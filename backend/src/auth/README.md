# Módulo de autenticación

## Propósito

Identificar al usuario mediante su número de control y contraseña, registrar su sesión y comprobar que esa sesión siga vigente. El servicio puede utilizarse desde otros componentes mediante `AuthService.validarSesion(token)`.

## Alcance y responsabilidades

El módulo es responsable de:

- Validar los datos recibidos para iniciar sesión.
- Comparar la contraseña con el hash existente mediante `bcryptjs`.
- Comprobar el estado administrativo de la cuenta y sus bloqueos temporales.
- Registrar los intentos fallidos y aplicar el bloqueo de cinco fallos consecutivos durante diez minutos.
- Reiniciar el contador tras una autenticación exitosa y al finalizar un bloqueo vencido.
- Firmar el JWT y registrar la sesión en `SesionUsuario`.
- Construir un contexto tipado con los datos actuales de la sesión, usuario, rol y sucursal.
- Cerrar la sesión, retirar sus destinos de avisos y liberar su atención activa.
- Exponer la validación de sesión para otros componentes de la aplicación.

## Archivos

| Archivo                     | Responsabilidad                                                                                   |
| :-------------------------- | :------------------------------------------------------------------------------------------------ |
| `auth.module.ts`            | Configurar JWT, registrar controlador y servicio y exportar `AuthService`.                        |
| `auth.controller.ts`        | Recibir las solicitudes, validar sus datos y extraer el token Bearer.                             |
| `auth.service.ts`           | Comprobar credenciales, registrar intentos, gestionar sesiones y ejecutar los efectos del cierre. |
| `dto/iniciar-sesion.dto.ts` | Definir y validar los campos del inicio de sesión.                                                |
| `../types/auth.types.ts`    | Definir los contratos compartidos del JWT, la sesión y la respuesta de acceso.                    |

Los imports internos utilizan `@src` y `@backend`. Los comentarios describen el propósito del código y las condiciones `if` utilizan llaves.

## Herramientas

| Herramienta                                               | Uso                                                                                 |
| :-------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `@nestjs/jwt`                                             | Firmar y verificar JWT mediante `JwtService`.                                       |
| `bcryptjs`                                                | Comparar la contraseña recibida con el hash guardado.                               |
| Prisma y `@prisma/adapter-mariadb`                        | Consultar y modificar usuarios, bloqueos, sesiones y registros asociados al cierre. |
| `class-validator`, `class-transformer` y `ValidationPipe` | Validar el cuerpo del inicio de sesión y rechazar campos adicionales.               |
| `node:crypto`                                             | Generar `jti` con `randomUUID` y calcular el hash SHA-256 del token.                |
| `dotenv`                                                  | Leer las variables de configuración locales.                                        |

## Configuración

Agrega las variables JWT de `backend/.env.example` al archivo local `backend/.env`:

```dotenv
JWT_SECRET=""
JWT_EXPIRES_IN="28800"
JWT_ISSUER="argos-api"
JWT_AUDIENCE="argos-clientes"
```

Desde la carpeta `backend`, genera la configuración completa con comentarios:

```bash
npm run jwt:generar
```

El script `backend/scripts/generar-jwt.ts` muestra las cuatro variables `JWT_*` para copiarlas al archivo local `.env`; no modifica archivos. Cada ejecución genera un secreto nuevo de 32 bytes aleatorios, representado como 64 caracteres hexadecimales. Cambiar el secreto invalida los tokens firmados con el anterior.

El secreto no se guarda en el repositorio. `JWT_EXPIRES_IN` representa segundos; el ejemplo de `28800` equivale a ocho horas y puede cambiarse mediante configuración. El módulo impide el inicio de la aplicación si falta una variable requerida o su valor es inválido.

El algoritmo utilizado es `HS256`. La verificación comprueba firma, algoritmo, emisor, destinatario y estructura de los campos. El vencimiento siempre se comprueba antes de devolver una sesión autenticada.

## Rutas

### POST /auth/login

Recibe exactamente `numeroControl` y `contrasena`:

```json
{
  "numeroControl": "16102026-1",
  "contrasena": "contraseña de la cuenta"
}
```

Ambos campos deben ser texto. El número de control admite hasta 191 caracteres y la contraseña entre 1 y 72 bytes, de acuerdo con el límite de bcrypt. No se aceptan campos adicionales.

Responde `200` con `accessToken`, `tokenType: "Bearer"` y `sesion`. El contexto de sesión incluye `sesionId`, `usuarioId`, `numeroControl`, `nombre`, `apellido`, `rol`, `sucursalId` y `vencimiento` en formato ISO. Una cuenta sin sucursal conserva `sucursalId: null`.

Una cuenta desconocida, una contraseña incorrecta, una cuenta inhabilitada o un bloqueo vigente reciben `401` con el mismo mensaje: `No fue posible iniciar sesión.` Los datos de entrada inválidos reciben `400`.

### GET /auth/me

Recibe el encabezado `Authorization: Bearer <token>` y responde `200` con el contexto actual de la sesión. Los datos de la cuenta se consultan nuevamente para reflejar cambios de nombre, rol, sucursal o estado.

Un encabezado incompleto, un token alterado, una sesión desconocida, cerrada o vencida reciben `401`. La comprobación nunca devuelve hashes ni el JWT dentro del contexto.

### POST /auth/logout

Recibe el mismo encabezado y responde `204`, sin cuerpo. Cierra únicamente la sesión presentada por el cliente y conserva sus registros históricos.

## JWT y persistencia de la sesión

El token incluye `sub` como ID del usuario expresado en texto, `jti` como identificador aleatorio, `iat`, `exp`, `iss` y `aud`. La base de datos conserva únicamente el hash SHA-256 del token completo en `SesionUsuario.tokenHash`.

La contraseña utiliza bcrypt. El token, generado por el servidor, utiliza SHA-256 para permitir su búsqueda por hash sin almacenar la credencial original. El JWT firmado puede leerse; su firma no cifra el contenido.

La sesión se crea con el mismo vencimiento del JWT. El token solo se devuelve cuando la transacción del inicio de sesión terminó correctamente. No se utiliza renovación automática ni refresh token: al vencer, el cliente debe iniciar sesión nuevamente.

`PayloadJwtSesion`, `SesionAutenticada` y `RespuestaInicioSesion` se definen en `src/types/auth.types.ts`. Los tipos ayudan durante el desarrollo; los campos del JWT también se comprueban en ejecución.

## Intentos fallidos y bloqueos

La comparación de bcrypt se realiza fuera de la transacción. También se compara contra un hash de referencia cuando la cuenta no existe, para evitar omitir ese trabajo en ese caso.

Dentro de la transacción se bloquea la fila del usuario mediante `SELECT ... FOR UPDATE`. Esto serializa los accesos simultáneos a una cuenta. El número de control, el hash y el estado se comprueban nuevamente antes de registrar el resultado.

Cada contraseña incorrecta incrementa el contador. El quinto fallo registra un bloqueo con inicio y vencimiento a diez minutos. Mientras el bloqueo siga vigente, nuevos accesos se rechazan aunque presenten una contraseña correcta.

Los bloqueos vencidos se finalizan con forma `automatica` y fecha efectiva igual al vencimiento previsto. Se reinicia el contador antes de evaluar el siguiente intento. Un acceso exitoso también lo reinicia.

El rechazo de acceso se devuelve después de confirmar la transacción para no revertir el contador o el bloqueo recién registrados. El bloqueo temporal no cambia el estado administrativo de la cuenta ni revoca sesiones anteriores.

## Validación y cierre de sesiones

`AuthService.validarSesion(token)` verifica criptográficamente el JWT, localiza la sesión por el hash del token y comprueba que el usuario coincida, la sesión no haya finalizado, el vencimiento corresponda y la cuenta siga activa.

La verificación criptográfica permite leer un token vencido únicamente para cerrar y limpiar su sesión persistida. Su fecha se comprueba explícitamente y ese token siempre se rechaza. Una cuenta que dejó de estar activa también provoca el cierre de la sesión presentada y una respuesta `401`.

El cierre se realiza en una transacción y:

1. Registra `finalizada` y `motivoFinalizacion` en la sesión.
2. Desactiva los destinos `DispositivoSesionUsuario` de esa sesión.
3. Cancela los avisos que todavía estén pendientes para esos destinos.
4. Finaliza las atenciones vigentes, establece `vigente: null` y registra el abandono en `HistorialEvento`.
5. Devuelve un evento `enAtencion` a `pendiente`. Un evento `confirmado` conserva su confirmación y queda sin encargado; los eventos cerrados no se reabren.

La sesión y cada evento se bloquean durante el cierre para evitar liberaciones duplicadas. Las transacciones utilizan aislamiento `ReadCommitted` para leer el estado vigente después de adquirir cada bloqueo.

El cierre explícito se atribuye al usuario que lo solicita. El cierre por vencimiento o cuenta inhabilitada se registra como automático, con usuario nulo en el historial.

No hay un proceso periódico de vencimiento en esta implementación. La limpieza de una sesión vencida se realiza cuando se presenta su token a la validación; el paso del tiempo por sí solo no modifica los destinos o atenciones de clientes desconectados.

## Comprobación

Desde `backend/`:

```bash
npm run typecheck
npm run build
npm test -- src/auth/auth.service.spec.ts
```

Las pruebas utilizan un cliente de base de datos simulado, bcrypt y JWT reales. Comprueban credenciales, bloqueos, vencimiento, revocación, contenido de las respuestas, cierre de destinos y liberación de atenciones. No sustituyen una prueba de integración con MySQL o MariaDB ni modifican la base de datos local.

## Referencias

- [NestJS JWT](https://github.com/nestjs/jwt).
- [NestJS: validación de datos](https://docs.nestjs.com/techniques/validation).
- [Prisma: transacciones](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js).
