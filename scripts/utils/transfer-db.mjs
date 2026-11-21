#!/usr/bin/env node

/**
 * Script de transferência e backup de dados: Local -> Remoto (PostgreSQL / Portainer)
 * Uso:
 *   node scripts/transfer-db.mjs [REMOTE_DATABASE_URL]
 * Ou:
 *   REMOTE_DATABASE_URL="postgresql://user:pass@host:5432/popclub" node scripts/transfer-db.mjs
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Carrega .env manualmente se não estiver presente no environment
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

const localUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
const remoteUrl = process.argv[2] || process.env.REMOTE_DATABASE_URL;

if (!localUrl) {
  console.error("❌ Erro: DATABASE_URL local não encontrada no .env");
  process.exit(1);
}

const localPrisma = new PrismaClient({
  datasources: { db: { url: localUrl } },
});

// Ordem estrita respeitando integridade referencial / chaves estrangeiras
const MODELS_ORDER = [
  { name: 'storeSettings', label: 'StoreSettings' },
  { name: 'loadingSettings', label: 'LoadingSettings' },
  { name: 'highlightBanner', label: 'HighlightBanner' },
  { name: 'cardBadge', label: 'CardBadge' },
  { name: 'category', label: 'Category' },
  { name: 'customAudienceList', label: 'CustomAudienceList' },
  { name: 'avatarPreset', label: 'AvatarPreset' },
  { name: 'notificationTemplate', label: 'NotificationTemplate' },
  { name: 'shift', label: 'Shift' },
  { name: 'coupon', label: 'Coupon' },
  { name: 'user', label: 'User' },
  { name: 'userLocation', label: 'UserLocation' },
  { name: 'product', label: 'Product' },
  { name: 'comboItem', label: 'ComboItem' },
  { name: 'promotion', label: 'Promotion' },
  { name: 'notification', label: 'Notification' },
  { name: 'userNotification', label: 'UserNotification' },
  { name: 'order', label: 'Order' },
  { name: 'orderItem', label: 'OrderItem' },
];

async function main() {
  console.log("==========================================================");
  console.log("🚀 Pop Shake Sorveteria — Migrador e Backup de Dados");
  console.log("==========================================================");
  console.log(`📍 Origem (Local):  ${localUrl.replace(/:[^:@]*@/, ':****@')}`);

  if (remoteUrl) {
    console.log(`🌐 Destino (Remoto): ${remoteUrl.replace(/:[^:@]*@/, ':****@')}`);
  } else {
    console.log("ℹ️  Destino Remoto: [NÃO INFORMADO] — O script executará o backup em arquivo JSON.");
  }
  console.log("----------------------------------------------------------");

  // 1. Extração dos dados locais
  console.log("📥 Extraindo registros do banco de dados local...");
  const dumpData = {};
  let totalRecords = 0;

  for (const { name, label } of MODELS_ORDER) {
    try {
      const records = await localPrisma[name].findMany();
      dumpData[name] = records;
      totalRecords += records.length;
      console.log(`   ✓ ${label.padEnd(22)}: ${records.length} registro(s)`);
    } catch (err) {
      console.warn(`   ⚠️  ${label.padEnd(22)}: Erro ao ler (${err.message})`);
      dumpData[name] = [];
    }
  }

  // 2. Salvar backup local de segurança em JSON
  const backupFile = path.resolve(process.cwd(), 'popclub_dump.json');
  fs.writeFileSync(backupFile, JSON.stringify(dumpData, null, 2), 'utf8');
  console.log(`\n💾 Backup local salvo em: ${backupFile} (${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB)`);

  // 3. Se houver URL remota, gravar no banco do servidor
  if (remoteUrl) {
    console.log("\n📡 Conectando ao banco remoto e iniciando inserção dos dados...");
    const remotePrisma = new PrismaClient({
      datasources: { db: { url: remoteUrl } },
    });

    try {
      await remotePrisma.$connect();
      console.log("✅ Conexão com o banco remoto estabelecida com sucesso!");

      for (const { name, label } of MODELS_ORDER) {
        const records = dumpData[name] || [];
        if (records.length === 0) continue;

        let insertedCount = 0;
        // Inserção em lotes ou via createMany
        try {
          // createMany com skipDuplicates preserva dados existentes e ignora conflitos de ID
          const res = await remotePrisma[name].createMany({
            data: records,
            skipDuplicates: true,
          });
          insertedCount = res.count;
        } catch (err) {
          // Fallback registro a registro com upsert se a tabela não suportar createMany
          for (const item of records) {
            try {
              if (item.id) {
                await remotePrisma[name].upsert({
                  where: { id: item.id },
                  update: item,
                  create: item,
                });
                insertedCount++;
              } else {
                await remotePrisma[name].create({ data: item });
                insertedCount++;
              }
            } catch (singleErr) {
              // Ignora duplicados residuais
            }
          }
        }
        console.log(`   ✨ ${label.padEnd(22)}: ${insertedCount} gravados no servidor remoto`);
      }

      console.log("\n🎉 Migração para o servidor de produção concluída com êxito!");
    } catch (remoteErr) {
      console.error("\n❌ Falha na conexão ou gravação remota:", remoteErr.message);
      console.log("\n💡 Dica: Verifique se a porta 5432 está aberta no firewall do servidor e se as credenciais estão corretas.");
    } finally {
      await remotePrisma.$disconnect();
    }
  } else {
    console.log("\n👉 Para enviar esses dados ao PostgreSQL da VPS, execute:");
    console.log(`   REMOTE_DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@SEU_IP_VPS:5432/popclub?schema=public" node scripts/utils/transfer-db.mjs\n`);
  }

  await localPrisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Erro fatal durante a execução:", err);
  process.exit(1);
});
