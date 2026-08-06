import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { ThrottlerExceptionFilter } from './modules/health/throttler-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { envSchema } from './config/env.schema';
import { AppModule } from './app.module';
import { setupSwagger } from './app.swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const env = envSchema.parse(process.env);

  app.setGlobalPrefix('/api/v1');

  app.enableCors({
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  app.use(helmet());
  app.use(compression());

  // Limit payload size (JSON + urlencoded) via Express body parsers
  app.use(json({ limit: '200kb' }));
  app.use(
    urlencoded({
      limit: '200kb',
      extended: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new ThrottlerExceptionFilter(),
  );

  setupSwagger(app);

  // Permite que o Nest dispare corretamente os hooks de shutdown (SIGTERM/SIGINT),
  // garantindo que providers como o PrismaService executem onModuleDestroy().
  app.enableShutdownHooks();

  await app.listen(env.PORT);
}
void bootstrap();
