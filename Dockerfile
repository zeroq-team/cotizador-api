# Stage 1: Build
FROM node:24-alpine AS builder

# Instalar pnpm globalmente (actualizado a v10.x para corregir CVE-2024-47829)
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN pnpm install --frozen-lockfile

# Copiar código fuente y archivos de configuración
COPY . .

# Compilar la aplicación (nest build usa automáticamente tsconfig.build.json)
RUN pnpm build

# Verificar que el build se completó correctamente
RUN ls -la /app/dist/ && test -f /app/dist/src/main.js

# Stage 2: Production
FROM node:24-alpine AS production

# Instalar pnpm globalmente (actualizado a v10.x para corregir CVE-2024-47829)
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción y limpiar cachés para reducir vulnerabilidades
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune && \
    rm -rf /root/.cache/node/corepack && \
    rm -rf /root/.npm && \
    rm -rf /tmp/*

# Copiar archivos compilados desde el stage de build
COPY --from=builder /app/dist ./dist

# Verificar que los archivos se copiaron correctamente (antes de cambiar de usuario)
RUN ls -la /app/dist/ && test -f /app/dist/src/main.js

# Copiar archivos de configuración necesarios en runtime
COPY --from=builder /app/drizzle.config.* ./
COPY --from=builder /app/trigger.config.* ./

# Cambiar propiedad de los archivos al usuario no-root
RUN chown -R nestjs:nodejs /app

# Cambiar al usuario no-root
USER nestjs

# Exponer el puerto de la aplicación
EXPOSE 3002

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Comando para iniciar la aplicación
CMD ["node", "dist/src/main.js"]

