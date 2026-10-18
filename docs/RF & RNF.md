# Requerimientos funcionales

## Módulos

| Módulo | Responsabilidad |
| :---- | :---- |
| Usuario y permisos | Identidad, sesiones, cuentas, bloqueo y autorización. |
| Sucursales y operación | Registro de sucursales, dirección, horarios, calendario y contactos. |
| Arquitectura de monitoreo | Particiones, zonas, sensores, cámaras y sus relaciones. |
| Eventos y monitoreo | Recepción, clasificación, seguimiento, decisiones e historial de eventos. |
| Notificaciones y escalamiento | Dispositivos, destinatarios, envíos, reintentos, repetición y escalada. |
| Videovigilancia y atención contextual | Apertura del contexto, vídeo, selección de cámaras y comunicación con contactos. |

### 1\. Usuarios y permisos

| N. RF | Función | Actor | Comportamiento |
| :---- | :---- | :---- | :---- |
| 01 | Iniciar sesión | Cualquier usuario registrado | El sistema deberá validar el identificador de acceso y contraseña, verificar cuenta vigente y sin bloqueo, y una sesión con los permisos asignados al rol. |
| 02 | Cerrar sesión | Usuario autenticado | El sistema deberá terminar la sesión del usuario autenticado y retirar la asociación de avisos de esa sesión. |
| 03 | Registrar operador | Administrador o gerente | El sistema deberá permitir crear una cuenta OPERADOR con identificador único, datos personales y sucursal. El gerente solo podrá usar su propia sucursal |
| 04 | Registrar gerente | Administrador | El sistema deberá permitir crear una cuenta GERENTE y vincularla a una sucursal. |
| 05 | Consultar usuarios administrables | Administrador o gerente | El sistema deberá listar los usuarios que el actor puede administrar y permitir filtrar por nombre, identificador y estado. El gerente verá únicamente operadores de su sucursal en este listado. |
| 06 | Consultar detalle de usuario | Administrador o gerente | El sistema deberá mostrar datos de cuenta, estado y condición de bloqueo (si la tiene) del usuario seleccionado. |
| 07 | Actualizar datos de usuario | Administrador o gerente | El sistema deberá permitir modificar los datos de identificación y nombre de cuentas. El rol se gestionará mediante operaciones específicas. |
| 08 | Desactivar cuenta | Administrador o gerente | El sistema deberá permitir desactivar una cuenta dentro del alcance del actor, invalidar su acceso y liberar su atención activa |
| 09 | Reactivar cuenta | Administrador o gerente | El sistema deberá permitir reactivar una cuenta administrativamente inactiva dentro del alcance permitido |
| 10 | Bloquear por intentos fallidos | Quinto fallo consecutivo de autenticación | El sistema deberá bloquear nuevos intentos de autenticación de la cuenta durante diez minutos, registrando inicio y vencimiento.  |
| 11 | Desbloquear automáticamente | Vencimiento del bloqueo temporal | El sistema deberá finalizar el bloqueo al cumplirse diez minutos y reiniciar el contador de fallos |
| 12 | Desbloquear manualmente | Administrador o gerente autorizado | El sistema deberá permitir terminar un bloqueo temporal vigente, solicitando motivo y registrando actor y fecha. |
| 13 | Reasignar sucursal de usuario | Administrador | El sistema deberá permitir trasladar un operador o gerente a una sucursal válida, conservando una sola relación entre usuario y sucursal. |
| 14 | Aplicar permisos por rol | Cualquier solicitud autenticada | El sistema deberá autorizar cada acción conforme a la matriz de permisos o responsabilidades, negar acciones fuera de su rol. |

###     2\. Sucursales y operación

| N. RF | Función | Actor | Comportamiento |
| :---- | :---- | :---- | :---- |
| 01 | Registrar sucursal | Administrador | El sistema deberá crear una sucursal con nombre, estado inicial y datos de ubicación necesarios para operar. |
| 02 | Consultar sucursales | Administrador | El sistema deberá listar las sucursales visibles y permitir al administrador filtrar por nombre y estado. |
| 03 | Consultar detalle de sucursal | Administrador o gerente | El sistema deberá presentar nombre o identificación de la sucursal, ubicación, estado y contexto operativo de la sucursal, además el historial de eventos. Los controles de edición dependen del rol. |
| 04 | Actualizar datos de sucursal | Administrador o gerente | El sistema deberá permitir modificar nombre y datos locales de una sucursal autorizada sin cambiar sus identificadores ni el registro histórico de eventos. |
| 05 | Activar o desactivar sucursal | Administrador | El sistema deberá cambiar el estado administrativo de la sucursal, advertir si existen eventos abiertos y conservar su historial y señales recibidas. |
| 06 | Configurar horario semanal | Administrador o gerente | El sistema deberá registrar y actualizar el horario de cada día, indicando días no laborables. |
| 07 | Registrar contacto | Administrador o gerente | El sistema deberá registrar un contacto de la sucursal con nombre, cargo o tipo, teléfono, correo cuando proceda y anomalías para las que sea pertinente. |
| 08 | Consultar contactos | Administrador o gerente | El sistema deberá registrar un contacto de la sucursal con nombre, cargo o tipo, teléfono, correo opcional y rol para las anomalías que pueda manejar. |
| 09 | Actualizar contacto | Administrador o gerente | El sistema deberá permitir corregir datos y asociaciones de un contacto, usando la nueva información en futuras consultas y comunicaciones. |
| 10 | Retirar contacto | Administrador o gerente | El sistema deberá permitir retirar un contacto de uso operativo y advertir cuando deje sin contacto un evento. |

###   3\. Arquitectura de monitoreo

| N. RF | Función | Actor | Comportamiento |
| :---- | :---- | :---- | :---- |
| 01 | Registrar partición | Administrador o gerente | El sistema deberá crear una partición asociada a la sucursal, con código de cuenta o identificación |
| 02 | consultar particiones | Administrador o gerente | El sistema deberá mostrar las particiones de la sucursal visible con su identificación, estado y zonas asociadas. |
| 03 | Actualizar partición | Administrador o gerente | El sistema deberá permitir corregir la identificación de una partición y actualizar el estado |
| 04 | Registrar zona | Administrador o gerente | El sistema deberá crear una zona con partición, número, nombre, tipo y descripción, también puede estar relacionado la zona directamente con la sucursal sin partición.  |
| 05 | Consultar zonas | Administrador o gerente | El sistema deberá listar y presentar las zonas de una partición o sucursal con su estado, sensores y cámaras. |
| 06 | Actualizar zona | Administrador o gerente | El sistema deberá permitir corregir nombre, descripción, tipo y número de zona e identificación, así como su estado.  |
| 07 | Registrar sensor | Administrador o gerente | El sistema deberá registrar un sensor con zona, tipo, identificador disponible en las señales, serie cuando exista, etiqueta y estado. |
| 08 | Consultar sensores | Administrador o gerente | El sistema deberá mostrar los sensores configurados en cada zona con tipo, identificación y estado. |
| 09 | Actualizar sensor | Administrador o gerente | El sistema deberá permitir corregir el tipo y datos descriptivos o de identificación de un sensor, así como su estado, permitiendo pasar un sensor a activo o inactivo.  |
| 10 | Registrar cámara | Administrador o gerente | El sistema deberá crear una cámara asociada a una zona con identificación, dirección, URL de transmisión, prioridad y estado. |
| 11 | Consultar cámaras | Administrador o gerente | El sistema deberá mostrar las cámaras de una zona con identificación, prioridad y estado. |
| 12 | Actualizar cámara | Administrador o gerente | El sistema deberá permitir corregir la identificación, dirección y acceso al stream de una cámara. Deberá permitir activar, desactivar, marcar mantenimiento o dar de baja una cámara, además ordenar las cámaras de una zona para establecer la primera opción de visualización  (prioridad). |
| 13 | Probar acceso a cámara | Administrador o gerente | El sistema deberá permitir comprobar una configuración de cámara antes de usarla operativamente y mostrar un resultado de acceso. |

###   4\. Eventos y monitoreo

Ciclo de vida de los eventos

| Estado | Significado | Salida |
| :---- | :---- | :---- |
| PENDIENTE | Evento operativo todavía sin responsable de atención. | EN\_ATENCION al tomarlo. |
| EN\_ATENCION | Un encargado analiza la señal y su contexto. | CONFIRMADO si verifica el incidente; DESCARTADO si determina falsa alarma; PENDIENTE si libera la atención. |
| CONFIRMADO | El evento se considera real y aún requiere gestión. | RESUELTO al registrar su cierre. Si pierde el encargado, conserva la confirmación y vuelve a requerir asignación. |
| RESUELTO | Evento confirmado cuya gestión terminó. | Sin salida. |
| DESCARTADO | Evento cerrado como falsa alarma o señal no pertinente, con motivo. | Sin salida. |

| N. RF | Función | Actor | Comportamiento |
| :---- | :---- | :---- | :---- |
| 01 | Recibir señales | Emisor o receptor autorizado | El sistema deberá recibir los eventos mediante el contrato de integración adoptado y emitir la respuesta o confirmación prevista por ese contrato.Mediante el comunicador LE4050M y la configuración inicial realizada con DSC Connect Installer, capturará eventos y datos de sensores.(aún pendiente por confirmar el escenario de recepción)  |
| 02 | Normalizar señal | Mensaje válido aceptado | El sistema deberá convertir el formato externo al contrato interno, conservando identificación de origen, código |
| 04 | Vincular señal con sucursal y zona | Señal normalizada | El sistema deberá identificar la sucursal, partición y zona por las claves del contrato y localizar sus sensores y cámaras configurados. |
| 05 | Clasificar evento | Señal vinculada | El sistema deberá aplicar reglas por tipo y código de señal, horario de sucursal y configuración vigente, registrando la regla utilizada. |
| 06 | Registrar evento y controlar duplicados | Evento clasificado | El sistema deberá crear un evento con su contexto y estado inicial, identificando reenvíos de la misma señal. |
| 07 | Tomar atención de evento | Administrador, gerente u operador | El sistema deberá asignar un único encargado vigente al evento atendible y validar que el actor no esté atendiendo otro evento |
| 08 | Confirmar incidente | Encargado vigente | El sistema deberá registrar que el evento analizado corresponde a un incidente real, con actor, fecha y observación, pasando de EN\_ATENCION a CONFIRMADO. |
| 09 | Resolver incidente | Encargado vigente | El sistema deberá permitir cerrar un incidente CONFIRMADO con resultado de gestión, actor y fecha. |
| 10 | Descartar evento | Encargado vigente | El sistema deberá permitir cerrar un evento EN\_ATENCION como falsa alarma, exigiendo motivo. |
| 11 | Liberar o abandonar atención | Encargado o detección de pérdida de sesión | El sistema deberá registrar la liberación o abandono de sesión, retirar al encargado y dejar el evento disponible para nueva atención |
| 12 | Consultar historial de eventos | Administrador o gerente | El sistema deberá permitir consultar eventos previos dentro del alcance de sucursal, incluyendo resueltos y descartados y su decisión final. |
| 13 | Filtrar y navegar eventos | Administrador o gerente | El sistema deberá filtrar por estado, tipo/anomalía, rango de fechas y sucursal. |
| 14 | Consultar detalle de evento | Administrador o gerente | El sistema deberá mostrar contexto de señal, sucursal, zonas implicadas, estado, encargado, cronología y decisión final. |

###   5\. Notificaciones y escalamiento

| N. RF | Función | Actor | Comportamiento |
| :---- | :---- | :---- | :---- |
| 01 | Registrar destino de avisos | Cliente autenticado | El sistema deberá registrar y relacionar el dispositivo o canal activo con la sesión del usuario  |
| 02 | Retirar destino de avisos | Cierre de sesión, baja o dispositivo invalido  | El sistema deberá desactivar la asociación de entrega al usuario cuando deje de ser válida |
| 03 | Seleccionar destinatarios iniciales | Evento notificable | El sistema deberá seleccionar operadores activos autorizados para la sucursal y usar sus destinos vigentes. |
| 04 | Construir contenido del aviso | Aviso preparado | El sistema deberá generar el aviso con tipo de anomalía, sucursal, zona o referencia y fecha/hora  |
| 05 | Enviar aviso inicial | Evento y destinatarios definidos | El sistema deberá enviar el aviso al canal de cada destinatario y guardar el identificador del intento y resultado de envío. |
| 06 | Registrar estado del aviso | Envío y seguimiento | El sistema deberá distinguir entre entregado, recibido y abierto. |
| 07 | Repetir aviso no atendido | Evento sin encargado | El sistema deberá reiterar el aviso con la frecuencia configurada mientras siga pendiente de atención |
| 08 | Configurar política de escalamiento | Administrador o gerente | El sistema deberá permitir establecer destinatarios, sustitutos, umbral de no respuesta y repetición por nivel, se propone:operador \-\> gerente local \-\> administrador. |
| 09 | Ejecutar escalamiento | Vencimiento del plazo sin responsable | El sistema deberá comprobar el estado y encargado actuales, notificar al siguiente nivel válido y registrar la escalada. |
| 10 | Detener avisos por atención o cierre | Envío y seguimiento | El sistema deberá detener repetición y escaladas pendientes mientras exista encargado |

###   6\. Videovigilancia y atención contextual

| N. RF | Función | Disparador | Comportamiento |
| :---- | :---- | :---- | :---- |
| 01 | Abrir contexto de evento | Selección desde el panel o enlace de notificación. | El sistema deberá abrir el evento específico después de comprobar sesión |
| 02 | Elegir cámara prioritaria  | Apertura de evento | El sistema deberá seleccionar la primera cámara operativa según la prioridad de la zona |
| 03 | Reproducir video en vivo | Apertura de evento | El sistema deberá solicitar y reproducir la transmisión autorizada de la cámara asociada |
| 04 | Cambiar cámara del evento | Usuario selecciona otra cámara | El sistema deberá permitir cambiar o ampliar la cámara visualizada entre las asociadas al evento |
| 05 | Presentar contexto de atención | Apertura de evento | El sistema deberá mostrar tipo, sucursal, zona, fecha/hora, estado  y ofrecer las acciones para dicho evento. |
| 06 | Mostrar falla o ausencia de video | Cámara no configurada | El sistema deberá informar la condición y conservar disponibles el evento, contactos y decisiones compatibles. |
| 07 | Reintentar reproducción | Usuario solicita recuperar video | El sistema deberá permitir volver a solicitar la transmisión de una cámara disponible |
| 08 | Presentar contactos pertinentes | Atención de evento | El sistema deberá mostrar gerente y contactos de emergencia de la sucursal pertinentes a la anomalía |
| 09 | Iniciar llamada en Android | Usuario selecciona un contacto | El cliente deberá abrir la interfaz telefónica del dispositivo con el número del contacto seleccionado |
| 10 | Copiar teléfono en Windows | Usuario selecciona un contacto | El cliente deberá copiar al portapapeles el número utilizable del contacto elegido |

#          Requerimientos no funcionales

##  1\. Look and Feel

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Apariencia | Las interfaces de usuario deberán utilizar el nombre, logotipo y recursos de marca aprobados | Permite reconocer el producto. |
| 02 | Apariencia | Los componentes equivalentes deberán mantener la misma apariencia y significado en las pantallas | Reducir interpretaciones distintas de una misma acción |
| 03 | Apariencia | Cada estado del evento deberá tener una representación visual consistente mediante texto y color. | Distinguir pendientes, atención y cierre. |
| 04 | Apariencia | La pantalla de atención deberá mostrar una diferencia visual al tipo de anomalía. | Orientar la revisión hacia el contexto del incidente. |
| 05 | Apariencia | Los textos y etiquetas deberán mantener legibilidad mediante contraste suficiente frente a su fondo. | Facilitar la lectura durante el monitoreo. |
| 06 | Apariencia | Las pantallas deberán conservar sus componentes y datos visibles y utilizables al cambiar el tamaño de ventana | Evitar que la composición oculte información operativa. |
| 07 | Apariencia | Los iconos de cámara, llamada, historial y acciones de evento deberán mantener un significado mediante etiquetas o ayudas visibles. | Evitar depender de símbolos desconocidos. |
| 08 | Estilo | La interacción deberá transmitir claridad y control mediante información directa y mensajes que indiquen la situación y el siguiente paso. | Dar confianza durante incidentes. |
| 09 | Estilo | Las alertas deberán llamar la atención sin ruido visual, que dificulte la observación | Evitar fatiga y molestias por estímulos visuales. |
| 10 | Estilo | La información esencial de los eventos debe ser conservada en las notificaciones  | Mantener reconocible el evento desde el aviso. |

## 2\. Usabilidad y humanidad

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Facilidad de uso | El recorrido desde una notificación hasta la información del evento deberá requerir el mínimo de pasos operativos. | Acelerar la atención. |
| 02 | Facilidad de uso | Las acciones de atención y descarte deberán ser distinguibles y resistentes a errores de interacción. | Evitar decisiones accidentales. |
| 03 | Facilidad de uso | La captura de configuraciones y contactos deberá ayudar a corregir datos inválidos | Configuración inválida o repetición de trabajo |
| 04 | Personalización e internacionalización | La interfaz deberá estar íntegramente disponible en español de México | Facilitar el trabajo en el idioma del personal. |
| 05 | Aprendizaje | El administrador y gerente deberán aprender el recorrido básico del panel para la configuración operativa. | Configuración correcta |
| 06 | Aprendizaje | Un operador nuevo deberá aprender el recorrido básico de atención mediante una capacitación breve. | Reducir el tiempo de incorporación. |
| 07 | Entendimiento | Los nombres de estados y acciones deberán ser comprensibles para el personal de monitoreo  | Evitar confundir aceptación con resolución. |
| 08 | Entendimiento | Los iconos por tipo de evento y estado deberán ser comprensibles para el personal | expresar sus consecuencias de cada acción. |
| 09 | Entendimiento | La navegación del panel debe ser clara manteniendo una correcta separación entre módulos. | Navegación instintiva |
| 10 | Accesibilidad | El cliente Windows deberá permitir ejecutar las tareas operativas mediante teclado. | Permitir operar sin ratón. |

## 3\. Rendimiento

P95: (percentil 95\) es un valor estadístico que indica que el 95% de los datos de un conjunto se encuentra por debajo de esa cifra, mientras que el 5% restante está por encima. 

**Latencia de una API:** Si el p95 de respuesta de una página web es de 480 ms, significa que el 95% de los usuarios experimentan un tiempo de carga igual o menor a 480 milisegundos, y solo el 5% restante experimenta demoras mayores

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Velocidad y latencia | El sistema deberá validar, persistir, asociar y clasificar cada señal válida recibida en un P95 de hasta un segundo. | Disponer pronto del evento para atención. |
| 02 | Velocidad y latencia | Una alerta procesada deberá entregarse al canal de notificación en un P95 de hasta tres segundos. | Reducir el tiempo del aviso. (Se mide desde que el evento queda listo para notificar hasta la aceptación del proveedor push o del canal de escritorio activo) |
| 03 | Velocidad y latencia | La visualización deberá presentar el primer frame de la cámara en un P95 de hasta cinco segundos desde la solicitud autorizada. | Facilitar la verificación visual. |
| 04 | Velocidad y latencia | El historial deberá responder las consultas paginadas habituales en un P95 de hasta dos segundos. | Mantener ágil la revisión de actividad. |
| 05 | Safety | La falla o interrupción del video deberá hacerse evidente sin cerrar ni descartar automáticamente la alerta. | Evitar que una imagen congelada se interprete como una situación normal. |
| 06 | Precisión | Las clasificaciones por horario y los vencimientos de escalamiento deberán usar la zona horaria de la sucursal y tiempos coherentes. | Evitar decisiones incorrectas por desfases temporales. |
| 07 | Fiabilidad y disponibilidad | Las funciones centrales de recepción, consulta y atención deberán tener una disponibilidad mensual mínima de 99.5 %. | Dar continuidad al monitoreo. |
| 08 | Fiabilidad y tolerancia a fallos | El procesamiento deberá tolerar reintentos y fallas sin perder eventos. | Mantener información confiable ante incidentes |
| 09 | Capacidad de almacenamiento | El sistema deberá administrar al menos el volumen inicial de una  sucursal, decenas de zonas, cámaras y cientos de eventos sin degradar las metas de recepción y consulta. | Dimensionar el almacenamiento de metadatos |
| 10 | Escalabilidad | La solución deberá admitir un crecimiento de más sucursales  | Permitir incorporar sucursales sin rediseñar las interfaces del producto. |

##    4\. Operación

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Condiciones ambientales esperadas | El sistema deberá estar preparado para operar en el entorno previsto de paneles HS2032, HS2064 o HS2128 con comunicador LE4050M, cuyo canal de comunicación tenga como destino el receptor del servidor de o un servicio intermediario que reenvíe la información por HTTP a dicho receptor. | Evitar despliegues en condiciones incompatibles.. |
| 02 | Condiciones ambientales esperadas | La operación deberá contemplar conectividad entre el destino configurado del LE4050M y el receptor del servidor, mediante la ruta seleccionada, y entre servidor, clientes y cámaras. | Hacer visibles las limitaciones del entorno de comunicación. |
| 03 | Interfaces con otros sistemas | La integración de entrada deberá ajustarse a un contrato definido para la ruta seleccionada: recepción directa desde el canal del comunicador o reenvío HTTP desde un servicio intermediario, incluyendo formato, identificación, autenticación y confirmación | Evitar asumir protocolos que el equipo no ofrece. |
| 04 | Interfaces con otros sistemas | La reproducción deberá ser compatible con los protocolos, ips y mecanismos de acceso de las cámaras. | Garantizar que la integración de video es utilizable. |
| 05 | Interfaces con otros sistemas | Los avisos y enlaces del evento deberán respetar las capacidades y restricciones de cada sistema operativo. | Establecer un comportamiento comprobable por plataforma. |
| 06 | Requerimientos de producción | La instalación del servidor y la configuración de su receptor deberán ser reproducibles mediante un procedimiento documentado | Reducir errores de implantación |
| 07 | Requerimientos de producción | Desarrollo, pruebas y producción deberán operar con configuraciones y credenciales separadas. | Evitar efectos de pruebas sobre la operación real. |
| 08 | Requerimientos de producción | La operación deberá permitir verificar manualmente que el servicio del sistema responde y consultar registros de errores de sus componentes propios para apoyar el diagnóstico. | Facilitar la revisión básica del servicio durante instalación y soporte. |
| 09 | Requerimientos de nuevas versiones | Cada actualización deberá identificar su versión, documentar sus cambios y coordinar las versiones del servidor y los clientes necesarios para operar. | Facilitar una actualización controlada. |
| 10 | Requerimientos de nuevas versiones | Cada liberación deberá identificar su versión y mostrar compatibilidad | Evitar interrupciones por actualización parcial. |

##   5\. Mantenimiento y soporte  

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Mantenimiento | Los parámetros operativos previstos como configurables, como horarios y tiempos de escalamiento, deberán poder modificarse mediante el mecanismo documentado sin cambiar el código. | Facilitar ajustes de operación. |
| 02 | Mantenimiento | Los receptores deben adaptarse a los formatos de entrada provenientes de la ruta directa o del intermediario HTTP, manteniendo la lógica operativa.  | Limitar el impacto de cambios en la integración. |
| 03 | Mantenimiento | Cada corrección o cambio deberá comprobar el funcionamiento del recorrido afectado y conservar una breve evidencia del resultado | Evitar introducir fallas durante los ajustes. |
| 04 | Mantenimiento | La documentación técnica deberá identificar la ruta de recepción adoptada, su configuración y los ejemplos de eventos disponibles | Facilitar que otra persona comprenda la integración. |
| 05 | Soporte | Operadores, gerentes y administradores deberán disponer de guías vigentes de operación | Facilitar atención inicial y reportes útiles. |
| 06 | Soporte | La entrega deberá indicar un medio de contacto, responsable y período de atención acordados para reportar incidencias del proyecto. | Delimitar el soporte |
| 07 | Soporte | El sistema deberá contar con instrucciones para respaldar y recuperar sus datos y configuración | Permitir una recuperación manual cuando sea necesaria. |
| 08 | Soporte | Los materiales de entrega deberán incluir código y documentación accesibles al responsable de continuidad | Facilitar la continuidad después del proyecto. |
| 09 | Adaptabilidad | Las reglas de clasificación, autorización y atención deberán mantenerse en el servidor | Facilitar ajustes de cliente sin duplicar reglas de negocio. |
| 10 | Adaptabilidad | La documentación deberá identificar las versiones de software y combinaciones de equipos utilizadas en las pruebas | Indicar el entorno en el que se evaluó la entrega. |

## 

## 6\. Seguridad

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Acceso | Las solicitudes a eventos, contactos, configuración y cámaras deberán autorizarse en el servidor según rol y sucursal del usuario. | Evitar acceso a información ajena al usuario. |
| 02 | Acceso | La autenticación deberá aplicar el bloqueo definido en los RF y presentar errores que no permitan distinguir públicamente si una cuenta existe. | Reducir intentos de acceso y exposición de cuentas. |
| 03 | Acceso | Las sesiones cerradas y cuentas desactivadas deberán dejar de autorizar nuevas solicitudes y avisos asociados al usuario. | Evitar conservar acceso después de retirar la autorización. |
| 04 | Integridad | Las modificaciones de estado y resolución deberán ser atendidas por un solo usuario y controlar la atención simultánea. | Evitar cierres contradictorios. |
| 05 | Integridad | Los datos entrantes y las relaciones entre sucursal, partición, zona, sensor y cámara deberán validarse antes de incorporarse al flujo operativo. | Impedir asociaciones incorrectas. |
| 06 | Privacidad | Las comunicaciones de API y avisos internos deberán cifrarse. | Evitar exposición de información en tránsito. |
| 07 | Privacidad | Las contraseñas deberán almacenarse mediante un hash. | Evitar recuperar credenciales |
| 08 | Privacidad | Las notificaciones deberán limitarse a los datos operativos necesarios y excluir credenciales y enlaces directos al stream de la cámara. | Reducir exposición en pantallas bloqueadas. |
| 09 | Auditoría | Las decisiones sobre eventos y cambios administrativos relevantes deberán conservar usuario o proceso responsable, fecha y resultado. | Permitir revisar quién realizó una acción. |
| 10 | Inmunidad | Los mensajes y valores introducidos deberán tratarse como datos validados, sin ejecutar instrucciones de código provenientes de su contenido. | Reducir riesgos por entradas maliciosas. |

##    7\. Culturales y políticos

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Culturales | Los textos deberán utilizar vocabulario reconocido por el personal, manteniendo equivalencias explícitas cuando se empleen términos técnicos. | Favorecer la comprensión compartida. |
| 02 | Culturales | Los textos, iconos y ejemplos propios del producto deberán tratar a las personas sin lenguaje discriminatorio ni estereotipos culturales. | Evitar rechazo o interpretaciones ofensivas. |
| 03 | Culturales | La presentación de fechas y horas deberá evitar ambigüedad regional.  | Interpretar correctamente incidentes entre ubicaciones. |
| 04 | Culturales | Los contactos deberán conservar los formatos telefónicos aprobados para la región atendida y respetar los números de emergencia locales. | Evitar errores al comunicarse. |
| 05 | Culturales | La interpretación de horarios deberá respetar los días y jornadas configurados para cada sucursal. |  |
| 06 | Políticos | El escalamiento deberá ajustarse a la estructura de responsabilidades, determinada por el rol, sin depender de nombres o jerarquías fijados en código. | Reflejar la cadena real de atención. |
| 07 | Políticos  | La distribución de permisos deberá respetar la separación acordada entre administración, gerencia de sucursal y operación de monitoreo. | Evitar conflictos de atribuciones. |
| 08 | Políticos | La operación entre sucursales deberá respetar el alcance de supervisión acordado y permitir conocer a quién corresponde atender cada alerta. | Mantener la responsabilidad entre equipos. |
| 09 | Políticos | Las decisiones de atención deberán quedar atribuidas sin borrarse por cambios posteriores de puesto o estructura. | Mantener los datos. |
| 10 | Culturales | Los nombres de personas, zonas y sucursales deberán conservar acentos y caracteres utilizados en español. | Respetar la identificación habitual de personas y lugares. |

## 8\. Legales

| N. RNF | SUBTIPO | REQUERIMIENTO | JUSTIFICACIÓN |
| :---- | :---- | :---- | :---- |
| 01 | Cumplimiento | Las dependencias, imágenes, fuentes y demás recursos distribuidos deberán contar con licencias o autorizaciones compatibles con su uso y entrega. | Respetar derechos de terceros. |
| 02 | Cumplimiento | Los materiales de prueba, demostración y entrega deberán usar datos ficticios o información real autorizada y protegida. | Preservar confidencialidad durante el proyecto. |
| 03 | Cumplimiento | La conservación y posterior eliminación de datos deberá seguir los criterios justificados por la empresa | Evitar conservar información sin fundamento |
| 04 | Cumplimiento | Los datos tratados deberán limitarse a las finalidades acordadas de autenticación, configuración y atención de eventos. | Evitar usos ajenos al proyecto. |
| 05 | Cumplimiento | Los medios de captura de datos deberán presentar o enviar el aviso de privacidad aprobado por la empresa. | Informar sobre el tratamiento de datos. |
| 06 | Estándares | La entrega deberá respetar las políticas internas y estándares expresamente acordados para el proyecto y documentar su alcance. | Alinear el proyecto con alcances y acuerdos reales. |
| 07 |  |  |  |
| 08 |  |  |  |
| 09 |  |  |  |
| 10 |  |  |  |

