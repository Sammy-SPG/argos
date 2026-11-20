import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  POLITICA_ACCESO,
  type PoliticaAcceso,
} from '@src/autorizacion/decorators/requiere-permiso.decorator';
import { PermisosService } from '@src/autorizacion/permisos.service';
import type { SolicitudAutenticada } from '@src/autorizacion/solicitud-autenticada';

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PermisosService) private readonly permisosService: PermisosService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const politica = this.reflector.getAllAndOverride<PoliticaAcceso>(
      POLITICA_ACCESO,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (politica?.tipo === 'publica' || politica?.tipo === 'sesion') {
      return true;
    }

    // Omitir la política en una ruta no la convierte en pública ni autoriza por defecto.
    if (!politica) {
      throw new ForbiddenException('La ruta no tiene una política de acceso.');
    }

    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>();
    if (!solicitud.sesion) {
      throw new ForbiddenException('Se requiere una sesión validada.');
    }

    const permisos = await this.permisosService.obtenerPermisos(
      solicitud.sesion,
    );
    const permiso = permisos.find(
      (fila) =>
        fila.modulo === politica.modulo && fila.accion === politica.accion,
    );
    if (!permiso) {
      throw new ForbiddenException(
        'No tiene permiso para realizar esta acción.',
      );
    }

    solicitud.permisos = permisos;
    solicitud.permisoAutorizado = permiso;
    return true;
  }
}
