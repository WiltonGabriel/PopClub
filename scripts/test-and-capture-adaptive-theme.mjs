import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/tema-adaptativo");
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
  console.log("TESTE E2E: TEMA ADAPTATIVO NATIVO (SISTEMA) + SELETOR TRIPLO");
  console.log("===================================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------------------
    // CENÁRIO 1: PRIMEIRO ACESSO COM SISTEMA ESCURO (DARK)
    // -------------------------------------------------------------------------
    console.log("\n[Cenário 1] Primeiro acesso em dispositivo configurado como DARK...");
    const contextDark = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: "dark", // Emula prefers-color-scheme: dark nativo
    });

    const pageDark = await contextDark.newPage();
    await pageDark.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 20000 });
    await pageDark.waitForTimeout(1000);

    const isDarkOnDarkSystem = await pageDark.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const storedOnDark = await pageDark.evaluate(() => localStorage.getItem("popshake-theme"));

    console.log(` -> <html> possui classe .dark: ${isDarkOnDarkSystem}`);
    console.log(` -> localStorage 'popshake-theme': ${storedOnDark}`);

    if (!isDarkOnDarkSystem) {
      throw new Error("FALHA: Sistema dark não aplicou tema escuro no primeiro acesso!");
    }
    console.log(" ✓ SUCESSO: Primeiro acesso com sistema Dark ativou dark mode perfeitamente!");

    const shot1 = path.join(OUT_DIR, "1-primeiro-acesso-sistema-escuro.png");
    await pageDark.screenshot({ path: shot1 });
    console.log(` ✓ Screenshot salvo: ${shot1}`);
    await contextDark.close();

    // -------------------------------------------------------------------------
    // CENÁRIO 2: PRIMEIRO ACESSO COM SISTEMA CLARO (LIGHT)
    // -------------------------------------------------------------------------
    console.log("\n[Cenário 2] Primeiro acesso em dispositivo configurado como LIGHT...");
    const contextLight = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: "light", // Emula prefers-color-scheme: light nativo
    });

    const pageLight = await contextLight.newPage();
    await pageLight.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 20000 });
    await pageLight.waitForTimeout(1000);

    const isDarkOnLightSystem = await pageLight.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const storedOnLight = await pageLight.evaluate(() => localStorage.getItem("popshake-theme"));

    console.log(` -> <html> possui classe .dark: ${isDarkOnLightSystem}`);
    console.log(` -> localStorage 'popshake-theme': ${storedOnLight}`);

    if (isDarkOnLightSystem) {
      throw new Error("FALHA: Sistema light não deveria ter classe .dark no primeiro acesso!");
    }
    console.log(" ✓ SUCESSO: Primeiro acesso com sistema Light ativou light mode perfeitamente!");

    const shot2 = path.join(OUT_DIR, "2-primeiro-acesso-sistema-claro.png");
    await pageLight.screenshot({ path: shot2 });
    console.log(` ✓ Screenshot salvo: ${shot2}`);
    await contextLight.close();

    // -------------------------------------------------------------------------
    // CENÁRIO 3: TELA DE PREFERÊNCIAS (/conta) COM SELETOR TRIPLO
    // -------------------------------------------------------------------------
    console.log("\n[Cenário 3] Testando seletor triplo na tela de Preferências (/conta)...");
    const userToken = createToken({
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    });

    // Inicia contexto com colorScheme light
    const contextPref = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });

    await contextPref.addCookies([
      { name: "popshake_session", value: userToken, url: "http://localhost:3000" },
      { name: "auth_token", value: userToken, url: "http://localhost:3000" },
    ]);

    const pagePref = await contextPref.newPage();
    await pagePref.goto("http://localhost:3000/conta?tab=preferencias", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await pagePref.waitForTimeout(1500);

    // Se estiver na tela inicial de menu mobile ou na visão desktop, clica em preferências se necessário
    const prefNav = pagePref.locator("#theme-card-system, button:has-text('Preferências')").first();
    await prefNav.waitFor({ state: "visible", timeout: 10000 });

    const cardVisible = await pagePref.locator("#theme-card-system").isVisible().catch(() => false);
    if (!cardVisible) {
      console.log(" -> Clicando no menu de Preferências...");
      const prefBtn = pagePref.locator("button:has-text('Preferências')").first();
      await prefBtn.click();
      await pagePref.waitForTimeout(1000);
    }

    console.log(" -> Validando existência dos 3 cards de tema...");
    const autoCard = pagePref.locator("#theme-card-system, button:has-text('Automático / Sistema')").first();
    const lightCard = pagePref.locator("#theme-card-light, button:has-text('Claro')").first();
    const darkCard = pagePref.locator("#theme-card-dark, button:has-text('Escuro')").first();

    await autoCard.waitFor({ state: "visible", timeout: 5000 });
    await lightCard.waitFor({ state: "visible", timeout: 5000 });
    await darkCard.waitFor({ state: "visible", timeout: 5000 });

    console.log("   * Card Automático / Sistema: ✓ OK");
    console.log("   * Card Claro: ✓ OK");
    console.log("   * Card Escuro: ✓ OK");

    // 3.1: Altera para MODO ESCURO FORÇADO em ambiente LIGHT
    console.log("\n -> Clicando no card 'Escuro' (forçando tema escuro)...");
    await darkCard.click();
    await pagePref.waitForTimeout(1000);

    const isDarkAfterDarkClick = await pagePref.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const storedAfterDarkClick = await pagePref.evaluate(() =>
      localStorage.getItem("popshake-theme")
    );

    console.log(`   * <html> possui classe .dark: ${isDarkAfterDarkClick}`);
    console.log(`   * localStorage 'popshake-theme': ${storedAfterDarkClick}`);

    if (!isDarkAfterDarkClick || storedAfterDarkClick !== "dark") {
      throw new Error("FALHA: Clique em 'Escuro' não ativou dark mode ou não persistiu no localStorage!");
    }
    console.log(" ✓ SUCESSO: Modo Escuro ativado com destaque visual e persistência!");

    const shot3 = path.join(OUT_DIR, "3-preferencias-modo-escuro-forcado.png");
    await pagePref.screenshot({ path: shot3 });
    console.log(` ✓ Screenshot salvo: ${shot3}`);

    // 3.2: Retorna para AUTOMÁTICO / SISTEMA
    console.log("\n -> Clicando no card 'Automático / Sistema'...");
    await autoCard.click();
    await pagePref.waitForTimeout(1000);

    // Como o contexto é light, ao voltar para Automático a página deve voltar para light (sem .dark)
    const isDarkAfterAutoClick = await pagePref.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const storedAfterAutoClick = await pagePref.evaluate(() =>
      localStorage.getItem("popshake-theme")
    );

    console.log(`   * <html> possui classe .dark: ${isDarkAfterAutoClick} (esperado: false, pois sistema é light)`);
    console.log(`   * localStorage 'popshake-theme': ${storedAfterAutoClick}`);

    if (isDarkAfterAutoClick || storedAfterAutoClick !== "system") {
      throw new Error("FALHA: Ao selecionar 'Automático', a página não retornou ao tema Light do dispositivo!");
    }
    console.log(" ✓ SUCESSO: Modo Automático sincronizou dinamicamente com o sistema do dispositivo!");

    const shot4 = path.join(OUT_DIR, "4-preferencias-modo-automatico-retorno.png");
    await pagePref.screenshot({ path: shot4 });
    console.log(` ✓ Screenshot salvo: ${shot4}`);

    // 3.3: Seleciona Modo Claro explícito
    console.log("\n -> Clicando no card 'Claro'...");
    await lightCard.click();
    await pagePref.waitForTimeout(1000);

    const storedAfterLightClick = await pagePref.evaluate(() =>
      localStorage.getItem("popshake-theme")
    );
    console.log(`   * localStorage 'popshake-theme': ${storedAfterLightClick}`);

    const shot5 = path.join(OUT_DIR, "5-preferencias-modo-claro.png");
    await pagePref.screenshot({ path: shot5 });
    console.log(` ✓ Screenshot salvo: ${shot5}`);

    await contextPref.close();

    console.log("\n===================================================================");
    console.log("BATERIA DE TESTES DO TEMA ADAPTATIVO CONCLUÍDA COM 100% DE SUCESSO!");
    console.log("===================================================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Erro nos testes:", err);
  process.exit(1);
});
