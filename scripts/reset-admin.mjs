#!/usr/bin/env node

/**
 * Utilitário para verificar e reinjetar/resetar credenciais do Administrador no banco ativo.
 * Uso:
 *   node scripts/reset-admin.mjs [NOVA_SENHA]
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        let v = trimmed.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL não encontrada no .env");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const targetPassword = process.argv[2] || "@64844048";
  const targetEmail = "admin@popclub.com";
  const targetUsername = "admin";

  console.log("==========================================================");
  console.log("🔑 Pop Shake — Reset / Verificação de Credenciais do Admin");
  console.log("==========================================================");
  console.log(`📍 Banco Alvo: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`👤 Usuário:   ${targetEmail} / ${targetUsername}`);
  console.log(`🔒 Senha:     ${targetPassword}\n`);

  console.log("⏳ Gerando novo hash bcrypt compatível...");
  const newHash = await bcrypt.hash(targetPassword, 10);

  console.log("⏳ Atualizando ou criando registro do Administrador...");
  const admin = await prisma.user.upsert({
    where: { email: targetEmail },
    update: {
      username: targetUsername,
      passwordHash: newHash,
      role: "admin",
      fullName: "Administrador Pop Shake",
      avatarUrl: "/avatars/avatar-chef.svg",
    },
    create: {
      email: targetEmail,
      username: targetUsername,
      passwordHash: newHash,
      role: "admin",
      fullName: "Administrador Pop Shake",
      avatarUrl: "/avatars/avatar-chef.svg",
    },
  });

  // Testa imediatamente a validação da senha com o hash recém-salvo
  const isValid = await bcrypt.compare(targetPassword, admin.passwordHash);

  console.log("\n✅ Administrador configurado com sucesso no banco!");
  console.log(`   ID:            ${admin.id}`);
  console.log(`   E-mail:        ${admin.email}`);
  console.log(`   Usuário:       ${admin.username}`);
  console.log(`   Role:          ${admin.role}`);
  console.log(`   Hash Válido:   ${isValid ? "SIM (100% Compatível)" : "NÃO"}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Erro ao configurar admin:", err);
  process.exit(1);
});
