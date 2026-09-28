# Argos

Monorepositorio para el sistema Argos. El backend ya tiene una plantilla NestJS y una configuración inicial de Prisma ORM 7 para MySQL/MariaDB. Las aplicaciones cliente y el receptor DC-09 siguen en fase de diseño.

| Directorio | Responsabilidad |
| --- | --- |
| [`frontend/`](frontend/) | Clientes Android y Windows, con Flutter como base de código compartida propuesta. |
| [`backend/`](backend/) | API NestJS; esquema y primera migración de Prisma ORM 7 para MySQL/MariaDB. |
| [`dc09-receiver/`](dc09-receiver/) | Posible receptor de eventos DC-09 en Node.js y TypeScript. |

## Flujo propuesto

1. Un receptor existente o uno propio recibe el evento y confirma la recepción según el protocolo aplicable.
2. El receptor entrega el evento al endpoint de entrada del backend.
3. El backend valida y normaliza el mensaje, guarda el evento y lo relaciona con una zona y cámara.
4. El backend avisa a los clientes. Android abre el evento desde una notificación FCM; la aplicación activa de Windows muestra su ventana.
5. El cliente consulta el detalle del evento y reproduce el stream autorizado de la cámara.

La adaptación de formatos HTTP externos pertenece inicialmente al endpoint de entrada de `backend/`. Si aparecen varios emisores, contratos complejos o necesidades de despliegue independientes, se podrá extraer a un servicio separado.
