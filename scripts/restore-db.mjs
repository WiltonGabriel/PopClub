#!/usr/bin/env node

/**
 * Pop Shake Sorveteria — Script Oficial de Restauração de Backup
 * 
 * Restaura o banco de dados a partir de um dos 2 slots de backup (backup_slot_1 ou backup_slot_2).
 * Executa dentro de uma transação PostgreSQL atômica com rollback automático em caso de erro.
 * 
 * Uso:
 *   node scripts/restore-db.mjs <1|2>
 * Exemplo:
 *   node scripts/restore-db.mjs 1
 */

import fs from 'fs';
import path from 'path';
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
  console.error("❌ DATABASE_URL não definida no .env");
  process.exit(1);
}

const requestedSlot = process.argv[2] ? parseInt(process.argv[2], 10) : null;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

// Ordem correta para inserção respeitando foreign keys
const INSERT_ORDER = [
  'StoreSettings',
  'LoadingSettings',
  'HighlightBanner',
  'CardBadge',
  'Category',
  'CustomAudienceList',
  'AvatarPreset',
  'NotificationTemplate',
  'Shift',
  'Coupon',
  'User',
  'UserLocation',
  'Product',
  'ComboItem',
  'Promotion',
  'Notification',
  'UserNotification',
  'Order',
  'OrderItem',
];

async function main() {
  console.log("==========================================================================");
  console.log("♻️  POP SHAKE — RESTAURAÇÃO DE BACKUP DO BANCO DE DADOS");
  console.log("==========================================================================");
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📍 Endpoint: ${maskedUrl}\n`);

  try {
    await prisma.$connect();

    // 1. Consulta slots existentes
    let metadata = [];
    try {
      metadata = await prisma.$queryRawUnsafe(`
        SELECT slot, created_at, total_tables, total_rows 
        FROM public._backup_metadata 
        ORDER BY slot ASC;
      `);
    } catch {
      console.log("ℹ️  Nenhum backup encontrado no servidor (tabela _backup_metadata inexistente).");
      process.exit(1);
    }

    if (metadata.length === 0) {
      console.log("ℹ️  Nenhum slot de backup disponível no servidor.");
      process.exit(1);
    }

    console.log("📋 Backups Disponíveis no Servidor:");
    for (const m of metadata) {
      console.log(`   [SLOT ${m.slot}] Gravado em: ${new Date(m.created_at).toLocaleString('pt-BR')} (${m.total_rows} linhas em ${m.total_tables} tabelas)`);
    }

    if (!requestedSlot || (requestedSlot !== 1 && requestedSlot !== 2)) {
      console.log("\n👉 Para restaurar, informe o número do slot desejado:");
      console.log("   node scripts/restore-db.mjs 1");
      console.log("   node scripts/restore-db.mjs 2\n");
      process.exit(0);
    }

    const chosen = metadata.find((m) => m.slot === requestedSlot);
    if (!chosen) {
      console.error(`\n❌ Erro: O SLOT ${requestedSlot} não possui backup gravado.`);
      process.exit(1);
    }

    const sourceSchema = `backup_slot_${requestedSlot}`;
    console.log(`\n🚨 ATENÇÃO: Restaurando dados a partir de "${sourceSchema}" para o schema "public"...`);

    // 2. Executa restauração com Transaction
    await prisma.$executeRawUnsafe(`BEGIN;`);

    try {
      // Lista tabelas existentes no backup_slot
      const backupTables = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${sourceSchema}' 
          AND table_type = 'BASE TABLE';
      `);

      const tableSet = new Set(backupTables.map((t) => t.table_name));

      // Trunca todas as tabelas em public com CASCADE
      console.log("🧹 Limpando dados atuais do schema public...");
      for (const model of [...INSERT_ORDER].reverse()) {
        if (tableSet.has(model)) {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE public."${model}" CASCADE;`);
        }
      }

      // Restaura dados na ordem correta
      console.log("📥 Injetando dados do backup...");
      let restoredTotal = 0;
      for (const model of INSERT_ORDER) {
        if (tableSet.has(model)) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO public."${model}" 
            SELECT * FROM "${sourceSchema}"."${model}";
          `);
          const [c] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM public."${model}";`);
          restoredTotal += c.count;
          console.log(`   ✓ ${model.padEnd(25)}: ${c.count} linha(s) restaurada(s)`);
        }
      }

      // Outras tabelas que possam existir além de INSERT_ORDER (ex: _prisma_migrations)
      for (const { table_name } of backupTables) {
        if (!INSERT_ORDER.includes(table_name) && table_name !== '_backup_metadata') {
          try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE public."${table_name}" CASCADE;`);
            await prisma.$executeRawUnsafe(`
              INSERT INTO public."${table_name}" 
              SELECT * FROM "${sourceSchema}"."${table_name}";
            `);
          } catch {
            // Ignora tabelas de sistema se houver
          }
        }
      }

      await prisma.$executeRawUnsafe(`COMMIT;`);
      console.log("\n==========================================================================");
      console.log(`🎉 RESTAURAÇÃO CONCLUÍDA COM SUCESSO! (${restoredTotal} registros recuperados)`);
      console.log("==========================================================================");
    } catch (restoreErr) {
      await prisma.$executeRawUnsafe(`ROLLBACK;`);
      throw restoreErr;
    }
  } catch (err) {
    console.error("❌ Falha crítica na restauração:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
