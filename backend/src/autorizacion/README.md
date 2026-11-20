# Matriz de permisos de Argos

**Estado: matriz definida en TypeScript con las decisiones del 19 de noviembre de 2026.** Los perfiles están en [matriz-permisos.ts](matriz-permisos.ts). Las propuestas pendientes se conservan por separado y no generan permisos efectivos. La semilla asigna los perfiles a `permiso_usuario`; `PermisosService`, los guards globales y `@RequierePermiso(...)` ya protegen las rutas implementadas. Los controladores de negocio permanecen previstos.

| Rol | Perfil propuesto |
| --- | --- |
| Administrador | Configurar y supervisar sucursales de forma global; crear y administrar administradores, gerentes y operadores, incluida su propia cuenta; atender eventos respetando la exclusividad del encargado. Los detalles de administración siguen pendientes en P2. |
| Gerente | Configurar y supervisar su sucursal y administrar únicamente a sus operadores; atender eventos de esa sucursal. No administra su propia cuenta. |
| Operador | Consultar todos los eventos de su sucursal, incluidos los atendidos, cerrados y en curso, y su contexto y video autorizado. Puede tomar un evento disponible y actuar sobre el que tenga a su cargo. No administra cuentas, incluida la propia, ni configuración. |

## Ubicación y fuentes

La configuración central vive en `backend/src/autorizacion/matriz-permisos.ts`, dentro del módulo de autorización. Este README explica los perfiles, sus condiciones y las decisiones. Al modificar un permiso se actualiza la configuración y su fila documental; ambas representaciones deben coincidir, incluidas las propuestas con asterisco. Las pruebas automatizadas se conservan solo de forma local y no se versionan.

Fuentes utilizadas:

- [Requerimientos funcionales y no funcionales](../../../docs/RF%20%26%20RNF.md): fuente de responsabilidades, actores y restricciones.
- [Esquema Prisma actual](../../prisma/schema.prisma): roles, acciones, alcances y relaciones disponibles.
- [Autenticación existente](../auth/README.md): identidad y contexto de sesión.
- [Redis](../redis/README.md): conexión y operaciones de caché disponibles.

Las definiciones del usuario del 19 de noviembre de 2026 complementan los RF y prevalecen en las decisiones P1, P2, P3, P5 y P6 registradas aquí. En particular, la consulta de historial por operadores y la creación y administración de administradores amplían los actores descritos en los RF originales. Ese documento y los diagramas deberán alinearse al consolidar las decisiones; no se modifican en este paso.

También se incorpora la organización por carpetas de negocio, el registro de dispositivos dentro de autenticación y la lectura de geografía para los tres roles, con municipios consultados obligatoriamente por estado.

Las referencias `RF-2.03`, por ejemplo, significan módulo 2, requisito 03 del documento original. Se conserva la numeración original, incluido el salto de RF-4.02 a RF-4.04.

## Cómo leer la matriz

| Valor | Significado |
| --- | --- |
| `G` | Permiso definido en el perfil con alcance `global`. |
| `A` | Permiso definido en el perfil con alcance `asignado`. |
| `—` | Sin permiso; no se crea una asignación para ese rol. |
| `G*` o `A*` | Propuesta pendiente, excluida del perfil efectivo y registrada en `PERMISOS_PENDIENTES`. El asterisco no es un valor del enum. |

`global` amplía el conjunto de recursos accesibles; no elimina las reglas de negocio. Un administrador también debe ser el encargado vigente para confirmar o resolver un evento.

`asignado` se resuelve según el recurso:

- **Sucursal y configuración:** la sucursal de `UsuarioSucursal`, o los registros que pertenecen a ella mediante sus relaciones. Actualmente cada usuario puede tener como máximo una sucursal asignada.
- **Eventos:** eventos de la sucursal autorizada; las decisiones exigen además la atención vigente correspondiente al usuario y su sesión.
- **Acuses personales:** notificaciones del propio destinatario y sesión. Este acceso personal no requiere tener una sucursal asignada. Los dispositivos se vinculan y desactivan dentro del flujo de autenticación, sin un permiso CRUD independiente.

Un usuario sin sucursal no obtiene acceso a datos de sucursales mediante un permiso `asignado`. La sucursal autorizada se obtiene del contexto validado y de las relaciones del recurso, nunca solo de un ID enviado por el cliente.

## Configuración disponible

| Exportación | Responsabilidad |
| --- | --- |
| `MATRIZ_PERMISOS` | Perfiles completos de administrador, gerente y operador, con arreglos y entradas inmutables. |
| `PERMISOS_PENDIENTES` | Propuestas por rol con el alcance sugerido y su motivo; no se incorporan a los perfiles. |
| `obtenerPermisosPorRol(rol)` | Obtener el perfil definido para generar sus asignaciones. Un rol desconocido recibe una lista vacía. |
| `obtenerAlcancePorRol(rol, modulo, accion)` | Obtener el alcance del perfil; devuelve `undefined` si el permiso no está definido para ese rol. |
| `ModuloPermiso` | Tipo de recursos conocidos, incluidos los que solo tienen propuestas pendientes, para el decorador. |

Ejemplo de consulta de la configuración actual:

```ts
import { RolUsuario } from '@backend/generated/prisma/enums';
import {
  obtenerAlcancePorRol,
  obtenerPermisosPorRol,
} from '@src/autorizacion/matriz-permisos';

const perfil = obtenerPermisosPorRol(RolUsuario.operador);
const consultaEvento = obtenerAlcancePorRol(RolUsuario.operador, 'evento', 'consultar'); // asignado
const edicionCuenta = obtenerAlcancePorRol(RolUsuario.operador, 'usuario', 'actualizar'); // undefined
```

Estas funciones solo consultan la política del rol en memoria; no abren conexiones ni escriben en MySQL o Redis. Obtener `asignado` no autoriza todavía un registro concreto: el servicio debe comprobar su sucursal, sesión, rol de la cuenta destinataria y encargado del evento, según corresponda. Por ejemplo, `usuario.actualizar` del gerente no le permite editar una cuenta de gerente, aunque sea la propia.

Al modificar la matriz se deben revisar las diferencias de acceso entre roles, la exclusión de propuestas pendientes y la coherencia con las tablas de este documento. Las rutas de diagnóstico permiten comprobar los permisos efectivos de cada cuenta.

## Relación con el esquema y con los controladores

Se conservan los enums actuales:

```text
AccionPermisoUsuario: crear, listar, consultar, actualizar, eliminar
AlcancePermisoUsuario: global, asignado
```

`modulo` identifica el recurso de autorización. Puede haber varios recursos dentro del mismo módulo o controlador de NestJS: `sucursal` y `sucursal_estado`, por ejemplo. Estos nombres no requieren una tabla, un controlador ni un módulo NestJS independiente por cada uno.

Las carpetas organizan el código por dominio: por ejemplo, `usuario/` contiene las operaciones protegidas por `usuario_operador.crear`, `usuario_gerente.crear` y `usuario_administrador.crear`. `geografia/` contiene la lectura protegida por `estado.listar` y `municipio.listar`. El nombre del permiso no impone el nombre de una carpeta.

Para distinguir operaciones especiales sin modificar el enum, proponemos recursos específicos:

| Operación | Módulo del permiso | Acción |
| --- | --- | --- |
| Activar o desactivar una sucursal | `sucursal_estado` | `actualizar` |
| Desbloquear manualmente una cuenta | `usuario_desbloqueo` | `actualizar` |
| Tomar atención | `evento_atencion` | `crear` |
| Liberar la propia atención | `evento_atencion` | `actualizar` |
| Registrar confirmación | `evento_confirmacion` | `crear` |
| Registrar resolución | `evento_resolucion` | `crear` |
| Registrar descarte | `evento_descarte` | `crear` |

Así, actualizar datos generales no autoriza por sí mismo a desbloquear una cuenta o cambiar el estado de un evento. Esta nomenclatura también es parte de la propuesta revisable.

Ejemplos de uso del decorador en un futuro controlador de sucursales:

```ts
// GET /sucursales
@RequierePermiso('sucursal', 'listar')

// GET /sucursales/:id
@RequierePermiso('sucursal', 'consultar')

// PATCH /sucursales/:id
@RequierePermiso('sucursal', 'actualizar')

// PATCH /sucursales/:id/estado
@RequierePermiso('sucursal_estado', 'actualizar')
```

Las rutas son propuestas y el decorador aún no existe. El permiso se expresa como recurso y acción; el método HTTP y la ruta pertenecen al controlador. Cada servicio deberá aplicar el alcance y las condiciones de la operación.

## 1. Usuarios y permisos

### Acceso y operaciones de sesión

Estas operaciones tienen reglas propias y no dependen de una fila CRUD en `permiso_usuario`:

| Operación | Quién puede ejecutarla | Condición | Referencias |
| --- | --- | --- | --- |
| Iniciar sesión | Cuenta registrada | Credenciales válidas, cuenta activa, sin bloqueo y sin otra sesión vigente. Si ya tiene una sesión activa, rechazar el nuevo acceso y conservar la anterior. | RF-1.01; definición P6 |
| Consultar la propia sesión (`GET /auth/me`) | Usuario autenticado | Solo la sesión presentada; soporte de la autenticación existente. | RF-1.01 |
| Cerrar la propia sesión | Usuario autenticado | Solo la sesión presentada. Retirar sus destinos y liberar su atención forma parte del cierre, sin pedir permisos adicionales. | RF-1.02 |
| Registrar o renovar el destino de avisos | Flujo de autenticación | Vincular el destino enviado por la aplicación a su usuario y sesión, conservando un solo destino activo. Sin permiso CRUD independiente. | RF-5.01; definición P6 |
| Bloquear por fallos y finalizar el bloqueo al vencer | Sistema | Aplicar intentos y plazos definidos; no es una operación pública de administración. | RF-1.10, RF-1.11 |
| Autorizar solicitudes | Backend | Evaluar rol, permiso asignado, alcance y restricciones del recurso. | RF-1.14; RNF Seguridad 01 y 03 |

El inicio de sesión es la excepción pública que valida credenciales. La consulta y el cierre de sesión requieren autenticación incluso si el usuario no tiene permisos administrativos.

### Una sola sesión activa por usuario

Decisión confirmada en P6: cada usuario tendrá como máximo una sesión activa, independientemente de que acceda desde Android, Windows u otro dispositivo. Si intenta iniciar una segunda sesión con credenciales válidas, se rechaza ese nuevo acceso; la sesión anterior y su atención en curso permanecen vigentes. La implementación responde `409 Conflict` con un mensaje que indique que ya existe una sesión activa.

`AuthService.iniciarSesion()` comprueba las sesiones y crea la nueva dentro de la misma transacción que bloquea la fila `usuario`. Esto serializa inicios simultáneos para una cuenta, también entre distintas instancias de la API. La regla se garantiza por ese flujo de aplicación; `SesionUsuario` todavía no incorpora una restricción adicional de unicidad para sesiones activas.

Una sesión está activa cuando no ha finalizado y su vencimiento es posterior al momento de la comprobación. Antes de admitir otra deben finalizarse las sesiones vencidas y realizar su limpieza de dispositivos y atenciones, conservando el historial. También habrá que definir el refuerzo de unicidad en la base de datos; no se debe hacer único `usuarioId` por sí solo, porque impediría conservar sesiones históricas.

Además, se mantendrá un solo destino activo de avisos por sesión. Una única sesión no basta si permite registrar varios destinos activos: el modelo actual conserva una lista de dispositivos y puede almacenar tanto registros activos como históricos. Registrar o renovar el destino deberá conservar uno activo y desactivar el anterior dentro de una operación atómica.

### Administración de cuentas

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `usuario_operador` | `crear` | G | A | — | Crear únicamente una cuenta de rol operador; el gerente usa su propia sucursal. | RF-1.03 |
| `usuario_gerente` | `crear` | G | — | — | Crear gerente y vincularlo a una sucursal válida. | RF-1.04 |
| `usuario_administrador` | `crear` | G | — | — | Crear otra cuenta de administrador. | Definición P2, 2026-11-19 |
| `usuario` | `listar` | G | A | — | El gerente lista solo operadores de su sucursal; incluye filtros de nombre, identificador y estado. | RF-1.05 |
| `usuario` | `consultar` | G | A | — | Administrador: los tres roles e identidad propia. Gerente: solo operadores de su sucursal. | RF-1.06; definición P2 |
| `usuario` | `actualizar` | G | A | — | Modificar identificación y nombre de cuentas administrables; el administrador puede editar esos datos de su propia cuenta. Excluir rol, sucursal, contraseña y estado. | RF-1.07; definición P2 |
| `usuario_estado` | `actualizar` | G | A | — | Desactivar o reactivar cuentas administrables; gerente solo sobre operadores de su sucursal. La desactivación invalida acceso y libera atención activa. La autodesactivación no se da por definida en P2. | RF-1.08, RF-1.09; definición P2 |
| `usuario_desbloqueo` | `actualizar` | G | A | — | Finalizar bloqueo vigente con motivo y actor; gerente solo sobre operadores de su sucursal. | RF-1.12; definición P2 |
| `usuario_sucursal` | `actualizar` | G | — | — | Reasignar un operador o gerente a una sucursal válida; conservar una sola asignación. | RF-1.13 |

Según la aclaración de P2, el administrador puede crear y administrar a los tres roles y administrar su propia cuenta. El gerente solo administra operadores de su sucursal y no su propia cuenta. El operador no administra ninguna cuenta, incluida la propia. P2 se conserva pendiente para detallar las operaciones concretas, como contraseñas, cambios de rol o autodesactivación; estas operaciones no se añaden por inferencia.

Consultar la sesión presentada mediante `/auth/me` y cerrar sesión sigue disponible para los tres roles. Esas operaciones de autenticación no permiten editar la cuenta ni contradicen la restricción de administración propia.

P3 queda resuelto: los permisos se asignan automáticamente según el rol, sin edición individual ni interfaz o endpoints para modificarlos en esta etapa. `PermisoUsuario` permite conservar la base para una futura personalización, pero por ahora no se ofrecen perfiles particulares por usuario. El cambio de rol es una operación distinta que sigue sin definirse en P2.

## 2. Sucursales y operación

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `sucursal` | `crear` | G | — | — | Registrar sucursal y ubicación. | RF-2.01 |
| `sucursal` | `listar` | G | — | — | Listar sucursales y filtrar por nombre y estado. El gerente obtiene directamente su sucursal por ID. | RF-2.02 |
| `sucursal` | `consultar` | G | A | — | Consultar detalle y contexto administrativo de la sucursal autorizada. | RF-2.03 |
| `sucursal` | `actualizar` | G | A | — | Modificar nombre y datos locales; excluir estado administrativo, identificadores e historial. | RF-2.04 |
| `sucursal_estado` | `actualizar` | G | — | — | Activar o desactivar; advertir eventos abiertos y conservar el historial. | RF-2.05 |
| `horario_sucursal` | `consultar` | G* | A* | — | Leer la configuración necesaria para editar el horario. | RF-2.03, RF-2.06; derivado |
| `horario_sucursal` | `actualizar` | G | A | — | Configurar el horario semanal y días no laborables; validar con la zona horaria de la sucursal. | RF-2.06 |
| `descanso_sucursal` | `consultar` | G | A | — | Consultar descansos recurrentes definidos por día y mes para la sucursal autorizada. | RF-2.06; definición P5 |
| `descanso_sucursal` | `actualizar` | G | A | — | Mantener las fechas de descanso, que prevalecen sobre el horario semanal. | RF-2.06; definición P5 |
| `contacto_sucursal` | `crear` | G | A | — | Registrar contacto de la sucursal autorizada. | RF-2.07 |
| `contacto_sucursal` | `listar` | G | A | — | Consultar el listado administrativo de contactos. | RF-2.08 |
| `contacto_sucursal` | `consultar` | G | A | — | Consultar un contacto del catálogo administrativo. | RF-2.08 |
| `contacto_sucursal` | `actualizar` | G | A | — | Corregir datos y asociaciones permitidas, manteniendo el alcance. | RF-2.09 |
| `contacto_sucursal` | `eliminar` | G | A | — | Retirar de uso operativo y advertir si deja un evento sin contacto pertinente. | RF-2.10 |

El operador obtiene los contactos pertinentes mediante el contexto del evento, sin acceso al catálogo administrativo completo. Retirar un contacto no autoriza a borrar decisiones o registros históricos de eventos.

### Descansos por fecha y horario semanal

P5 queda resuelto: `DescansoSucursal` identifica una fecha por `dia` y `mes`, sin año. Por ejemplo, `dia = 16` y `mes = 9` indica descanso el 16 de septiembre, aunque `HorarioSemanalSucursal` configure trabajo de lunes a viernes.

Al evaluar si una sucursal trabaja en una fecha, se utiliza su zona horaria y esta precedencia:

1. Si el día y mes coinciden con un descanso configurado, se considera día de descanso.
2. Si no hay descanso para esa fecha, se aplica el horario del día de la semana.

El descanso no elimina ni modifica el horario semanal; constituye una excepción al evaluarlo. Al no almacenar un año, la fecha se repite cada año en que exista ese día y mes.

RF-2.08 se interpreta por su función «Consultar contactos»; su texto repite la descripción de registrar. Esta discrepancia se conserva señalada para corregirla en el documento de requisitos cuando corresponda.

## 3. Arquitectura de monitoreo

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `particion` | `crear` | G | A | — | Asociar a una sucursal autorizada. | RF-3.01 |
| `particion` | `listar` | G | A | — | Listar particiones dentro del alcance. | RF-3.02 |
| `particion` | `consultar` | G | A | — | Obtener identificación, estado y zonas asociadas. | RF-3.02 |
| `particion` | `actualizar` | G | A | — | Corregir identificación y estado. | RF-3.03 |
| `zona` | `crear` | G | A | — | Asociar a sucursal; la partición es opcional y, si existe, debe ser de la misma sucursal. | RF-3.04 |
| `zona` | `listar` | G | A | — | Listar zonas de una sucursal o partición autorizada. | RF-3.05 |
| `zona` | `consultar` | G | A | — | Consultar detalle, sensores y cámaras configuradas. | RF-3.05 |
| `zona` | `actualizar` | G | A | — | Corregir datos y estado; validar cualquier asociación permitida. | RF-3.06 |
| `sensor` | `crear` | G | A | — | Registrar en una zona de la sucursal autorizada. | RF-3.07 |
| `sensor` | `listar` | G | A | — | Listar sensores de zonas autorizadas. | RF-3.08 |
| `sensor` | `consultar` | G | A | — | Consultar detalle de configuración del sensor. | RF-3.08 |
| `sensor` | `actualizar` | G | A | — | Corregir datos y los estados operativos descritos en el RF. | RF-3.09 |
| `camara` | `crear` | G | A | — | Registrar cámara en una zona autorizada. | RF-3.10 |
| `camara` | `listar` | G | A | — | Listar configuración de cámaras de zonas autorizadas. | RF-3.11 |
| `camara` | `consultar` | G | A | — | Consultar configuración de una cámara autorizada. | RF-3.11 |
| `camara` | `actualizar` | G | A | — | Corregir identificación, acceso, prioridad y estados operativos; la baja usa su permiso específico. | RF-3.12 |
| `camara` | `eliminar` | G | A | — | Dar de baja mediante el estado `eliminada`; no borrar físicamente la cámara ni su contexto histórico. | RF-3.12 |
| `camara_prueba` | `crear` | G | A | — | Solicitar una prueba de acceso a una cámara configurada dentro del alcance. | RF-3.13 |

Las consultas administrativas de configuración son distintas del acceso operativo al video. El operador podrá solicitar video contextual sin recibir el catálogo de cámaras ni sus credenciales internas.

No se concede eliminación de particiones, zonas o sensores: los RF describen configuración y cambios de estado, y no una operación de eliminación de esos recursos. Un valor del enum de estados en Prisma no concede por sí mismo una función administrativa.

## 4. Eventos y monitoreo

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `evento` | `listar` | G | A | A | Listado e historial con filtros; gerente y operador limitados a su sucursal. Incluye eventos atendidos, cerrados y en curso. | RF-4.12, RF-4.13; definición P1 |
| `evento` | `consultar` | G | A | A | Consultar detalle, cronología y decisión final dentro del alcance, en cualquier estado del evento. | RF-4.14; definición P1 |
| `evento_atencion` | `crear` | G | A | A | Tomar un evento atendible sin encargado; el usuario no debe tener otra atención vigente. | RF-4.07 |
| `evento_confirmacion` | `crear` | G | A | A | Ser encargado vigente del evento en atención; registrar actor, fecha y observación. | RF-4.08 |
| `evento_resolucion` | `crear` | G | A | A | Ser encargado vigente de un incidente confirmado; registrar resultado y cierre. | RF-4.09 |
| `evento_descarte` | `crear` | G | A | A | Ser encargado vigente de un evento en atención; motivo obligatorio. | RF-4.10 |
| `evento_atencion` | `actualizar` | G | A | A | Liberar únicamente la propia atención vigente; registrar finalización y dejarlo disponible. | RF-4.11 |

Condiciones comunes:

- Tomar, confirmar, resolver, descartar y liberar deben comprobar el estado y la atención actuales de forma atómica. Redis no sustituye estas comprobaciones.
- El alcance `global` no permite confirmar o cerrar un evento atendido por otra persona. No se concede una operación para forzar la toma o liberar atenciones ajenas.
- Al tomar un evento confirmado sin encargado, conserva su confirmación. Al perder o liberar su atención, también conserva ese estado.
- No se concede `evento.crear`, `evento.actualizar` ni `evento.eliminar` a personas. El registro proviene de una señal y las transiciones pasan por las operaciones específicas.
- P1 permite al operador listar y consultar todos los eventos de su sucursal, incluidos los cerrados y los atendidos por otra persona. Ese acceso es de lectura: no le permite modificar una atención ajena ni un evento cerrado.
- El operador conserva las acciones de atención: puede tomar un evento disponible de su sucursal y confirmar, resolver, descartar o liberar el que tenga a su cargo, cumpliendo el estado y la sesión exigidos. Consultar un evento no asigna su atención.
- El contexto operativo se obtiene mediante `contexto_evento.consultar`, descrito en el módulo 6.

### Toma simultánea del mismo evento

La asignación definitiva debe resolverse en MySQL dentro de una transacción. La caché Redis proporciona los permisos; el estado actual de sesión, evento y atención se comprueba en la base de datos al ejecutar la operación.

El esquema ya define en `AtencionEvento`:

```prisma
@@unique([eventoSucursalId, vigente])
@@unique([usuarioId, vigente])
```

Con `vigente = true` durante la atención y `vigente = null` al finalizar, estas restricciones permiten una atención vigente por evento y una por usuario, conservando múltiples registros históricos. Son una protección adicional; el método que realiza la toma todavía no está implementado.

Flujo propuesto para `evento_atencion.crear`:

1. Abrir una transacción y bloquear las filas que controlan al usuario, la sesión y el evento. Un orden propuesto es usuario → sesión → evento; los demás procesos que modifican esos recursos deben mantener un orden compatible.
2. Revalidar la sesión, el alcance y el estado del evento después de obtener los bloqueos. Confirmar que el evento admite atención, no tiene encargado y el usuario no atiende otro.
3. Crear la atención vigente, registrar el historial y actualizar el estado dentro de la misma transacción. Un pendiente pasa a `enAtencion`; un confirmado sin encargado conserva `confirmado`.
4. Confirmar la transacción y responder que la toma fue aceptada. Las comunicaciones posteriores a clientes y procesos de avisos se realizan después de confirmar.

Si dos usuarios intentan tomar el mismo evento, una solicitud obtiene primero su bloqueo. La otra espera y, al continuar, vuelve a comprobar el estado: si ya tiene encargado, responde `409 Conflict` («El evento ya está siendo atendido»). El bloqueo se mantiene hasta confirmar o revertir la transacción. Este comportamiento se apoya en [las lecturas con bloqueo de MySQL](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html).

La creación de atención, el cambio de estado y su historial deben confirmarse o revertirse juntos mediante una [transacción de Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions). Si una carrera alcanza las restricciones únicas, se debe tratar como conflicto de negocio, no como dos tomas exitosas. Los conflictos transitorios de transacción requieren una política de reintentos limitada.

Un doble clic o reintento del mismo usuario y sesión debe devolver la atención vigente que ya obtuvo para ese evento, sin crear otra ni repetir el historial de inicio. Deshabilitar el botón en el cliente ayuda a la interacción, pero la exclusividad se garantiza en el servidor y la base de datos.

Al implementar se deberán comprobar solicitudes concurrentes reales: dos usuarios para un evento; un usuario para dos eventos; reintento de la misma toma; y cierre de sesión mientras se intenta tomar un evento. No debe quedar una atención nueva asociada a una sesión ya finalizada.

### Procesamiento de señales y acciones automáticas

| Operación | Actor técnico | Regla | Referencias |
| --- | --- | --- | --- |
| Recibir señales | Emisor o receptor autorizado | Autenticación del contrato de integración, independiente de los tres roles humanos. El contrato sigue pendiente. | RF-4.01 |
| Normalizar la señal | Backend o adaptador | Procesar un mensaje aceptado y conservar el origen. | RF-4.02 |
| Vincular sucursal y zona | Backend | Validar relaciones y claves del contrato. | RF-4.04 |
| Clasificar | Backend | Aplicar reglas, horario y configuración vigente. | RF-4.05 |
| Registrar evento y controlar reenvíos | Backend | Conservar recepciones y deduplicar el evento operativo. | RF-4.06 |
| Abandonar atención por pérdida de sesión | Backend | Finalizar la atención y conservar el estado que corresponda. No requiere el permiso de liberación del usuario. | RF-4.11, RF-1.02 |

Estas tareas no se convierten en permisos de administrador, gerente u operador ni en endpoints públicos por aparecer en la matriz. Los puntos de entrada de integración necesitan su propia autenticación.

## 5. Notificaciones y escalamiento

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `notificacion_estado` | `actualizar` | A | A | A | La aplicación confirma recepción y apertura o interacción sobre un aviso del propio destinatario y sesión; estados de envío se gestionan por integración. | RF-5.06; definición P6 |
| `politica_escalamiento` | `consultar` | G* | A* | — | Leer la configuración necesaria para mantenerla. | RF-5.08; derivado |
| `politica_escalamiento` | `actualizar` | G | A* | — | Configurar destinatarios, sustitutos y plazos; gerente limitado a su sucursal. Ver P4. | RF-5.08 |

Los acuses quedan limitados al propio destinatario y sesión, incluso para el administrador. Un ID de notificación no permite actuar sobre otra persona. El destino de avisos pertenece a autenticación: no tiene carpeta, controlador CRUD ni permisos independientes. El modelo `DispositivoSesionUsuario` se conserva para persistir la relación y el historial.

La aplicación debe proporcionar el token o dato de destino; el backend no puede deducirlo de las credenciales. Si está disponible al iniciar sesión, puede vincularse en ese flujo. Si se obtiene o renueva después, la aplicación podrá comunicarlo mediante una operación autenticada de sesión dentro de `auth/`, sin una gestión administrativa de dispositivos. El contrato actual de login todavía recibe únicamente número de control y contraseña; la integración del destino sigue pendiente de implementación.

Al cerrar sesión se desactiva el registro del destino, en lugar de borrar el historial al que pueden estar vinculadas notificaciones anteriores. La baja del usuario, el vencimiento y los destinos inválidos deben aplicar la limpieza correspondiente.

La sesión única evita multiplicar destinos activos de la misma persona; una alerta sí puede enviarse a varios usuarios autorizados. La aplicación confirma `recibida` y registra `recibido`; al abrir o interactuar con el aviso confirma `abierta` y registra `abierto`. Repetir un acuse no debe duplicar acciones ni hacer retroceder una notificación abierta a recibida. Abrir o interactuar con el aviso no toma el evento: la acción explícita «Tomar evento» ejecuta la operación transaccional descrita en el módulo 4.

Las operaciones automáticas quedan separadas:

| Operación | Actor | Condición | Referencias |
| --- | --- | --- | --- |
| Registrar o renovar el destino de avisos | Autenticación y aplicación cliente | El cliente aporta el destino; el backend lo vincula a la sesión y sustituye el anterior de forma atómica. | RF-5.01 |
| Retirar destinos al cerrar sesión, dar de baja la cuenta o detectar destino inválido | Backend | Desactivar la asociación correspondiente como parte del proceso. | RF-5.02 |
| Seleccionar destinatarios y preparar el contenido | Backend | Operadores activos autorizados, sucursal correcta y datos operativos mínimos. | RF-5.03, RF-5.04 |
| Enviar avisos y registrar resultados del proveedor | Backend e integración autorizada | Registrar intentos y distinguir estados de envío y recepción. | RF-5.05, RF-5.06 |
| Repetir avisos | Backend | Evento abierto sin encargado y política vigente. | RF-5.07 |
| Ejecutar escalamiento | Backend | Reevaluar evento y atención antes de aplicar los niveles configurados. | RF-5.09 |
| Detener repeticiones y escaladas | Backend | Suspender mientras exista encargado o al cerrar el evento. | RF-5.10 |

No se conceden por inferencia permisos para enviar avisos manuales, forzar escaladas ni listar notificaciones de otras personas.

## 6. Videovigilancia y atención contextual

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `contexto_evento` | `consultar` | G | A | A | Consultar el contexto de un evento autorizado en cualquier estado: datos operativos, zona, cámaras disponibles y contactos pertinentes. Operador limitado a su sucursal. | RF-6.01, RF-6.02, RF-6.05, RF-6.06, RF-6.08; definición P1 |
| `video_evento` | `consultar` | G | A | A | Solicitar el video disponible de cámaras vinculadas al evento autorizado, cambiar de cámara o reintentar. El mecanismo de transmisión está pendiente. | RF-6.03, RF-6.04, RF-6.07; definición P1 |

El módulo 6 describe disparadores y no enumera los roles. Se mantiene su uso por los tres roles que pueden atender eventos, conforme a RF-4.07 y RNF Seguridad 01. P1 confirma que el operador puede consultar todos los eventos de su sucursal, sin limitarlo a los notificados, abiertos o atendidos por él.

Los RF describen video en vivo. Poder consultar un evento cerrado no introduce una función de grabaciones históricas ni garantiza que exista video del momento en que ocurrió; ese almacenamiento y reproducción no se han planteado.

El acceso al contexto permite revisar un evento antes de tomarlo; no asigna automáticamente su atención. Las decisiones siguen requiriendo los permisos y las condiciones del módulo 4.

La respuesta contextual debe limitarse a la información necesaria del evento autorizado. No concede al operador acceso a la administración de sucursales, al catálogo de contactos ni a la configuración o credenciales de las cámaras. Los enlaces de notificación no deben contener credenciales ni enlaces directos al stream, según RNF Seguridad 08.

| Función del cliente | Permiso adicional de API | Referencias |
| --- | --- | --- |
| Abrir la interfaz telefónica de Android con un contacto ya autorizado | Ninguno; utiliza los datos obtenidos en el contexto. | RF-6.09 |
| Copiar un teléfono en Windows | Ninguno; utiliza los datos obtenidos en el contexto. | RF-6.10 |

## Geografía

La carpeta de negocio será `geografia/`. Todos los usuarios autenticados, incluidos los operadores, podrán listar estados y consultar el listado de municipios de un estado. Esta lectura sirve, entre otros usos, para capturar o modificar la ubicación de una sucursal. No se habilita edición de los catálogos ni acceso anónimo por esta decisión.

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `estado` | `listar` | G | G | G | Catálogo geográfico de solo lectura, disponible para los tres roles autenticados. | RF-2.01, RF-2.04; definición del usuario |
| `municipio` | `listar` | G | G | G | Exige un estado y filtra los resultados por su `estadoId`; no hay listado global de municipios. | RF-2.01, RF-2.04; definición del usuario |

El alcance `global` se refiere al catálogo geográfico y no permite consultar sucursales ajenas. No se conceden permisos para crear, actualizar ni eliminar estados o municipios desde la aplicación.

Rutas previstas para `GeografiaController`:

```text
GET /geografia/estados
GET /geografia/estados/:estadoId/municipios
```

El parámetro de estado será obligatorio: se valida su identificador y la existencia del estado, y la consulta de municipios debe incluir el filtro `estadoId`. No se ofrecerá una ruta alternativa que devuelva todos los municipios sin seleccionar estado. Estos endpoints todavía no están implementados.

## Módulos NestJS y controladores previstos

La estructura acordada utiliza nombres de carpetas en singular. Los módulos de negocio serán `usuario`, `sucursal`, `monitoreo`, `evento`, `notificacion`, `escalamiento`, `atencion` y `geografia`, junto a la infraestructura de `auth`, `autorizacion` y `redis`.

Árbol previsto dentro de `backend/src/`:

```text
src/
├── auth/
├── autorizacion/
├── redis/
├── usuario/
│   └── dto/
├── sucursal/
│   ├── horario/
│   ├── descanso/
│   └── contacto/
├── monitoreo/
│   ├── particion/
│   ├── zona/
│   ├── sensor/
│   └── camara/
├── evento/
│   └── contexto/
├── notificacion/
├── escalamiento/
├── atencion/
└── geografia/
```

`usuario/` no necesita subcarpetas por cada rol solo para crear cuentas: `UsuarioController` y `UsuarioService` pueden tener métodos `crearOperador`, `crearGerente` y `crearAdministrador`, con DTO específicos dentro de `dto/` y su permiso correspondiente. Estado de cuenta, desbloqueo y reasignación también son operaciones del mismo dominio.

En `sucursal/` y `monitoreo/`, las subcarpetas agrupan funcionalidades con sus DTO, controlador y servicio. Pueden registrarse en el módulo NestJS de su dominio; una subcarpeta no obliga a crear otro módulo NestJS. `evento/contexto/` agrupa la vista operativa y la solicitud de video de un evento, conservando su autorización contextual.

Los controladores de negocio de este árbol siguen previstos. `AuthModule`, `AutorizacionModule`, `RedisModule` y el diagnóstico opcional `TestUserModule` ya están implementados. La estructura general y el comando de semilla están en el [README del backend](../../README.md).

| Módulo NestJS | Controladores | Responsabilidad |
| --- | --- | --- |
| `AuthModule` (`auth/`) | `AuthController` | Login, sesión actual y logout; registro y renovación internos del destino de avisos, con baja automática al cerrar sesión. La integración del registro todavía está pendiente. |
| `AutorizacionModule` | Sin controlador de administración | Matriz ejecutable, guard, decorador, asignación automática por rol e integración con la caché Redis. P3 excluye la edición individual de permisos en esta etapa. |
| `RedisModule` (`redis/`) | Sin controlador | Conexión compartida y operaciones de caché. |
| `UsuarioModule` (`usuario/`) | `UsuarioController` | Cuentas de los tres roles, estado, desbloqueo y reasignación; cada método declara su permiso. |
| `SucursalModule` (`sucursal/`) | `SucursalController`, `HorarioSucursalController`, `DescansoSucursalController`, `ContactoSucursalController` | Datos locales, estado administrativo, horario, calendario y contactos. |
| `MonitoreoModule` (`monitoreo/`) | `ParticionController`, `ZonaController`, `SensorController`, `CamaraController` | Configuración de particiones, zonas, sensores y cámaras, incluida la prueba de acceso. |
| `EventoModule` (`evento/`) | `EventoController`, `ContextoEventoController` | Registro por señales, clasificación, listado, detalle, historial y contexto con acceso al video. Recepción mediante el adaptador acordado. |
| `NotificacionModule` (`notificacion/`) | `NotificacionController` | Preparación, envío, seguimiento y acuses personales. El envío y los reintentos se ejecutan en servicios o procesos internos. |
| `EscalamientoModule` (`escalamiento/`) | `EscalamientoController` | Política de destinatarios y plazos y ejecución automática del escalamiento; P4 sigue pendiente. |
| `AtencionModule` (`atencion/`) | `AtencionController` | Toma exclusiva, confirmación, resolución, descarte y liberación. Coordina los cambios del evento, atención e historial en una misma transacción. |
| `GeografiaModule` (`geografia/`) | `GeografiaController` | Listado de estados y de municipios por un estado obligatorio, para los tres roles autenticados. |

Un controlador puede tener métodos con permisos diferentes. Por ejemplo, `SucursalController` usa `sucursal.actualizar` para los datos locales y `sucursal_estado.actualizar` para activar o desactivar. La separación de `evento/` y `atencion/` organiza responsabilidades dentro del mismo backend; la toma y sus efectos deben conservar una sola transacción de base de datos.

## Diagnóstico de permisos

Estas rutas usan los mismos guards y permisos que utilizarán los módulos de negocio. Se habilitan explícitamente con `ENABLE_TEST_ROUTES=true` en desarrollo o pruebas y no se registran en producción. No permiten consultar identidades ajenas, ni al administrador.

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `test_usuario` | `consultar` | A | A | A | `GET /test/user/:id`: devuelve el rol actual del propio usuario. | Diagnóstico solicitado |
| `test_operador` | `consultar` | — | — | A | `GET /test/user/:id/operador`: permisos efectivos del propio operador. | Diagnóstico solicitado |
| `test_gerente` | `consultar` | — | A | — | `GET /test/user/:id/gerente`: permisos efectivos del propio gerente. | Diagnóstico solicitado |
| `test_administrador` | `consultar` | A | — | — | `GET /test/user/:id/administrador`: permisos efectivos del propio administrador. | Diagnóstico solicitado |

## Aplicación de la matriz

1. **Asignaciones:** `npm run seed:permisos` reemplaza los permisos de cada usuario por `obtenerPermisosPorRol(rol)`, en una transacción por usuario. Se excluyen propuestas pendientes y no se habilita edición individual. La futura creación de cuentas deberá generar el mismo perfil en su transacción.
2. **Autenticación:** `AuthGuard` verifica JWT y estado SQL en cada petición. `@Publica()` omite esa validación para login; `@SoloSesion()` se utiliza en me y logout. Las sesiones no se cachean en Redis.
3. **Autorización:** `PermisosGuard` lee `@RequierePermiso(...)`, obtiene las asignaciones efectivas y entrega `solicitud.permisos` y `solicitud.permisoAutorizado`. Una ruta sin política se deniega. La política del método prevalece sobre una política de clase.
4. **Alcance:** los futuros servicios deberán filtrar sucursal y recursos, validar el rol administrable y revalidar estado y encargado dentro de las transacciones correspondientes. El guard solo comprueba recurso/acción; no convierte un ID enviado por el cliente en un recurso autorizado. En diagnóstico, el controlador exige que `:id` sea la identidad autenticada.
5. **Caché:** `PermisosService.obtenerPermisos()` usa `permisos:usuario:<id>` con TTL `REDIS_TTL_SECONDS` (3600 por defecto). Valida usuario, rol, versión de matriz y estructura; descarta filas ajenas al perfil y limita el alcance al máximo del rol. Una lista vacía es válida y no concede acceso.
6. **Fallos:** un error o ausencia de caché provoca consulta SQL. Si MySQL también falla se propaga el error; no se conceden permisos por ese fallo. La precarga tras login se hace después del commit: si falla, se entrega igualmente el token confirmado y se reintenta la carga en una petición posterior.
7. **Invalidación:** `PermisosService.invalidarUsuario(id)` cambia la revisión y elimina el perfil atómicamente. Se invoca después del commit de la semilla; futuros cambios de permisos, rol o asignación deben hacer lo mismo. Una lectura en curso puede terminar con su instantánea anterior, pero no puede volver a cachearla tras esa invalidación.

La clave auxiliar `permisos:revision:<id>` contiene un UUID con TTL. Redis ejecuta en Lua la creación de revisión, la publicación condicionada a la revisión y la invalidación. Los UUID evitan reutilizar una revisión después de expulsión o vencimiento. La versión de matriz es un SHA-256 del perfil del código: cambiar reglas descarta perfiles cacheados anteriores, pero no sustituye ejecutar la semilla para sincronizar las filas SQL.

La restricción `@@unique([usuarioId, modulo, accion])` mantiene una fila por permiso y ya crea el índice compuesto necesario. La semilla invalida después de cada commit. Si falla esa invalidación, termina con error; el usuario ya actualizado puede conservar la caché anterior hasta que se repita la operación o venza su TTL. No existe una transacción distribuida entre MySQL y Redis.

La sesión única ya está implementada. Siguen pendientes el registro/renovación del destino de avisos, los módulos de negocio y la toma transaccional de eventos. La caché no sustituye los bloqueos SQL necesarios para esas operaciones.

## Estado de las decisiones

| ID | Estado | Tema | Decisión / punto pendiente |
| --- | --- | --- | --- |
| P1 | Resuelto | Consulta y atención del operador | Consulta todos los eventos de su sucursal, atendidos, cerrados y en curso. Puede tomar uno disponible y actuar sobre su propia atención; consultar no permite modificar eventos ajenos o cerrados. |
| P2 | Pendiente, con alcance precisado | Administración de cuentas | Administrador crea y administra los tres roles y su propia cuenta. Gerente solo administra operadores de su sucursal, no su propia cuenta. Operador no administra cuentas, ni la propia. Falta concretar las operaciones particulares. |
| P3 | Resuelto para esta etapa | Edición de permisos individuales | No habrá interfaz ni endpoints para modificar permisos por usuario. Cada rol determina un perfil fijo; la estructura conserva la posibilidad de una futura ampliación. |
| P4 | Pendiente | Configuración del escalamiento por el gerente | Falta definir qué puede cambiar. La limitación local de la tabla continúa como propuesta. El esquema registra escalamientos ejecutados, pero aún no tiene un modelo para guardar la política configurable. |
| P5 | Resuelto | Descansos por día y mes | Una fecha como 16/09 marca descanso y prevalece sobre el horario semanal. Es recurrente por día y mes, sin año. |
| P6 | Sesión única implementada; destino y acuses pendientes | Sesión única, destino interno y confirmaciones | Una sesión activa por usuario; rechazar un nuevo login y conservar la anterior. El destino se registra o renueva dentro de autenticación y se desactiva al cerrar sesión, sin módulo CRUD ni gestión manual independiente. La aplicación confirma recepción y apertura; abrir no equivale a tomar el evento. |
| P7 | Pendiente por decisión del usuario | Origen autorizado de las alarmas | `dc09-receiver` es una posibilidad para recibir señales del canal y reenviarlas al backend con un token interno. No están confirmados el receptor ni su mecanismo de autenticación. |

### P6 explicado: a dónde avisar y qué confirma la aplicación

El flujo principal ya está definido:

1. **Sesión y destino únicos.** Se admite una sola sesión activa por usuario y se rechaza un segundo inicio de sesión. Autenticación registra o renueva el único destino activo con los datos que aporta la aplicación. Al cerrar sesión, el backend desactiva ese destino, como requieren RF-1.02 y RF-5.02. No existe un módulo CRUD independiente de dispositivos ni un permiso adicional para estas tareas.
2. **Confirmación de recepción.** Cuando la aplicación recibe el aviso, informa al backend para registrar el estado `recibida` y la fecha `recibido` de `NotificacionEvento`.
3. **Confirmación de apertura.** Al abrir o interactuar con el aviso, informa al backend para registrar `abierta` y la fecha `abierto`. Esa confirmación no crea atención ni modifica el estado operativo del evento.
4. **Toma explícita.** El usuario utiliza la acción «Tomar evento». El backend comprueba y asigna la atención de forma transaccional, resolviendo también los intentos simultáneos de otros usuarios.

`entregada` seguirá dependiendo de la evidencia que ofrezca el canal y no se da por confirmada solamente por haber enviado. El retiro del destino forma parte del ciclo de sesión; no se plantea una operación de administración manual de dispositivos.

Registrar un destino o confirmar la apertura de un aviso pertenece a la sesión y al destinatario; no concede edición de la cuenta ni contradice las restricciones de P2. Los recursos de permisos `dispositivo_sesion.crear` y `dispositivo_sesion.eliminar` se retiran de la matriz; el modelo Prisma se mantiene. Las confirmaciones de `notificacion_estado` quedan definidas para los tres roles.

### P7 explicado: quién le entrega una alarma al backend

Este punto trata del programa que entrega las señales, no del empleado que inicia sesión. Por ejemplo, un receptor podría enviar al backend un mensaje equivalente a «se activó la zona 3 de la sucursal 5».

El backend necesita verificar que el mensaje viene del receptor o servicio autorizado. Por eso quedan dos preguntas: **qué programa nos enviará las alarmas** y **cómo reconoceremos a ese programa cuando se conecte**.

La alternativa comentada por el usuario es que `dc09-receiver` reciba las señales del canal de comunicación y las reenvíe al backend con un token interno. Sería una credencial técnica exclusiva de la integración, separada de las sesiones de administradores, gerentes y operadores. La alternativa y el token no están confirmados ni implementados.

P7 se mantiene pendiente por indicación del usuario mientras se confirma el receptor y el contrato de recepción. El estado actual de esa alternativa está en el [README del receptor](../../../dc09-receiver/README.md).

También habrá que precisar el retiro de contactos y su conservación histórica, las anomalías pertinentes de cada contacto y la auditoría de cambios administrativos. El esquema actual no expresa toda esa configuración descrita en los RF y RNF. Estas observaciones no cambian el esquema en este paso.

Las filas con asterisco son propuestas para discutir, no requisitos confirmados. Las funciones no enumeradas quedan sin permiso por defecto: por ejemplo, editar permisos individuales, cambiar roles, borrar usuarios o sucursales físicamente, editar el historial, forzar una atención ajena o enviar avisos manuales.
