import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import pino from 'pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

async function bootstrap() {
  const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger }),
    { bufferLogs: true },
  );

  const config = app.get(ConfigService);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyHelmet as unknown as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // CORS — strict allow-list, never wildcard for authenticated API
  const allowedOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyCors as unknown as any, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  // Global validation pipe — strip unknown, whitelist, transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new MetricsInterceptor());

  // OpenAPI docs (disabled in production unless explicitly enabled)
  if (config.get<string>('NODE_ENV') !== 'production' || config.get<boolean>('SWAGGER_ENABLED')) {
    const docConfig = new DocumentBuilder()
      .setTitle('SEM V2 API')
      .setDescription('Secure Environment Manager V2 Backend API')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3001);
  const host = config.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);

  const appLogger = new Logger('Bootstrap');
  appLogger.log(`SEM V2 API listening on ${host}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
