# Backend de Argos

API de Argos basada en NestJS 12 y TypeScript. La persistencia usa Prisma ORM 7 con el proveedor `mysql`, compatible con MySQL y MariaDB. `AppService` utiliza el cliente de `libs/db.ts` para consultar usuarios.

## Configuración realizada

1. Se generó la plantilla NestJS en `backend/` con el nombre de paquete `argos-backend` (equivalente a ejecutar `nest new argos-backend --directory backend --language ts --skip-git` desde la raíz del repositorio). Se escribe en TypeScript y actualmente se compila a CommonJS para permitir imports sin extensión.
2. Se instalaron `prisma@7` y `dotenv` como dependencias de desarrollo, y `@prisma/client@7` y `@prisma/adapter-mariadb` como dependencias de la aplicación. Las versiones exactas quedan registradas en `package-lock.json`.
3. Se inicializó Prisma con `npx prisma init --datasource-provider mysql --output ../generated/prisma`. El esquema está en `prisma/schema.prisma` y el cliente generado queda en `generated/prisma/`.
4. En el generador del esquema se configuró `moduleFormat = "cjs"`, consistente con el formato compilado del backend.
5. `prisma7.config.ts` carga `.env` mediante `dotenv/config`, lee `DATABASE_URL` y define la ruta de las migraciones.
6. Se creó el modelo inicial `Usuario`, con los enumerados `EstadoUsuario` y `RolUsuario`. La primera migración está en `prisma/migrations/20260928232758_init/` y crea la tabla `usuario`. La migración se aplicó a la base de datos configurada durante la configuración inicial.

Los comandos de instalación e inicialización correspondientes, ejecutados desde `backend/`, son:

```bash
npm install prisma@7 dotenv --save-dev
npm install @prisma/client@7 @prisma/adapter-mariadb
npx prisma init --datasource-provider mysql --output ../generated/prisma
```

El esquema vigente está basado en `docs/Argos-Apex.png`. El módulo de autenticación está en `src/auth/` y su configuración, rutas y responsabilidades se documentan en [su README](src/auth/README.md). La conexión compartida de Redis, sus variables y el servicio local se documentan en [Redis](src/redis/README.md). La administración de usuarios sigue pendiente. Los nombres y campos vigentes son los de `prisma/schema.prisma`.

## Preparar una instalación local

Comprueba `node -v` antes de instalar. Prisma 7 requiere Node.js 20.19+, 22.12+ o 24+; si vas a usar también los generadores de NestJS 12, necesitas Node.js 22.22.3+, 24.15+ o 26+.

Desde `backend/`:

```bash
npm ci
cp .env.example .env
```

Edita `.env` con la URL de tu base de datos MySQL o MariaDB. Nunca confirmes ese archivo en Git. La URL de ejemplo contiene marcadores de posición, no credenciales reales.

Después, valida el esquema, aplica las migraciones existentes y genera el cliente local:

```bash
npx prisma validate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

Para crear una migración nueva durante el desarrollo, edita `prisma/schema.prisma` y ejecuta `npx prisma migrate dev --config prisma7.config.ts --name nombre_del_cambio`. Confirma en Git tanto el esquema como los archivos de la nueva migración. `generated/prisma/`, `dist/` y `.env` quedan fuera del repositorio; el cliente debe generarse también en una instalación nueva o en CI.

## Redis local

Completa las variables `REDIS_*` de `.env.example` en tu `.env`, genera una contraseña propia para `REDIS_PASSWORD` y, con Docker iniciado, ejecuta:

```bash
npm run redis:up
npm run redis:check
```

El backend requiere Redis disponible para iniciar. La caché tiene un TTL predeterminado de una hora y utiliza un prefijo por entorno. Consulta la [guía de Redis](src/redis/README.md) para generar la contraseña, cambiar puertos, detener el contenedor y utilizar la conexión desde otros módulos. La autorización ya utiliza Redis para cachear los permisos; las sesiones continúan validándose en MySQL en cada petición.

## Autorización y matriz de permisos

La [matriz de permisos](src/autorizacion/README.md) contiene los permisos de administrador, gerente y operador, su alcance, las condiciones de cada operación y su referencia a los requerimientos funcionales. Su configuración TypeScript está en [matriz-permisos.ts](src/autorizacion/matriz-permisos.ts), con perfiles fijos y propuestas pendientes separadas.

`@RequierePermiso(modulo, accion)` declara el permiso requerido; los guards globales validan la sesión y el permiso antes de ejecutar el controlador. `PermisosService` consulta Redis y recurre a MySQL ante un fallo o ausencia de caché. Cada servicio de negocio deberá aplicar el alcance a los recursos concretos. Las rutas sin política se deniegan; login es público y `/auth/me` y `/auth/logout` solo requieren sesión.

La autenticación permite una sola sesión activa por usuario. Un segundo login válido recibe `409` y conserva la sesión anterior. Al iniciar sesión se precargan los permisos en Redis después de confirmar la transacción SQL.

### Semilla de permisos

Con las migraciones aplicadas, el cliente Prisma generado y MySQL y Redis disponibles:

```bash
npm run seed:permisos
```

`scripts/seeds/permisos-usuarios.ts` recorre todos los usuarios y **elimina sus permisos anteriores para reemplazarlos por el perfil confirmado de su rol**, incluidos los permisos de diagnóstico. No cambia roles ni datos de cuenta; las propuestas con asterisco quedan excluidas. Cada usuario se actualiza en una transacción y su caché se invalida después del commit. Puede repetirse sin duplicar filas.

La operación es atómica por usuario, no para el conjunto completo. Si falla, los usuarios anteriores pueden haber quedado actualizados; si falla la invalidación, también el usuario actual. El comando termina con error y debe repetirse una vez restablecidos los servicios. Una modificación de la matriz requiere ejecutar esta semilla: cambiar código o documentación no crea asignaciones automáticamente. Cuando se implemente la creación de cuentas, deberá generar sus permisos dentro de la transacción de creación.

### Estructura acordada

```text
backend/src/
├── auth/                 # Implementado: login, sesión, logout y guard
├── autorizacion/         # Implementado: matriz, decoradores, guard y caché de permisos
├── redis/                # Implementado: conexión y operaciones Redis
├── test/user/            # Implementado: diagnóstico opcional, excluido de producción
├── usuario/              # Previsto
│   └── dto/
├── sucursal/             # Previsto
│   ├── horario/
│   ├── descanso/
│   └── contacto/
├── monitoreo/            # Previsto
│   ├── particion/
│   ├── zona/
│   ├── sensor/
│   └── camara/
├── evento/               # Previsto
│   └── contexto/
├── notificacion/         # Previsto
├── escalamiento/         # Previsto
├── atencion/             # Previsto
└── geografia/            # Previsto: estados y municipios por estado
```

`usuario/` agrupará las operaciones de los tres roles con DTO específicos, sin subcarpetas por rol. Las subcarpetas de sucursal y monitoreo organizan controlador, servicio y DTO; no obligan a crear módulos NestJS independientes. Los dispositivos se registrarán internamente en autenticación y se desactivan al finalizar la sesión. Los módulos de negocio indicados como previstos aún no se han creado.

### Probar autorización

En `.env`, establece `ENABLE_TEST_ROUTES="true"` y conserva `NODE_ENV="development"`; reinicia el backend. En producción el módulo queda excluido incluso con el indicador activado. Las rutas y ejemplos están en [test/user](src/test/user/README.md).

```text
GET /test/user/:id
GET /test/user/:id/operador
GET /test/user/:id/gerente
GET /test/user/:id/administrador
```

Se requiere el Bearer token obtenido en login y el ID del propio usuario. La primera devuelve el rol actual; cada ruta específica devuelve los permisos efectivos y solo admite ese rol, sin herencia de administrador.

Las rutas de diagnóstico permiten comprobar los permisos manualmente. Las suites automatizadas se mantienen fuera del repositorio por decisión del proyecto: `backend/.gitignore` excluye `/test/`, `/tests/`, archivos `*.spec.*`, `*.test.*`, `*.e2e-spec.*` y `/coverage/`. La carpeta `src/test/` sí se versiona porque contiene los endpoints de diagnóstico.

Se conservan las configuraciones de Vitest y los comandos `npm test` y `npm run test:e2e` para suites locales opcionales. Un checkout nuevo no contiene pruebas automatizadas; esos comandos requieren disponer de archivos locales y, si no existen, Vitest informa que no encontró pruebas.

Validación realizada el 19 de noviembre de 2026 antes de retirar las suites del repositorio: 21 pruebas unitarias y 23 de integración aprobadas, además de tipos, lint y compilación. El backend compilado en modo producción respondió `404` a las rutas de diagnóstico aun con el indicador activo. Se ejecutó la semilla sobre las dos cuentas locales existentes: 55 permisos de administrador y 14 de operador.

## Catálogos de estados y municipios

La semilla `scripts/seeds/catalogos-geograficos.ts` lee `db/estados.json` y `db/municipios.json` en UTF-8. Convierte los IDs de texto a enteros, conserva los IDs originales y relaciona cada municipio mediante `estado_id` → `estadoId`.

Con las migraciones aplicadas (incluida la que permite `clave = NULL`), el cliente de Prisma generado y las variables de MySQL configuradas en `.env`, ejecuta desde `backend/`:

```bash
npm run seed:geografia
```

Para comprobar únicamente los archivos, sin abrir la conexión a MySQL:

```bash
npm run seed:geografia -- --validar
```

La validación detecta JSON inválido, IDs duplicados o fuera del rango de `Int`, nombres vacíos o demasiado largos y municipios que referencian estados ausentes del catálogo. Los archivos actuales contienen 32 estados y 2,458 municipios.

La importación crea primero los estados y después los municipios, mediante inserciones por catálogo dentro de una sola transacción. Se puede repetir: los IDs existentes conservan sus nombres, claves y demás datos; solo se crean los ausentes, con `clave: null`. No elimina registros que falten del JSON. Si un municipio existente pertenece a otro estado distinto al indicado en el archivo, se cancela la carga para no reasignarlo silenciosamente.

El resultado indica registros del archivo, creados y existentes por catálogo. Un error cancela la transacción y el proceso termina con código distinto de cero. La conexión se cierra al finalizar; no se necesita Redis para ejecutar esta semilla.

## Usuarios iniciales

Los scripts de datos iniciales están en `scripts/seeds/`, separados de las migraciones del esquema de Prisma. Con las migraciones aplicadas, el cliente generado y las variables de conexión configuradas en `.env`, ejecuta desde `backend/`:

```bash
npm run seed:usuarios
```

El script `scripts/seeds/usuarios-iniciales.ts` crea estas dos cuentas activas, ambas con nombre `john` y apellido `doe`:

| Número de control | Rol |
| :--- | :--- |
| `16102026-1` | administrador |
| `16102026-2` | operador |

La contraseña inicial definida en el script se almacena como un hash generado con `bcryptjs` y 12 rondas. Cada cuenta recibe su propia sal. El módulo de autenticación la verifica con `bcrypt.compare`.

La carga usa una transacción y puede repetirse: las cuentas se identifican por `numeroControl` y las existentes conservan sus datos, contraseña, rol y estado. El script no crea sucursales; el operador queda pendiente de asignación. No genera sesiones ni modifica las migraciones.

## Ejecutar y comprobar la plantilla

```bash
npm run start:dev
npm run typecheck
npm run build
npm run lint
npm run start:prod
```

La API de ejemplo escucha en el puerto 3000, salvo que se defina `PORT`. `libs/db.ts` configura la conexión mediante `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` y `DATABASE_NAME`. Los comandos de Prisma usan `DATABASE_URL`.

## Archivos fuente e imports

El alias `@backend/` parte de la raíz de `backend/` y se configura en `compilerOptions.paths` de `tsconfig.json`. Los imports internos de `src/`, `libs/`, `scripts/` y `test/` usan este alias sin extensión:

```ts
import { AppService } from '@backend/src/app.service';
import db from '@backend/libs/db';
import { RolUsuario } from '@backend/generated/prisma/enums';
```

`package.json` declara `"type": "commonjs"`. TypeScript usa `nodenext` para resolver los módulos y compila los imports a CommonJS. `main.ts` inicia la aplicación desde una función asíncrona, sin `await` en el nivel superior.

Nest resuelve los alias durante `build`, `start` y el modo de desarrollo. Las configuraciones de Vitest leen los mismos alias mediante `vite-tsconfig-paths`. Los scripts se ejecutan directamente con `tsx`, que lee los alias de `tsconfig.json`; `npm run seed:usuarios` ejecuta `scripts/seeds/usuarios-iniciales.ts`.

Para ejecutar otro script TypeScript con los alias, desde `backend/`:

```bash
npx tsx scripts/ruta-del-script.ts
```

La opción `paths` de TypeScript no reescribe por sí sola los imports emitidos: para compilar la aplicación usa `npm run build`, que aplica la resolución de Nest.

`tsconfig.json` tiene `noEmit: true`: `npm run typecheck` y `npx tsc` comprueban tipos sin generar archivos. `tsconfig.build.json` activa la emisión únicamente para la compilación de Nest y utiliza `rootDir: "."` y `outDir: "./dist"`. `noEmitOnError: true` impide emitir si existen errores de TypeScript.

El build produce `.js` para ejecutar en Node, `.js.map` para depuración y `.d.ts` para declaraciones de tipos. Estos archivos quedan dentro de `dist/`, que está ignorado por Git, y se regeneran al compilar. El punto de entrada de producción es `dist/src/main.js`.

Usa los comandos del proyecto: pasar un archivo directamente a `tsc`, por ejemplo `tsc libs/db.ts`, omite `tsconfig.json` y puede volver a emitir archivos junto al fuente.

Los archivos de `generated/prisma/` se generan desde el esquema; Prisma administra sus imports internos. Las configuraciones de Vitest usan `.mts`, que también es TypeScript y permite que esas herramientas carguen sus configuraciones como ESM.

## Fuentes de la configuración

- [NestJS: integración con Prisma](https://docs.nestjs.com/data/prisma)
- [TypeScript: alias mediante paths](https://www.typescriptlang.org/tsconfig/paths.html)
- [tsx: ejecución de TypeScript](https://github.com/privatenumber/tsx)
- [NestJS 12: requisitos de Node.js](https://docs.nestjs.com/migration-guide#nodejs-requirements)
- [Prisma ORM 7: MySQL y MariaDB](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Prisma ORM 7: requisitos del sistema](https://www.prisma.io/docs/orm/v7/reference/system-requirements)
