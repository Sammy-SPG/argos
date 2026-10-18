import type { RolUsuario } from '@backend/generated/prisma/enums';

/** Campos del JWT firmado por el servidor. */
export interface PayloadJwtSesion {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/** Datos públicos de una sesión validada; el vencimiento utiliza formato ISO. */
export interface SesionAutenticada {
  sesionId: number;
  usuarioId: number;
  numeroControl: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  sucursalId: number | null;
  vencimiento: string;
}

/** Respuesta del inicio de sesión, sin hashes ni datos privados de la cuenta. */
export interface RespuestaInicioSesion {
  accessToken: string;
  tokenType: 'Bearer';
  sesion: SesionAutenticada;
}
