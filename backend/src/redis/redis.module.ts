import 'dotenv/config';
import { Module } from '@nestjs/common';
import {
  obtenerConfiguracionRedis,
  REDIS_CONFIG,
} from '@src/redis/redis.config';
import { RedisService } from '@src/redis/redis.service';

/** Comparte una conexión Redis entre los módulos que importan RedisModule. */
@Module({
  providers: [
    { provide: REDIS_CONFIG, useFactory: () => obtenerConfiguracionRedis() },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
