#!/usr/bin/env node

/**
 * Pop Shake Sorveteria — Script Oficial de Restauração de Backup
 *
 * Restaura o banco de dados a partir de um dos 2 slots de backup (backup_slot_1 ou backup_slot_2).
 * Executa dentro de uma transação PostgreSQL atômica com rollback automático em caso de erro.
 *
 * Uso:
 *   node scripts/restore-db.mjs <1|2>
 *   node scripts/restore-db.mjs --verify <1|2>
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

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify');
const slotArg = args.find((a) => /^\d+$/.test(a));
const requestedSlot = slotArg ? parseInt(slotArg, 10) : null;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

// Ordem topológica real (nomes snake_case no PostgreSQL) respeitando todas as FKs
export const INSERT_ORDER = [
  'store_settings',
  'loading_settings',
  'highlight_banners',
  'card_badges',
  'categories',
  'custom_audience_lists',
  'avatar_presets',
  'notification_templates',
  'loyalty_badge_configs',
  'custom_roles',
  'couriers',
  'shifts',
  'coupons',
  'addon_groups',
  'users',
  'user_locations',
  'products',
  'addon_items',
  'product_addon_groups',
  'combo_items',
  'promotions',
  'notifications',
  'user_notifications',
  'orders',
  'order_items',
  'coupon_redemptions',
  'admin_audit_logs',
];

const IGNORED_TABLES = new Set(['_backup_metadata', '_prisma_migrations']);

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
      console.log("\n👉 Para restaurar ou verificar, informe o número do slot desejado:");
      console.log("   node scripts/restore-db.mjs 1");
      console.log("   node scripts/restore-db.mjs --verify 1\n");
      process.exit(0);
    }

    const chosen = metadata.find((m) => m.slot === requestedSlot);
    if (!chosen) {
      console.error(`\n❌ Erro: O SLOT ${requestedSlot} não possui backup gravado.`);
      process.exit(1);
    }

    const sourceSchema = `backup_slot_${requestedSlot}`;

    const backupTables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${sourceSchema}' 
        AND table_type = 'BASE TABLE';
    `);

    const publicTables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
    `);

    const backupSet = new Set(backupTables.map((t) => t.table_name));
    const publicSet = new Set(publicTables.map((t) => t.table_name));

    const unknownTables = [...backupSet].filter(
      (t) => !IGNORED_TABLES.has(t) && !INSERT_ORDER.includes(t)
    );

    if (verifyOnly) {
      console.log(`\n🔎 Verificando integridade de "${sourceSchema}" (somente leitura)...`);
      for (const table of INSERT_ORDER) {
        if (backupSet.has(table)) {
          const [cnt] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${sourceSchema}"."${table}";`);
          console.log(`   ✓ ${table.padEnd(25)}: ${cnt.count} linha(s) pronta(s)`);
        }
      }
      if (unknownTables.length > 0) {
        console.warn(`   ⚠️ Tabelas fora da ordem padrão: ${unknownTables.join(', ')}`);
      }
      console.log("\n✅ Verificação de backup concluída.");
      return;
    }

    console.log(`\n🚨 ATENÇÃO: Restaurando dados a partir de "${sourceSchema}" para o schema "public"...`);

    // 2. Executa restauração atômica em transação única sem silenciar falhas
    await prisma.$executeRawUnsafe(`BEGIN;`);

    try {
      const truncateOrder = [
        ...unknownTables,
        ...[...INSERT_ORDER].reverse(),
      ];

      console.log("🧹 Limpando dados atuais do schema public...");
      for (const table of truncateOrder) {
        if (publicSet.has(table) && backupSet.has(table)) {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE public."${table}" CASCADE;`);
        }
      }

      console.log("📥 Injetando dados do backup...");
      let restoredTotal = 0;

      for (const table of INSERT_ORDER) {
        if (!backupSet.has(table)) continue;
        if (!publicSet.has(table)) {
          throw new Error(`Tabela "${table}" existe no backup mas não existe no schema public.`);
        }

        await prisma.$executeRawUnsafe(`
          INSERT INTO public."${table}" 
          SELECT * FROM "${sourceSchema}"."${table}";
        `);

        const [expected] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${sourceSchema}"."${table}";`);
        const [actual] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM public."${table}";`);
        if (expected.count !== actual.count) {
          throw new Error(`Divergência de contagem na tabela "${table}": esperado=${expected.count}, restaurado=${actual.count}`);
        }

        restoredTotal += actual.count;
        console.log(`   ✓ ${table.padEnd(25)}: ${actual.count} linha(s) restaurada(s)`);
      }

      // Tabelas extras não previstas: falhar caso não possam ser restauradas (nunca ignorar erro!)
      for (const extraTable of unknownTables) {
        if (!publicSet.has(extraTable)) {
          throw new Error(`Tabela adicional "${extraTable}" ausente no schema public.`);
        }
        await prisma.$executeRawUnsafe(`
          INSERT INTO public."${extraTable}" 
          SELECT * FROM "${sourceSchema}"."${extraTable}";
        `);
        const [actual] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM public."${extraTable}";`);
        restoredTotal += actual.count;
        console.log(`   ✓ ${extraTable.padEnd(25)}: ${actual.count} linha(s) restaurada(s) [extra]`);
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
    console.error("❌ Falha crítica na restauração (ROLLBACK executado):", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
