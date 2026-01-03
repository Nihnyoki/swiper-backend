import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NotFoundException } from '@nestjs/common';

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
       origin: true
  });

/*  async function testDBConnection() {
     const person = await this.personModel.findOne().lean();
      if (!person) {
        throw new NotFoundException('Person not found');
      }
      console.log(`Person found: : ${JSON.stringify(person)}`);
}*/

  app.use((req, res, next) => {
  res.on('finish', () => {
    console.log('⬅️ Response headers:', res.getHeaders());
  });
  next();
});

  const port = process.env.PORT || 8080;
  console.log('🚀 Listening on port:', port);
  //await testDBConnection();
  await app.listen(port, '0.0.0.0');





}
bootstrap();

