import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { strict as assert } from 'node:assert';
import { NestFactory } from '@nestjs/core';
import { RedisModule } from '@src/redis/redis.module';
import { RedisService } from '@src/redis/redis.service';

/** Comprueba el módulo real sin cargar Prisma ni modificar permisos de usuarios. */
async function comprobarRedis(): Promise<void> {
  const app = await NestFactory.createApplicationContext(RedisModule, {
    logger: ['warn', 'error'],
    abortOnError: false,
  });
  const redis = app.get(RedisService);
  const clave = `diagnostico:${randomUUID()}`;

  try {
    assert.equal(await redis.ping(), 'PONG');
    assert.equal(await redis.obtenerJson(clave), null);

    await redis.guardarJson(clave, { prueba: 'redis' });
    assert.deepEqual(await redis.obtenerJson(clave), { prueba: 'redis' });
    assert.ok(
      (await redis.obtenerTtl(clave)) > 0,
      'La escritura debe tener vencimiento.',
    );

    await redis.eliminar(clave);
    assert.equal(await redis.obtenerJson(clave), null);

    await redis.guardarJson(clave, [], 1);
    assert.deepEqual(await redis.obtenerJson(clave), []);
    await setTimeout(1200);
    assert.equal(await redis.obtenerJson(clave), null);

    console.log(
      'Redis OK: PING, lectura/escritura JSON, TTL, eliminación y expiración.',
    );
  } finally {
    try {
      await redis.eliminar(clave);
    } finally {
      await app.close();
    }
  }
}

void comprobarRedis().catch(() => {
  console.error(
    'Falló la comprobación de Redis. Revisa el servicio y las variables REDIS_*.',
  );
  process.exitCode = 1;
});
