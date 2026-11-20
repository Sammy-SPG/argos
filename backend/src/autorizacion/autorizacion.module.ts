import { Module } from '@nestjs/common';
import { RedisModule } from '@src/redis/redis.module';
import { PermisosService } from '@src/autorizacion/permisos.service';
import { PermisosGuard } from '@src/autorizacion/guards/permisos.guard';

@Module({
  imports: [RedisModule],
  providers: [PermisosService, PermisosGuard],
  exports: [PermisosService, PermisosGuard],
})
export class AutorizacionModule {}
