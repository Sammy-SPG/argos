export const REDIS_CONFIG = Symbol('REDIS_CONFIG');

export interface ConfiguracionRedis {
  readonly url: string;
  readonly password: string | undefined;
  readonly prefijo: string;
  readonly ttlSegundos: number;
  readonly tiempoConexionMs: number;
  readonly tiempoComandoMs: number;
}

/** Valida la configuración antes de abrir conexiones, sin incluir secretos en los errores. */
export function obtenerConfiguracionRedis(
  variables: NodeJS.ProcessEnv = process.env,
): ConfiguracionRedis {
  let url: URL;

  try {
    url = new URL(variables.REDIS_URL ?? '');
  } catch {
    throw new Error('REDIS_URL debe ser una URL válida de Redis.');
  }

  if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname) {
    throw new Error(
      'REDIS_URL debe utilizar redis:// o rediss:// y contener un host.',
    );
  }

  const password = variables.REDIS_PASSWORD || undefined;

  if (!password && !url.password) {
    throw new Error('Configura REDIS_PASSWORD o una contraseña en REDIS_URL.');
  }

  const prefijo =
    variables.REDIS_KEY_PREFIX ??
    `argos:${variables.NODE_ENV ?? 'development'}:v1`;

  if (!/^[a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)*$/.test(prefijo)) {
    throw new Error(
      'REDIS_KEY_PREFIX debe contener segmentos separados por dos puntos, sin espacios.',
    );
  }

  return {
    url: url.toString(),
    password,
    prefijo,
    ttlSegundos: enteroPositivo(variables, 'REDIS_TTL_SECONDS', 3600),
    tiempoConexionMs: enteroPositivo(
      variables,
      'REDIS_CONNECT_TIMEOUT_MS',
      5000,
    ),
    tiempoComandoMs: enteroPositivo(
      variables,
      'REDIS_COMMAND_TIMEOUT_MS',
      2000,
    ),
  };
}

function enteroPositivo(
  variables: NodeJS.ProcessEnv,
  nombre: string,
  predeterminado: number,
): number {
  const texto = variables[nombre];
  const valor = texto === undefined ? predeterminado : Number(texto);

  if (!Number.isSafeInteger(valor) || valor <= 0 || valor > 2_147_483_647) {
    throw new Error(
      `${nombre} debe ser un entero positivo de hasta 2147483647.`,
    );
  }

  return valor;
}
