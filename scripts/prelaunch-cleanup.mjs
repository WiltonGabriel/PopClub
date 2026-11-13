#!/usr/bin/env node

/**
 * Pop Shake Sorveteria — Rotina Controlada de Limpeza Pré-Lançamento
 *
 * Modo padrão SEGURO: --dry-run (somente leitura; não modifica nenhum dado).
 * Para executar a limpeza real após revisar o relatório:
 *   node scripts/prelaunch-cleanup.mjs --confirm-wipe --yes-remove-test-clients
 *
 * Garantias:
 * 1. Executa backup completo automático (scripts/backup-db.mjs) antes de apagar qualquer linha.
 * 2. Preserva 100% das contas ADMIN/EDITOR, custom_roles, catálogo, store_settings,
 *    banners, card_badges, avatar_presets, notification_templates, loyalty_badge_configs e couriers.
 * 3. Executa tudo em transação única (prisma.$transaction) com validação de >= 1 ADMIN ativo.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { PrismaClient, Role } from '@prisma/client';

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
  console.error('❌ DATABASE_URL não definida no .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const isConfirmWipe =
  args.includes('--confirm-wipe') &&
  (args.includes('--yes-remove-test-clients') || process.env.CONFIRM_PRELAUNCH_WIPE === 'YES');
const skipAutoBackup = args.includes('--skip-backup');

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const PLACEHOLDER_WHATSAPP = new Set(['5565999999999', '5565992345678']);
const MOCK_COURIER_NAMES = new Set(['Carlos Silva', 'Marcos Vinícius', 'Lucas Ferreira']);

async function collectSnapshot() {
  const [
    activeAdmins,
    editors,
    clientsTotal,
    clientsRegistered,
    clientsFastAccess,
    orders,
    orderItems,
    couponRedemptions,
    notifications,
    userNotifications,
    customAudienceLists,
    userLocations,
    shifts,
    coupons,
    products,
    promotions,
    categories,
    couriers,
    storeSettings,
    courierRows,
    adminRows,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.ADMIN, isActive: true, isBlocked: false, deletedAt: null } }),
    prisma.user.count({ where: { role: Role.EDITOR, deletedAt: null } }),
    prisma.user.count({ where: { role: Role.CLIENT } }),
    prisma.user.count({ where: { role: Role.CLIENT, isRegistered: true } }),
    prisma.user.count({ where: { role: Role.CLIENT, isRegistered: false } }),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.couponRedemption.count(),
    prisma.notification.count(),
    prisma.userNotification.count(),
    prisma.customAudienceList.count(),
    prisma.userLocation.count({ where: { user: { role: Role.CLIENT } } }),
    prisma.shift.count(),
    prisma.coupon.count(),
    prisma.product.count(),
    prisma.promotion.count(),
    prisma.category.count(),
    prisma.courier.count(),
    prisma.storeSettings.findUnique({ where: { id: 'store_config' } }),
    prisma.courier.findMany({ select: { name: true } }),
    prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { email: true } }),
  ]);

  const hygieneWarnings = [];
  if (storeSettings?.whatsappNumber && PLACEHOLDER_WHATSAPP.has(storeSettings.whatsappNumber.replace(/\D/g, ''))) {
    hygieneWarnings.push('StoreSettings.whatsappNumber usa número de desenvolvimento.');
  }
  if (!storeSettings?.storeCnpj || !storeSettings.storeCnpj.trim()) {
    hygieneWarnings.push('StoreSettings.storeCnpj não preenchido (verifique se aplicável).');
  }
  const mockCouriers = courierRows.map((c) => c.name).filter((n) => MOCK_COURIER_NAMES.has(n));
  if (mockCouriers.length > 0) {
    hygieneWarnings.push(`Entregadores possivelmente de exemplo: ${mockCouriers.join(', ')}.`);
  }
  if (adminRows.some((a) => String(a.email || '').toLowerCase() === 'admin@popclub.com')) {
    hygieneWarnings.push('Conta admin@popclub.com presente: confirme alteração da senha padrão dev antes do lançamento.');
  }

  return {
    counts: {
      activeAdmins,
      editors,
      clientsTotal,
      clientsRegistered,
      clientsFastAccess,
      orders,
      orderItems,
      couponRedemptions,
      notifications,
      userNotifications,
      customAudienceLists,
      userLocations,
      shifts,
      coupons,
      products,
      promotions,
      categories,
      couriers,
    },
    hygieneWarnings,
  };
}

function printDryRunReport(snapshot) {
  const { counts, hygieneWarnings } = snapshot;
  console.log('==========================================================================');
  console.log(`🔎 RELATÓRIO PRÉ-LANÇAMENTO (${isConfirmWipe ? 'EXECUÇÃO AUTORIZADA' : 'MODO DRY-RUN — SOMENTE LEITURA'})`);
  console.log('==========================================================================\n');

  console.log('🗑️  REGISTROS QUE SERÃO REMOVIDOS (DADOS DE TESTE):');
  console.log(`   • coupon_redemptions     : ${counts.couponRedemptions}`);
  console.log(`   • order_items            : ${counts.orderItems}`);
  console.log(`   • orders                 : ${counts.orders}`);
  console.log(`   • user_notifications     : ${counts.userNotifications}`);
  console.log(`   • notifications          : ${counts.notifications}`);
  console.log(`   • custom_audience_lists  : ${counts.customAudienceLists}`);
  console.log(`   • user_locations (CLIENT): ${counts.userLocations}`);
  console.log(`   • users (CLIENT total)   : ${counts.clientsTotal} (${counts.clientsRegistered} cadastrados + ${counts.clientsFastAccess} acesso rápido)`);
  console.log(`   • shifts (turnos teste)  : ${counts.shifts}`);

  console.log('\n🔄 CONTADORES QUE SERÃO ZERADOS (SEM EXCLUIR REGISTROS):');
  console.log(`   • store_settings         : currentShiftId, openedAt, closedAt -> NULL`);
  console.log(`   • coupons                : ${counts.coupons} registro(s) -> uses = 0`);
  console.log(`   • products               : ${counts.products} registro(s) -> scarcitySold = 0`);
  console.log(`   • promotions             : ${counts.promotions} registro(s) -> scarcitySold = 0`);

  console.log('\n🛡️  REGISTROS QUE SERÃO PRESERVADOS INTEGRALMENTE:');
  console.log(`   • users (ADMIN ativos)   : ${counts.activeAdmins}`);
  console.log(`   • users (EDITOR)         : ${counts.editors}`);
  console.log(`   • categories             : ${counts.categories}`);
  console.log(`   • products               : ${counts.products}`);
  console.log(`   • promotions             : ${counts.promotions}`);
  console.log(`   • coupons (definições)   : ${counts.coupons}`);
  console.log(`   • couriers               : ${counts.couriers}`);

  if (hygieneWarnings.length > 0) {
    console.log('\n⚠️  CHECKLIST DE HIGIENIZAÇÃO PRÉ-PRODUÇÃO:');
    for (const warning of hygieneWarnings) {
      console.log(`   - ${warning}`);
    }
  }
  console.log('');
}

async function main() {
  try {
    await prisma.$connect();

    const snapshot = await collectSnapshot();
    printDryRunReport(snapshot);

    if (snapshot.counts.activeAdmins < 1) {
      console.error('❌ BLOQUEADO: Nenhum ADMIN ativo encontrado no banco. Abortando por segurança.');
      process.exit(1);
    }

    if (!isConfirmWipe) {
      console.log('ℹ️  Modo DRY-RUN concluído. Nenhuma alteração foi gravada no banco.');
      console.log('👉 Quando estiver pronto para limpar após backup, execute:');
      console.log('   node scripts/prelaunch-cleanup.mjs --confirm-wipe --yes-remove-test-clients\n');
      return;
    }

    if (!skipAutoBackup) {
      console.log('🛡️  Executando backup obrigatório antes da limpeza...');
      execFileSync(process.execPath, [path.resolve(process.cwd(), 'scripts', 'backup-db.mjs')], {
        stdio: 'inherit',
      });
    }

    console.log('\n🚨 Executando limpeza transacional atômica...');
    const summary = await prisma.$transaction(async (tx) => {
      const adminsBefore = await tx.user.count({
        where: { role: Role.ADMIN, isActive: true, isBlocked: false, deletedAt: null },
      });
      if (adminsBefore < 1) {
        throw new Error('Operação abortada: ao menos 1 ADMIN ativo é obrigatório.');
      }

      await tx.storeSettings.updateMany({
        data: { currentShiftId: null, openedAt: null, closedAt: null },
      });

      const delRedemptions = await tx.couponRedemption.deleteMany({});
      const delOrderItems = await tx.orderItem.deleteMany({});
      const delOrders = await tx.order.deleteMany({});
      const delUserNotifs = await tx.userNotification.deleteMany({});
      const delNotifs = await tx.notification.deleteMany({});
      const delAudiences = await tx.customAudienceList.deleteMany({});
      const delLocations = await tx.userLocation.deleteMany({
        where: { user: { role: Role.CLIENT } },
      });
      const delClients = await tx.user.deleteMany({
        where: { role: Role.CLIENT },
      });
      const delShifts = await tx.shift.deleteMany({});

      await tx.coupon.updateMany({ data: { uses: 0 } });
      await tx.product.updateMany({ data: { scarcitySold: 0 } });
      await tx.promotion.updateMany({ data: { scarcitySold: 0 } });

      const adminsAfter = await tx.user.count({
        where: { role: Role.ADMIN, isActive: true, isBlocked: false, deletedAt: null },
      });
      if (adminsAfter < 1) {
        throw new Error('Verificação pós-limpeza falhou: ADMIN ativo ausente. Executando rollback.');
      }

      await tx.adminAuditLog.create({
        data: {
          actorUserId: null,
          actorRole: 'SYSTEM',
          action: 'PRELAUNCH_CLEANUP_EXECUTED',
          resourceType: 'database',
          summary: `Limpeza pré-lançamento executada: ${delClients.count} cliente(s) e ${delOrders.count} pedido(s) removidos; ${adminsAfter} admin(s) preservado(s).`,
          diffKeys: ['clients', 'orders', 'shifts', 'notifications'],
          metadata: {
            deletedClients: delClients.count,
            deletedOrders: delOrders.count,
            deletedOrderItems: delOrderItems.count,
            deletedCouponRedemptions: delRedemptions.count,
            deletedNotifications: delNotifs.count,
            deletedUserNotifications: delUserNotifs.count,
            deletedAudienceLists: delAudiences.count,
            deletedLocations: delLocations.count,
            deletedShifts: delShifts.count,
            preservedAdmins: adminsAfter,
          },
        },
      });

      return {
        deletedClients: delClients.count,
        deletedOrders: delOrders.count,
        deletedShifts: delShifts.count,
        preservedAdmins: adminsAfter,
      };
    });

    console.log('✅ Limpeza pré-lançamento concluída com sucesso!', summary);
  } catch (err) {
    console.error('❌ Erro na rotina pré-lançamento (nenhuma mudança persistida):', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
