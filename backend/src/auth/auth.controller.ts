import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  HttpCode,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '@src/auth/auth.service';
import { IniciarSesionDto } from '@src/auth/dto/iniciar-sesion.dto';
import {
  Publica,
  SoloSesion,
} from '@src/autorizacion/decorators/requiere-permiso.decorator';
import type { SolicitudAutenticada } from '@src/autorizacion/solicitud-autenticada';
import type {
  RespuestaInicioSesion,
  SesionAutenticada,
} from '@src/types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  /** Valida las credenciales y entrega la nueva sesión al cliente. */
  @Post('login')
  @Publica()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  iniciarSesion(
    @Body(
      new ValidationPipe({
        expectedType: IniciarSesionDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    datos: IniciarSesionDto,
  ): Promise<RespuestaInicioSesion> {
    return this.authService.iniciarSesion(datos);
  }

  /** Devuelve los datos actuales de la sesión presentada en el encabezado. */
  @Get('me')
  @SoloSesion()
  @Header('Cache-Control', 'no-store')
  obtenerSesion(@Req() solicitud: SolicitudAutenticada): SesionAutenticada {
    return solicitud.sesion;
  }

  /** Cierra únicamente la sesión correspondiente al token recibido. */
  @Post('logout')
  @SoloSesion()
  @HttpCode(204)
  cerrarSesion(@Req() solicitud: SolicitudAutenticada): Promise<void> {
    return this.authService.cerrarSesionValidada(solicitud.sesion);
  }
}
