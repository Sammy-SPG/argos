# Diagnóstico de autorización

Este módulo permite comprobar los guards reales con una cuenta de cada rol. No simula roles ni permite ver permisos de otras cuentas.

## Habilitación

En `backend/.env`:

```dotenv
NODE_ENV="development"
ENABLE_TEST_ROUTES="true"
```

Reinicia el backend después de cambiar el indicador. El módulo solo se registra con `ENABLE_TEST_ROUTES=true` y `NODE_ENV=development` o `test`. En producción estas rutas responden `404`, incluso si el indicador está activado.

Con MySQL y Redis configurados, ejecuta desde `backend/`:

```bash
npm run seed:permisos
npm run start:dev
```

La semilla reemplaza los permisos de **todos** los usuarios por los de su rol; no crea usuarios ni cambia contraseñas o roles. Los permisos de diagnóstico se siembran también si las rutas están deshabilitadas, para mantener un perfil determinista por rol.

## Rutas

Todas requieren `Authorization: Bearer <accessToken>`, obtenido mediante `POST /auth/login`. `:id` debe coincidir con `sesion.usuarioId` del login, también para administradores.

| Ruta | Rol permitido | Respuesta |
| --- | --- | --- |
| `GET /test/user/:id` | Los tres roles | `{ usuarioId, rol }` actual de MySQL. |
| `GET /test/user/:id/operador` | Operador | `{ usuarioId, rol, permisos }`. |
| `GET /test/user/:id/gerente` | Gerente | `{ usuarioId, rol, permisos }`. |
| `GET /test/user/:id/administrador` | Administrador | `{ usuarioId, rol, permisos }`. |

Ejemplo para un operador cuyo ID sea 25:

```http
GET /test/user/25/operador
Authorization: Bearer <accessToken>
```

Cada permiso contiene únicamente `modulo`, `accion` y `alcance`. El resultado refleja las asignaciones efectivas, limitadas por el perfil del rol; no incluye hashes, contraseñas, tokens ni datos de otras cuentas. Las respuestas llevan `Cache-Control: no-store`.

| Código | Significado |
| --- | --- |
| `200` | Sesión, permiso e identidad autorizados. |
| `400` | ID con formato inválido o cuerpo de login inválido. |
| `401` | Token ausente o inválido; sesión vencida, cerrada o cuenta inhabilitada. |
| `403` | Falta el permiso, la ruta corresponde a otro rol o el ID es ajeno. |
| `404` | El módulo está deshabilitado o la ruta no existe. |
| `409` en login | Ya existe una sesión vigente; se conserva la anterior. |

Un administrador no hereda las rutas de operador o gerente. Para probar otro usuario debe cerrarse su sesión anterior o utilizarse otra cuenta; la sesión única es por cuenta, no por rol.

## Pruebas automatizadas locales

Las suites automatizadas no se versionan. `backend/.gitignore` excluye los archivos `*.spec.*`, `*.test.*`, `*.e2e-spec.*`, las carpetas `/test/` y `/tests/` y la cobertura. Se conservan las configuraciones y comandos de Vitest para uso local cuando existan suites; un checkout nuevo no las incluye.

Este módulo `src/test/user/` sí forma parte del backend y se conserva en Git para comprobar la autorización mediante llamadas HTTP. Su registro sigue deshabilitado en producción.
