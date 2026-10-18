import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '@src/auth/auth.service';
import { IniciarSesionDto } from '@src/auth/dto/iniciar-sesion.dto';
import type {
  RespuestaInicioSesion,
  SesionAutenticada,
} from '@src/types/auth.types';

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Valida las credenciales y entrega la nueva sesión al cliente. */
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  iniciarSesion(
    @Body() datos: IniciarSesionDto,
  ): Promise<RespuestaInicioSesion> {
    return this.authService.iniciarSesion(datos);
  }

  /** Devuelve los datos actuales de la sesión presentada en el encabezado. */
  @Get('me')
  @Header('Cache-Control', 'no-store')
  obtenerSesion(
    @Headers('authorization') authorization?: string,
  ): Promise<SesionAutenticada> {
    return this.authService.validarSesion(this.obtenerToken(authorization));
  }

  /** Cierra únicamente la sesión correspondiente al token recibido. */
  @Post('logout')
  @HttpCode(204)
  cerrarSesion(
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    return this.authService.cerrarSesion(this.obtenerToken(authorization));
  }

  /** Extrae el token sin aceptar encabezados incompletos o con otro esquema. */
  private obtenerToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    // Se espera un encabezado de autorización con el formato "Bearer <token>".
    const partes = authorization.split(' ');

    if (
      partes.length !== 2 ||
      partes[0].toLowerCase() !== 'bearer' ||
      !partes[1]
    ) {
      throw new UnauthorizedException('Sesión no válida.');
    }

    return partes[1];
  }
}
