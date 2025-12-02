# =============================================================================
# NossoCRM - Dockerfile (Development)
# =============================================================================
# Multi-stage build optimized for Vite development with hot-reload
# =============================================================================

FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# =============================================================================
# Dependencies Stage
# =============================================================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for Vite)
# Using npm install since package-lock.json may not exist
RUN npm install

# =============================================================================
# Development Stage
# =============================================================================
FROM base AS development

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
