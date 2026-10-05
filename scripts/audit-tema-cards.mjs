import { chromium } from "playwright-core";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const DIR = path.resolve(process.cwd(), "docs/screenshots-audit");
fs.mkdirSync(DIR, { recursive: true });

const ok = (m) => console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${m}`);
const fail = (m) => {
  console.log(`  \x1b[31m✗ [FAIL]\x1b[0m ${m}`);
  process.exitCode = 1;
};

const browser = await chromium.launch({
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

// Testa os dois estados do SO: claro e escuro
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: scheme,
  });
  const token = jwt.sign(
    {
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    },
    process.env.JWT_SECRET || "popclub_secret_jwt_key_2026_super_secure",
    { expiresIn: "1d" }
  );
  await context.addCookies(
    ["popshake_session", "auth_token"].map((name) => ({
      name,
      value: token,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    }))
  );
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("popshake-theme", "system"));
  await page.goto(`${BASE_URL}/conta?section=preferencias`, { waitUntil: "networkidle", timeout: 30000 });

  const system = page.locator("#theme-card-system");
  const light = page.locator("#theme-card-light");
  const dark = page.locator("#theme-card-dark");
  await system.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(600);

  console.log(`\n▶ Esquema do SO: ${scheme}`);

  const sysText = await system.innerText();
  const lightText = await light.innerText();
  const darkText = await dark.innerText();

  if (sysText.includes("Automático Sistema") && !sysText.includes("/")) {
    ok('Título "Automático Sistema"');
  } else {
    fail(`Título: ${sysText}`);
  }

  if (sysText.includes("Acompanha o tema do seu aparelho em tempo real.") && !sysText.includes("muda sozinho")) {
    ok("Descrição enxuta");
  } else {
    fail("Descrição do card automático");
  }

  const expected = scheme === "dark" ? "Status atual: 🌙 Escuro" : "Status atual: ☀️ Claro";
  if (sysText.includes(expected)) {
    ok(`"${expected}"`);
  } else {
    fail(`Status esperado "${expected}", obtido: ${sysText}`);
  }

  if (!/Visualização/i.test(lightText)) {
    ok('Card "Sempre Claro" sem linha "Visualização"');
  } else {
    fail("Linha Visualização presente no card claro");
  }

  if (!/Visualização/i.test(darkText)) {
    ok('Card "Sempre Escuro" sem linha "Visualização"');
  } else {
    fail("Linha Visualização presente no card escuro");
  }

  if (sysText.includes("Ativo")) {
    ok('Badge "Ativo" no card automático');
  } else {
    fail("Badge Ativo ausente");
  }

  // Alturas uniformes
  const heights = await Promise.all([system, light, dark].map((l) => l.evaluate((el) => Math.round(el.getBoundingClientRect().height))));
  if (new Set(heights).size === 1 && heights[0] >= 160) {
    ok(`Alturas uniformes: ${heights.join("px / ")}px`);
  } else {
    fail(`Alturas divergentes: ${heights}`);
  }

  // Sem elementos com position:absolute dentro dos cards
  const abs = await page.evaluate(() =>
    ["theme-card-system", "theme-card-light", "theme-card-dark"].flatMap((id) =>
      [...document.getElementById(id).querySelectorAll("*")].filter((e) => getComputedStyle(e).position === "absolute").map(() => id)
    )
  );
  if (abs.length === 0) {
    ok("Nenhum elemento absolute dentro dos cards");
  } else {
    fail(`Elementos absolute: ${abs}`);
  }

  // Screenshot: modo claro é o oficial; o escuro vai com sufixo
  const section = page.locator("#theme-card-system").locator("xpath=ancestor::div[contains(@class,'space-y-3')][1]");
  const file = scheme === "light" ? "preferencias-tema-cards-limpos.png" : "preferencias-tema-cards-limpos-dark.png";
  await section.screenshot({ path: path.join(DIR, file) });
  ok(`📸 ${file}`);

  await context.close();
}

await browser.close();
