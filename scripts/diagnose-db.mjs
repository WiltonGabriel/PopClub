#!/usr/bin/env node

/**
 * Script de Diagnóstico e Auditoria de Conexão e Integridade de Dados
 * Valida a conexão com DATABASE_URL (.env atual), contagem das tabelas e
 * lógica de consulta das rotas críticas de API.
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

async function runDiagnostics() {
  const results = {
    connection: { status: 'PENDING', host: '', db: '', latencyMs: 0 },
    tables: {},
    apis: {},
  };

  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
  console.log("=================================================================");
  console.log("🔍 DIAGNÓSTICO DE BANCO DE DADOS & AUDITORIA DE ROTAS");
  console.log("=================================================================");
  console.log(`📍 Endpoint Avaliado: ${maskedUrl}\n`);

  // 1. Teste de Conectividade e Ping
  const startTime = Date.now();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as ping`;
    const latency = Date.now() - startTime;
    results.connection = {
      status: 'OK',
      latencyMs: latency,
      url: maskedUrl,
    };
    console.log(`[1] CONECTIVIDADE & SCHEMA: ✅ OK (${latency}ms)`);
  } catch (err) {
    results.connection = { status: 'FALHA', error: err.message };
    console.error(`[1] CONECTIVIDADE & SCHEMA: ❌ FALHA - ${err.message}`);
    await prisma.$disconnect();
    return results;
  }

  // 2. Contagem e Integridade de Dados
  console.log("\n[2] CONTAGEM E INTEGRIDADE DE TABELAS:");
  const tablesToCheck = [
    { key: 'storeSettings', label: 'StoreSettings', model: prisma.storeSettings },
    { key: 'loadingSettings', label: 'LoadingSettings', model: prisma.loadingSettings },
    { key: 'categories', label: 'Categories', model: prisma.category },
    { key: 'products', label: 'Products', model: prisma.product },
    { key: 'promotions', label: 'Promotions', model: prisma.promotion },
    { key: 'highlightBanners', label: 'HighlightBanners', model: prisma.highlightBanner },
    { key: 'orders', label: 'Orders', model: prisma.order },
    { key: 'users', label: 'Users', model: prisma.user },
    { key: 'orderItems', label: 'OrderItems', model: prisma.orderItem },
    { key: 'coupons', label: 'Coupons', model: prisma.coupon },
    { key: 'cardBadges', label: 'CardBadges', model: prisma.cardBadge },
  ];

  for (const { key, label, model } of tablesToCheck) {
    try {
      const count = await model.count();
      results.tables[key] = { status: 'OK', count };
      console.log(`    ✓ ${label.padEnd(20)}: ${count} registro(s)`);
    } catch (err) {
      results.tables[key] = { status: 'FALHA', count: 0, error: err.message };
      console.log(`    ✗ ${label.padEnd(20)}: FALHA (${err.message})`);
    }
  }

  // 3. Validação das Rotas de API Críticas
  console.log("\n[3] VALIDAÇÃO DE ROTAS DE API CRÍTICAS (Simulação de Query & Formatação):");

  // 3.1 /api/categories
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    if (!Array.isArray(categories)) {
      throw new Error("Retorno não é um array");
    }
    results.apis['/api/categories'] = {
      status: 'OK',
      itemCount: categories.length,
      sample: categories.slice(0, 3).map((c) => c.name),
    };
    console.log(`    ✓ /api/categories: ✅ OK (${categories.length} categorias carregadas)`);
  } catch (err) {
    results.apis['/api/categories'] = { status: 'FALHA', error: err.message };
    console.log(`    ✗ /api/categories: ❌ FALHA (${err.message})`);
  }

  // 3.2 /api/products
  try {
    const products = await prisma.product.findMany({
      include: {
        categoryRel: { select: { name: true } },
        cardBadge: true,
        comboItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.categoryRel?.name || p.category || "Outros",
      imageUrl: p.imageUrl || "",
      stock: p.stock,
      isAvailable: p.isAvailable,
      cardBadgeId: p.cardBadgeId,
      cardBadge: p.cardBadge,
      isCombo: p.isCombo,
      comboItems:
        p.comboItems?.map((ci) => ({
          id: ci.id,
          productId: ci.productId,
          quantity: ci.quantity,
          product: {
            id: ci.product?.id,
            name: ci.product?.name,
            price: Number(ci.product?.price || 0),
            imageUrl: ci.product?.imageUrl || "",
          },
        })) || [],
    }));

    results.apis['/api/products'] = {
      status: 'OK',
      itemCount: formatted.length,
      sample: formatted.slice(0, 3).map((p) => `${p.name} (R$ ${p.price.toFixed(2)})`),
    };
    console.log(`    ✓ /api/products:   ✅ OK (${formatted.length} produtos formatados com sucesso)`);
  } catch (err) {
    results.apis['/api/products'] = { status: 'FALHA', error: err.message };
    console.log(`    ✗ /api/products:   ❌ FALHA (${err.message})`);
  }

  // 3.3 /api/promotions
  try {
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedPromos = promotions.map((p) => {
      let finalPrice = p.product ? Number(p.product.price) : 0;
      const originalTotal = finalPrice;
      if (p.discountType === "percentage") {
        const pct = Number(p.discountValue);
        finalPrice = originalTotal * (1 - pct / 100);
      } else {
        const fixed = Number(p.discountValue);
        finalPrice = Math.max(0, originalTotal - fixed);
      }

      return {
        id: p.id,
        title: p.title,
        badge: p.badge,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        isActive: p.isActive,
        originalTotal: Number(originalTotal.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
      };
    });

    results.apis['/api/promotions'] = {
      status: 'OK',
      itemCount: formattedPromos.length,
    };
    console.log(`    ✓ /api/promotions: ✅ OK (${formattedPromos.length} promoções ativas carregadas sem 500)`);
  } catch (err) {
    results.apis['/api/promotions'] = { status: 'FALHA', error: err.message };
    console.log(`    ✗ /api/promotions: ❌ FALHA (${err.message})`);
  }

  console.log("\n=================================================================");
  console.log("🎯 RESULTADO GERAL: Todas as verificações concluídas!");
  console.log("=================================================================");

  await prisma.$disconnect();
  return results;
}

runDiagnostics().catch((e) => {
  console.error("Erro inesperado no diagnóstico:", e);
  process.exit(1);
});
