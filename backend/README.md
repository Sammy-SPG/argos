# Backend de Argos

API de Argos basada en NestJS 12 y TypeScript. La persistencia usa Prisma ORM 7 con el proveedor `mysql`, compatible con MySQL y MariaDB. `AppService` utiliza el cliente de `libs/db.ts` para consultar usuarios.

## Configuración realizada

1. Se generó la plantilla NestJS en `backend/` con el nombre de paquete `argos-backend` (equivalente a ejecutar `nest new argos-backend --directory backend --language ts --skip-git` desde la raíz del repositorio). Se escribe en TypeScript y actualmente se compila a CommonJS para permitir imports relativos sin extensión.
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

El esquema vigente está basado en `docs/Argos-Apex.png`; aún no hay autenticación ni endpoints de usuarios implementados. Los nombres y campos vigentes son los de `prisma/schema.prisma`.

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
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

Para crear una migración nueva durante el desarrollo, edita `prisma/schema.prisma` y ejecuta `npx prisma migrate dev --name nombre_del_cambio`. Confirma en Git tanto el esquema como los archivos de la nueva migración. `generated/prisma/`, `dist/` y `.env` quedan fuera del repositorio; el cliente debe generarse también en una instalación nueva o en CI.

## Ejecutar y comprobar la plantilla

```bash
npm run start:dev
npm run typecheck
npm run build
npm test
npm run start:prod
```

La API de ejemplo escucha en el puerto 3000, salvo que se defina `PORT`. `libs/db.ts` configura la conexión mediante `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` y `DATABASE_NAME`. Los comandos de Prisma usan `DATABASE_URL`.

## Archivos fuente e imports

El código de aplicación se crea y edita en archivos `.ts` dentro de `src/` y `libs/`. Los imports relativos se escriben sin extensión:

```ts
import { AppService } from './app.service';
import db from '../libs/db';
```

`package.json` declara `"type": "commonjs"`. TypeScript usa `nodenext` para resolver los módulos y compila los imports a CommonJS. `main.ts` inicia la aplicación desde una función asíncrona, sin `await` en el nivel superior.

`tsconfig.json` tiene `noEmit: true`: `npm run typecheck` y `npx tsc` comprueban tipos sin generar archivos. `tsconfig.build.json` activa la emisión únicamente para la compilación de Nest y utiliza `rootDir: "."` y `outDir: "./dist"`. `noEmitOnError: true` impide emitir si existen errores de TypeScript.

El build produce `.js` para ejecutar en Node, `.js.map` para depuración y `.d.ts` para declaraciones de tipos. Estos archivos quedan dentro de `dist/`, que está ignorado por Git, y se regeneran al compilar. El punto de entrada de producción es `dist/src/main.js`.

Usa los comandos del proyecto: pasar un archivo directamente a `tsc`, por ejemplo `tsc libs/db.ts`, omite `tsconfig.json` y puede volver a emitir archivos junto al fuente.

Los archivos de `generated/prisma/` se generan desde el esquema; Prisma administra sus imports internos. Las configuraciones de Vitest usan `.mts`, que también es TypeScript y permite que esas herramientas carguen sus configuraciones como ESM.

## Fuentes de la configuración

- [NestJS: integración con Prisma](https://docs.nestjs.com/data/prisma)
- [NestJS 12: requisitos de Node.js](https://docs.nestjs.com/migration-guide#nodejs-requirements)
- [Prisma ORM 7: MySQL y MariaDB](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Prisma ORM 7: requisitos del sistema](https://www.prisma.io/docs/orm/v7/reference/system-requirements)
