# 🛒 Cotizador Dinámico API

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)

API REST completa para el sistema de cotizaciones dinámicas con IA. Desarrollada con NestJS, TypeScript y PostgreSQL, proporciona endpoints para gestionar productos, carritos, cotizaciones, personalizaciones, métodos de pago e inventario.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Base de Datos](#-base-de-datos)
- [Ejecución](#-ejecución)
- [Documentación de API](#-documentaci6  ón-de-api)
- [Endpoints Principales](#-endpoints-principales)
- [WebSockets](#-websockets)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Scripts Disponibles](#-scripts-disponibles)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contribución](#-contribución)

## ✨ Características

- ✅ **CRUD Completo** para todos los recursos (productos, carritos, métodos de pago, personalizaciones)
- ✅ **Sistema de Personalización Flexible** con grupos y campos dinámicos
- ✅ **Gestión de Inventario** integrada con sistema externo
- ✅ **Múltiples Métodos de Pago** configurables con cuotas y descuentos
- ✅ **WebSockets** para actualizaciones en tiempo real del carrito
- ✅ **Validación de Datos** con class-validator y DTOs
- ✅ **Documentación Interactiva** con Swagger/OpenAPI
- ✅ **ORM Moderno** con Drizzle ORM y migraciones automáticas
- ✅ **TypeScript** para seguridad de tipos en toda la aplicación
- ✅ **CORS Configurado** para integración con frontend
- ✅ **Arquitectura Modular** siguiendo principios SOLID

## 🛠 Tecnologías

- **Framework**: [NestJS](https://nestjs.com/) ^10.0.0
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) ^5.1.3
- **Base de Datos**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) ^0.44.6
- **Documentación**: [Swagger/OpenAPI](https://swagger.io/) ^11.2.0
- **WebSockets**: [Socket.IO](https://socket.io/) ^4.8.1
- **Validación**: [class-validator](https://github.com/typestack/class-validator) ^0.14.0
- **Cliente HTTP**: [Axios](https://axios-http.com/) ^1.12.2

## 📦 Requisitos Previos

- [Node.js](https://nodejs.org/) >= 18.x
- [pnpm](https://pnpm.io/) >= 9.x
- [PostgreSQL](https://www.postgresql.org/) >= 14.x

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/yourusername/cotizador-api.git
cd cotizador-api
```

### 2. Instalar dependencias

```bash
pnpm install
```

## ⚙️ Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/cotizador_db

# Server Configuration
PORT=3000
NODE_ENV=development

# Trigger.dev Configuration (REQUERIDO)
# Esta variable es OBLIGATORIA para que la aplicación inicie
# Obtenla desde: https://trigger.dev -> Project Settings -> API Keys
TRIGGER_SECRET_KEY=your_trigger_secret_key_here

# WebPay Configuration
WEBPAY_COMMERCE_CODE=597055555532
WEBPAY_API_KEY=579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C
WEBPAY_ENVIRONMENT=integration
WEBPAY_RETURN_BASE_URL=http://localhost:3003

# External Services (opcional)
PRODUCTS_API_URL=https://api.products.example.com
INVENTORY_API_URL=https://api.inventory.example.com

# WebSocket Configuration
WS_PORT=3001
```

> ⚠️ **Importante**: La variable `TRIGGER_SECRET_KEY` es obligatoria. La aplicación no se iniciará si no está configurada.

### Configuración de PostgreSQL

1. Crear la base de datos:

```sql
CREATE DATABASE cotizador_db;
CREATE USER cotizador_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cotizador_db TO cotizador_user;
```

2. Verificar la conexión:

```bash
psql -U cotizador_user -d cotizador_db -h localhost
```

## 🗄️ Base de Datos

### Generar Migraciones

```bash
# Genera archivos de migración basados en cambios del schema
pnpm run db:generate
```

### Ejecutar Migraciones

```bash
# Aplica las migraciones pendientes a la base de datos
pnpm run db:migrate
```

### Sincronizar Schema (Desarrollo)

```bash
# Push cambios del schema directamente (solo desarrollo)
pnpm run db:push
```

### Drizzle Studio

```bash
# Abre una interfaz visual para explorar la base de datos
pnpm run db:studio
```

Accede a: [http://localhost:4983](http://localhost:4983)

## 🏃 Ejecución

### Modo Desarrollo

```bash
pnpm run start:dev
```

La API estará disponible en: [http://localhost:3000](http://localhost:3000)

### Modo Producción

```bash
# Compilar
pnpm run build

# Ejecutar
pnpm run start:prod
```

### Modo Debug

```bash
pnpm run start:debug
```

## 📚 Documentación de API

### Swagger UI

Una vez que la aplicación esté ejecutándose, accede a la documentación interactiva:

**URL**: [http://localhost:3000/docs](http://localhost:3000/docs)

La documentación de Swagger proporciona:

- 📖 Descripción detallada de cada endpoint
- 🔍 Esquemas de request/response
- 🧪 Interfaz interactiva para probar endpoints
- 📝 Ejemplos de uso
- ⚠️ Códigos de error y sus descripciones

### Características de la Documentación

- **Filtrado por Tags**: Organiza endpoints por categoría
- **Pruebas en Vivo**: Ejecuta requests directamente desde el navegador
- **Esquemas Detallados**: Visualiza estructuras de datos completas
- **Ejemplos Reales**: Cada endpoint incluye ejemplos de uso

## 🎯 Endpoints Principales

### 🛒 Carritos (Carts)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/cart` | Obtener todas las cotizaciones |
| `GET` | `/cart/:id` | Obtener carrito por ID |
| `GET` | `/cart/conversation/:conversationId` | Obtener carrito por conversation ID |
| `POST` | `/cart` | Crear nuevo carrito |
| `PUT` | `/cart/:id` | Actualizar carrito completo |
| `PATCH` | `/cart/:id/customization` | Actualizar personalizaciones |

### 📦 Productos (Products)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/products` | Listar productos (con filtros) |
| `GET` | `/products/:id` | Obtener producto por ID |
| `POST` | `/products` | Crear nuevo producto |
| `PUT` | `/products/:id` | Actualizar producto |
| `DELETE` | `/products/:id` | Eliminar producto |
| `POST` | `/products/upload` | Importar productos desde archivo |

### 💳 Métodos de Pago (Payment Methods)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/payment-methods` | Listar todos los métodos de pago |
| `GET` | `/payment-methods/:id` | Obtener método de pago por ID |
| `POST` | `/payment-methods` | Crear nuevo método de pago |
| `PATCH` | `/payment-methods/:id` | Actualizar método de pago |
| `DELETE` | `/payment-methods/:id` | Eliminar método de pago |
| `PATCH` | `/payment-methods/:id/toggle-active` | Activar/Desactivar método |
| `POST` | `/payment-methods/reorder` | Reordenar métodos de pago |

### 📋 Grupos de Personalización (Customization Groups)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/customization-groups` | Listar todos los grupos |
| `GET` | `/customization-groups/active` | Listar grupos activos |
| `GET` | `/customization-groups/:id` | Obtener grupo por ID |
| `POST` | `/customization-groups` | Crear nuevo grupo |
| `PATCH` | `/customization-groups/:id` | Actualizar grupo |
| `DELETE` | `/customization-groups/:id` | Eliminar grupo |
| `PATCH` | `/customization-groups/:id/toggle-active` | Activar/Desactivar |
| `POST` | `/customization-groups/reorder` | Reordenar grupos |

### 🎨 Campos de Personalización (Customization Fields)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/customization-fields` | Listar todos los campos |
| `GET` | `/customization-fields?groupId=xxx` | Filtrar campos por grupo |
| `GET` | `/customization-fields/:id` | Obtener campo por ID |
| `POST` | `/customization-fields` | Crear nuevo campo |
| `PATCH` | `/customization-fields/:id` | Actualizar campo |
| `DELETE` | `/customization-fields/:id` | Eliminar campo |
| `PATCH` | `/customization-fields/:id/toggle-active` | Activar/Desactivar |
| `POST` | `/customization-fields/reorder` | Reordenar campos |

### 📊 Inventario (Inventory)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/inventory` | Obtener inventario (con filtros) |
| `GET` | `/inventory/aggregated` | Obtener inventario agregado |
| `PUT` | `/inventory` | Actualizar inventario |

## 🔌 WebSockets

La API incluye soporte para WebSockets usando Socket.IO para actualizaciones en tiempo real del carrito.

### Conexión

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
```

### Eventos Disponibles

#### Cliente → Servidor

- `cart:update` - Actualizar carrito
- `cart:get` - Obtener estado del carrito
- `cart:subscribe` - Suscribirse a actualizaciones

#### Servidor → Cliente

- `cart:updated` - Carrito actualizado
- `cart:item-added` - Item agregado al carrito
- `cart:item-removed` - Item removido del carrito
- `cart:error` - Error en operación

### Ejemplo de Uso

```typescript
// Suscribirse a actualizaciones del carrito
socket.emit('cart:subscribe', { cartId: 'cart_123456' });

// Escuchar actualizaciones
socket.on('cart:updated', (data) => {
  console.log('Carrito actualizado:', data);
});

// Actualizar carrito
socket.emit('cart:update', {
  cartId: 'cart_123456',
  items: [...]
});
```

## 📁 Estructura del Proyecto

```
cotizador-api/
├── src/
│   ├── carts/                    # Módulo de carritos
│   │   ├── dto/                  # Data Transfer Objects
│   │   ├── cart.controller.ts    # Controlador REST
│   │   ├── cart.gateway.ts       # Gateway WebSocket
│   │   ├── cart.service.ts       # Lógica de negocio
│   │   ├── cart.repository.ts    # Acceso a datos
│   │   └── cart.module.ts        # Módulo NestJS
│   │
│   ├── products/                 # Módulo de productos
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   └── products.module.ts
│   │
│   ├── payment-methods/          # Módulo de métodos de pago
│   │   ├── dto/
│   │   ├── payment-method.controller.ts
│   │   ├── payment-method.service.ts
│   │   ├── payment-method.repository.ts
│   │   └── payment-method.module.ts
│   │
│   ├── customization-groups/     # Módulo de grupos de personalización
│   │   ├── dto/
│   │   ├── customization-group.controller.ts
│   │   ├── customization-group.service.ts
│   │   ├── customization-group.repository.ts
│   │   └── customization-group.module.ts
│   │
│   ├── customization-fields/     # Módulo de campos de personalización
│   │   ├── dto/
│   │   ├── customization-field.controller.ts
│   │   ├── customization-field.service.ts
│   │   ├── customization-field.repository.ts
│   │   └── customization-field.module.ts
│   │
│   ├── inventory/                # Módulo de inventario
│   │   ├── inventory.controller.ts
│   │   ├── inventory.service.ts
│   │   └── inventory.module.ts
│   │
│   ├── database/                 # Configuración de base de datos
│   │   ├── schemas/              # Esquemas de Drizzle
│   │   ├── migrations/           # Archivos de migración
│   │   ├── database.service.ts
│   │   ├── database.module.ts
│   │   └── index.ts
│   │
│   ├── app.module.ts             # Módulo principal
│   └── main.ts                   # Punto de entrada
│
├── test/                         # Tests E2E
├── dist/                         # Build de producción
├── drizzle.config.ts             # Configuración de Drizzle
├── nest-cli.json                 # Configuración de NestJS CLI
├── tsconfig.json                 # Configuración de TypeScript
├── package.json                  # Dependencias y scripts
└── README.md                     # Este archivo
```

## 📜 Scripts Disponibles

### Desarrollo

```bash
# Iniciar en modo desarrollo con hot-reload
pnpm run start:dev

# Iniciar en modo debug
pnpm run start:debug

# Compilar el proyecto
pnpm run build

# Ejecutar en modo producción
pnpm run start:prod
```

### Base de Datos

```bash
# Generar migraciones
pnpm run db:generate

# Ejecutar migraciones
pnpm run db:migrate

# Push schema (desarrollo)
pnpm run db:push

# Abrir Drizzle Studio
pnpm run db:studio
```

### Calidad de Código

```bash
# Ejecutar linter
pnpm run lint

# Formatear código
pnpm run format
```

### Testing

```bash
# Tests unitarios
pnpm run test

# Tests con watch mode
pnpm run test:watch

# Coverage
pnpm run test:cov

# Tests E2E
pnpm run test:e2e
```

## 🧪 Testing

### Tests Unitarios

```bash
pnpm run test
```

### Tests E2E

```bash
pnpm run test:e2e
```

### Coverage

```bash
pnpm run test:cov
```

Los reportes de coverage se generan en `coverage/`.

## 🚀 Deployment

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/cotizador_db
    depends_on:
      - db
  
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: cotizador_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Variables de Entorno en Producción

Asegúrate de configurar:

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `NODE_ENV=production`
- `PORT`: Puerto de la aplicación
- `TRIGGER_SECRET_KEY`: ⚠️ **OBLIGATORIO** - Secret key de Trigger.dev
- `WEBPAY_COMMERCE_CODE`: Código de comercio de WebPay
- `WEBPAY_API_KEY`: API Key de WebPay
- `WEBPAY_ENVIRONMENT`: Entorno de WebPay (integration/production)
- `WEBPAY_RETURN_BASE_URL`: URL base para el retorno de WebPay
- Otras variables según servicios externos

## 🤝 Contribución

Las contribuciones son bienvenidas! Por favor, sigue estos pasos:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convenciones de Código

- Usar TypeScript para todos los archivos
- Seguir la guía de estilo de NestJS
- Agregar tests para nuevas funcionalidades
- Documentar endpoints con decoradores de Swagger
- Validar DTOs con class-validator

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

- **Documentación**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/cotizador-api/issues)
- **Email**: support@example.com

## 🎯 Roadmap

- [ ] Autenticación y autorización con JWT
- [ ] Rate limiting y throttling
- [ ] Cache con Redis
- [ ] Logs estructurados
- [ ] Monitoreo con Prometheus
- [ ] CI/CD con GitHub Actions
- [ ] Tests de carga
- [ ] Documentación de arquitectura

