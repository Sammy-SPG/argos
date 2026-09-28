# DC-09 receiver

Proyecto reservado para un posible receptor de eventos DC-09 en Node.js y TypeScript. Todavía no se ha decidido implementarlo ni se ha creado ninguna plantilla.

## Responsabilidades previstas si se implementa

- Recibir los mensajes que envíe el equipo o servicio configurado en DSC Connect Installer.
- Validar lo necesario para procesar el mensaje y emitir la confirmación de recepción que corresponda al protocolo.
- Entregar el evento al endpoint de entrada del backend mediante el contrato HTTP acordado.

Antes de desarrollarlo, hay que confirmar si ya existe un servidor receptor configurado, qué formato entrega, cómo confirma la recepción y cómo se autenticaría ante el backend. Si se usa ese servidor, esta carpeta documenta la alternativa evaluada.
