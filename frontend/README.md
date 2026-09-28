# Frontend

Aplicaciones cliente de Argos para Android y Windows. La propuesta inicial es usar un proyecto Flutter con una base de código compartida y las integraciones específicas que requiera cada plataforma.

## Responsabilidades previstas

- Mostrar eventos, zonas y cámaras.
- Abrir el detalle del evento al tocar una notificación FCM en Android.
- En Windows, permanecer disponible en la sesión del usuario, recibir avisos y mostrar la ventana del evento.
- Reproducir el stream de la cámara asociada al evento.

Queda por validar el protocolo del stream (RTSP o HLS), el reproductor de Windows y el comportamiento de la aplicación en segundo plano. Todavía no se ha creado el proyecto Flutter.
