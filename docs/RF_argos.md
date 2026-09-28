# Argos Apex

## Requerimientos funcionales (RF)


### RF1 - Recepción de señales de sensores:

Mediante el comunicador LE4050M y la configuración inicial realizada con DSC Connect Installer, capturará eventos y datos de sensores. Una vez detectada la señal a través del canal de comunicación del panel, los datos se transmitirán al servidor configurado. Para la recepción de estas señales, el sistema deberá soportar los siguientes escenarios según la configuración del panel:

- A) El sistema debe permitir transmitir eventos y datos de sensores a servidores externos. La comunicación se realizará mediante protocolos HTTP Webhook tras la inicialización con DSC Connect Installer, donde el panel envía las señales detectadas por el LE4050M al Endpoint REST configurado en la red externa.
- B) Cuando el panel se configure para enviar los datos directamente al servidor del proyecto, el sistema deberá implementar un receptor basado en el protocolo SIA DC-09 sobre TCP o UDP, que permita interpretar y procesar cada evento recibido.


### RF2 – Vinculación automática:

Al recibir una señal de algún sensor, el sistema debe de identificar automáticamente a la zona física con la que se asocie, al igual que con la cámara de videovigilancia correspondiente eliminando así la búsqueda manual.

### RF3 Clasificación de anomalías:

El sistema debe de clasificar cada anomalía de forma automática de acuerdo con las siguientes condiciones

| Eventos                                  | Condición                                        | Anomalía                                                |
| -----------------------------------------|:------------------------------------------------:|:-------------------------------------------------------:|
| Sensor Activado (Humo / Incendio)        | Si el valor supera el límite configurado         | Incendio o humo generado                                |
| Ruptura de cristal                       | Si se activa el sensor	                          | Ingreso de algún intruso o la ruptura de algún cristal  |
| Contacto magnético en cortinas de acceso | Si se activa el sensor fuera del horario laboral | Ingreso de algún intruso                                |
| Sensor de movimiento                     | Si se detecta movimiento extraño                 | Algún robo o acceso no autorizado en horario no laboral |
| Botón de pánico                          | En cualquier momento donde se accione            | Emergencia                                              |

### RF4 

Una vez detectada una anomalía, el sistema deberá enviar de forma inmediata una notificación push de alta prioridad a los dispositivos del personal de monitoreo (móvil o escritorio). La notificación deberá ser breve y contener como mínimo la siguiente información.

- Tipo de anomalía detectada.
- Nombre de la sucursal y zona donde se detectó la anomalía.
- Fecha y hora de la anomalía


La configuración debe soportar dos niveles operativos:


1.  Notificación Inicial: Se despliega en el dispositivo con un icono distintivo (color rojo/flash) y los siguientes datos dinámicos:
    - Tipo de anomalia
    - ubicación
    - tiempo de detención

2. Lógica de Escalado: Si el administrador asignado no responde ni activa la alerta en un tiempo configurado (ej. N mins), el sistema debe:
    - Desactivar la notificación repetitiva para el mismo usuario.
    - Enviar automáticamente una copia a un nivel jerárquico superior (Gerente/Jefe de Seguridad) con la misma información y estado "En Escalada".

3. Gestión de Estado: La notificación debe mantenerse en activo hasta que se confirme su resolución o cierre, permitiendo al equipo ver el historial de intentos.

### - RF5

Al presionar la notificación push, la aplicación deberá abrirse automáticamente y mostrar la cámara de videovigilancia en vivo correspondiente a la zona donde se activó el sensor, sin necesidad de que el usuario la busque manualmente. Esta funcionalidad deberá operar independientemente del estado de la aplicación:

- Aplicación abierta (primer plano).
- Aplicación en segundo plano.
- Aplicación cerrada.

Casos considerados:

- Múltiples notificaciones simultáneas: Si el usuario recibe varias notificaciones, al presionar una de ellas se deberá abrir directamente la cámara asociada a ese evento específico, sin interferir con las demás alertas pendientes.
- Evento ya atendido por otro usuario: Si el evento fue atendido o descartado por otro usuario antes de que este abra la notificación, la aplicación deberá mostrar un mensaje indicando que el evento ya fue gestionado y ofrecer la opción de ver el historial o la grabación del evento.

### RF6 – Pantalla de atención: 

Cuando un operador atiende una alerta activada por Deep Linking, debe aparecer una pantalla de resumen integradora que muestre:

1. Visor Principal: Flujo de video en vivo de la cámara vinculada a la zona afectada.
2. Metadatos Críticos: Hora de detección y ubicación (Sucursal/Zona) visibles sobre el video o en panel lateral.
3. Contactos Estratégicos: Lista desplegable de nombres, teléfonos del Gerente de Sucursal y autoridad de emergencia local.
4. Acciones de Cierre: Botones claros para "Confirmar/Aceptado" (cerrando la alerta) o "Revisar/Descartar".
    - Si se selecciona "Descartar": La notificación desaparece del cliente actual y no envía alertas más a otros equipos
    - Si se selecciona "Aceptado/En Curso": El estado de alerta cambia a "En Atendio", notificando visualmente a los demás monitores en tiempo real (evitando duplicidad).
5. Comportamiento de No-Respuesta: Si el usuario intenta cerrar la sesión sin confirmar (ej. "Ignorar"), el sistema debe registrar esto como "No respondida" y activar automáticamente la lógica de escalada definida en RF4 si aplica.


#### RF6.1 - Confirmación o descarte de eventos:

"Descartar" en la pantalla de atención, el sistema deberá registrar automáticamente:

- Identificador del encargado que realizó la acción.
- Fecha y hora de la acción.
- Estado final del evento (confirmado o descartado).
- En caso de descarte: el motivo de la falsa alarma, seleccionado de un catálogo predefinido (por ejemplo: movimiento de personal, animal, falla técnica, error de sensor, otro) y/o un campo de texto libre.

### RF7 – Llamada directa:

El personal encargado del monitoreo debe poder iniciar una llamada telefónica al gerente o las autoridades con un solo toque, sin necesidad de copiar el numero telefónico. En caso de que el encargado se encuentre en un equipo de escritorio tiene la función de copiar dicho número telefónico al portapapeles.


### RF8 – Visualización de cámara(s) asociada(s) al evento:

Al atender un evento, el sistema deberá transmitir en vivo la cámara asociada a la zona donde se detectó la anomalía. Cada evento estará vinculado a una o más cámaras según la configuración de la zona.
Casos considerados:

- Un evento, una cámara: Se muestra el video en vivo de la cámara asociada.
- Un evento, múltiples cámaras (misma zona): Si la zona afectada tiene varias cámaras vinculadas (por ejemplo, una zona con varios ángulos), el sistema deberá mostrarlas en una vista multipantalla dentro de la misma pantalla de atención, priorizando la cámara que disparó el evento.
- Evento grande o multi-zona: Si el evento involucra varios sensores o cámaras en distintas zonas de la misma sucursal (por ejemplo, una intrusión que activa varios sensores), el sistema deberá agruparlos en un solo evento consolidado o bien en un evento principal con eventos secundarios asociados, y mostrar todas las cámaras relevantes en una vista multipantalla, permitiendo al encargado navegar entre ellas.
- Atención de un evento a la vez: El encargado atenderá un evento a la vez. Si tiene varios eventos pendientes, deberá poder cambiar entre ellos desde el panel de monitoreo (ver RF10), pero la pantalla de atención mostrará un evento activo a la vez.

### RF9 – Panel de Monitoreo y Historial

El panel debe permitir al encargado gestionar y revisar todo el historial de actividad del monitoreo:

1. Filtrado de Estado: Debe mostrar todas las alertas por su estado actual (activa pendiente, confirmada / cerrada o descartada).
2. Consulta Pendientes: El usuario debe poder visualizar claramente cuáles son las alertas pendientes de respuesta.
3. Historial Completo: Incluye un registro con fecha y hora, sucursal, ubicación del sensor, tipo de evento y quién lo resolvió (o motivo de descarte en caso de falsa alarma).

### RF10 – Configuración de datos:

El gerente o personal autorizado debe de poder registrar y actualizar desde el sistema: zonas físicas de la sucursal, sensores instalados (tipos, zona donde se encuentra), cámaras (zona asociada y URL del stream) y el horario laboral de la sucursal. 


### RF11 – Gestión de contactos:

El personal autorizado debe poder registrar, actualizar y eliminar los contactos de emergencia por tipo de anomalía (bomberos o policía) y el gerente de la sucursal (nombre, cargo y número telefónico).

### RF12 – Control de acceso:

El sistema debe de requerir autenticación con usuario y contraseña. Debe de tener roles tal como:
- Administrador: Con acceso total.
- Gerente_sucursal: con acceso total a la configuración de una sucursal.
- Operador: con acceso a la visualización y gestión de anomalías.

> En caso de no ingresar el usuario o contraseña correcta, se boquea la cuenta durante 10 minutos tras 5 intentos fallidos.