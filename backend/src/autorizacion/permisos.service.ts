import { Inject, Injectable } from '@nestjs/common';
import {
  AccionPermisoUsuario,
  AlcancePermisoUsuario,
} from '@backend/generated/prisma/enums';
import db from '@backend/libs/db';
import { RedisService } from '@src/redis/redis.service';
import {
  obtenerAlcancePorRol,
  type PermisoDeRol,
} from '@src/autorizacion/matriz-permisos';
import {
  clavePermisos,
  claveRevisionPermisos,
  VERSION_MATRIZ,
} from '@src/autorizacion/permisos-cache';
import type { SesionAutenticada } from '@src/types/auth.types';

type IdentidadPermisos = Pick<SesionAutenticada, 'usuarioId' | 'rol'>;

@Injectable()
export class PermisosService {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  /** MySQL conserva las asignaciones; Redis evita repetir su lectura durante el TTL. */
  async obtenerPermisos(
    usuario: IdentidadPermisos,
  ): Promise<readonly PermisoDeRol[]> {
    const clave = clavePermisos(usuario.usuarioId);
    const claveRevision = claveRevisionPermisos(usuario.usuarioId);
    let revision: string | undefined;

    try {
      const cache = await this.redis.obtenerJson(clave);
      if (this.esPerfilValido(cache, usuario)) {
        return this.limitarAlPerfil(cache.permisos, usuario);
      }
      revision = await this.redis.obtenerRevision(claveRevision);
    } catch {
      // Una caché ausente, dañada o inaccesible nunca concede permisos por sí misma.
    }

    const asignados = await db.permisoUsuario.findMany({
      where: { usuarioId: usuario.usuarioId },
      select: { modulo: true, accion: true, alcance: true },
      orderBy: [{ modulo: 'asc' }, { accion: 'asc' }],
    });
    const permisos = this.limitarAlPerfil(asignados, usuario);

    if (revision !== undefined) {
      try {
        // Si una semilla invalidó durante la lectura SQL, se descarta esta escritura.
        await this.redis.guardarJsonSiRevision(
          clave,
          {
            usuarioId: usuario.usuarioId,
            rol: usuario.rol,
            versionMatriz: VERSION_MATRIZ,
            permisos,
          },
          claveRevision,
          revision,
        );
      } catch {
        // El resultado SQL sigue siendo válido aunque no pueda almacenarse en Redis.
      }
    }
    return permisos;
  }

  /** Debe ejecutarse después de confirmar cambios de permisos, rol o asignación. */
  async invalidarUsuario(usuarioId: number): Promise<void> {
    await this.redis.invalidarConRevision(
      clavePermisos(usuarioId),
      claveRevisionPermisos(usuarioId),
    );
  }

  private esPerfilValido(
    valor: unknown,
    usuario: IdentidadPermisos,
  ): valor is { permisos: PermisoDeRol[] } {
    if (!valor || typeof valor !== 'object') {
      return false;
    }
    const perfil = valor as Record<string, unknown>;
    return (
      perfil.usuarioId === usuario.usuarioId &&
      perfil.rol === usuario.rol &&
      perfil.versionMatriz === VERSION_MATRIZ &&
      Array.isArray(perfil.permisos) &&
      perfil.permisos.every((permiso: unknown) => {
        if (!permiso || typeof permiso !== 'object') {
          return false;
        }
        const fila = permiso as Record<string, unknown>;
        return (
          typeof fila.modulo === 'string' &&
          Object.values(AccionPermisoUsuario).includes(
            fila.accion as AccionPermisoUsuario,
          ) &&
          Object.values(AlcancePermisoUsuario).includes(
            fila.alcance as AlcancePermisoUsuario,
          )
        );
      })
    );
  }

  private limitarAlPerfil(
    asignados: readonly PermisoDeRol[],
    usuario: IdentidadPermisos,
  ): readonly PermisoDeRol[] {
    const permisos = new Map<string, PermisoDeRol>();
    for (const permiso of asignados) {
      const maximo = obtenerAlcancePorRol(
        usuario.rol,
        permiso.modulo,
        permiso.accion,
      );
      if (!maximo) {
        continue;
      }
      permisos.set(`${permiso.modulo}.${permiso.accion}`, {
        modulo: permiso.modulo,
        accion: permiso.accion,
        // Una fila antigua o editada manualmente no puede ampliar el alcance del rol.
        alcance: maximo === 'asignado' ? 'asignado' : permiso.alcance,
      });
    }
    return [...permisos.values()];
  }
}
