# Multi-stage build for optimal image size
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
COPY frontend/ ./frontend/
COPY backend/ ./backend/
COPY shared/ ./shared/

RUN npm ci

# Build frontend
RUN npm run build:frontend

# Build backend (if TypeScript)
RUN npm run build:backend || echo "No backend build needed"

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 cropguard
RUN adduser --system --uid 1001 cropguard

# Copy built application
COPY --from=builder --chown=cropguard:cropguard /app/backend/src ./backend/src
COPY --from=builder --chown=cropguard:cropguard /app/backend/package*.json ./backend/
COPY --from=deps --chown=cropguard:cropguard /app/node_modules ./node_modules
COPY --from=deps --chown=cropguard:cropguard /app/backend/node_modules ./backend/node_modules

# Copy frontend build (served by backend in production)
COPY --from=builder --chown=cropguard:cropguard /app/frontend/dist ./frontend/dist

# Copy other necessary files
COPY --from=builder --chown=cropguard:cropguard /app/backend/data ./backend/data

USER cropguard

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

CMD ["node", "backend/src/index.js"]