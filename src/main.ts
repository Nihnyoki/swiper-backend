import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API docs')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.enableCors({ 
   origin: [
      'https://swiper-cards.up.railway.app/',
      'https://swiper-cards.up.railway.app',
      'swiper-cards.up.railway.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization','Access-Control-Allow-Origin'],
    credentials: true,
  });

  const port = process.env.PORT || 10000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
