# Redis del backend de Argos

Redis queda configurado como almacenamiento compartido de caché para el backend. El primer consumidor previsto es la autorización: conservar temporalmente los permisos de cada usuario y eliminarlos de caché cuando cambien.

Esta configuración incorpora la conexión, operaciones JSON con TTL, un servicio local en Docker Compose y una comprobación de integración. La [matriz de roles y permisos](../autorizacion/README.md) está documentada como propuesta revisable; el servicio de permisos y el decorador `@RequierePermiso(...)` todavía no están implementados. Actualmente ninguna solicitud consulta permisos mediante Redis.

## Arquitectura y acceso privado en producción

Redis es un servicio de infraestructura, comparable en este sentido al servidor MySQL: corre en su propio proceso y recibe conexiones en un puerto. `RedisService` es el cliente dentro de NestJS que se conecta a ese proceso. Levantarlo en un contenedor no convierte el backend en una arquitectura de microservicios de negocio.

La API puede escuchar, por ejemplo, en el puerto 3000 y Redis en el 6379 del mismo servidor. Los clientes web, Android o Windows hablan con la API; la API consulta Redis por una conexión privada. Redis utiliza su propio protocolo, no endpoints HTTP de nuestra API.

La dirección del backend para Redis depende de dónde se ejecute cada proceso:

| Despliegue | Dirección de Redis desde el backend | Acceso al puerto |
| --- | --- | --- |
| Backend directamente en el servidor y Redis en Docker, en ese mismo servidor | `redis://127.0.0.1:6379/0` | El mapeo actual publica Redis solo en el loopback del servidor. |
| Backend y Redis en contenedores que comparten una red de Docker | `redis://redis:6379/0` | Se comunican por el nombre del servicio; se puede omitir `ports` en Redis. |
| Redis en otro servidor | IP o nombre DNS de su red privada | Se configura conectividad privada entre ambos servidores. |

`127.0.0.1` siempre apunta al entorno de red del proceso que se conecta. Desde el contenedor del backend, apunta a ese mismo contenedor. Para alcanzar otro contenedor en una red compartida se usa su nombre, como `redis`.

Por tanto, sí podemos conservar `127.0.0.1` en producción si el backend se ejecuta directamente en el mismo servidor donde Docker publica Redis en loopback. Redis no necesita un dominio público, una ruta de Nginx ni un puerto abierto a Internet. Docker permite distinguir el puerto publicado en el servidor del puerto utilizado entre contenedores. Consulta [redes de Compose](https://docs.docker.com/compose/how-tos/networking/) y [publicación de puertos](https://docs.docker.com/engine/network/port-publishing/).

## Archivos y decisiones

| Archivo | Responsabilidad |
| --- | --- |
| `../../compose.redis.yaml` | Servicio local Redis 8 Alpine con contraseña, comprobación de salud y puerto publicado solo en `127.0.0.1`. |
| `redis.config.ts` | Validación de URL, credenciales, prefijo, TTL y tiempos límite. |
| `redis.module.ts` | Registrar y exportar el servicio; carga `.env` y comparte una instancia por aplicación NestJS. |
| `redis.service.ts` | Abrir y cerrar la conexión, recuperar desconexiones y ejecutar las operaciones de caché. |
| `../../scripts/comprobar-redis.ts` | Comprobar el módulo contra Redis sin cargar Prisma ni autenticación. |
| `redis.config.spec.ts` | Pruebas de configuración inválida, credenciales, aislamiento por entorno y vencimientos. |

Se instaló el cliente oficial `redis` mediante `npm install redis`. La versión instalada inicialmente es 6.3.1; `package-lock.json` registra la versión resuelta y sus dependencias. Se utiliza directamente desde un servicio NestJS para controlar las claves, el vencimiento y la invalidación explícita.

`AppModule` importa `RedisModule`. Además, `main.ts` activa `enableShutdownHooks()` para cerrar la conexión al detener la aplicación con `SIGINT` o `SIGTERM`.

## Preparación local

Requisitos: Docker con el daemon iniciado, Docker Compose y las dependencias del backend instaladas mediante `npm ci`.

Todos los comandos de este documento se ejecutan desde `backend/`.

1. Si aún no existe `.env`, créalo a partir de `.env.example`. Si ya existe, agrega únicamente las variables `REDIS_*` del ejemplo y conserva tu configuración de MySQL y JWT.
2. Genera una contraseña local:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Guarda el resultado en `REDIS_PASSWORD` dentro de `.env`. Ese archivo está ignorado por Git. El contenedor y el backend utilizan la misma contraseña.
4. Levanta Redis y comprueba la integración:

   ```bash
   npm run redis:up
   npm run redis:check
   ```

5. Con MySQL y JWT también configurados, inicia el backend:

   ```bash
   npm run start:dev
   ```

En la configuración inicial de este proyecto se agregaron las variables de Redis al `.env` local y se generó una contraseña aleatoria de 32 bytes, sin mostrarla ni incorporarla a archivos versionados. No se modificaron las credenciales existentes de MySQL ni JWT.

## Variables de entorno

| Variable | Valor o requisito | Uso |
| --- | --- | --- |
| `REDIS_URL` | Obligatoria; ejemplo: `redis://127.0.0.1:6379/0` | Host, puerto, base lógica y protocolo. Acepta `rediss://` para TLS y credenciales en la URL. |
| `REDIS_PASSWORD` | Obligatoria para el Compose local; el cliente también admite la contraseña dentro de `REDIS_URL` | Contraseña del servidor. Si se define, prevalece sobre la contraseña de la URL. |
| `REDIS_KEY_PREFIX` | Por defecto `argos:${NODE_ENV}:v1`; usa `development` cuando falta `NODE_ENV` | Separa las claves por aplicación, entorno y versión de formato. El `.env.example` fija `argos:development:v1`. |
| `REDIS_TTL_SECONDS` | `3600` | Vencimiento predeterminado de las escrituras, en segundos: una hora. |
| `REDIS_CONNECT_TIMEOUT_MS` | `5000` | Tiempo límite para establecer la conexión, en milisegundos. |
| `REDIS_COMMAND_TIMEOUT_MS` | `2000` | Tiempo límite para ejecutar cada comando, en milisegundos. |
| `REDIS_LOCAL_PORT` | `6379` | Puerto que Docker publica en el equipo. Si cambia, ajusta también el puerto en `REDIS_URL`. |

Los tiempos y el TTL deben ser enteros positivos. Un TTL de cero se rechaza para evitar entradas sin vencimiento. Los prefijos aceptan letras sin acentos, números, guiones y guiones bajos, agrupados con dos puntos.

Para otros entornos, configura explícitamente un prefijo distinto, por ejemplo `argos:production:v1`. Las instancias del mismo entorno deben utilizar el mismo servidor Redis, base lógica y prefijo para compartir las invalidaciones.

Si utilizas un Redis externo, configura su URL y credenciales; no necesitas levantar el contenedor local. Para conexiones TLS utiliza `rediss://` y conserva la validación del certificado del servidor.

## Servicio local de Docker

`compose.redis.yaml` define:

- Imagen oficial `redis:8-alpine`. La etiqueta sigue las actualizaciones de Redis 8; no fija un digest.
- Autenticación mediante `REDIS_PASSWORD`; Compose rechaza una contraseña vacía.
- Puerto publicado exclusivamente en `127.0.0.1`, para clientes que se ejecutan en el equipo.
- Comprobación de salud con `PING` autenticado; `redis:up` espera a que el servicio esté disponible.
- Límite de datos de 128 MB y política `allkeys-lru`: Redis puede descartar claves cuando se alcanza el límite.
- Persistencia RDB y AOF desactivada y directorio `/data` temporal. Las claves pueden perderse al detener o recrear el contenedor.
- Reinicio automático mediante `unless-stopped` y proceso ejecutado como el usuario `redis` de la imagen.

La caché es reconstruible; MySQL continuará siendo la fuente de los permisos cuando se implemente el servicio de autorización. La configuración local usa Redis para caché y no está preparada para almacenar colas, sesiones u otros datos que necesiten persistencia.

### Estructura general

| Sección | Significado en este archivo |
| --- | --- |
| `name: argos-backend` | Nombre del proyecto de Compose, utilizado para agrupar los recursos creados. |
| `services.redis` | Servicio llamado `redis`; este nombre también permite encontrarlo desde contenedores de la misma red. |
| `image` | Software que Docker descarga y ejecuta: Redis 8 sobre Alpine Linux. |
| `restart: unless-stopped` | Reinicia un contenedor que termina, salvo que se haya detenido manualmente. |
| `user: redis` | Ejecuta el proceso con la cuenta Linux `redis` de la imagen; no corresponde a un usuario de Argos. |

### `ports`: dirección y puertos

```yaml
ports:
  - '127.0.0.1:${REDIS_LOCAL_PORT:-6379}:6379'
```

Se lee como `dirección del servidor:puerto del servidor:puerto del contenedor`:

- `127.0.0.1` limita la publicación al loopback del servidor.
- `${REDIS_LOCAL_PORT:-6379}` utiliza el puerto configurado o 6379 si la variable falta o está vacía.
- El último `6379` es el puerto en el que Redis escucha dentro del contenedor.

Cambiar `REDIS_LOCAL_PORT` cambia el puerto del equipo; Redis sigue escuchando en 6379 dentro del contenedor.

### `environment`: contraseña disponible dentro del contenedor

```yaml
environment:
  REDIS_PASSWORD: ${REDIS_PASSWORD:?Configura REDIS_PASSWORD en backend/.env}
```

Compose obtiene el valor del entorno o del `.env` del proyecto y lo entrega al contenedor. La expresión `:?` detiene la configuración si la variable falta o está vacía. Esta sección entrega la contraseña al proceso; el argumento `--requirepass` de `command` es el que configura la autenticación del servidor Redis.

### `command`: cómo se inicia Redis

Esta sección reemplaza el comando predeterminado de la imagen y ejecuta Redis con nuestras opciones:

```yaml
command:
  - /bin/sh
  - -ec
  - |
    exec redis-server \
      --requirepass "$$REDIS_PASSWORD" \
      --save "" \
      --appendonly no \
      --maxmemory 128mb \
      --maxmemory-policy allkeys-lru
```

La lista representa un comando con sus argumentos:

- `/bin/sh` ejecuta el intérprete de comandos del contenedor, necesario para expandir la variable de contraseña.
- `-ec` combina `-e`, que hace salir al intérprete si falla un comando simple en este bloque, y `-c`, que indica que el siguiente argumento es el texto a ejecutar.
- `|` pertenece a YAML: conserva el bloque siguiente como un texto de varias líneas. Las barras `\` permiten continuar el mismo comando de shell en la línea siguiente.
- `exec redis-server` reemplaza el intérprete por el proceso de Redis, que recibe directamente las señales de parada del contenedor.

En `"$$REDIS_PASSWORD"`, el doble `$` evita que Compose sustituya la variable en esa etapa. Compose conserva un `$` y, al ejecutar el comando dentro del contenedor, `/bin/sh` obtiene el valor de `REDIS_PASSWORD` que recibió mediante `environment`. Las comillas conservan la contraseña como un único argumento. Esta sintaxis se explica en [interpolación de Compose](https://docs.docker.com/reference/compose-file/interpolation/).

Cada opción tiene un propósito:

| Opción | Efecto |
| --- | --- |
| `--requirepass "$$REDIS_PASSWORD"` | Exige esa contraseña a los clientes de Redis. El backend utiliza la misma credencial. |
| `--save ""` | Desactiva las reglas automáticas de snapshots RDB, que son copias del contenido a disco. |
| `--appendonly no` | Desactiva AOF, el archivo que registra escrituras para recuperarlas al reiniciar. |
| `--maxmemory 128mb` | Establece el umbral de memoria administrada por Redis a partir del que aplica la política de expulsión. No es un límite total de memoria del contenedor. |
| `--maxmemory-policy allkeys-lru` | Al necesitar liberar memoria, permite descartar claves y prioriza las utilizadas menos recientemente. |

Elegimos estas opciones porque los permisos almacenados serán una copia temporal de MySQL. Una clave puede desaparecer antes de cumplir su TTL si Redis necesita liberar memoria; el futuro servicio de permisos deberá poder volver a cargarla. Más información: [persistencia de Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) y [expulsión de claves](https://redis.io/docs/latest/develop/reference/eviction/).

### `tmpfs`: directorio temporal

```yaml
tmpfs:
  - /data:uid=999,gid=1000
```

Monta `/data` como un directorio temporal en memoria. `uid` y `gid` definen su propietario y grupo con los identificadores usados por la cuenta `redis` de esta imagen. No se utiliza un volumen persistente del equipo para conservar archivos de Redis. Consulta [montajes tmpfs de Docker](https://docs.docker.com/engine/storage/tmpfs/).

### `healthcheck`: comprobar que Redis responde

La comprobación ejecuta dentro del contenedor:

```sh
REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -qx PONG
```

`REDISCLI_AUTH` entrega la contraseña al cliente de consola `redis-cli`. El comando `ping` debe responder `PONG`; `grep -qx` comprueba esa respuesta exacta sin imprimirla. El YAML usa `$$REDIS_PASSWORD` para que la variable se resuelva dentro del contenedor, igual que en `command`.

La comprobación se ejecuta con `CMD-SHELL`. `interval: 5s` fija la separación entre comprobaciones, `timeout: 3s` limita cada ejecución y `retries: 5` marca el contenedor como no saludable tras cinco fallos consecutivos. `start_period: 5s` da un margen inicial durante el cual los fallos no cuentan para ese límite. El comportamiento se detalla en la [referencia de HEALTHCHECK](https://docs.docker.com/reference/dockerfile/#healthcheck).

`redis:up` utiliza `--wait` para esperar a que el servicio esté saludable. El estado no saludable sirve para diagnosticar; por sí solo no provoca un reinicio mediante `restart`.

### Comandos disponibles

```bash
npm run redis:up
npm run redis:check
npm run redis:logs
npm run redis:down
```

Para ver el estado sin seguir los logs:

```bash
docker compose -f compose.redis.yaml ps
```

## Uso desde otros módulos

El módulo consumidor debe importar `RedisModule` e inyectar `RedisService`. Las importaciones del mismo módulo comparten su instancia y conexión; no se crea un cliente por solicitud.

Las operaciones disponibles son:

| Método | Comportamiento |
| --- | --- |
| `ping()` | Devuelve `PONG` si Redis responde. |
| `guardarJson(clave, valor, ttlSegundos?)` | Serializa el valor y lo guarda mediante `SET ... EX`; aplica una hora por defecto. |
| `obtenerJson(clave)` | Devuelve el JSON como `unknown`, o `null` si la clave no existe. El consumidor debe validar su estructura. |
| `eliminar(clave)` | Elimina únicamente la clave indicada y permite invalidar una entrada. |
| `obtenerTtl(clave)` | Devuelve los segundos restantes; Redis devuelve `-2` si la clave no existe y `-1` si no tiene vencimiento. |

Ejemplo de uso previsto para permisos, una vez implementado ese módulo:

```ts
const clave = `permisos:usuario:${usuarioId}`;
await redis.guardarJson(clave, permisos);
const contenido = await redis.obtenerJson(clave);
await redis.eliminar(clave);
```

Con el prefijo local, la clave final sería `argos:development:v1:permisos:usuario:25`. El servicio agrega el prefijo automáticamente en todas sus operaciones.

Una lista vacía `[]` se conserva como valor válido; es diferente de una clave inexistente. Los errores de conexión y el JSON inválido se propagan: no se convierten silenciosamente en permisos ni en autorizaciones concedidas.

## Conexión, fallos e invalidación

- Durante el arranque, NestJS espera la conexión. Si Redis no responde o rechaza las credenciales, la aplicación falla antes de escuchar solicitudes.
- Después de conectar, el cliente intenta recuperar desconexiones con una espera creciente de hasta tres segundos entre intentos.
- Los comandos tienen un tiempo límite y la cola de comandos durante desconexiones está deshabilitada. Un comando fallido debe gestionarse desde su consumidor.
- Los logs de conexión no incluyen la URL ni la contraseña.
- Al cerrar la aplicación se cierra la conexión. Si está desconectada y reintentando, se destruye el cliente para detener los reintentos.

La hora de TTL limita la antigüedad de una entrada; no sustituye la invalidación. El futuro servicio de permisos deberá eliminar la clave del usuario al confirmar cambios de permisos, rol o asignaciones. También deberá definir cómo resolver lecturas y cambios concurrentes y cómo proceder si Redis falla, conservando MySQL como fuente y sin conceder acceso por un error de caché.

La validación actual de sesión continúa consultando su estado en MySQL. Esta configuración no guarda sesiones ni decisiones de acceso a recursos en Redis.

## Comprobaciones

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run redis:check
```

`redis:check` abre el módulo real de NestJS y comprueba `PING`, lectura y escritura JSON, TTL positivo, eliminación y expiración de una entrada de un segundo. Utiliza una clave aleatoria `diagnostico:<uuid>`, la elimina al terminar y cierra el contexto. No necesita MySQL ni las variables JWT, y no modifica permisos de usuarios.

Las pruebas de configuración pueden ejecutarse sin un servidor Redis. La comprobación de integración sí necesita que Redis esté iniciado y sus variables estén configuradas.

Validación realizada durante esta configuración:

- Las 10 pruebas de configuración pasaron, al igual que TypeScript, lint y compilación.
- El contenedor quedó saludable y publicó únicamente `127.0.0.1:6379`. La imagen descargada reportó Redis 8.10.3.
- La comprobación real `redis:check` pasó, incluida la expiración de claves.
- Una conexión sin credenciales recibió `NOAUTH Authentication required`.
- El backend compilado inició en un puerto local temporal, respondió `401` a `/auth/me` sin sesión y `400` a un inicio de sesión con cuerpo inválido, y cerró correctamente. Esta prueba no consultó ni modificó datos de MySQL.

## Problemas frecuentes

- **Docker indica permiso denegado:** comprueba que tu usuario tenga acceso al daemon de Docker según la instalación de tu equipo.
- **El puerto 6379 está ocupado:** utiliza otro `REDIS_LOCAL_PORT` y actualiza `REDIS_URL` con ese mismo puerto.
- **Falla la autenticación:** revisa que cliente y servidor usen la misma contraseña. Si cambiaste la del contenedor, ejecuta nuevamente `npm run redis:up` y reinicia el backend para cargar el nuevo entorno.
- **Redis pierde claves:** el servicio local no tiene persistencia; también pueden vencer por TTL o descartarse por el límite de memoria.
- **Un cambio directo en MySQL no se refleja en caché:** una vez implementada la autorización, los cambios deberán pasar por el servicio que invalide las entradas o acompañarse de invalidación explícita.

## Fuentes

- [Redis: conexión con el cliente oficial de Node.js](https://redis.io/docs/latest/develop/clients/nodejs/connect/)
- [Redis: reconexión, tiempos límite y cola de comandos](https://redis.io/docs/latest/develop/clients/nodejs/produsage/)
- [Redis: ejecutar el servidor con Docker](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/)
- [Redis: SET y expiración mediante EX](https://redis.io/docs/latest/commands/set/)
- [NestJS: ciclo de vida y cierre de conexiones](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Docker: definición de servicios y command](https://docs.docker.com/reference/compose-file/services/#command)
- [Docker: interpolación de variables y escape con $$](https://docs.docker.com/reference/compose-file/interpolation/)
- [Docker: redes compartidas de Compose](https://docs.docker.com/compose/how-tos/networking/)
- [Docker: publicación de puertos](https://docs.docker.com/engine/network/port-publishing/)
