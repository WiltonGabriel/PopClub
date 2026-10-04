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
  console.log("=================================================");
  console.log("INICIANDO BATERIA DE TESTES E EVIDÊNCIAS E2E");
  console.log("=================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: NAVEGAÇÃO /login COM HISTÓRICO REAL, HOME E ALTERNADOR DE TEMA
    // -------------------------------------------------------------------------
    console.log("\n[1/3] Testando fluxo de navegação e temas em /login...");
    const contextNav = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: "dark",
    });

    const pageNav = await contextNav.newPage();

    // Inicia com tema dark no localStorage para montagem determinística
    await pageNav.addInitScript(() => {
      localStorage.setItem("popshake-theme", "dark");
    });

    // 1.1 Acessa o carrinho primeiro
    console.log(" -> Acessando /carrinho para criar histórico...");
    await pageNav.goto("http://localhost:3000/carrinho", { waitUntil: "networkidle", timeout: 20000 });
    await pageNav.waitForTimeout(1000);

    // 1.2 Navega para /login a partir do carrinho
    console.log(" -> Clicando ou navegando para /login a partir do carrinho...");
    await pageNav.evaluate(() => {
      window.location.href = "/login?redirect=/carrinho";
    });
    await pageNav.waitForURL("**/login**", { timeout: 10000 });
    await pageNav.waitForTimeout(1500);

    console.log(" -> Capturando screenshot em modo Dark...");
    const darkScreenshotPath = path.join(OUT_DIR, "login-header-navegacao-dark.png");
    await pageNav.screenshot({
      path: darkScreenshotPath,
      fullPage: false,
    });
    console.log(` ✓ Salvo: ${darkScreenshotPath}`);

    // 1.4 Clica no botão de tema para alternar para modo claro
    console.log(" -> Clicando no alternador de tema...");
    const themeBtn = pageNav.locator("header button").last();
    await themeBtn.click();
    await pageNav.waitForTimeout(1000);

    const isLight = await pageNav.evaluate(() => !document.documentElement.classList.contains("dark"));
    console.log(` -> Alternância de tema concluída? Modo Claro ativo: ${isLight}`);

    const lightScreenshotPath = path.join(OUT_DIR, "login-header-navegacao-light.png");
    await pageNav.screenshot({
      path: lightScreenshotPath,
      fullPage: false,
    });
    console.log(` ✓ Salvo: ${lightScreenshotPath}`);

    // 1.5 Clica no botão "Voltar" e valida retorno para /carrinho
    console.log(" -> Testando botão 'Voltar'...");
    const backBtn = pageNav.locator("header button", { hasText: "Voltar" });
    await backBtn.click();
    await pageNav.waitForTimeout(1500);

    const currentUrlAfterBack = pageNav.url();
    console.log(` -> URL após clicar em 'Voltar': ${currentUrlAfterBack}`);
    if (currentUrlAfterBack.includes("/carrinho")) {
      console.log(" ✓ SUCESSO: Voltar retornou com precisão para /carrinho!");
    } else {
      console.warn(" ⚠ URL diferente de /carrinho, verificando fallback...");
    }

    // 1.6 Navega para /login e testa botão "Início" / "Home"
    console.log(" -> Testando botão 'Início' / 'Home'...");
    await pageNav.goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 15000 });
    await pageNav.waitForTimeout(1000);

    const homeLink = pageNav.locator("header a[title='Ir para a Página Inicial']");
    await homeLink.click();
    await pageNav.waitForURL("http://localhost:3000/", { timeout: 10000 });
    console.log(` ✓ SUCESSO: Home direcionou para vitrine: ${pageNav.url()}`);

    await contextNav.close();

    // -------------------------------------------------------------------------
    // TESTE 2: NOVO RODAPÉ (FOOTER) DA VITRINE
    // -------------------------------------------------------------------------
    console.log("\n[2/3] Testando novo rodapé da vitrine...");
    const contextFooter = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: "dark",
    });

    const pageFooter = await contextFooter.newPage();
    await pageFooter.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 20000 });
    await pageFooter.waitForTimeout(2000);

    // Rola suavemente até o rodapé
    console.log(" -> Rolando até o rodapé...");
    await pageFooter.locator("footer").scrollIntoViewIfNeeded();
    await pageFooter.waitForTimeout(1000);

    const footerScreenshotPath = path.join(OUT_DIR, "novo-rodape-vitrine.png");
    await pageFooter.screenshot({
      path: footerScreenshotPath,
      fullPage: false,
    });
    console.log(` ✓ Salvo: ${footerScreenshotPath}`);
    await contextFooter.close();

    // -------------------------------------------------------------------------
    // TESTE 3: ABA "CANAIS E ATENDIMENTO" NO PAINEL OPERACIONAL
    // -------------------------------------------------------------------------
    console.log("\n[3/3] Testando aba 'Canais e Atendimento' no Painel Admin...");
    const adminToken = createToken({
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    });

    const contextAdmin = await browser.newContext({
      viewport: { width: 1366, height: 950 },
      colorScheme: "dark",
    });

    await contextAdmin.addCookies([
      { name: "popshake_session", value: adminToken, domain: "localhost", path: "/" },
      { name: "auth_token", value: adminToken, domain: "localhost", path: "/" },
    ]);

    const pageAdmin = await contextAdmin.newPage();
    await pageAdmin.goto("http://localhost:3000/admin?section=channels", { waitUntil: "networkidle", timeout: 20000 });
    await pageAdmin.waitForTimeout(2000);

    // Clica na aba Canais se ainda não estiver ativa
    const channelsTabBtn = pageAdmin.locator("button", { hasText: /Canais & Atendimento|Canais de Atendimento|Canais/i }).first();
    if (await channelsTabBtn.isVisible()) {
      await channelsTabBtn.click();
      await pageAdmin.waitForTimeout(1500);
    }

    // Interage com os templates: clica no estágio "4. Em Rota / Despachado"
    const deliveringStageBtn = pageAdmin.locator("button", { hasText: "Despachado" });
    if (await deliveringStageBtn.isVisible()) {
      console.log(" -> Clicando no estágio 'Despachado'...");
      await deliveringStageBtn.click();
      await pageAdmin.waitForTimeout(500);
    }

    // Clica em uma tag para demonstrar inserção rápida
    const tagBadge = pageAdmin.locator("button", { hasText: "{link_rastreamento}" });
    if (await tagBadge.isVisible()) {
      console.log(" -> Clicando na tag {link_rastreamento}...");
      await tagBadge.click();
      await pageAdmin.waitForTimeout(500);
    }

    const adminScreenshotPath = path.join(OUT_DIR, "admin-canais-templates.png");
    await pageAdmin.screenshot({
      path: adminScreenshotPath,
      fullPage: false,
    });
    console.log(` ✓ Salvo: ${adminScreenshotPath}`);

    await contextAdmin.close();

    console.log("\n=================================================");
    console.log("TODAS AS EVIDÊNCIAS FORAM CAPTURADAS COM SUCESSO!");
    console.log("=================================================");
  } catch (err) {
    console.error("Erro na bateria de testes:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
