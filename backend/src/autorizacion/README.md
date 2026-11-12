# Matriz de permisos de Argos

**Estado: propuesta inicial para revisión.** Este documento define los permisos propuestos; todavía no concede accesos en ejecución ni carga registros en `permiso_usuario`. El servicio de autorización, los guards y `@RequierePermiso(...)` siguen pendientes de implementación.

| Rol | Perfil propuesto |
| --- | --- |
| Administrador | Configurar y supervisar sucursales de forma global; administrar operadores y gerentes; atender eventos respetando la exclusividad del encargado. |
| Gerente | Configurar y supervisar su sucursal y administrar sus operadores; atender eventos de esa sucursal. |
| Operador | Atender eventos de su sucursal, consultar su contexto y video autorizado y gestionar los destinos y acuses de su propia sesión. Sin administración de configuración ni historial general. |

## Ubicación y fuentes

La propuesta vive en `backend/src/autorizacion/README.md`, junto al futuro módulo de autorización. Se puede revisar y modificar directamente en las tablas. Su traducción a una configuración TypeScript formará parte de la implementación de ese módulo; por ahora evitamos mantener dos versiones editables de la política.

Fuentes utilizadas:

- [Requerimientos funcionales y no funcionales](../../../docs/RF%20%26%20RNF.md): fuente de responsabilidades, actores y restricciones.
- [Esquema Prisma actual](../../prisma/schema.prisma): roles, acciones, alcances y relaciones disponibles.
- [Autenticación existente](../auth/README.md): identidad y contexto de sesión.
- [Redis](../redis/README.md): conexión y operaciones de caché disponibles.

Las referencias `RF-2.03`, por ejemplo, significan módulo 2, requisito 03 del documento original. Se conserva la numeración original, incluido el salto de RF-4.02 a RF-4.04.

## Cómo leer la matriz

| Valor | Significado |
| --- | --- |
| `G` | Permiso con alcance `global`. |
| `A` | Permiso con alcance `asignado`. |
| `—` | Sin permiso; no se crea una asignación para ese rol. |
| `G*` o `A*` | Permiso sugerido por una necesidad derivada o una interpretación pendiente; revisar la condición indicada. El asterisco no es un valor del enum. |

`global` amplía el conjunto de recursos accesibles; no elimina las reglas de negocio. Un administrador también debe ser el encargado vigente para confirmar o resolver un evento.

`asignado` se resuelve según el recurso:

- **Sucursal y configuración:** la sucursal de `UsuarioSucursal`, o los registros que pertenecen a ella mediante sus relaciones. Actualmente cada usuario puede tener como máximo una sucursal asignada.
- **Eventos:** eventos de la sucursal autorizada; las decisiones exigen además la atención vigente correspondiente al usuario y su sesión.
- **Dispositivos y acuses personales:** dispositivos de la propia sesión o notificaciones del propio destinatario y sesión. Este acceso personal no requiere tener una sucursal asignada.

Un usuario sin sucursal no obtiene acceso a datos de sucursales mediante un permiso `asignado`. La sucursal autorizada se obtiene del contexto validado y de las relaciones del recurso, nunca solo de un ID enviado por el cliente.

## Relación con el esquema y con los controladores

Se conservan los enums actuales:

```text
AccionPermisoUsuario: crear, listar, consultar, actualizar, eliminar
AlcancePermisoUsuario: global, asignado
```

`modulo` identifica el recurso de autorización. Puede haber varios recursos dentro del mismo módulo o controlador de NestJS: `sucursal` y `sucursal_estado`, por ejemplo. Estos nombres no requieren una tabla, un controlador ni un módulo NestJS independiente por cada uno.

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

Ejemplos de declaración futura en un mismo controlador:

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
| Iniciar sesión | Cuenta registrada | Credenciales válidas, cuenta activa y sin bloqueo vigente. | RF-1.01 |
| Consultar la propia sesión (`GET /auth/me`) | Usuario autenticado | Solo la sesión presentada; soporte de la autenticación existente. | RF-1.01 |
| Cerrar la propia sesión | Usuario autenticado | Solo la sesión presentada. Retirar sus destinos y liberar su atención forma parte del cierre, sin pedir permisos adicionales. | RF-1.02 |
| Bloquear por fallos y finalizar el bloqueo al vencer | Sistema | Aplicar intentos y plazos definidos; no es una operación pública de administración. | RF-1.10, RF-1.11 |
| Autorizar solicitudes | Backend | Evaluar rol, permiso asignado, alcance y restricciones del recurso. | RF-1.14; RNF Seguridad 01 y 03 |

El inicio de sesión es la excepción pública que valida credenciales. La consulta y el cierre de sesión requieren autenticación incluso si el usuario no tiene permisos administrativos.

### Administración de cuentas

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `usuario_operador` | `crear` | G | A | — | Crear únicamente una cuenta de rol operador; el gerente usa su propia sucursal. | RF-1.03 |
| `usuario_gerente` | `crear` | G | — | — | Crear gerente y vincularlo a una sucursal válida. | RF-1.04 |
| `usuario` | `listar` | G | A | — | El gerente lista solo operadores de su sucursal; incluye filtros de nombre, identificador y estado. | RF-1.05 |
| `usuario` | `consultar` | G | A* | — | Aplicar el mismo límite de cuentas administrables al detalle; ver P2. | RF-1.06 |
| `usuario` | `actualizar` | G | A* | — | Modificar identificación y nombre; excluir rol, sucursal, contraseña y estado. Ver P2. | RF-1.07 |
| `usuario_estado` | `actualizar` | G | A* | — | Desactivar o reactivar cuentas administrables. La desactivación invalida acceso y libera atención activa. Ver P2. | RF-1.08, RF-1.09 |
| `usuario_desbloqueo` | `actualizar` | G | A* | — | Finalizar bloqueo vigente con motivo y actor; gerente solo sobre operadores administrables. Ver P2. | RF-1.12 |
| `usuario_sucursal` | `actualizar` | G | — | — | Reasignar un operador o gerente a una sucursal válida; conservar una sola asignación. | RF-1.13 |

Para esta propuesta, las cuentas administrables del administrador son operadores y gerentes de cualquier sucursal. El manejo de otras cuentas de administrador queda sin conceder hasta resolver P2. El acceso a la propia identidad continúa disponible mediante `/auth/me`.

La gestión de asignaciones de permisos y los cambios de rol requieren definición adicional: RF-1.14 exige aplicar permisos, pero no define una interfaz para otorgarlos. No se conceden por inferencia permisos para administrarlos; ver P3.

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
| `descanso_sucursal` | `consultar` | G* | A* | — | Consultar descansos del calendario; detalle del alcance por definir en P5. | RF-2.06 y responsabilidad del módulo 2; derivado |
| `descanso_sucursal` | `actualizar` | G* | A* | — | Mantener el conjunto de descansos de una sucursal. Propuesta basada también en `DescansoSucursal`; ver P5. | RF-2.06 y responsabilidad del módulo 2; derivado |
| `contacto_sucursal` | `crear` | G | A | — | Registrar contacto de la sucursal autorizada. | RF-2.07 |
| `contacto_sucursal` | `listar` | G | A | — | Consultar el listado administrativo de contactos. | RF-2.08 |
| `contacto_sucursal` | `consultar` | G | A | — | Consultar un contacto del catálogo administrativo. | RF-2.08 |
| `contacto_sucursal` | `actualizar` | G | A | — | Corregir datos y asociaciones permitidas, manteniendo el alcance. | RF-2.09 |
| `contacto_sucursal` | `eliminar` | G | A | — | Retirar de uso operativo y advertir si deja un evento sin contacto pertinente. | RF-2.10 |

El operador obtiene los contactos pertinentes mediante el contexto del evento, sin acceso al catálogo administrativo completo. Retirar un contacto no autoriza a borrar decisiones o registros históricos de eventos.

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
| `evento` | `listar` | G | A | — | Historial general y filtros por estado, anomalía, fechas y sucursal autorizada. | RF-4.12, RF-4.13 |
| `evento` | `consultar` | G | A | — | Detalle completo de supervisión, cronología y decisión final dentro del alcance. | RF-4.14 |
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
- El operador accede al contexto operativo mediante `contexto_evento.consultar`, descrito en el módulo 6. Su acceso al contexto no implica permiso para el historial general.

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
| `dispositivo_sesion` | `crear` | A | A | A | Registrar un destino en la propia sesión. El servidor determina usuario y sesión. | RF-5.01 |
| `dispositivo_sesion` | `eliminar` | A* | A* | A* | Propuesta de retiro explícito de un destino propio; el retiro automático al cerrar sesión no necesita este permiso. | RF-5.02; derivado |
| `notificacion_estado` | `actualizar` | A* | A* | A* | Acusar recibida o abierta una notificación del propio destinatario y sesión; estados de envío se gestionan por integración. | RF-5.06; actor del acuse por confirmar |
| `politica_escalamiento` | `consultar` | G* | A* | — | Leer la configuración necesaria para mantenerla. | RF-5.08; derivado |
| `politica_escalamiento` | `actualizar` | G | A* | — | Configurar destinatarios, sustitutos y plazos; gerente limitado a su sucursal. Ver P4. | RF-5.08 |

Un administrador también queda limitado a su propia sesión al registrar dispositivos o acusar notificaciones personales. Un ID de notificación o un token de dispositivo no permite actuar sobre otro destinatario.

Las operaciones automáticas quedan separadas:

| Operación | Actor | Condición | Referencias |
| --- | --- | --- | --- |
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
| `contexto_evento` | `consultar` | G | A | A* | Consultar datos operativos del evento, estado, zona, cámaras disponibles y contactos pertinentes. Propuesta para operador: eventos abiertos de su sucursal; ver P1. | RF-6.01, RF-6.02, RF-6.05, RF-6.06, RF-6.08 |
| `video_evento` | `consultar` | G | A | A* | Solicitar video de cámaras vinculadas al evento visible, cambiar de cámara o reintentar. El mecanismo de transmisión está pendiente. Ver P1. | RF-6.03, RF-6.04, RF-6.07 |

El módulo 6 describe disparadores y no enumera los roles. Se propone su uso por los tres roles que pueden atender eventos, conforme a RF-4.07 y RNF Seguridad 01. La limitación del operador a eventos abiertos se señala como interpretación pendiente, no como una regla expresamente escrita en los RF.

El acceso al contexto permite revisar un evento antes de tomarlo; no asigna automáticamente su atención. Las decisiones siguen requiriendo los permisos y las condiciones del módulo 4.

La respuesta contextual debe limitarse a la información necesaria del evento autorizado. No concede al operador acceso a la administración de sucursales, al catálogo de contactos ni a la configuración o credenciales de las cámaras. Los enlaces de notificación no deben contener credenciales ni enlaces directos al stream, según RNF Seguridad 08.

| Función del cliente | Permiso adicional de API | Referencias |
| --- | --- | --- |
| Abrir la interfaz telefónica de Android con un contacto ya autorizado | Ninguno; utiliza los datos obtenidos en el contexto. | RF-6.09 |
| Copiar un teléfono en Windows | Ninguno; utiliza los datos obtenidos en el contexto. | RF-6.10 |

## Catálogos de apoyo propuestos

Estos accesos no aparecen como RF independientes. Se proponen para completar la captura de ubicación de una sucursal a partir de los modelos `Estado` y `Municipio`:

| Módulo del permiso | Acción | Administrador | Gerente | Operador | Condición / función | Referencias |
| --- | --- | --- | --- | --- | --- | --- |
| `estado` | `listar` | G* | G* | — | Catálogo geográfico de solo lectura; `global` aquí no permite ver otras sucursales. | RF-2.01, RF-2.04; derivado |
| `municipio` | `listar` | G* | G* | — | Catálogo geográfico filtrado por estado; no contiene información de sucursales. | RF-2.01, RF-2.04; derivado |

No se propone edición de estos catálogos desde la aplicación.

## Módulos NestJS y controladores previstos

Esta distribución organiza responsabilidades; solo `AuthModule` y sus rutas de autenticación están implementados en esta lista.

| Módulo NestJS | Controladores | Responsabilidad |
| --- | --- | --- |
| `AuthModule` | `AuthController` | Login, sesión actual y logout; reutilizar la implementación existente. |
| `AutorizacionModule` | Sin controlador de administración por ahora | Matriz ejecutable, guard, decorador, lectura de permisos e integración con la caché Redis. Gestión de permisos pendiente de P3. |
| `UsuariosModule` | `UsuariosController` | Cuentas, estado, desbloqueo y reasignación; cada método declara el recurso y acción que correspondan. |
| `SucursalesModule` | `SucursalesController`, `HorariosSucursalController`, `DescansosSucursalController`, `ContactosSucursalController` | Datos locales, estado administrativo, horario, calendario y contactos. |
| `ArquitecturaMonitoreoModule` | `ParticionesController`, `ZonasController`, `SensoresController`, `CamarasController` | Configuración y prueba de cámaras. |
| `EventosModule` | `EventosController`, `AtencionesController` | Historial, detalle y operaciones de atención, confirmación, resolución y descarte. Procesamiento interno de señales mediante el adaptador acordado. |
| `NotificacionesModule` | `DispositivosSesionController`, `AcusesNotificacionController`, `PoliticasEscalamientoController` | Destinos propios, acuses y configuración. Envío, reintentos y escalamiento quedan en procesos internos. |
| `VideovigilanciaModule` | `ContextoEventosController`, `VideoEventosController` | Vista operativa agregada y acceso autorizado al video. |
| `CatalogosModule` | `CatalogosController` | Lectura de estados y municipios, si se acepta la propuesta de catálogos de apoyo. |

Un controlador puede tener métodos con permisos diferentes. Por ejemplo, `SucursalesController` usa `sucursal.actualizar` para los datos locales y `sucursal_estado.actualizar` para activar o desactivar.

## Aplicación futura de la matriz

1. **Política por rol:** convertir esta propuesta revisada en una configuración TypeScript tipada. La matriz define los permisos máximos y sus alcances por rol, sin un comodín que permita todo al administrador.
2. **Asignación individual:** al crear un usuario, generar sus filas de `PermisoUsuario` a partir del perfil del rol. Un usuario puede tener un subconjunto de esos permisos; una asignación individual no puede ampliar las atribuciones de su rol. Para las cuentas existentes habrá que preparar una carga explícita y revisable; editar la matriz no modificará automáticamente sus filas.
3. **Guard:** validar una sola vez la sesión, leer el permiso declarado por el endpoint, comprobar matriz y asignación individual y entregar el alcance al servicio. Una ruta de negocio sin una política declarada se deniega; las excepciones públicas y las operaciones de sesión se declaran expresamente.
4. **Reglas de recurso:** aplicar el alcance en consultas y escrituras; validar relaciones, campos modificables, estado del evento y encargado actual. Las consultas agregadas también deben respetar el alcance.
5. **Caché:** guardar las asignaciones del usuario bajo `permisos:usuario:<id>` mediante `RedisService`, con el TTL de una hora y el prefijo de entorno. La matriz estática del código no necesita una lectura de Redis por cada comprobación.
6. **Cambios e invalidación:** confirmar la escritura de permisos, rol o asignaciones e invalidar la caché afectada. Definir cómo impedir que una lectura concurrente repueble datos anteriores al cambio. La expiración por sí sola no garantiza revocación inmediata.

La restricción `@@unique([usuarioId, modulo, accion])` mantiene una sola fila por permiso de un usuario. Los alcances admitidos se limitan también por la matriz: un gerente no obtiene `global` sobre sucursales por tener una fila incorrecta en la base de datos.

No se ejecutaron seeds, migraciones ni cargas de permisos para elaborar esta propuesta.

## Decisiones pendientes para revisar

| ID | Punto por definir | Propuesta inicial / efecto |
| --- | --- | --- |
| P1 | ¿Qué eventos y videos puede abrir un operador antes y después de atenderlos? | Permitir contexto y video de eventos abiertos de su sucursal, aunque aún no sea el encargado. Mantener denegado el historial general. Definir si solo ve eventos notificados o todos los abiertos y si conserva acceso al cierre. |
| P2 | ¿Hasta dónde llega la administración de cuentas? | Gerente administra exclusivamente operadores de su sucursal también en detalle, edición, estado y desbloqueo. Administrador administra operadores y gerentes de cualquier sucursal. Definir gestión de otros administradores, perfil propio, contraseñas y cambios de rol, que no quedan concedidos aquí. |
| P3 | ¿Habrá gestión individual de permisos desde una interfaz? | Proponer que solo el administrador pueda reducir o restablecer permisos dentro del perfil permitido. Faltan RF de consulta, modificación, auditoría y efecto sobre usuarios existentes. No conceder esa administración hasta definirla. |
| P4 | ¿Qué parte de la política de escalamiento puede configurar el gerente? | Limitarlo a su sucursal y a destinatarios permitidos; reservar reglas globales al administrador. El esquema registra escalamientos ejecutados, pero aún no tiene un modelo para guardar su política configurable. |
| P5 | ¿El calendario incluye descansos por fecha además de los días semanales? | Prisma incluye `DescansoSucursal` con día y mes, pero RF-2.06 detalla el horario semanal. Se proponen lectura y mantenimiento del calendario; falta precisar su funcionamiento. |
| P6 | ¿Qué operaciones del cliente se usarán para retirar dispositivos y confirmar avisos? | El registro de destino está explícito. El retiro manual y los acuses propios se proponen para el flujo del cliente; precisar cuáles estados confirma el cliente y cuáles el proveedor. |
| P7 | ¿Cuál es la identidad técnica autorizada para recibir señales? | Usar autenticación de integración independiente de los roles humanos. El contrato, receptor y respuesta siguen pendientes según RF-4.01. |

También habrá que precisar el retiro de contactos y su conservación histórica, las anomalías pertinentes de cada contacto y la auditoría de cambios administrativos. El esquema actual no expresa toda esa configuración descrita en los RF y RNF. Estas observaciones no cambian el esquema en este paso.

Las filas con asterisco son propuestas para discutir, no requisitos confirmados. Las funciones no enumeradas quedan sin permiso por defecto: por ejemplo, crear administradores, cambiar roles, borrar usuarios o sucursales físicamente, editar el historial, forzar una atención ajena o enviar avisos manuales.
