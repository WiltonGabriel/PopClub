import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/metricas-investigacao");
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

async function run() {
  console.log("==================================================================");
  console.log("INICIANDO TESTES E CAPTURA DE EVIDÊNCIAS DE MÉTRICAS & RECUPERAÇÃO");
  console.log("==================================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: RECUPERAÇÃO DE SENHA MULTI-STEP NO MODAL
    // -------------------------------------------------------------------------
    console.log("\n[1/2] Testando fluxo multi-step inline de recuperação de senha...");
    const contextAuth = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: "dark",
    });
    const pageAuth = await contextAuth.newPage();

    await pageAuth.addInitScript(() => {
      localStorage.setItem("popshake-theme", "dark");
    });

    await pageAuth.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await pageAuth.waitForTimeout(1000);

    // Clica na aba "Entrar" (aba de login com senha)
    const passwordTabButton = pageAuth.locator("button[role='tab']:has-text('Entrar')");
    if (await passwordTabButton.count() > 0) {
      await passwordTabButton.click();
      await pageAuth.waitForTimeout(600);
    }

    // Clica no botão "Esqueceu a senha?"
    const forgotBtn = pageAuth.locator("button:has-text('Esqueceu a senha?')");
    await forgotBtn.click();
    await pageAuth.waitForTimeout(600);

    // PASSO 1: Confirmação do e-mail
    console.log(" -> Capturando Passo 1 (Confirmação de E-mail)...");
    await pageAuth.screenshot({
      path: path.join(OUT_DIR, "recuperacao-passo1-email.png"),
      fullPage: false,
    });

    // Preenche e-mail e submete
    const emailInput = pageAuth.locator("#recoveryEmail");
    await emailInput.fill("admin@popclub.com");
    await pageAuth.waitForTimeout(300);

    const submitEmailBtn = pageAuth.locator("button:has-text('Enviar Código de Recuperação')");
    await submitEmailBtn.click();

    // Aguarda transição para o PASSO 2 (Código de 6 dígitos)
    await pageAuth.waitForSelector("#verificationCode", { timeout: 8000 });
    await pageAuth.waitForTimeout(600);

    console.log(" -> Capturando Passo 2 (Entrada do Código de 6 Dígitos)...");
    await pageAuth.screenshot({
      path: path.join(OUT_DIR, "recuperacao-passo2-codigo.png"),
      fullPage: false,
    });

    // Preenche o código seguro
    const preencherBtn = pageAuth.locator("button:has-text('Preencher')");
    if (await preencherBtn.count() > 0) {
      await preencherBtn.click();
      console.log(" -> Código preenchido via botão de simulação");
    } else {
      const updatedUser = await prisma.user.findUnique({
        where: { email: "admin@popclub.com" },
        select: { resetCode: true },
      });
      const resetCode = updatedUser?.resetCode || "123456";
      console.log(` -> Código obtido do banco: ${resetCode}`);
      const codeInput = pageAuth.locator("#verificationCode");
      await codeInput.fill(resetCode);
    }
    await pageAuth.waitForTimeout(400);

    const confirmCodeBtn = pageAuth.locator("button:has-text('Confirmar Código')");
    await confirmCodeBtn.click();

    // Aguarda transição para o PASSO 3 (Nova Senha)
    await pageAuth.waitForSelector("#newPasswordInput", { timeout: 8000 });
    await pageAuth.waitForTimeout(600);

    console.log(" -> Capturando Passo 3 (Definição de Nova Senha)...");
    await pageAuth.screenshot({
      path: path.join(OUT_DIR, "recuperacao-passo3-novasenha.png"),
      fullPage: false,
    });

    // Preenche a nova senha
    const newPassInput = pageAuth.locator("#newPasswordInput");
    const confirmPassInput = pageAuth.locator("#confirmPasswordInput");
    await newPassInput.fill("PopClub@2026Nova");
    await confirmPassInput.fill("PopClub@2026Nova");
    await pageAuth.waitForTimeout(400);

    pageAuth.on("response", async (res) => {
      if (res.url().includes("/api/auth/")) {
        try {
          const body = await res.text();
          console.log(`[API RESPONSE ${res.status()}] ${res.url()}: ${body}`);
        } catch {}
      }
    });

    const submitPasswordBtn = pageAuth.locator("button:has-text('Salvar Nova Senha')");
    await submitPasswordBtn.click();

    // Aguarda transição para o PASSO 4 (Sucesso)
    try {
      await pageAuth.waitForSelector("text=Senha redefinida com sucesso!", { timeout: 8000 });
    } catch (e) {
      console.log("Erro aguardando sucesso. HTML atual do modal:");
      const modalHtml = await pageAuth.locator(".fixed.inset-0").innerHTML().catch(() => "n/a");
      console.log(modalHtml);
      throw e;
    }
    await pageAuth.waitForTimeout(600);

    console.log(" -> Capturando Passo 4 (Feedback de Sucesso)...");
    await pageAuth.screenshot({
      path: path.join(OUT_DIR, "recuperacao-passo4-sucesso.png"),
      fullPage: false,
    });

    await contextAuth.close();

    // -------------------------------------------------------------------------
    // TESTE 2: PAINEL DE MÉTRICAS & DESEMPENHO NO ADMIN
    // -------------------------------------------------------------------------
    console.log("\n[2/2] Testando Painel de Métricas e Ranking de Produtos...");
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    const adminToken = createToken({
      userId: adminUser?.id || "admin_test",
      email: adminUser?.email || "admin@popclub.com",
      role: "admin",
      permissions: ["METRICS_VIEW", "ORDERS_KANBAN", "ORDERS_HISTORY"],
    });

    const contextAdmin = await browser.newContext({
      viewport: { width: 1440, height: 1024 },
      colorScheme: "dark",
    });

    await contextAdmin.addCookies([
      {
        name: "popshake_session",
        value: adminToken,
        domain: "localhost",
        path: "/",
      },
      {
        name: "auth_token",
        value: adminToken,
        domain: "localhost",
        path: "/",
      },
    ]);

    const pageAdmin = await contextAdmin.newPage();
    await pageAdmin.addInitScript(() => {
      localStorage.setItem("popshake-theme", "dark");
    });

    await pageAdmin.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
    await pageAdmin.waitForTimeout(2000);

    // Certifica-se de que a aba Métricas & Desempenho está ativa
    const metricsTab = pageAdmin.locator("button:has-text('Métricas')");
    if (await metricsTab.count() > 0) {
      await metricsTab.first().click();
      await pageAdmin.waitForTimeout(1000);
    }

    // Garante que o Histórico Acumulado e Todo o Período estão selecionados
    const historyBtn = pageAdmin.locator("button:has-text('Histórico Acumulado')");
    if (await historyBtn.count() > 0) {
      await historyBtn.click();
      await pageAdmin.waitForTimeout(800);
    }

    const allPeriodBtn = pageAdmin.locator("button:has-text('Todo o Período')");
    if (await allPeriodBtn.count() > 0) {
      await allPeriodBtn.click();
      await pageAdmin.waitForTimeout(800);
    }

    console.log(" -> Capturando Painel com Histórico Acumulado (92 Pedidos)...");
    await pageAdmin.screenshot({
      path: path.join(OUT_DIR, "painel-metricas-historico-geral.png"),
      fullPage: false,
    });

    // Alterna para "Turno Ativo"
    console.log(" -> Alternando para Escopo de Turno Ativo...");
    const activeShiftBtn = pageAdmin.locator("button:has-text('Turno Ativo')");
    if (await activeShiftBtn.count() > 0) {
      await activeShiftBtn.click();
      await pageAdmin.waitForTimeout(800);
    }

    await pageAdmin.screenshot({
      path: path.join(OUT_DIR, "painel-metricas-turno-ativo.png"),
      fullPage: false,
    });

    // Retorna para Histórico Acumulado para testar ranking
    await historyBtn.click();
    await pageAdmin.waitForTimeout(800);

    // Rola até o card do Ranking de Produtos
    const rankingSection = pageAdmin.locator("h3:has-text('Mais Vendidos'), h3:has-text('Top Mais Vendidos')");
    await rankingSection.scrollIntoViewIfNeeded();
    await pageAdmin.waitForTimeout(600);

    console.log(" -> Capturando Ranking Top Mais Vendidos...");
    await pageAdmin.screenshot({
      path: path.join(OUT_DIR, "ranking-mais-vendidos.png"),
      fullPage: false,
    });

    // Alterna para "Menos Vendidos (Baixa)"
    console.log(" -> Alternando para Menos Vendidos (Baixa saída)...");
    const bottomBtn = pageAdmin.locator("button[title='Ver menos vendidos'], button:has-text('Baixa')");
    if (await bottomBtn.count() > 0) {
      await bottomBtn.first().click();
      await pageAdmin.waitForTimeout(800);
    }

    await pageAdmin.screenshot({
      path: path.join(OUT_DIR, "ranking-menos-vendidos.png"),
      fullPage: false,
    });

    // Abre o Modal "Ver Todos"
    console.log(" -> Abrindo modal 'Ver Todos' (Giro Completo)...");
    const verTodosBtn = pageAdmin.locator("button:has-text('Ver Todos')");
    if (await verTodosBtn.count() > 0) {
      await verTodosBtn.first().click();
      await pageAdmin.waitForTimeout(1000);
    }

    console.log(" -> Capturando Modal de Giro Completo de Produtos...");
    await pageAdmin.screenshot({
      path: path.join(OUT_DIR, "modal-giro-completo-produtos.png"),
      fullPage: false,
    });

    await contextAdmin.close();

    console.log("\n==================================================================");
    console.log("TODOS OS TESTES EVIDENCIAIS CONCLUÍDOS COM SUCESSO!");
    console.log("Screenshots salvas em docs/screenshots-audit/metricas-investigacao/");
    console.log("==================================================================");
  } catch (err) {
    console.error("ERRO DURANTE OS TESTES E2E:", err);
    process.exit(1);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

run();
