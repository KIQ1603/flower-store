import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setup(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Sau proxy (nginx/Cloudflare) thì TRUST_PROXY=1 để lấy đúng IP khách cho giới hạn tần suất
  if (process.env.TRUST_PROXY) (app.getHttpAdapter().getInstance() as any).set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(compression());
  const origins = process.env.CORS_ORIGINS?.split(',').map(x => x.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : true, exposedHeaders: ['Retry-After'] });
  if (process.env.NODE_ENV === 'production' && process.env.SWAGGER !== 'on') return; // không công khai tài liệu API khi chạy thật
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Florea API').setDescription('Website bán hoa Florea by FloraHub').setVersion('0.1').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);
}
