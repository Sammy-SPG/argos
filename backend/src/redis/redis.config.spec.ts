import { obtenerConfiguracionRedis } from '@src/redis/redis.config';

describe('Configuración de Redis', () => {
  const variables: NodeJS.ProcessEnv = {
    REDIS_URL: 'redis://127.0.0.1:6379/0',
    REDIS_PASSWORD: 'password-de-prueba',
  };

  it('usa una hora de TTL y separa las claves por entorno', () => {
    const desarrollo = obtenerConfiguracionRedis(variables);
    const produccion = obtenerConfiguracionRedis({
      ...variables,
      NODE_ENV: 'production',
    });

    expect(desarrollo.ttlSegundos).toBe(3600);
    expect(desarrollo.prefijo).not.toBe(produccion.prefijo);
  });

  it('acepta TLS y credenciales en una URL sin exigir una segunda contraseña', () => {
    const configuracion = obtenerConfiguracionRedis({
      REDIS_URL: 'rediss://usuario:password-de-prueba@redis.example.com:6380/0',
    });

    expect(configuracion.url).toMatch(/^rediss:/);
    expect(configuracion.password).toBeUndefined();
  });

  it.each(['', 'https://redis.example.com', 'redis://'])(
    'rechaza una URL inválida: %s',
    (url) => {
      expect(() =>
        obtenerConfiguracionRedis({ ...variables, REDIS_URL: url }),
      ).toThrow(/REDIS_URL/);
    },
  );

  it('exige autenticación y no revela la contraseña al rechazar una URL', () => {
    expect(() =>
      obtenerConfiguracionRedis({ REDIS_URL: variables.REDIS_URL }),
    ).toThrow(/contraseña/);
    expect(() =>
      obtenerConfiguracionRedis({
        REDIS_URL: 'https://usuario:secreto@example.com',
      }),
    ).toThrow(
      'REDIS_URL debe utilizar redis:// o rediss:// y contener un host.',
    );
  });

  it.each([
    'REDIS_TTL_SECONDS',
    'REDIS_CONNECT_TIMEOUT_MS',
    'REDIS_COMMAND_TIMEOUT_MS',
  ])('rechaza valores sin vencimiento o sin límite para %s', (nombre) => {
    for (const valor of ['0', '-1', '1.5', 'abc', '', '2147483648']) {
      expect(() =>
        obtenerConfiguracionRedis({ ...variables, [nombre]: valor }),
      ).toThrow(nombre);
    }
  });

  it('rechaza un prefijo vacío o con segmentos ambiguos', () => {
    for (const prefijo of [
      '',
      'argos development',
      'argos::development',
      'argos:',
    ]) {
      expect(() =>
        obtenerConfiguracionRedis({ ...variables, REDIS_KEY_PREFIX: prefijo }),
      ).toThrow(/REDIS_KEY_PREFIX/);
    }
  });
});
