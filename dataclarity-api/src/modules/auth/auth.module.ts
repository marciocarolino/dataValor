import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { envSchema } from '../../config/env.schema';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: false,
      secret: envSchema.parse(process.env).JWT_SECRET,
      signOptions: {
        expiresIn: envSchema.parse(process.env).JWT_EXPIRES_IN as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
