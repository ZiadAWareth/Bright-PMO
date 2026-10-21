import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { OpenApiStore } from './workflow/pulses/services/openapi-store';

// Two scalars JSON cannot represent are given ONE wire form for the whole app:
//   BigInt → its decimal digits as a string (JSON.stringify throws on a bigint otherwise, which
//             would 500 every read of a table with a BigInt column);
//   Bytes  → base64 (Node's default is {type:'Buffer',data:[...]}, useless to a browser).
// Decimal already serialises itself as a numeric string. The DTOs accept the same forms back.
(BigInt.prototype as any).toJSON = function () { return this.toString(); };
(Buffer.prototype as any).toJSON = function () { return this.toString('base64'); };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix FIRST (before Swagger setup)
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:4000').split(',').map(s => s.trim()), // Frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });
  
  // Setup Swagger (after prefix is set, so it knows about /api routes)
  const config = new DocumentBuilder()
    .setTitle('another test PMO APIs')
    .setDescription('')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Hand the same document to the pulse engine: the integration/appApi pulse's
  // endpoint picker reads it to list this app's callable routes. Without this the
  // store stays empty and the picker shows "No matching endpoints" forever.
  OpenApiStore.set(document);
  SwaggerModule.setup('api/swagger', app, document); // ✅ Swagger also under /api prefix
  
  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  const PORT = process.env.BACKEND_PORT 
    ? parseInt(process.env.BACKEND_PORT, 10) 
    : 4002;
  if (!PORT || isNaN(PORT)) {
    throw new Error('BACKEND_PORT environment variable is required and must be a valid number');
  }
  console.log(`Server is running on port ${PORT}`);
  await app.listen(PORT);
}
bootstrap();