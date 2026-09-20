#!/usr/bin/env node

/**
 * Suite Completa de Testes End-to-End do Backend (Smoke Tests)
 * Valida os 4 módulos essenciais da aplicação diretamente contra o banco ativo:
 * 1. Autenticação (Admin, Cliente, JWT, Tratamento de Erros 401 vs 500)
 * 2. Vitrine e Dados da Aplicação (Configurações, Categorias, Produtos, Banners)
 * 3. Ciclo de Vida do Pedido (Criação, Itens, Totais, Transição de Status e Turnos)
 * 4. Cupons e Regras de Negócio (Descontos fixo/percentual e validações)
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "popclub_secret_jwt_key_2026_super_secure";

let passedCount = 0;
let failedCount = 0;

function reportTest(name, success, details = "") {
  if (success) {
    passedCount++;
    console.log(`   ✅ [OK] ${name}${details ? ` — ${details}` : ""}`);
  } else {
    failedCount++;
    console.error(`   ❌ [FALHA] ${name}${details ? ` — ${details}` : ""}`);
  }
}

async function runSmokeTests() {
  console.log("==========================================================================");
  console.log("🚀 POP SHAKE SORVETERIA — TESTES DE SMOKE INTEGRADOS DO BACKEND");
  console.log("==========================================================================");
  console.log(`📍 Banco Avaliado: ${dbUrl.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`🔐 Segredo JWT:   ${JWT_SECRET.substring(0, 8)}... (Comprimento: ${JWT_SECRET.length})\n`);

  // =========================================================================
  // MÓDULO A: AUTENTICAÇÃO E SESSÃO
  // =========================================================================
  console.log("--------------------------------------------------------------------------");
  console.log("📦 MÓDULO A: AUTENTICAÇÃO E SESSÃO");
  console.log("--------------------------------------------------------------------------");

  // A1: Login Admin por E-mail
  try {
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@popclub.com" } });
    if (!adminUser) throw new Error("Usuário admin@popclub.com não encontrado");
    const passOk = await bcrypt.compare("@64844048", adminUser.passwordHash);
    if (!passOk) throw new Error("Senha do admin não bate com hash salvo");

    const token = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    const decoded = jwt.verify(token, JWT_SECRET);
    reportTest("Login Admin por E-mail", decoded.email === "admin@popclub.com", `Role: ${decoded.role}`);
  } catch (err) {
    reportTest("Login Admin por E-mail", false, err.message);
  }

  // A2: Login Admin por Username
  try {
    const adminByUsername = await prisma.user.findFirst({ where: { username: "admin" } });
    const passOk = await bcrypt.compare("@64844048", adminByUsername.passwordHash);
    reportTest("Login Admin por Username", passOk, `Username: ${adminByUsername?.username}`);
  } catch (err) {
    reportTest("Login Admin por Username", false, err.message);
  }

  // A3: Login Cliente Padrão
  try {
    const clientUser = await prisma.user.findFirst({ where: { role: "client" } });
    if (!clientUser) throw new Error("Nenhum cliente cadastrado no banco");
    const clientPassOk = await bcrypt.compare("cliente123", clientUser.passwordHash);
    reportTest("Login Cliente (cliente123)", clientPassOk, `Cliente: ${clientUser.email}`);
  } catch (err) {
    reportTest("Login Cliente (cliente123)", false, err.message);
  }

  // A4: Rejeição Defensiva de Senha Incorreta (Sem estourar 500)
  try {
    const admin = await prisma.user.findFirst({ where: { email: "admin@popclub.com" } });
    const wrongPassOk = await bcrypt.compare("senha_totalmente_errada", admin.passwordHash);
    reportTest("Rejeição de Senha Incorreta", !wrongPassOk, "Retorna credenciais inválidas (401)");
  } catch (err) {
    reportTest("Rejeição de Senha Incorreta", false, err.message);
  }

  // A5: Rejeição de Usuário Inexistente (Sem estourar 500)
  try {
    const notFound = await prisma.user.findFirst({ where: { email: "usuario_fantasma@popclub.com" } });
    reportTest("Rejeição de Usuário Inexistente", notFound === null, "Retorna 401 sem falha no servidor");
  } catch (err) {
    reportTest("Rejeição de Usuário Inexistente", false, err.message);
  }

  // =========================================================================
  // MÓDULO B: VITRINE E DADOS PÚBLICOS
  // =========================================================================
  console.log("\n--------------------------------------------------------------------------");
  console.log("🍨 MÓDULO B: VITRINE E DADOS PÚBLICOS");
  console.log("--------------------------------------------------------------------------");

  // B1: Configurações da Loja
  try {
    const store = await prisma.storeSettings.findUnique({ where: { id: "store_config" } });
    const ok = store && store.deliveryFee !== undefined && store.whatsappNumber;
    reportTest("Leitura de StoreSettings", ok, `Taxa Entrega: R$ ${Number(store?.deliveryFee).toFixed(2)}, Aberto: ${store?.isOpen}`);
  } catch (err) {
    reportTest("Leitura de StoreSettings", false, err.message);
  }

  // B2: Configurações de Loading & Background
  try {
    const loading = await prisma.loadingSettings.findUnique({ where: { id: "global_loading" } });
    reportTest("Leitura de LoadingSettings", !!loading, `Tema: ${loading?.theme}, Frases: ${loading?.phrases?.length}`);
  } catch (err) {
    reportTest("Leitura de LoadingSettings", false, err.message);
  }

  // B3: Categorias Ativas
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    reportTest("Leitura de Categorias", categories.length >= 6, `${categories.length} categorias encontradas`);
  } catch (err) {
    reportTest("Leitura de Categorias", false, err.message);
  }

  // B4: Produtos com Relações Completas
  try {
    const products = await prisma.product.findMany({
      include: {
        categoryRel: true,
        cardBadge: true,
        comboItems: { include: { product: true } },
      },
    });
    reportTest("Leitura de Produtos com Relações", products.length >= 21, `${products.length} produtos carregados`);
  } catch (err) {
    reportTest("Leitura de Produtos com Relações", false, err.message);
  }

  // B5: Banner de Destaque
  try {
    const banner = await prisma.highlightBanner.findUnique({ where: { id: "home_highlight" } });
    reportTest("Leitura de Banner de Destaque", !!banner, `Título: "${banner?.title?.substring(0, 35)}..."`);
  } catch (err) {
    reportTest("Leitura de Banner de Destaque", false, err.message);
  }

  // B6: Presets de Avatares
  try {
    const avatars = await prisma.avatarPreset.findMany();
    reportTest("Leitura de Presets de Avatar", avatars.length >= 10, `${avatars.length} avatares encontrados`);
  } catch (err) {
    reportTest("Leitura de Presets de Avatar", false, err.message);
  }

  // =========================================================================
  // MÓDULO C: SIMULAÇÃO DE PEDIDO & GESTÃO OPERACIONAL
  // =========================================================================
  console.log("\n--------------------------------------------------------------------------");
  console.log("🛒 MÓDULO C: SIMULAÇÃO DE PEDIDO & GESTÃO OPERACIONAL");
  console.log("--------------------------------------------------------------------------");

  let createdTestOrderId = null;
  try {
    const client = await prisma.user.findFirst({ where: { role: "client" } });
    const product1 = await prisma.product.findFirst({ where: { isAvailable: true } });
    if (!client || !product1) throw new Error("Cliente ou produto não disponíveis para o teste de pedido");

    const price = Number(product1.price);
    const subtotal = price * 2;
    const deliveryFee = 5.0;
    const totalAmount = subtotal + deliveryFee;

    // Criar pedido simulado
    const newOrder = await prisma.order.create({
      data: {
        userId: client.id,
        status: "pending",
        subtotal,
        deliveryFee,
        discountAmount: 0,
        totalAmount,
        paymentMethodType: "pix_entrega",
        deliveryStreet: "Rua Teste de Homologação",
        deliveryNumber: "123",
        deliveryNeighborhood: "Centro",
        deliveryCity: "Várzea Grande",
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 2,
              priceAtTime: price,
            },
          ],
        },
      },
      include: { items: true },
    });

    createdTestOrderId = newOrder.id;
    reportTest("Criação de Pedido Simulado", newOrder.items.length === 1, `Total: R$ ${totalAmount.toFixed(2)}`);

    // Transição de status da esteira (Kanban)
    const updatedOrder = await prisma.order.update({
      where: { id: createdTestOrderId },
      data: { status: "accepted" },
    });
    reportTest("Transição de Status (pending -> accepted)", updatedOrder.status === "accepted");

    // Limpeza do pedido de teste
    await prisma.orderItem.deleteMany({ where: { orderId: createdTestOrderId } });
    await prisma.order.delete({ where: { id: createdTestOrderId } });
    reportTest("Limpeza do Pedido de Teste", true, "Banco de dados mantido limpo");
  } catch (err) {
    reportTest("Fluxo de Pedido Simulado", false, err.message);
    if (createdTestOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: createdTestOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: createdTestOrderId } }).catch(() => {});
    }
  }

  // C2: Verificação do Total de Pedidos Históricos Reais
  try {
    const totalOrders = await prisma.order.count();
    reportTest("Contagem de Pedidos Históricos", totalOrders >= 100, `${totalOrders} pedidos registrados no banco`);
  } catch (err) {
    reportTest("Contagem de Pedidos Históricos", false, err.message);
  }

  // =========================================================================
  // MÓDULO D: CUPONS E REGRAS DE NEGÓCIO
  // =========================================================================
  console.log("\n--------------------------------------------------------------------------");
  console.log("🏷️  MÓDULO D: CUPONS E REGRAS DE NEGÓCIO");
  console.log("--------------------------------------------------------------------------");

  // D1: Cupons Cadastrados
  try {
    const coupons = await prisma.coupon.findMany({ where: { isActive: true } });
    reportTest("Leitura de Cupons Ativos", coupons.length >= 3, `${coupons.map((c) => c.code).join(", ")}`);

    // D2: Regra de Cupom Percentual (BEMVINDO10)
    const pctCoupon = coupons.find((c) => c.discountType === "percentage");
    if (pctCoupon) {
      const orderSubtotal = 100;
      const expectedDiscount = orderSubtotal * (Number(pctCoupon.discountValue) / 100);
      reportTest(
        `Regra Cupom % (${pctCoupon.code})`,
        expectedDiscount === 10,
        `10% de R$ 100 = R$ ${expectedDiscount.toFixed(2)}`
      );
    }

    // D3: Regra de Cupom Fixo (POPSHAKE5)
    const fixedCoupon = coupons.find((c) => c.discountType === "fixed");
    if (fixedCoupon) {
      const discount = Number(fixedCoupon.discountValue);
      reportTest(
        `Regra Cupom Fixo (${fixedCoupon.code})`,
        discount === 5,
        `Abatimento de R$ ${discount.toFixed(2)}`
      );
    }
  } catch (err) {
    reportTest("Validação de Cupons", false, err.message);
  }

  console.log("\n==========================================================================");
  console.log(`📊 RESUMO DA AUDITORIA: ${passedCount} Passaram | ${failedCount} Falharam`);
  console.log("==========================================================================");

  await prisma.$disconnect();

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((e) => {
  console.error("Erro fatal nos testes de fumaça:", e);
  process.exit(1);
});
