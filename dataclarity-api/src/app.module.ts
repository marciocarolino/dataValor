import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        // Limite geral: 100 requisições por minuto por IP
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
      {
        // Limite restrito para auth: 10 tentativas por minuto por IP
        name: 'auth',
        ttl: 60_000,
        limit: 10,
      },
    ]),
    PrismaModule,
    HealthModule,
    ContactsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
