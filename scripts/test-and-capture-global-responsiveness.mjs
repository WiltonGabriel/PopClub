import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/responsividade-global");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret && typeof secret === "string" && secret.trim().length > 0) {
    return secret.trim();
  }
  return "popclub_secret_jwt_key_2026_super_secure";
}

function createToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

async function checkNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const hasOverflow = docWidth > winWidth;
    let overflowingEl = null;

    if (hasOverflow) {
      const all = document.querySelectorAll("*");
      for (const el of all) {
        if (el.tagName !== "HTML" && el.tagName !== "BODY" && (el.scrollWidth > winWidth + 5 || el.offsetWidth > winWidth + 5)) {
          overflowingEl = {
            tag: el.tagName,
            class: (el.className && typeof el.className === "string") ? el.className.substring(0, 100) : "",
            offsetWidth: el.offsetWidth,
            scrollWidth: el.scrollWidth,
          };
          break;
        }
      }
    }

    return {
      scrollWidth: docWidth,
      innerWidth: winWidth,
      hasOverflow,
      difference: docWidth - winWidth,
      overflowingEl,
    };
  });

  if (result.hasOverflow) {
    console.warn(`⚠️ [OVERFLOW DETECTADO em ${label}]: scrollWidth (${result.scrollWidth}px) > innerWidth (${result.innerWidth}px) por ${result.difference}px`);
    if (result.overflowingEl) {
      console.warn(`   -> Causa provável: <${result.overflowingEl.tag} class="${result.overflowingEl.class}"> (w: ${result.overflowingEl.scrollWidth}px)`);
    }
  } else {
    console.log(`✅ [SEM TRANSBORDAMENTO em ${label}]: scrollWidth (${result.scrollWidth}px) <= innerWidth (${result.innerWidth}px)`);
  }
  return !result.hasOverflow;
}

async function runAudit() {
  console.log("==========================================================================");
  console.log("BATERIA DE AUDITORIA MULTI-VIEWPORT DE RESPONSIVIDADE ADAPTATIVA E PWA");
  console.log("==========================================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // Busca ou cria admin para autenticação nos painéis
    let adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (!adminUser) {
      adminUser = await prisma.user.findFirst();
    }

    const adminToken = createToken({
      userId: adminUser?.id || "admin_test",
      email: adminUser?.email || "admin@popclub.com",
      role: "admin",
      permissions: ["METRICS_VIEW", "ORDERS_KANBAN", "ORDERS_HISTORY", "CATALOG_MANAGE"],
    });

    const viewports = [
      { name: "Vertical 1080p (Monitor Vertical)", width: 1080, height: 1920 },
      { name: "Desktop Full HD", width: 1920, height: 1080 },
      { name: "Tablet / iPad", width: 820, height: 1180 },
      { name: "Smartphone PWA", width: 390, height: 844 },
    ];

    // -------------------------------------------------------------------------
    // 1. AUDITORIA DA VITRINE PÚBLICA (STOREFRONT PWA) EM 1080x1920 (VERTICAL)
    // -------------------------------------------------------------------------
    console.log("\n[1/5] Auditando Vitrine Pública no Monitor Vertical (1080x1920)...");
    const ctxVertical = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      colorScheme: "dark",
    });
    const pageVitrine = await ctxVertical.newPage();
    await pageVitrine.addInitScript(() => {
      localStorage.setItem("popshake-theme", "dark");
    });
    await pageVitrine.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await pageVitrine.waitForTimeout(1500);

    await checkNoHorizontalOverflow(pageVitrine, "Vitrine Pública - 1080x1920");

    const vitrineVerticalPath = path.join(OUT_DIR, "01-vitrine-vertical-1080p.png");
    await pageVitrine.screenshot({ path: vitrineVerticalPath, fullPage: false });
    console.log(`📸 Salvo: ${vitrineVerticalPath}`);

    // Injeta item diretamente no carrinho via localStorage para o teste do checkout
    console.log(" -> Configurando item no carrinho para teste de checkout fluido...");
    await pageVitrine.evaluate(() => {
      const sampleItem = [{
        id: "item_audit_acai_500",
        productId: "prod_audit_1",
        name: "Açaí Especial Pop Shake 500ml",
        price: 28.50,
        originalPrice: 28.50,
        quantity: 2,
        imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=400&q=80",
        selectedOptions: [
          { groupName: "Acompanhamentos", name: "Leite Condensado", price: 0 },
          { groupName: "Frutas", name: "Morango", price: 4.00 }
        ],
        notes: "Por favor enviar com bastante colher e guardanapos."
      }];
      localStorage.setItem("popclub_cart_v1", JSON.stringify(sampleItem));
    });

    // -------------------------------------------------------------------------
    // 2. AUDITORIA DO CARRINHO / CHECKOUT EM 1080x1920 (VERTICAL)
    // -------------------------------------------------------------------------
    console.log("\n[2/5] Auditando Carrinho / Checkout no Monitor Vertical (1080x1920)...");
    await pageVitrine.goto("http://localhost:3000/carrinho", { waitUntil: "networkidle" });
    await pageVitrine.waitForTimeout(1500);

    await checkNoHorizontalOverflow(pageVitrine, "Carrinho / Checkout - 1080x1920");

    const carrinhoVerticalPath = path.join(OUT_DIR, "02-carrinho-vertical-1080p.png");
    await pageVitrine.screenshot({ path: carrinhoVerticalPath, fullPage: false });
    console.log(`📸 Salvo: ${carrinhoVerticalPath}`);
    await ctxVertical.close();

    // -------------------------------------------------------------------------
    // 3. AUDITORIA DO PAINEL ADMIN DASHBOARD EM 1080x1920 (VERTICAL)
    // -------------------------------------------------------------------------
    console.log("\n[3/5] Auditando Painel Admin (Dashboard) no Monitor Vertical (1080x1920)...");
    const ctxAdmin = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      colorScheme: "dark",
    });
    await ctxAdmin.addCookies([
      { name: "popshake_session", value: adminToken, domain: "localhost", path: "/" },
      { name: "auth_token", value: adminToken, domain: "localhost", path: "/" },
    ]);
    const pageAdmin = await ctxAdmin.newPage();
    await pageAdmin.addInitScript((adminData) => {
      localStorage.setItem("popshake-theme", "dark");
      localStorage.setItem("popclub_user", JSON.stringify(adminData));
    }, adminUser);

    await pageAdmin.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
    await pageAdmin.waitForTimeout(2000);

    // Garante que está na aba de métricas
    const metricsTab = pageAdmin.locator("button:has-text('Métricas')");
    if (await metricsTab.count() > 0) {
      await metricsTab.click();
      await pageAdmin.waitForTimeout(1000);
    }

    await checkNoHorizontalOverflow(pageAdmin, "Admin Dashboard - 1080x1920");

    const adminDashboardPath = path.join(OUT_DIR, "03-admin-dashboard-vertical-1080p.png");
    await pageAdmin.screenshot({ path: adminDashboardPath, fullPage: false });
    console.log(`📸 Salvo: ${adminDashboardPath}`);

    // -------------------------------------------------------------------------
    // 4. AUDITORIA DO KANBAN DA COZINHA EM 1080x1920 (VERTICAL)
    // -------------------------------------------------------------------------
    console.log("\n[4/5] Auditando Kanban da Cozinha no Monitor Vertical (1080x1920)...");
    await pageAdmin.goto("http://localhost:3000/admin/pedidos", { waitUntil: "networkidle" });
    await pageAdmin.waitForTimeout(2000);

    await checkNoHorizontalOverflow(pageAdmin, "Admin Kanban - 1080x1920");

    const adminKanbanPath = path.join(OUT_DIR, "04-admin-kanban-vertical-1080p.png");
    await pageAdmin.screenshot({ path: adminKanbanPath, fullPage: false });
    console.log(`📸 Salvo: ${adminKanbanPath}`);
    await ctxAdmin.close();

    // -------------------------------------------------------------------------
    // 5. AUDITORIA DA VITRINE NO SMARTPHONE PWA (390x844)
    // -------------------------------------------------------------------------
    console.log("\n[5/5] Auditando Storefront no Smartphone PWA (390x844)...");
    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
    });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.addInitScript(() => {
      localStorage.setItem("popshake-theme", "dark");
    });
    await pageMobile.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await pageMobile.waitForTimeout(1500);

    await checkNoHorizontalOverflow(pageMobile, "Storefront Mobile PWA - 390x844");

    const storefrontMobilePath = path.join(OUT_DIR, "05-storefront-mobile.png");
    await pageMobile.screenshot({ path: storefrontMobilePath, fullPage: false });
    console.log(`📸 Salvo: ${storefrontMobilePath}`);
    await ctxMobile.close();

    // -------------------------------------------------------------------------
    // BATERIA COMPLEMENTAR: VERIFICAÇÃO MULTI-VIEWPORT EM TODAS AS 4 RESOLUÇÕES
    // -------------------------------------------------------------------------
    console.log("\n[EXTRA] Executando varredura multi-viewport nas 4 resoluções obrigatórias...");
    for (const vp of viewports) {
      const ctxTest = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: "dark",
      });
      const p = await ctxTest.newPage();
      await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
      await p.waitForTimeout(500);
      const passed = await checkNoHorizontalOverflow(p, `Home / Storefront - ${vp.name} (${vp.width}x${vp.height})`);
      if (!passed) {
        console.error(`❌ Falha de responsividade em ${vp.name}!`);
      }
      await ctxTest.close();
    }

    console.log("\n==========================================================================");
    console.log("✅ AUDITORIA CONCLUÍDA COM SUCESSO! TODAS AS CAPTURAS FORAM SALVAS.");
    console.log("==========================================================================");
  } catch (err) {
    console.error("Erro durante a auditoria:", err);
    process.exit(1);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runAudit();
