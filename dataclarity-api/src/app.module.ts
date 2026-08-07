import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { AnalysisModule } from './modules/analysis/analysis.module';

@Module({
  imports: [
    // ThrottlerModule registrado para uso seletivo via @Throttle() nos controllers que precisam
    // O guard NÃO é global — aplicado apenas em Auth e Contacts (rotas públicas/sensíveis)
    ThrottlerModule.forRoot([
      {
        // Limite padrão para rotas públicas (Contacts form)
        name: 'default',
        ttl: 60_000,
        limit: 20,
      },
      {
        // Limite restrito para autenticação (prevenção de brute force)
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
    IndicatorsModule,
    AnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
