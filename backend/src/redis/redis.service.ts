import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createClient } from 'redis';
import { REDIS_CONFIG, type ConfiguracionRedis } from '@src/redis/redis.config';

/**
 * Cliente de la aplicación para comunicarse con el servidor Redis, que corre en otro proceso.
 * Redis almacena pares clave/valor; este servicio convierte los valores a JSON y agrega un TTL
 * (tiempo de vida) para que las entradas caduquen. No consulta MySQL ni decide permisos.
 * Los módulos consumidores comparten esta conexión y reciben los errores para gestionarlos.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);

  // Es el cliente de Node.js, no el servidor Redis. Su tipo se obtiene de createClient().
  private readonly cliente: ReturnType<typeof createClient>;

  // Distingue el primer arranque de una pérdida de conexión posterior.
  private inicializado = false;

  // Evita que una desconexión durante el apagado provoque nuevos intentos de conexión.
  private cerrando = false;

  // Permite registrar un solo aviso por caída, aunque fallen varios reintentos.
  private falloReportado = false;

  // Nest inyecta los valores validados por redis.config.ts. Aquí se prepara el cliente;
  // la conexión de red se abre después, cuando Nest llama a onModuleInit().
  constructor(
    @Inject(REDIS_CONFIG) private readonly configuracion: ConfiguracionRedis,
  ) {
    this.cliente = createClient({
      // Indica protocolo, servidor, puerto y base lógica. rediss:// activa TLS.
      url: configuracion.url,
      password: configuracion.password,

      // Si Redis se desconecta, los comandos fallan en vez de quedar pendientes
      // para ejecutarse inesperadamente cuando se recupere la conexión.
      disableOfflineQueue: true,

      // Limita cuánto espera el cliente por la respuesta de cada comando.
      // Es independiente del tiempo necesario para establecer la conexión inicial.
      commandOptions: { timeout: configuracion.tiempoComandoMs },
      socket: {
        connectTimeout: configuracion.tiempoConexionMs,
        reconnectStrategy: (intentos) => {
          // El cliente interpreta false como "dejar de reintentar". Al arrancar,
          // una configuración o un servicio incorrectos deben impedir el inicio;
          // durante el apagado tampoco queremos recuperar la conexión.
          if (!this.inicializado || this.cerrando) {
            return false;
          }

          // Después de haber conectado, devuelve los milisegundos hasta el siguiente
          // intento: 250, 500, 1000, 2000 y como máximo 3000. Así evitamos reintentos
          // continuos sin pausa cuando el servidor Redis no está disponible.
          return Math.min(250 * 2 ** Math.min(intentos, 4), 3000);
        },
      },
    });

    // El cliente emite eventos de conexión. El manejador de error es necesario
    // para recibir esos fallos; los comandos también pueden rechazar sus promesas.
    this.cliente.on('error', () => {
      // No incluimos el error original porque puede contener datos de conexión.
      if (!this.falloReportado && !this.cerrando) {
        this.logger.error(
          'Conexión Redis no disponible. Revisa el servicio y sus credenciales.',
        );
        this.falloReportado = true;
      }
    });

    this.cliente.on('ready', () => {
      // ready significa que Redis ya acepta comandos, también tras una reconexión.
      // Reiniciamos el aviso para poder informar una nueva caída en el futuro.
      this.falloReportado = false;
      this.logger.log('Conexión Redis lista.');
    });
  }

  /** Nest espera este método antes de terminar el arranque de la aplicación. */
  async onModuleInit(): Promise<void> {
    try {
      // connect() abre la conexión y realiza la autenticación con Redis.
      await this.cliente.connect();
      this.inicializado = true;
    } catch {
      // Liberamos una conexión parcialmente abierta antes de propagar el fallo.
      if (this.cliente.isOpen) {
        this.cliente.destroy();
      }

      throw new Error(
        'No se pudo conectar a Redis. Revisa REDIS_URL, REDIS_PASSWORD y el servicio.',
      );
    }
  }

  /** Se ejecuta al cerrar Nest; main.ts habilita también el cierre mediante señales. */
  async onApplicationShutdown(): Promise<void> {
    this.cerrando = true;

    if (!this.cliente.isOpen) {
      // El cliente ya está cerrado; no hay recursos de red que liberar.
      return;
    }

    if (!this.cliente.isReady) {
      // Puede estar intentando reconectar. destroy() detiene el cliente sin
      // esperar a que un servidor desconectado vuelva a responder.
      this.cliente.destroy();
      return;
    }

    // Con una conexión disponible, close() permite terminar los comandos pendientes.
    await this.cliente.close();
  }

  /** PING solicita una respuesta PONG para comprobar que el servidor responde. */
  async ping(): Promise<string> {
    return this.cliente.ping();
  }

  /**
   * GET recupera el texto guardado bajo una clave y JSON.parse reconstruye su valor.
   * unknown obliga al consumidor a comprobar su estructura antes de usarlo.
   */
  async obtenerJson(clave: string): Promise<unknown | null> {
    const contenido = await this.cliente.get(this.claveCompleta(clave));

    if (contenido === null) {
      // La clave puede no haberse creado, haber vencido o haber sido eliminada.
      // Una lista vacía [] sí es un valor almacenado y no entra en este caso.
      return null;
    }

    try {
      return JSON.parse(contenido) as unknown;
    } catch {
      // Un valor corrupto es un error; no debe interpretarse como permisos válidos.
      throw new Error('La entrada Redis no contiene JSON válido.');
    }
  }

  /**
   * Guarda un valor JSON. El TTL se expresa en segundos y por defecto usa REDIS_TTL_SECONDS.
   * SET con EX escribe el contenido y su vencimiento en una sola operación de Redis.
   */
  async guardarJson(
    clave: string,
    valor: unknown,
    ttlSegundos: number = this.configuracion.ttlSegundos,
  ): Promise<void> {
    // Exigimos vencimiento para que una entrada de caché no permanezca indefinidamente.
    if (!Number.isSafeInteger(ttlSegundos) || ttlSegundos <= 0) {
      throw new Error(
        'El TTL debe ser un entero positivo expresado en segundos.',
      );
    }

    // Guardamos texto JSON en una clave de tipo string de Redis. No requiere
    // instalar un módulo JSON en el servidor. Los errores de serialización se propagan.
    const contenido = JSON.stringify(valor);

    if (contenido === undefined) {
      throw new Error('El valor no se puede representar como JSON.');
    }

    // Una escritura reemplaza el valor anterior y establece de nuevo el TTL.
    // Las lecturas con obtenerJson() no prolongan el vencimiento.
    await this.cliente.set(this.claveCompleta(clave), contenido, {
      EX: ttlSegundos,
    });
  }

  /**
   * DEL elimina la entrada de caché; no modifica el dato original en MySQL.
   * Es la operación que utilizará permisos para invalidar la caché de un usuario.
   * Si la clave ya no existe, Redis permite repetir la eliminación sin error.
   */
  async eliminar(clave: string): Promise<void> {
    await this.cliente.del(this.claveCompleta(clave));
  }

  /**
   * TTL devuelve segundos restantes; -2 indica que la clave no existe y -1 que no vence.
   * Las entradas creadas por guardarJson() siempre se escriben con vencimiento.
   */
  async obtenerTtl(clave: string): Promise<number> {
    return this.cliente.ttl(this.claveCompleta(clave));
  }

  /** Agrega el espacio de nombres para separar aplicación, entorno y versión del formato. */
  private claveCompleta(clave: string): string {
    if (!clave.trim()) {
      throw new Error('La clave Redis no puede estar vacía.');
    }

    // Ejemplo: permisos:usuario:25 pasa a argos:development:v1:permisos:usuario:25.
    // Los demás módulos entregan la clave corta; el prefijo se aplica centralmente.
    return `${this.configuracion.prefijo}:${clave}`;
  }
}
