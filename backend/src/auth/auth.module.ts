import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { AuthController } from '@src/auth/auth.controller';
import { AuthService } from '@src/auth/auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      // La configuración se valida al iniciar y no utiliza un secreto por defecto.
      useFactory: (): JwtModuleOptions => {
        const secret = process.env.JWT_SECRET;
        const expiresIn = Number(process.env.JWT_EXPIRES_IN);
        const issuer = process.env.JWT_ISSUER;
        const audience = process.env.JWT_AUDIENCE;

        if (!secret || !secret.trim() || Buffer.byteLength(secret) < 32) {
          throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
        }

        if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
          throw new Error(
            'JWT_EXPIRES_IN debe ser un número positivo de segundos.',
          );
        }

        if (!issuer?.trim() || !audience?.trim()) {
          throw new Error('JWT_ISSUER y JWT_AUDIENCE son obligatorios.');
        }

        return {
          secret,
          signOptions: { algorithm: 'HS256', expiresIn, issuer, audience },
          verifyOptions: { algorithms: ['HS256'], issuer, audience },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // El servicio permite validar sesiones desde otros componentes de la aplicación.
  exports: [AuthService],
})
export class AuthModule {}
