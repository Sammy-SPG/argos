import { createHash } from 'node:crypto';
import { MATRIZ_PERMISOS } from '@src/autorizacion/matriz-permisos';

// Una nueva matriz no debe reutilizar un perfil calculado con reglas anteriores.
export const VERSION_MATRIZ = createHash('sha256')
  .update(JSON.stringify(MATRIZ_PERMISOS))
  .digest('hex');
export const clavePermisos = (usuarioId: number) =>
  `permisos:usuario:${usuarioId}`;
export const claveRevisionPermisos = (usuarioId: number) =>
  `permisos:revision:${usuarioId}`;
