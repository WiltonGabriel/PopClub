#!/usr/bin/env node

/**
 * Pop Shake Sorveteria — Script Oficial de Backup do Banco de Dados
 * 
 * Regra: Mantém NO MÁXIMO 2 backups ativos no servidor (backup_slot_1 e backup_slot_2)
 * através de rotação automática (FIFO). Também gera arquivo JSON em /backups com
 * retenção máxima de 2 arquivos.
 * 
 * Uso:
 *   node scripts/backup-db.mjs
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

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  console.log("==========================================================================");
  console.log("🛡️  POP SHAKE — BACKUP DE SEGURANÇA DO BANCO DE DADOS (MAX 2 BACKUPS)");
  console.log("==========================================================================");
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`📍 Endpoint: ${maskedUrl}\n`);

  try {
    await prisma.$connect();

    // 1. Inicializa tabela de controle de backups caso não exista
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public._backup_metadata (
        slot INT PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        total_tables INT NOT NULL,
        total_rows INT NOT NULL,
        details JSONB
      );
    `);

    // 2. Consulta histórico de slots
    const metadata = await prisma.$queryRawUnsafe(`
      SELECT slot, created_at, total_tables, total_rows 
      FROM public._backup_metadata 
      ORDER BY slot ASC;
    `);

    let targetSlot = 1;
    const slot1 = metadata.find((m) => m.slot === 1);
    const slot2 = metadata.find((m) => m.slot === 2);

    if (!slot1) {
      targetSlot = 1;
    } else if (!slot2) {
      targetSlot = 2;
    } else {
      // Ambos existem: sobrescreve o mais antigo (rotação FIFO estrita)
      targetSlot = new Date(slot1.created_at) < new Date(slot2.created_at) ? 1 : 2;
    }

    const schemaName = `backup_slot_${targetSlot}`;
    console.log(`📌 Selecionado Slot de Destino: [SLOT ${targetSlot}] (Schema: "${schemaName}")`);
    if (slot1 || slot2) {
      console.log("📋 Estado atual dos slots no servidor:");
      if (slot1) console.log(`   • Slot 1: ${new Date(slot1.created_at).toLocaleString('pt-BR')} (${slot1.total_rows} linhas em ${slot1.total_tables} tabelas)`);
      if (slot2) console.log(`   • Slot 2: ${new Date(slot2.created_at).toLocaleString('pt-BR')} (${slot2.total_rows} linhas em ${slot2.total_tables} tabelas)`);
    }

    // 3. Cria schema do slot selecionado
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);

    // 4. Lista todas as tabelas em public (exceto metadados)
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE' 
        AND table_name != '_backup_metadata';
    `);

    console.log(`\n📦 Clonando ${tables.length} tabelas no PostgreSQL da VPS...`);

    let totalRows = 0;
    const details = {};
    const jsonDump = {};

    for (const { table_name } of tables) {
      // Clona estrutura e dados
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${schemaName}"."${table_name}" CASCADE;`);
      await prisma.$executeRawUnsafe(`CREATE TABLE "${schemaName}"."${table_name}" AS TABLE public."${table_name}";`);

      const [countResult] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${schemaName}"."${table_name}";`);
      const rowCount = countResult.count;
      totalRows += rowCount;
      details[table_name] = rowCount;

      // Coleta dados para o JSON de contingência
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM public."${table_name}";`);
      jsonDump[table_name] = rows;

      console.log(`   ✓ ${table_name.padEnd(25)}: ${rowCount} linha(s) clonada(s)`);
    }

    // 5. Atualiza metadados do slot
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO public._backup_metadata (slot, created_at, total_tables, total_rows, details)
      VALUES ($1, NOW(), $2, $3, $4::jsonb)
      ON CONFLICT (slot) DO UPDATE SET
        created_at = EXCLUDED.created_at,
        total_tables = EXCLUDED.total_tables,
        total_rows = EXCLUDED.total_rows,
        details = EXCLUDED.details;
      `,
      targetSlot,
      tables.length,
      totalRows,
      JSON.stringify(details)
    );

    // 6. Salva arquivo JSON em /backups e garante retenção máxima de 2 arquivos
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFile = path.join(backupDir, `backup_slot_${targetSlot}_${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(jsonDump, null, 2), 'utf8');

    // Limpeza de arquivos antigos: mantém apenas os 2 mais recentes
    const existingFiles = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f,
        fullPath: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (existingFiles.length > 2) {
      const filesToDelete = existingFiles.slice(2);
      for (const f of filesToDelete) {
        fs.unlinkSync(f.fullPath);
        console.log(`🧹 Removido arquivo de backup antigo para manter o limite de 2: ${f.name}`);
      }
    }

    console.log("\n==========================================================================");
    console.log(`✅ BACKUP CONCLUÍDO COM SUCESSO NO SERVIDOR VPS!`);
    console.log(`   • Slot Ativo:     backup_slot_${targetSlot}`);
    console.log(`   • Total Linhas:   ${totalRows}`);
    console.log(`   • Total Tabelas:  ${tables.length}`);
    console.log(`   • Cópia JSON:     backups/${path.basename(jsonFile)}`);
    console.log(`   • Limite Máximo:  2 backups garantidos`);
    console.log("==========================================================================");

  } catch (err) {
    console.error("❌ Erro durante o backup:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
