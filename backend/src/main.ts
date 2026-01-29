import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement depuis .env
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000',
  });
  
  // Servir les fichiers statiques depuis le dossier uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  
  // S'assurer que les réponses sont en UTF-8
  app.use((req, res, next) => {
    if (!req.path.startsWith('/uploads')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
