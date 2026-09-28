# Backend

API y lógica de negocio de Argos. Se prevé implementarlo con NestJS; todavía no hay plantilla ni código.

## Responsabilidades previstas

- Recibir eventos desde el receptor DC-09 existente o desde `dc09-receiver/` mediante un endpoint de entrada.
- Validar el contrato HTTP de entrada y normalizarlo a un modelo interno de evento.
- Persistir eventos y relacionarlos con zonas y cámaras.
- Exponer los datos necesarios a los clientes y gestionar el acceso.
- Enviar avisos a Android mediante FCM y definir el canal de eventos para Windows.

La adaptación del contrato externo se mantiene aquí mientras exista un único punto de entrada. El esquema exacto, la autenticación y el tratamiento de duplicados están pendientes de diseño.
