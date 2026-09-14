# syntax=docker/dockerfile:1

# ── Stage 1: Base image ──
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Stage 2: Dependencies ──
FROM base AS deps
WORKDIR /app

# Copy package manifests and prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies strictly from package-lock.json
RUN npm ci

# ── Stage 3: Builder ──
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Configure build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile Next.js in standalone mode
RUN npm run build

# ── Stage 4: Production Runner ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets with non-root ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Ensure uploads and cache directories exist and are writable
RUN mkdir -p /app/public/uploads && \
    mkdir -p /app/.next && \
    chown -R nextjs:nodejs /app/public /app/.next

# Copy standalone server and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Execute standalone server
CMD ["node", "server.js"]
