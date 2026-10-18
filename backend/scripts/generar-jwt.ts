import { randomBytes } from 'node:crypto';

// Se generan 32 bytes aleatorios y se representan como 64 caracteres hexadecimales.
const secret = randomBytes(32).toString('hex');

// Se muestra la configuración para copiarla al archivo .env sin modificar archivos.
console.info(`# Secreto utilizado para firmar los tokens de sesión, generado con 32 bytes aleatorios.
JWT_SECRET="${secret}"

# Duración del token en segundos; 28800 equivale a ocho horas.
JWT_EXPIRES_IN="28800"

# Identificador de la API que emite los tokens.
JWT_ISSUER="argos-api"

# Identificador de los clientes a los que se destinan los tokens.
JWT_AUDIENCE="argos-clientes"`);
