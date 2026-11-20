import { SetMetadata } from '@nestjs/common';
import type { AccionPermisoUsuario } from '@backend/generated/prisma/enums';
import type { ModuloPermiso } from '@src/autorizacion/matriz-permisos';

export const POLITICA_ACCESO = 'argos:politica-acceso';

export type PoliticaAcceso =
  | { tipo: 'publica' }
  | { tipo: 'sesion' }
  | { tipo: 'permiso'; modulo: ModuloPermiso; accion: AccionPermisoUsuario };

/** Declara una ruta sin autenticación, como el inicio de sesión. */
export const Publica = () =>
  SetMetadata(POLITICA_ACCESO, { tipo: 'publica' } satisfies PoliticaAcceso);

/** Exige sesión válida sin requerir un permiso de negocio adicional. */
export const SoloSesion = () =>
  SetMetadata(POLITICA_ACCESO, { tipo: 'sesion' } satisfies PoliticaAcceso);

/** El guard comprueba el permiso; el servicio de negocio debe aplicar su alcance. */
export const RequierePermiso = (
  modulo: ModuloPermiso,
  accion: AccionPermisoUsuario,
) =>
  SetMetadata(POLITICA_ACCESO, {
    tipo: 'permiso',
    modulo,
    accion,
  } satisfies PoliticaAcceso);
