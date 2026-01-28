import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ROUTES_PREFIX } from './config/configuration';

// Validar variables de entorno críticas ANTES de inicializar la aplicación
if (!process.env.TRIGGER_SECRET_KEY) {
  console.error('\n');
  console.error('═'.repeat(80));
  console.error('❌ ERROR CRÍTICO: Variable de entorno faltante');
  console.error('═'.repeat(80));
  console.error('\n');
  console.error('  La variable de entorno TRIGGER_SECRET_KEY es REQUERIDA.');
  console.error('  Por favor, configura esta variable en tu archivo .env');
  console.error('\n');
  console.error('  Ejemplo:');
  console.error('  TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxxxxx');
  console.error('\n');
  console.error('  Puedes obtener tu secret key desde:');
  console.error('  https://trigger.dev -> Project Settings -> API Keys');
  console.error('\n');
  console.error('═'.repeat(80));
  console.error('\n');
  process.exit(1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe with transform
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     transform: true, // Habilita la transformación automática de tipos
  //     transformOptions: {
  //       enableImplicitConversion: true, // Convierte tipos automáticamente
  //     },
  //     whitelist: true, // Elimina propiedades no definidas en el DTO
  //     forbidNonWhitelisted: false, // No lanza error por propiedades extra
  //   }),
  // );
  
  // Enable CORS - Allow all origins for now
  app.enableCors({
    origin: true, // Esto permite cualquier origen
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Cache-Control',
      'X-Organization-ID',
      'x-api-key'
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    credentials: false, // Importante: false cuando se permite cualquier origen
    maxAge: 3600, // Cache preflight request por 1 hora
  });


  // Swagger configuration - Se genera automáticamente en cada inicio
  // No especificamos servidores explícitamente para que Swagger UI
  // use automáticamente el dominio desde donde se está sirviendo
  const config = new DocumentBuilder()
    .setTitle('Cotizador Dinámico API')
    .setDescription(
      '# API REST para Sistema de Cotizaciones Dinámicas con IA\n\n'
    )
    .setVersion('1.0.0')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('products', '📦 Productos - Gestión completa de catálogo de productos')
    .addTag('carts', '🛒 Carritos - Operaciones de carritos y cotizaciones')
    .addTag('customization-fields', '🎨 Campos de Personalización - Gestión de campos personalizables')
    .addTag('customization-groups', '📋 Grupos de Personalización - Organización de campos de personalización')
    .addTag('payment-methods', '💳 Métodos de Pago - Configuración de formas de pago')
    .addTag('inventory', '📊 Inventario - Gestión de stock y disponibilidad')
    .build();

  // Generar documentación automáticamente
  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    // Ordenar tags explícitamente
    deepScanRoutes: true,
  });

  // Configurar Swagger UI con opciones mejoradas
  SwaggerModule.setup('/docs', app, document, {
    customSiteTitle: 'Cotizador API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  });

  // SwaggerModule.setup(ROUTES_PREFIX + '/docs', app, document);
  SwaggerModule.setup('/docs', app, document);
  // app.setGlobalPrefix(ROUTES_PREFIX, {
  //   exclude: ['health', 'metrics'],
  // });

  await app.listen(process.env.PORT ?? 3002);
}


bootstrap().catch((error) => {
  console.error('\n');
  console.error('═'.repeat(80));
  console.error('❌ ERROR AL INICIAR LA APLICACIÓN');
  console.error('═'.repeat(80));
  console.error('\n', error.message, '\n');
  console.error('═'.repeat(80));
  console.error('\n');
  process.exit(1);
});
