import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/tema-tempo-real");
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
  console.log("TESTE E2E: TEMA ADAPTATIVO COM SINCRONIZAÇÃO EM TEMPO REAL DO SO");
  console.log("===================================================================");

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------------------
    // TESTE 1: TRANSIÇÃO DINÂMICA DIA ➔ NOITE (SEM RELOAD)
    // -------------------------------------------------------------------------
    console.log("\n[Teste 1] Iniciando navegador com colorScheme: 'light'...");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });

    const page = await context.newPage();
    console.log(" -> Acessando a vitrine pública (http://localhost:3000/)...");
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1000);

    const isDarkInitial = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    console.log(` -> <html> possui classe .dark no estado inicial (Light): ${isDarkInitial}`);

    if (isDarkInitial) {
      throw new Error("FALHA: Com SO em light no primeiro acesso, .dark não deveria estar ativa!");
    }

    const shot1 = path.join(OUT_DIR, "01-so-claro.png");
    await page.screenshot({ path: shot1 });
    console.log(` ✓ Screenshot 1 salvo (SO Claro): ${shot1}`);

    console.log("\n -> Disparando emulação do SO para DARK via emulateMedia SEM recarregar a página...");
    await page.emulateMedia({ colorScheme: "dark" });
    // Aguarda propagação do evento change da media query
    await page.waitForTimeout(1200);

    const isDarkAfterEmulateDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    console.log(` -> <html> recebeu classe .dark em tempo real: ${isDarkAfterEmulateDark}`);

    if (!isDarkAfterEmulateDark) {
      throw new Error("FALHA: Mudança do SO para Dark não atualizou a classe .dark em tempo real!");
    }
    console.log(" ✓ SUCESSO: Transição dinâmica Dia ➔ Noite efetuada em tempo real com zero reload!");

    const shot2 = path.join(OUT_DIR, "02-so-escuro-tempo-real.png");
    await page.screenshot({ path: shot2 });
    console.log(` ✓ Screenshot 2 salvo (SO Escuro em tempo real): ${shot2}`);

    // -------------------------------------------------------------------------
    // TESTE 2: TRANSIÇÃO DINÂMICA NOITE ➔ DIA (SEM RELOAD)
    // -------------------------------------------------------------------------
    console.log("\n[Teste 2] Disparando emulação do SO de volta para LIGHT SEM recarregar a página...");
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForTimeout(1200);

    const isDarkAfterEmulateLight = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    console.log(` -> <html> removeu classe .dark em tempo real: ${!isDarkAfterEmulateLight}`);

    if (isDarkAfterEmulateLight) {
      throw new Error("FALHA: Mudança do SO para Light não removeu a classe .dark em tempo real!");
    }
    console.log(" ✓ SUCESSO: Transição dinâmica Noite ➔ Dia efetuada em tempo real com zero reload!");

    // -------------------------------------------------------------------------
    // TESTE 3: OVERRIDE MANUAL NAS PREFERÊNCIAS (/conta)
    // -------------------------------------------------------------------------
    console.log("\n[Teste 3] Testando Override Manual nas Preferências (/conta)...");
    const userToken = createToken({
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    });

    await context.addCookies([
      { name: "popshake_session", value: userToken, url: "http://localhost:3000" },
      { name: "auth_token", value: userToken, url: "http://localhost:3000" },
    ]);

    // Mantém SO em light
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("http://localhost:3000/conta?tab=preferencias", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(1500);

    const prefNav = page.locator("#theme-card-system, button:has-text('Preferências')").first();
    await prefNav.waitFor({ state: "visible", timeout: 10000 });

    const cardVisible = await page.locator("#theme-card-system").isVisible().catch(() => false);
    if (!cardVisible) {
      console.log(" -> Abrindo seção de Preferências...");
      const prefBtn = page.locator("button:has-text('Preferências')").first();
      await prefBtn.click();
      await page.waitForTimeout(1000);
    }

    const autoCard = page.locator("#theme-card-system").first();
    const darkCard = page.locator("#theme-card-dark").first();
    await autoCard.waitFor({ state: "visible", timeout: 5000 });
    await darkCard.waitFor({ state: "visible", timeout: 5000 });

    console.log(" -> Selecionando 'Sempre Escuro' enquanto o SO está em light...");
    await darkCard.click();
    await page.waitForTimeout(1000);

    const isDarkManualOverride = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const storedAfterDark = await page.evaluate(() => localStorage.getItem("popshake-theme"));

    console.log(`   * <html> possui classe .dark: ${isDarkManualOverride}`);
    console.log(`   * localStorage 'popshake-theme': ${storedAfterDark}`);

    if (!isDarkManualOverride || storedAfterDark !== "dark") {
      throw new Error("FALHA: Override manual para 'Sempre Escuro' não permaneceu forçado!");
    }
    console.log(" ✓ SUCESSO: Modo Sempre Escuro forçado sobrepôs a preferência do SO!");

    const shot3 = path.join(OUT_DIR, "03-seletor-preferencias.png");
    await page.screenshot({ path: shot3 });
    console.log(` ✓ Screenshot 3 salvo (Seletor Preferências): ${shot3}`);

    console.log(" -> Selecionando 'Automático / Sistema' novamente...");
    await autoCard.click();
    await page.waitForTimeout(1000);

    // Como o SO está em light, a seleção de 'Automático' deve retornar a tela para light
    const isDarkAfterRevertToAuto = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    const storedAfterAuto = await page.evaluate(() => localStorage.getItem("popshake-theme"));

    console.log(`   * <html> possui classe .dark: ${isDarkAfterRevertToAuto} (esperado: false, pois SO é light)`);
    console.log(`   * localStorage 'popshake-theme': ${storedAfterAuto}`);

    if (isDarkAfterRevertToAuto || storedAfterAuto !== "system") {
      throw new Error("FALHA: Seleção de 'Automático' não retornou o controle da cor ao SO!");
    }
    console.log(" ✓ SUCESSO: 'Automático' devolveu o controle total ao SO do dispositivo!");

    await context.close();

    console.log("\n===================================================================");
    console.log("AUDITORIA EM TEMPO REAL CONCLUÍDA COM 100% DE SUCESSO!");
    console.log("===================================================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
