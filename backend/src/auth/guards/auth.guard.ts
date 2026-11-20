import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@src/auth/auth.service';
import {
  POLITICA_ACCESO,
  type PoliticaAcceso,
} from '@src/autorizacion/decorators/requiere-permiso.decorator';
import type { SolicitudAutenticada } from '@src/autorizacion/solicitud-autenticada';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const politica = this.reflector.getAllAndOverride<PoliticaAcceso>(
      POLITICA_ACCESO,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (politica?.tipo === 'publica') {
      return true;
    }

    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>();
    const authorization = solicitud.headers.authorization;
    const coincidencia =
      typeof authorization === 'string'
        ? /^Bearer ([^\s]+)$/i.exec(authorization)
        : null;
    if (!coincidencia) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    solicitud.sesion = await this.authService.validarSesion(coincidencia[1]);
    return true;
  }
}
