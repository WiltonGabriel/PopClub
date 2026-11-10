#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " [PopClub] Executando Pipeline de Qualidade Automatizada "
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"

echo "1. Gerando Prisma Client (schema.prisma)..."
npx prisma generate

echo ""
echo "2. Executando testes automatizados (Vitest)..."
npm test

echo ""
echo "3. Executando análise estática (ESLint)..."
npm run lint

echo ""
echo "4. Executando compilação e validação de tipos TypeScript..."
npm run build

echo ""
echo "=========================================================="
echo " ✅ Todos os critérios de qualidade e testes foram APROVADOS!"
echo "=========================================================="
