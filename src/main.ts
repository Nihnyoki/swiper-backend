import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Swiper Backend')
    .setDescription('Swiper API docs')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.use((req, res, next) => {
    console.log('➡️ Incoming request:', {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      host: req.headers.host,
    });
    next();
  });

  app.enableCors({ 
   origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  const port = process.env.PORT || 10000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
