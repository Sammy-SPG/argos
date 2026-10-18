import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import db from '@backend/libs/db';
import {
  AccionHistorialEvento,
  EstadoEventoSucursal,
  EstadoNotificacionEvento,
  EstadoUsuario,
  FormaFinalizacionAtencion,
  FormaFinalizacionBloqueo,
  type RolUsuario,
} from '@backend/generated/prisma/enums';
import type { IniciarSesionDto } from '@src/auth/dto/iniciar-sesion.dto';
import type {
  PayloadJwtSesion,
  RespuestaInicioSesion,
  SesionAutenticada,
} from '@src/types/auth.types';

// La comparación también se realiza para cuentas inexistentes, sin guardar su contraseña.
const hashComparacion = bcrypt.hashSync('cuenta-inexistente', 12);
const duracionBloqueo = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /** Comprueba las credenciales y registra cada resultado de acceso de forma atómica. */
  async iniciarSesion(datos: IniciarSesionDto): Promise<RespuestaInicioSesion> {
    const usuarioInicial = await db.usuario.findUnique({
      where: { numeroControl: datos.numeroControl },
      select: { id: true, contrasenaHash: true },
    });

    // El cálculo de bcrypt se realiza antes de adquirir el bloqueo de la fila SQL.
    const contrasenaValida = await bcrypt.compare(
      datos.contrasena,
      usuarioInicial?.contrasenaHash ?? hashComparacion,
    );

    if (!usuarioInicial) {
      throw new UnauthorizedException('No fue posible iniciar sesión.');
    }

    const respuesta = await db.$transaction(
      async (tx) => {
        // La fila bloqueada serializa los accesos simultáneos a esta misma cuenta.
        await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${usuarioInicial.id} FOR UPDATE`;
        
        const usuario = await tx.usuario.findUnique({
          where: { id: usuarioInicial.id },
          include: { sucursal: true },
        });

        if (!usuario || usuario.estado !== EstadoUsuario.activo) {
          return null;
        }

        // Una modificación de identificador o contraseña invalida la comparación anterior.
        if (
          usuario.numeroControl !== datos.numeroControl ||
          usuario.contrasenaHash !== usuarioInicial.contrasenaHash
        ) {
          return null;
        }

        const ahora = new Date();

        // Se buscan los bloqueos vigentes (sin fecha de finalización) para determinar si se permite un nuevo intento.
        const bloqueos = await tx.bloqueoUsuario.findMany({
          where: { usuarioId: usuario.id, finalizacionEfectiva: null },
        });

        let bloqueoVigente = bloqueos.some((bloqueo) => bloqueo.vencimientoPrevisto > ahora);
        let bloqueosFinalizados = bloqueos.filter((bloqueo) => bloqueo.vencimientoPrevisto <= ahora);

        let bloqueoFinalizado = bloqueosFinalizados.length > 0;

        if (bloqueoFinalizado) {
          await tx.bloqueoUsuario.updateMany({
            where: { id: { in: bloqueosFinalizados.map((bloqueo) => bloqueo.id) } },
            data: {
              finalizacionEfectiva: ahora,
              formaFinalizacion: FormaFinalizacionBloqueo.automatica,
            },
          });
        }

        if (bloqueoFinalizado) {
          await tx.usuario.update({
            where: { id: usuario.id },
            data: { intentosFallidos: 0, actualizado: ahora },
          });
        }

        if (bloqueoVigente) {
          return null;
        }

        if (!contrasenaValida) {
          const cuenta = await tx.usuario.update({
            where: { id: usuario.id },
            data: { intentosFallidos: { increment: 1 }, actualizado: ahora },
            select: { intentosFallidos: true },
          });

          if (cuenta.intentosFallidos >= 5) {
            await tx.bloqueoUsuario.create({
              data: {
                usuarioId: usuario.id,
                fecha: ahora,
                vencimientoPrevisto: new Date(
                  ahora.getTime() + duracionBloqueo,
                ),
              },
            });
          }

          // Devolver null permite confirmar el contador y el bloqueo antes de responder 401.
          return null;
        }

        const accessToken = await this.jwtService.signAsync({
          sub: String(usuario.id),
          jti: randomUUID(),
        });

        // Este token acaba de firmarse localmente; se lee exp para guardar el mismo vencimiento.
        const payload = this.jwtService.decode<PayloadJwtSesion>(accessToken);
        const sesion = await tx.sesionUsuario.create({
          data: {
            usuarioId: usuario.id,
            tokenHash: this.obtenerHashToken(accessToken),
            inicio: new Date(payload.iat * 1000),
            vencimiento: new Date(payload.exp * 1000),
          },
        });

        await tx.usuario.update({
          where: { id: usuario.id },
          data: { intentosFallidos: 0, actualizado: ahora },
        });

        return {
          accessToken,
          tokenType: 'Bearer' as const,
          sesion: this.crearContexto(sesion.id, sesion.vencimiento, usuario),
        };
      },
      { isolationLevel: 'ReadCommitted' },
    );

    if (!respuesta) {
      throw new UnauthorizedException('No fue posible iniciar sesión.');
    }

    return respuesta;
  }

  /** Verifica la firma, el contenido del JWT y la vigencia de su sesión persistida. */
  async validarSesion(token: string): Promise<SesionAutenticada> {
    const payload = await this.verificarToken(token);

    const sesion = await db.sesionUsuario.findUnique({
      where: { tokenHash: this.obtenerHashToken(token) },
      include: { usuario: { include: { sucursal: true } } },
    });

    if (
      !sesion ||
      sesion.finalizada ||
      String(sesion.usuarioId) !== payload.sub ||
      sesion.vencimiento.getTime() !== payload.exp * 1000
    ) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    if (sesion.usuario.estado !== EstadoUsuario.activo) {
      await this.finalizarSesion(sesion.id, 'Cuenta inhabilitada.', null);
      throw new UnauthorizedException('Sesión no válida.');
    }

    // El vencimiento se comprueba siempre antes de devolver un contexto autenticado.
    if (
      payload.exp * 1000 <= Date.now() ||
      sesion.vencimiento.getTime() <= Date.now()
    ) {
      await this.finalizarSesion(sesion.id, 'Sesión vencida.', null);
      throw new UnauthorizedException('Sesión no válida.');
    }

    return this.crearContexto(sesion.id, sesion.vencimiento, sesion.usuario);
  }

  /** Cierra la sesión que presenta el cliente y registra los efectos del cierre. */
  async cerrarSesion(token: string): Promise<void> {
    const sesion = await this.validarSesion(token);
    await this.finalizarSesion(
      sesion.sesionId,
      'Cierre de sesión solicitado.',
      sesion.usuarioId,
    );
  }

  /** Verifica criptográficamente el token y comprueba los campos esperados en ejecución. */
  private async verificarToken(token: string): Promise<PayloadJwtSesion> {
    let payload: PayloadJwtSesion;

    try {
      // Permite reconocer un token vencido para limpiar su sesión; validarSesion lo rechaza.
      payload = await this.jwtService.verifyAsync<PayloadJwtSesion>(token, {
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Sesión no válida.');
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d*$/.test(payload.sub) ||
      !Number.isSafeInteger(Number(payload.sub)) ||
      typeof payload.jti !== 'string' ||
      payload.jti.trim().length === 0 ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat <= 0 ||
      payload.exp <= payload.iat ||
      typeof payload.iss !== 'string' ||
      typeof payload.aud !== 'string'
    ) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    return payload;
  }

  /** Calcula la clave de búsqueda sin guardar el token completo en la base de datos. */
  private obtenerHashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Selecciona únicamente los datos públicos de la sesión y del usuario. */
  private crearContexto(
    sesionId: number,
    vencimiento: Date,
    usuario: {
      id: number;
      numeroControl: string;
      nombre: string;
      apellido: string;
      rol: RolUsuario;
      sucursal: { sucursalId: number } | null;
    },
  ): SesionAutenticada {
    let sucursalId: number | null = null;

    if (usuario.sucursal) {
      sucursalId = usuario.sucursal.sucursalId;
    }

    return {
      sesionId,
      usuarioId: usuario.id,
      numeroControl: usuario.numeroControl,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      sucursalId,
      vencimiento: vencimiento.toISOString(),
    };
  }

  /** Finaliza la sesión, sus destinos y sus atenciones sin borrar el historial. */
  private async finalizarSesion(
    sesionId: number,
    motivo: string,
    actorId: number | null,
  ): Promise<void> {
    await db.$transaction(
      async (tx) => {
        // Dos solicitudes de cierre no deben liberar ni registrar dos veces una atención.
        await tx.$queryRaw`SELECT id FROM sesion_usuario WHERE id = ${sesionId} FOR UPDATE`;

        const sesion = await tx.sesionUsuario.findUnique({
          where: { id: sesionId },
        });

        if (!sesion || sesion.finalizada) {
          return;
        }

        const ahora = new Date();
        const atenciones = await tx.atencionEvento.findMany({
          where: { sesionUsuarioId: sesionId, vigente: true },
          orderBy: { eventoSucursalId: 'asc' },
        });

        // Se liberan las atenciones vigentes y se registra el historial de cada evento.
        for (const atencion of atenciones) {
          // El evento se bloquea antes de modificar su responsable y su estado.
          await tx.$queryRaw`SELECT id FROM evento_sucursal WHERE id = ${atencion.eventoSucursalId} FOR UPDATE`;

          const evento = await tx.eventoSucursal.findUniqueOrThrow({
            where: { id: atencion.eventoSucursalId },
          });

          const liberacion = await tx.atencionEvento.updateMany({
            where: {
              id: atencion.id,
              sesionUsuarioId: sesionId,
              vigente: true,
            },
            data: {
              vigente: null,
              finalizada: ahora,
              formaFinalizacion: FormaFinalizacionAtencion.abandonoSesion,
              motivo,
            },
          });

          if (liberacion.count === 0) {
            continue;
          }

          // Un incidente confirmado conserva su confirmación cuando pierde al encargado.
          let estado = evento.estado;

          if (estado === EstadoEventoSucursal.enAtencion) {
            estado = EstadoEventoSucursal.pendiente;
            await tx.eventoSucursal.update({
              where: { id: evento.id },
              data: { estado, actualizado: ahora },
            });
          }

          await tx.historialEvento.create({
            data: {
              eventoSucursalId: evento.id,
              atencionEventoId: atencion.id,
              usuarioId: actorId,
              accion: AccionHistorialEvento.atencionAbandonada,
              estadoAnterior: evento.estado,
              estado,
              observacion: motivo,
              fecha: ahora,
            },
          });
        }

        await tx.dispositivoSesionUsuario.updateMany({
          where: { sesionUsuarioId: sesionId, desactivado: null },
          data: { desactivado: ahora },
        });

        await tx.notificacionEvento.updateMany({
          where: {
            dispositivoSesionUsuario: { sesionUsuarioId: sesionId },
            estado: EstadoNotificacionEvento.pendiente,
          },
          data: { estado: EstadoNotificacionEvento.cancelada },
        });

        await tx.sesionUsuario.update({
          where: { id: sesionId },
          data: { finalizada: ahora, motivoFinalizacion: motivo },
        });
      },
      // Cada lectura observa el estado confirmado después de adquirir los bloqueos SQL.
      { isolationLevel: 'ReadCommitted' },
    );
  }
}
