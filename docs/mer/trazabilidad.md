# Trazabilidad del modelo Chen

Archivo generado por `generar.py`. Fuente: `backend/prisma/schema.prisma`.

SHA-256 del esquema: `2af41fabc2c5b527be1864e8c317348e78e6316d893db525b538ecc4012ab1f9`.

Cobertura: **26 entidades**, **35 relaciones explícitas**, **137 atributos no relacionales** y **20 dominios enumerados**.

## Entidades y atributos

Cada entidad se define completa en una lámina de detalle. Las claves foráneas se representan como relaciones. `?` señala un atributo opcional.

| Entidad Prisma | Lámina | Atributos dibujados |
| --- | --- | --- |
| `Usuario` | [01-usuarios-acceso](01-usuarios-acceso.svg) | `id`, `nombre`, `apellido`, `numeroControl`, `contrasenaHash`, `intentosFallidos`, `estado`, `rol`, `creado`, `actualizado` |
| `SesionUsuario` | [01-usuarios-acceso](01-usuarios-acceso.svg) | `id`, `tokenHash`, `inicio`, `vencimiento`, `finalizada?`, `motivoFinalizacion?` |
| `DispositivoSesionUsuario` | [01-usuarios-acceso](01-usuarios-acceso.svg) | `id`, `tipo`, `token`, `creado`, `desactivado?` |
| `PermisoUsuario` | [01-usuarios-acceso](01-usuarios-acceso.svg) | `id`, `modulo`, `controlador`, `creado`, `actualizado` |
| `PlantillaPermiso` | [01-usuarios-acceso](01-usuarios-acceso.svg) | `id`, `rol`, `modulo`, `controlador` |
| `BloqueoUsuario` | [01-usuarios-acceso](01-usuarios-acceso.svg) | `id`, `fecha`, `vencimientoPrevisto`, `finalizacionEfectiva?`, `formaFinalizacion?`, `motivo?` |
| `UsuarioSucursal` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `creado`, `actualizado` |
| `Sucursal` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `nombre`, `estado`, `zonaHoraria` |
| `Estado` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `nombre`, `clave` |
| `Municipio` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `nombre`, `clave` |
| `DireccionSucursal` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `cp`, `colonia`, `calle`, `numero` |
| `DescansoSucursal` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `dia`, `mes` |
| `HorarioSemanalSucursal` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `dia`, `entrada`, `salida` |
| `ContactoSucursal` | [02-sucursales-territorio](02-sucursales-territorio.svg) | `id`, `nombre`, `telefono`, `correo`, `rol` |
| `ParticionSucursal` | [03-infraestructura](03-infraestructura.svg) | `id`, `codigoCuenta`, `estado` |
| `ZonaParticion` | [03-infraestructura](03-infraestructura.svg) | `id`, `tipo`, `nombre`, `numero`, `descripcion`, `estado` |
| `SensorZona` | [03-infraestructura](03-infraestructura.svg) | `id`, `numeroSerie`, `etiqueta`, `descripcion`, `estado` |
| `CamaraZona` | [03-infraestructura](03-infraestructura.svg) | `id`, `prioridad`, `ip`, `urlStream`, `estado` |
| `RecepcionEvento` | [04-eventos-recepcion](04-eventos-recepcion.svg) | `id`, `origen`, `codigoExterno?`, `claveDeduplicacion?`, `contenido`, `ocurrido?`, `recibido`, `procesado?`, `estado`, `error?` |
| `EventoSucursal` | [04-eventos-recepcion](04-eventos-recepcion.svg) | `id`, `tipo`, `anomalia`, `estado`, `claveDeduplicacion`, `creado`, `actualizado` |
| `AtencionEvento` | [05-atencion-historial](05-atencion-historial.svg) | `id`, `inicio`, `finalizada?`, `formaFinalizacion?`, `motivo?`, `vigente?` |
| `HistorialEvento` | [05-atencion-historial](05-atencion-historial.svg) | `id`, `accion`, `estadoAnterior?`, `estado?`, `observacion?`, `fecha` |
| `EscalamientoEvento` | [06-notificaciones](06-notificaciones.svg) | `id`, `rolOrigen`, `rolDestino`, `fecha` |
| `NotificacionEvento` | [06-notificaciones](06-notificaciones.svg) | `id`, `estado`, `creado`, `enviado?`, `entregado?`, `recibido?`, `abierto?` |
| `IntentoNotificacion` | [06-notificaciones](06-notificaciones.svg) | `id`, `numero`, `estado`, `inicio`, `finalizado?`, `identificadorExterno?`, `error?` |
| `ResolucionEvento` | [05-atencion-historial](05-atencion-historial.svg) | `id`, `accion`, `comentarios`, `creado`, `actualizado` |

## Relaciones y participación

Las dos cardinalidades expresan cuántas veces **cada instancia del extremo indicado** puede participar en esa relación; no se leen desde el extremo contrario. N significa muchas. La participación mínima de una colección es 0 porque Prisma no exige hijos.

| Campo Prisma | Entidad referenciada: participación | Relación | Entidad propietaria: participación | Lámina |
| --- | --- | --- | --- | --- |
| `SesionUsuario.usuario` | `Usuario` (0,N) | inicia | `SesionUsuario` (1,1) | 01 |
| `DispositivoSesionUsuario.sesionUsuario` | `SesionUsuario` (0,N) | registra | `DispositivoSesionUsuario` (1,1) | 01 |
| `PermisoUsuario.usuario` | `Usuario` (0,N) | posee | `PermisoUsuario` (1,1) | 01 |
| `BloqueoUsuario.usuario` | `Usuario` (0,N) | recibe bloqueo | `BloqueoUsuario` (1,1) | 01 |
| `BloqueoUsuario.desbloqueadoPor` | `Usuario` (0,N) | finaliza bloqueo | `BloqueoUsuario` (0,1) | 01 |
| `UsuarioSucursal.sucursal` | `Sucursal` (0,N) | agrupa asignaciones | `UsuarioSucursal` (1,1) | 02 |
| `UsuarioSucursal.usuario` | `Usuario` (0,1) | tiene asignación | `UsuarioSucursal` (1,1) | 02 |
| `DireccionSucursal.estado` | `Estado` (0,N) | ubica dirección | `DireccionSucursal` (1,1) | 02 |
| `DireccionSucursal.municipio` | `Municipio` (0,N) | localiza dirección | `DireccionSucursal` (1,1) | 02 |
| `DireccionSucursal.sucursal` | `Sucursal` (0,1) | tiene dirección | `DireccionSucursal` (1,1) | 02 |
| `DescansoSucursal.sucursal` | `Sucursal` (0,N) | programa descanso | `DescansoSucursal` (1,1) | 02 |
| `HorarioSemanalSucursal.sucursal` | `Sucursal` (0,N) | define horario | `HorarioSemanalSucursal` (1,1) | 02 |
| `ContactoSucursal.sucursal` | `Sucursal` (0,N) | registra contacto | `ContactoSucursal` (1,1) | 02 |
| `ParticionSucursal.sucursal` | `Sucursal` (0,N) | contiene partición | `ParticionSucursal` (1,1) | 03 |
| `ZonaParticion.particion` | `ParticionSucursal` (0,N) | agrupa zona | `ZonaParticion` (0,1) | 03 |
| `ZonaParticion.sucursal` | `Sucursal` (0,N) | contiene zona | `ZonaParticion` (1,1) | 03 |
| `SensorZona.zonaParticion` | `ZonaParticion` (0,N) | dispone de sensor | `SensorZona` (1,1) | 03 |
| `CamaraZona.zonaParticion` | `ZonaParticion` (0,N) | dispone de cámara | `CamaraZona` (1,1) | 03 |
| `RecepcionEvento.eventoSucursal` | `EventoSucursal` (0,N) | vincula recepción | `RecepcionEvento` (0,1) | 04 |
| `EventoSucursal.sucursal` | `Sucursal` (0,N) | registra evento | `EventoSucursal` (1,1) | 04 |
| `EventoSucursal.zonaParticion` | `ZonaParticion` (0,N) | sitúa evento | `EventoSucursal` (1,1) | 04 |
| `AtencionEvento.eventoSucursal` | `EventoSucursal` (0,N) | tiene atención | `AtencionEvento` (1,1) | 05 |
| `AtencionEvento.usuario` | `Usuario` (0,N) | realiza atención | `AtencionEvento` (1,1) | 05 |
| `AtencionEvento.sesionUsuario` | `SesionUsuario` (0,N) | sustenta atención | `AtencionEvento` (1,1) | 05 |
| `HistorialEvento.eventoSucursal` | `EventoSucursal` (0,N) | conserva historial | `HistorialEvento` (1,1) | 05 |
| `HistorialEvento.atencionEvento` | `AtencionEvento` (0,N) | contextualiza registro | `HistorialEvento` (0,1) | 05 |
| `HistorialEvento.usuario` | `Usuario` (0,N) | ejecuta acción | `HistorialEvento` (0,1) | 05 |
| `EscalamientoEvento.eventoSucursal` | `EventoSucursal` (0,N) | origina escalamiento | `EscalamientoEvento` (1,1) | 06 |
| `NotificacionEvento.eventoSucursal` | `EventoSucursal` (0,N) | genera aviso | `NotificacionEvento` (1,1) | 06 |
| `NotificacionEvento.dispositivoSesionUsuario` | `DispositivoSesionUsuario` (0,N) | recibe en dispositivo | `NotificacionEvento` (1,1) | 06 |
| `NotificacionEvento.destinatario` | `Usuario` (0,N) | es destinatario | `NotificacionEvento` (1,1) | 06 |
| `NotificacionEvento.escalamientoEvento` | `EscalamientoEvento` (0,N) | motiva aviso | `NotificacionEvento` (0,1) | 06 |
| `IntentoNotificacion.notificacionEvento` | `NotificacionEvento` (0,N) | registra intento | `IntentoNotificacion` (1,1) | 06 |
| `ResolucionEvento.eventoSucursal` | `EventoSucursal` (0,1) | tiene resolución | `ResolucionEvento` (1,1) | 05 |
| `ResolucionEvento.usuario` | `Usuario` (0,N) | emite resolución | `ResolucionEvento` (1,1) | 05 |

## Dominios enumerados

Los enumerados restringen atributos; no se convierten en entidades ni en relaciones nuevas.

| Dominio | Valores Prisma |
| --- | --- |
| `EstadoUsuario` | `activo`, `inactivo`, `bloqueado`, `eliminado` |
| `RolUsuario` | `administrador`, `gerente`, `operador` |
| `TipoDispositivoUsuario` | `android`, `ios`, `escritorio` |
| `FormaFinalizacionBloqueo` | `manual`, `automatica` |
| `EstadoSucursal` | `activa`, `inactiva` |
| `DiaHorarioSemanalSucursal` | `lunes`, `martes`, `miércoles`, `jueves`, `viernes`, `sábado`, `domingo` |
| `RolContactoSucursal` | `emergencia`, `seguridad`, `administrativo` |
| `EstadoParticionSucursal` | `activa`, `inactiva` |
| `EstadoZonaParticion` | `activa`, `inactiva` |
| `EstadoSensorZona` | `activo`, `inactivo`, `mantenimiento`, `eliminado` |
| `EstadoCamaraZona` | `activa`, `inactiva`, `mantenimiento`, `eliminada` |
| `TipoEventoSucursal` | `alerta`, `incidente`, `emergencia` |
| `AnomaliaEventoSucursal` | `intrusión`, `incendio`, `falla_sistema` |
| `EstadoEventoSucursal` | `pendiente`, `enAtencion`, `confirmado`, `resuelto`, `descartado` |
| `AccionResolucionEvento` | `resuelto`, `descartado` |
| `EstadoRecepcionEvento` | `pendiente`, `procesada`, `duplicada`, `error` |
| `FormaFinalizacionAtencion` | `liberada`, `abandonoSesion`, `cierreEvento`, `cuentaDesactivada` |
| `AccionHistorialEvento` | `registrado`, `atencionIniciada`, `atencionLiberada`, `atencionAbandonada`, `confirmado`, `descartado`, `resuelto`, `escalado` |
| `EstadoNotificacionEvento` | `pendiente`, `enviada`, `entregada`, `recibida`, `abierta`, `fallida`, `cancelada` |
| `EstadoIntentoNotificacion` | `enProceso`, `aceptado`, `fallido` |

## Atributos y dominios

Tipos usados para rastrear los dominios del esquema; se omiten del dibujo para mantener la notación conceptual.

| Entidad | Atributo | Dominio Prisma |
| --- | --- | --- |
| `Usuario` | `id` | `Int` |
| `Usuario` | `nombre` | `String` |
| `Usuario` | `apellido` | `String` |
| `Usuario` | `numeroControl` | `String` |
| `Usuario` | `contrasenaHash` | `String` |
| `Usuario` | `intentosFallidos` | `Int` |
| `Usuario` | `estado` | `EstadoUsuario` |
| `Usuario` | `rol` | `RolUsuario` |
| `Usuario` | `creado` | `DateTime` |
| `Usuario` | `actualizado` | `DateTime` |
| `SesionUsuario` | `id` | `Int` |
| `SesionUsuario` | `tokenHash` | `String` |
| `SesionUsuario` | `inicio` | `DateTime` |
| `SesionUsuario` | `vencimiento` | `DateTime` |
| `SesionUsuario` | `finalizada` | `DateTime?` |
| `SesionUsuario` | `motivoFinalizacion` | `String?` |
| `DispositivoSesionUsuario` | `id` | `Int` |
| `DispositivoSesionUsuario` | `tipo` | `TipoDispositivoUsuario` |
| `DispositivoSesionUsuario` | `token` | `String` |
| `DispositivoSesionUsuario` | `creado` | `DateTime` |
| `DispositivoSesionUsuario` | `desactivado` | `DateTime?` |
| `PermisoUsuario` | `id` | `Int` |
| `PermisoUsuario` | `modulo` | `String` |
| `PermisoUsuario` | `controlador` | `String` |
| `PermisoUsuario` | `creado` | `DateTime` |
| `PermisoUsuario` | `actualizado` | `DateTime` |
| `PlantillaPermiso` | `id` | `Int` |
| `PlantillaPermiso` | `rol` | `RolUsuario` |
| `PlantillaPermiso` | `modulo` | `String` |
| `PlantillaPermiso` | `controlador` | `String` |
| `BloqueoUsuario` | `id` | `Int` |
| `BloqueoUsuario` | `fecha` | `DateTime` |
| `BloqueoUsuario` | `vencimientoPrevisto` | `DateTime` |
| `BloqueoUsuario` | `finalizacionEfectiva` | `DateTime?` |
| `BloqueoUsuario` | `formaFinalizacion` | `FormaFinalizacionBloqueo?` |
| `BloqueoUsuario` | `motivo` | `String?` |
| `UsuarioSucursal` | `id` | `Int` |
| `UsuarioSucursal` | `creado` | `DateTime` |
| `UsuarioSucursal` | `actualizado` | `DateTime` |
| `Sucursal` | `id` | `Int` |
| `Sucursal` | `nombre` | `String` |
| `Sucursal` | `estado` | `EstadoSucursal` |
| `Sucursal` | `zonaHoraria` | `String` |
| `Estado` | `id` | `Int` |
| `Estado` | `nombre` | `String` |
| `Estado` | `clave` | `String` |
| `Municipio` | `id` | `Int` |
| `Municipio` | `nombre` | `String` |
| `Municipio` | `clave` | `String` |
| `DireccionSucursal` | `id` | `Int` |
| `DireccionSucursal` | `cp` | `String` |
| `DireccionSucursal` | `colonia` | `String` |
| `DireccionSucursal` | `calle` | `String` |
| `DireccionSucursal` | `numero` | `String` |
| `DescansoSucursal` | `id` | `Int` |
| `DescansoSucursal` | `dia` | `Int` |
| `DescansoSucursal` | `mes` | `Int` |
| `HorarioSemanalSucursal` | `id` | `Int` |
| `HorarioSemanalSucursal` | `dia` | `DiaHorarioSemanalSucursal` |
| `HorarioSemanalSucursal` | `entrada` | `DateTime` |
| `HorarioSemanalSucursal` | `salida` | `DateTime` |
| `ContactoSucursal` | `id` | `Int` |
| `ContactoSucursal` | `nombre` | `String` |
| `ContactoSucursal` | `telefono` | `String` |
| `ContactoSucursal` | `correo` | `String` |
| `ContactoSucursal` | `rol` | `RolContactoSucursal` |
| `ParticionSucursal` | `id` | `Int` |
| `ParticionSucursal` | `codigoCuenta` | `String` |
| `ParticionSucursal` | `estado` | `EstadoParticionSucursal` |
| `ZonaParticion` | `id` | `Int` |
| `ZonaParticion` | `tipo` | `String` |
| `ZonaParticion` | `nombre` | `String` |
| `ZonaParticion` | `numero` | `String` |
| `ZonaParticion` | `descripcion` | `String` |
| `ZonaParticion` | `estado` | `EstadoZonaParticion` |
| `SensorZona` | `id` | `Int` |
| `SensorZona` | `numeroSerie` | `String` |
| `SensorZona` | `etiqueta` | `String` |
| `SensorZona` | `descripcion` | `String` |
| `SensorZona` | `estado` | `EstadoSensorZona` |
| `CamaraZona` | `id` | `Int` |
| `CamaraZona` | `prioridad` | `Int` |
| `CamaraZona` | `ip` | `String` |
| `CamaraZona` | `urlStream` | `String` |
| `CamaraZona` | `estado` | `EstadoCamaraZona` |
| `RecepcionEvento` | `id` | `Int` |
| `RecepcionEvento` | `origen` | `String` |
| `RecepcionEvento` | `codigoExterno` | `String?` |
| `RecepcionEvento` | `claveDeduplicacion` | `String?` |
| `RecepcionEvento` | `contenido` | `Json` |
| `RecepcionEvento` | `ocurrido` | `DateTime?` |
| `RecepcionEvento` | `recibido` | `DateTime` |
| `RecepcionEvento` | `procesado` | `DateTime?` |
| `RecepcionEvento` | `estado` | `EstadoRecepcionEvento` |
| `RecepcionEvento` | `error` | `String?` |
| `EventoSucursal` | `id` | `Int` |
| `EventoSucursal` | `tipo` | `TipoEventoSucursal` |
| `EventoSucursal` | `anomalia` | `AnomaliaEventoSucursal` |
| `EventoSucursal` | `estado` | `EstadoEventoSucursal` |
| `EventoSucursal` | `claveDeduplicacion` | `String` |
| `EventoSucursal` | `creado` | `DateTime` |
| `EventoSucursal` | `actualizado` | `DateTime` |
| `AtencionEvento` | `id` | `Int` |
| `AtencionEvento` | `inicio` | `DateTime` |
| `AtencionEvento` | `finalizada` | `DateTime?` |
| `AtencionEvento` | `formaFinalizacion` | `FormaFinalizacionAtencion?` |
| `AtencionEvento` | `motivo` | `String?` |
| `AtencionEvento` | `vigente` | `Boolean?` |
| `HistorialEvento` | `id` | `Int` |
| `HistorialEvento` | `accion` | `AccionHistorialEvento` |
| `HistorialEvento` | `estadoAnterior` | `EstadoEventoSucursal?` |
| `HistorialEvento` | `estado` | `EstadoEventoSucursal?` |
| `HistorialEvento` | `observacion` | `String?` |
| `HistorialEvento` | `fecha` | `DateTime` |
| `EscalamientoEvento` | `id` | `Int` |
| `EscalamientoEvento` | `rolOrigen` | `RolUsuario` |
| `EscalamientoEvento` | `rolDestino` | `RolUsuario` |
| `EscalamientoEvento` | `fecha` | `DateTime` |
| `NotificacionEvento` | `id` | `Int` |
| `NotificacionEvento` | `estado` | `EstadoNotificacionEvento` |
| `NotificacionEvento` | `creado` | `DateTime` |
| `NotificacionEvento` | `enviado` | `DateTime?` |
| `NotificacionEvento` | `entregado` | `DateTime?` |
| `NotificacionEvento` | `recibido` | `DateTime?` |
| `NotificacionEvento` | `abierto` | `DateTime?` |
| `IntentoNotificacion` | `id` | `Int` |
| `IntentoNotificacion` | `numero` | `Int` |
| `IntentoNotificacion` | `estado` | `EstadoIntentoNotificacion` |
| `IntentoNotificacion` | `inicio` | `DateTime` |
| `IntentoNotificacion` | `finalizado` | `DateTime?` |
| `IntentoNotificacion` | `identificadorExterno` | `String?` |
| `IntentoNotificacion` | `error` | `String?` |
| `ResolucionEvento` | `id` | `Int` |
| `ResolucionEvento` | `accion` | `AccionResolucionEvento` |
| `ResolucionEvento` | `comentarios` | `String` |
| `ResolucionEvento` | `creado` | `DateTime` |
| `ResolucionEvento` | `actualizado` | `DateTime` |
