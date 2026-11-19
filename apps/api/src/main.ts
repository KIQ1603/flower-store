import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setup } from './setup';
import { assertProductionEnv } from './common/prod-env';

async function bootstrap() {
  assertProductionEnv();
  const app = await NestFactory.create(AppModule);
  setup(app);
  const port = Number(process.env.PORT ?? 3100);
  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
  console.log(`Florea API: http://localhost:${port}/api/v1  ·  Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
