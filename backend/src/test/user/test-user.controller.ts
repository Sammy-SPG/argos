import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { RequierePermiso } from '@src/autorizacion/decorators/requiere-permiso.decorator';
import type { SolicitudAutenticada } from '@src/autorizacion/solicitud-autenticada';

@Controller('test/user')
export class TestUserController {

  @Get(':id')
  @RequierePermiso('test_usuario', 'consultar')
  @Header('Cache-Control', 'no-store')
  obtenerRol(
    @Param('id', ParseIntPipe) id: number,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    this.validarPropietario(id, solicitud);
    return { usuarioId: solicitud.sesion.usuarioId, rol: solicitud.sesion.rol };
  }

  @Get(':id/operador')
  @RequierePermiso('test_operador', 'consultar')
  @Header('Cache-Control', 'no-store')
  obtenerOperador(
    @Param('id', ParseIntPipe) id: number,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.obtenerPerfil(id, solicitud);
  }

  @Get(':id/gerente')
  @RequierePermiso('test_gerente', 'consultar')
  @Header('Cache-Control', 'no-store')
  obtenerGerente(
    @Param('id', ParseIntPipe) id: number,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.obtenerPerfil(id, solicitud);
  }

  @Get(':id/administrador')
  @RequierePermiso('test_administrador', 'consultar')
  @Header('Cache-Control', 'no-store')
  obtenerAdministrador(
    @Param('id', ParseIntPipe) id: number,
    @Req() solicitud: SolicitudAutenticada,
  ) {
    return this.obtenerPerfil(id, solicitud);
  }

  private obtenerPerfil(id: number, solicitud: SolicitudAutenticada) {
    this.validarPropietario(id, solicitud);
    return {
      usuarioId: solicitud.sesion.usuarioId,
      rol: solicitud.sesion.rol,
      permisos: solicitud.permisos,
    };
  }

  private validarPropietario(
    id: number,
    solicitud: SolicitudAutenticada,
  ): void {
    // En estas rutas el alcance asignado siempre significa la propia identidad.
    if (id !== solicitud.sesion.usuarioId) {
      throw new ForbiddenException(
        'Solo se puede consultar el propio usuario.',
      );
    }
  }
}
