# Backend de Argos

API de Argos basada en NestJS 12 y TypeScript. La configuración inicial de persistencia usa Prisma ORM 7 con el proveedor `mysql`, compatible con MySQL y MariaDB. Por ahora NestJS conserva el controlador de ejemplo: el cliente Prisma todavía no está conectado a un módulo o servicio de la aplicación.

## Configuración realizada

1. Se generó la plantilla NestJS en `backend/` con el nombre de paquete `argos-backend` (equivalente a ejecutar `nest new argos-backend --directory backend --language ts --skip-git` desde la raíz del repositorio). La plantilla usa TypeScript y módulos ESM.
2. Se instalaron `prisma@7` y `dotenv` como dependencias de desarrollo, y `@prisma/client@7` y `@prisma/adapter-mariadb` como dependencias de la aplicación. Las versiones exactas quedan registradas en `package-lock.json`.
3. Se inicializó Prisma con `npx prisma init --datasource-provider mysql --output ../generated/prisma`. El esquema está en `prisma/schema.prisma` y el cliente generado queda en `generated/prisma/`.
4. En el generador del esquema se configuró `moduleFormat = "cjs"`. Esta opción se conserva como parte de la configuración probada; la plantilla NestJS usa ESM, por lo que habrá que revisar el formato y la ruta del cliente cuando se integre en el código de la API.
5. `prisma7.config.ts` carga `.env` mediante `dotenv/config`, lee `DATABASE_URL` y define la ruta de las migraciones.
6. Se creó el modelo inicial `Usuario`, con los enumerados `EstadoUsuario` y `RolUsuario`. La primera migración está en `prisma/migrations/20260928232758_init/` y crea la tabla `usuario`. La migración se aplicó a la base de datos configurada durante la configuración inicial.

Los comandos de instalación e inicialización correspondientes, ejecutados desde `backend/`, son:

```bash
npm install prisma@7 dotenv --save-dev
npm install @prisma/client@7 @prisma/adapter-mariadb
npx prisma init --datasource-provider mysql --output ../generated/prisma
```

El modelo `Usuario` es una primera prueba del esquema; aún no hay autenticación ni endpoints de usuarios implementados. Los nombres y campos vigentes son los de `prisma/schema.prisma`.

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
npm run build
npm test
```

La API de ejemplo escucha en el puerto 3000, salvo que se defina `PORT`. La conexión a la base de datos desde NestJS queda pendiente: por ahora, los comandos de Prisma son los que usan `DATABASE_URL`.

## Fuentes de la configuración

- [NestJS: integración con Prisma](https://docs.nestjs.com/data/prisma)
- [NestJS 12: requisitos de Node.js](https://docs.nestjs.com/migration-guide#nodejs-requirements)
- [Prisma ORM 7: MySQL y MariaDB](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Prisma ORM 7: requisitos del sistema](https://www.prisma.io/docs/orm/v7/reference/system-requirements)
