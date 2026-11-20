import type { Request } from 'express';
import type { SesionAutenticada } from '@src/types/auth.types';
import type { PermisoDeRol } from '@src/autorizacion/matriz-permisos';

/** Contexto establecido por los guards antes de ejecutar el controlador. */
export interface SolicitudAutenticada extends Request {
  sesion: SesionAutenticada;
  permisos: readonly PermisoDeRol[];
  permisoAutorizado: PermisoDeRol;
}
