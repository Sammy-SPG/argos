import { Module } from '@nestjs/common';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { AuthModule } from '@src/auth/auth.module';
import { RedisModule } from '@src/redis/redis.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '@src/auth/guards/auth.guard';
import { AutorizacionModule } from '@src/autorizacion/autorizacion.module';
import { PermisosGuard } from '@src/autorizacion/guards/permisos.guard';
import { TestUserModule } from '@src/test/user/test-user.module';
import { habilitarRutasTest } from '@src/test/test.config';

@Module({
  imports: [
    AuthModule,
    RedisModule,
    AutorizacionModule,
    ...(habilitarRutasTest() ? [TestUserModule] : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // El orden garantiza que permisos reciba una sesión ya validada.
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: PermisosGuard },
  ],
})
export class AppModule {}
