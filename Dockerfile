# syntax=docker/dockerfile:1

# ── Stage 1: Dependencies ──
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Instala openssl necessário para dependências do Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# ── Stage 2: Builder ──
FROM node:20-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o cliente Prisma
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compila o projeto em modo standalone
RUN npm run build

# ── Stage 3: Runner ──
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Instala openssl (para o Prisma Engine) e netcat (para o healthcheck de rede do PostgreSQL)
RUN apt-get update && apt-get install -y openssl netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Cria usuário e grupo de sistema não privilegiados
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs

# Cria diretórios necessários com permissão para o usuário nextjs
RUN mkdir -p /app/public/uploads /app/.next && \
    chown -R nextjs:nodejs /app

# Copia arquivos estáticos públicos
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copia build standalone, assets estáticos e schema prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copia binário e módulos do Prisma para permitir 'npx prisma migrate deploy'
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# Copia script de inicialização (entrypoint)
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
