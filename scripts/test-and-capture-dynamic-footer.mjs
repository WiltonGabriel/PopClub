import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots-audit");
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
  console.log("===================================================================");
  console.log("TESTE E2E: GESTÃO DINÂMICA DO RODAPÉ VIA CANAIS & ATENDIMENTO");
  console.log("===================================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const adminToken = createToken({
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });

    await context.addCookies([
      { name: "popshake_session", value: adminToken, domain: "localhost", path: "/" },
      { name: "auth_token", value: adminToken, domain: "localhost", path: "/" },
    ]);

    const page = await context.newPage();

    // -------------------------------------------------------------------------
    // PASSO 1: ACESSAR O PAINEL ADMIN E ALTERAR SLOGAN E HORÁRIO
    // -------------------------------------------------------------------------
    console.log("\n[1/3] Acessando /admin?section=channels no painel administrativo...");
    await page.goto("http://localhost:3000/admin?section=channels", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(2000);

    const channelsTabBtn = page.locator("button", { hasText: /Canais & Atendimento|Canais de Atendimento|Canais/i }).first();
    if (await channelsTabBtn.isVisible()) {
      await channelsTabBtn.click();
      await page.waitForTimeout(1000);
    }

    const testSlogan = "Açaí artesanal supremo, cremosidade única e o melhor sabor de Várzea Grande!";
    const testBadge = "Delivery Oficial & Marmitas Fartas";
    const testHours = "Segunda a Domingo das 12h às 23h30";

    console.log(" -> Preenchendo novos dados no formulário...");
    // Slogan
    const sloganInput = page.locator("input[placeholder*='Açaí artesanal']").first();
    await sloganInput.fill(testSlogan);

    // Texto do Selo
    const badgeInput = page.locator("input[placeholder*='Delivery Próprio']").first();
    await badgeInput.fill(testBadge);

    // Horário de Atendimento
    const hoursInput = page.locator("input[placeholder*='Terça a Domingo']").first();
    await hoursInput.fill(testHours);

    // Telefone Comercial / Chamada diferente do WhatsApp para acionar menu inteligente
    const phoneInput = page.locator("input[placeholder*='(65) 3682-0000']").first();
    await phoneInput.fill("(65) 3682-9988");

    // Capturar screenshot do admin com a nova subseção preenchida
    const adminScreenshotPath = path.join(OUT_DIR, "admin-novo-rodape-configurado.png");
    await page.screenshot({ path: adminScreenshotPath, fullPage: false });
    console.log(` ✓ Screenshot do Admin salvo em: ${adminScreenshotPath}`);

    // Clicar em Salvar
    console.log(" -> Clicando em 'Salvar Rodapé, Canais & Notificações'...");
    const saveBtn = page.locator("button:has-text('Salvar Rodapé')");
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------------------
    // PASSO 2: ACESSAR A VITRINE PÚBLICA E VALIDAR ATUALIZAÇÃO DO RODAPÉ
    // -------------------------------------------------------------------------
    console.log("\n[2/3] Acessando vitrine pública (/) para verificar persistência...");
    const publicPage = await context.newPage();
    await publicPage.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 20000 });
    await publicPage.waitForTimeout(1500);

    const footer = publicPage.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await publicPage.waitForTimeout(1000);

    const footerText = await footer.innerText();
    console.log("\nConteúdo renderizado no Footer:");
    console.log("-----------------------------------------------------------------");
    console.log(footerText);
    console.log("-----------------------------------------------------------------");

    const hasNewSlogan = footerText.includes(testSlogan);
    const hasNewBadge = footerText.includes(testBadge);
    const hasNewHours = footerText.includes(testHours);
    const hasPaymentsBar = footerText.includes("FORMAS DE PAGAMENTO ACEITAS");
    const hasPix = footerText.includes("Pix Instantâneo");
    const hasCredit = footerText.includes("Cartão de Crédito");
    const hasDebit = footerText.includes("Cartão de Débito");
    const hasCash = footerText.includes("Dinheiro (Levamos Troco)");

    // Checar se o texto solto "Telefone: (65) ..." desapareceu
    const hasLoosePhoneText = footerText.includes("Telefone: (65)");

    console.log("\nVerificações de Integridade:");
    console.log(` - Novo Slogan atualizado dinamicamente: ${hasNewSlogan ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Novo Selo atualizado dinamicamente: ${hasNewBadge ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Novo Horário atualizado dinamicamente: ${hasNewHours ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Barra de Formas de Pagamento restaurada: ${hasPaymentsBar ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Badge Pix: ${hasPix ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Badge Cartão de Crédito: ${hasCredit ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Badge Cartão de Débito: ${hasDebit ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Badge Dinheiro (com troco): ${hasCash ? "✓ SIM" : "✗ NÃO"}`);
    console.log(` - Texto solto de telefone avulso removido: ${!hasLoosePhoneText ? "✓ SIM (removido!)" : "✗ NÃO"}`);

    if (!hasNewSlogan || !hasNewHours || !hasPaymentsBar || hasLoosePhoneText) {
      throw new Error("Falha na validação do rodapé dinâmico!");
    }

    // -------------------------------------------------------------------------
    // PASSO 3: TESTAR BOTÃO DE CONTATO INTELIGENTE & POPOVER
    // -------------------------------------------------------------------------
    console.log("\n[3/3] Testando botão de contato inteligente no rodapé...");
    const contactBtn = footer.locator("button:has-text('Falar com Atendente')");
    if (await contactBtn.count() > 0) {
      console.log(" -> Botão 'Falar com Atendente' encontrado! Clicando para abrir popover...");
      await contactBtn.click();
      await publicPage.waitForTimeout(600);

      const hasWhatsAppOption = (await footer.locator("text=Conversar no WhatsApp").count()) > 0;
      const hasCallOptions = (await footer.locator("text=Ligar para").count()) > 0;

      console.log(` - Opção 'Conversar no WhatsApp': ${hasWhatsAppOption ? "✓ VISÍVEL" : "✗ NÃO"}`);
      console.log(` - Opção 'Ligar para (65) 3682-9988': ${hasCallOptions ? "✓ VISÍVEL" : "✗ NÃO"}`);
    }

    // Capturar o screenshot oficial exigido na task
    const footerScreenshotPath = path.join(OUT_DIR, "novo-rodape-dinamico.png");
    await footer.screenshot({ path: footerScreenshotPath });
    console.log(`\n✓ EVIDÊNCIA OFICIAL SALVA EM: ${footerScreenshotPath}`);

    console.log("\n===================================================================");
    console.log("TODAS AS VALIDAÇÕES FORAM EXECUTADAS COM SUCESSO!");
    console.log("===================================================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
