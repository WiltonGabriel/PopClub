#!/bin/sh
set -e

echo "==> Iniciando inicialização do container..."

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

if [ -n "$DATABASE_URL" ]; then
  # Extrair host e porta da URL do PostgreSQL (formato postgresql://user:pass@host:port/db)
  EXTRACTED_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  EXTRACTED_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')

  if [ -n "$EXTRACTED_HOST" ] && [ "$EXTRACTED_HOST" != "$DATABASE_URL" ]; then
    DB_HOST="$EXTRACTED_HOST"
  fi
  if [ -n "$EXTRACTED_PORT" ] && [ "$EXTRACTED_PORT" != "$DATABASE_URL" ]; then
    DB_PORT="$EXTRACTED_PORT"
  fi
fi

echo "==> Aguardando conexão com PostgreSQL em ${DB_HOST}:${DB_PORT}..."

MAX_RETRIES=60
RETRY_COUNT=0

check_db() {
  if command -v nc >/dev/null 2>&1; then
    nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null
    return $?
  fi
  node -e "const net = require('net'); const s = net.connect($DB_PORT, '$DB_HOST', () => { s.destroy(); process.exit(0); }); s.on('error', () => process.exit(1));" 2>/dev/null
  return $?
}

while ! check_db; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "==> ERRO: Timeout aguardando PostgreSQL em ${DB_HOST}:${DB_PORT} após ${MAX_RETRIES} tentativas."
    exit 1
  fi
  echo "==> PostgreSQL ainda não está disponível... tentativa ${RETRY_COUNT}/${MAX_RETRIES} (aguardando 2s)"
  sleep 2
done

echo "==> Conexão com PostgreSQL estabelecida com sucesso!"

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "==> Executando migrations do banco de dados (./node_modules/.bin/prisma migrate deploy)..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "==> Diretório prisma/migrations ausente/vazio; sincronizando schema com db push..."
  if ! ./node_modules/.bin/prisma db push --skip-generate; then
    echo "==> Verificando se há alterações destrutivas (DROP TABLE / DROP COLUMN / TRUNCATE) pendentes antes de prosseguir..."
    DIFF_SQL=$(./node_modules/.bin/prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script 2>/dev/null || true)
    if [ -n "$DIFF_SQL" ] && echo "$DIFF_SQL" | grep -v '^[[:space:]]*--' | grep -qiE '(DROP[[:space:]]+(TABLE|COLUMN)|TRUNCATE[[:space:]]+)'; then
      echo "==> ERRO: prisma db push bloqueado por conter instruções destrutivas (DROP TABLE / DROP COLUMN / TRUNCATE)."
      exit 1
    fi
    echo "==> Nenhuma instrução DROP TABLE/COLUMN detectada. Aplicando db push seguro..."
    ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss
  fi
fi

echo "==> Iniciando aplicação Next.js (node server.js)..."
exec node server.js
