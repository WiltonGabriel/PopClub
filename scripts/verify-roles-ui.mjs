import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("Iniciando navegador Chrome Headless...");
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,960",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  console.log("1. Acessando login...");
  await page.goto(`${BASE_URL}/login?tab=password&redirect=/admin/usuarios`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  console.log("2. Realizando login de Administrador...");
  await page.fill('#loginId', "admin@popclub.com");
  await page.fill('#loginPassword', "@64844048");
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  console.log("3. Navegando para /admin/usuarios...");
  await page.goto(`${BASE_URL}/admin/usuarios`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const outDir = path.resolve(process.cwd(), "docs/screenshots-audit");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Filtrar pela tab "Editores" para comprovar "Criado em / Por" para membros da equipe
  console.log("4. Filtrando pela tab Editores...");
  const editoresTab = page.locator('button:has-text("Editores")');
  await editoresTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, "gestao-usuarios-equipe-criado-por.png") });
  console.log("✓ Screenshot salva: gestao-usuarios-equipe-criado-por.png");

  // 2. Abrir modal "+ Novo Usuário / Membro" (garantindo que não há CPF)
  console.log("5. Abrindo modal + Novo Usuário / Membro...");
  const newUserBtn = page.locator('button:has-text("+ Novo Usuário / Membro")');
  await newUserBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, "modal-novo-usuario-sem-cpf.png") });
  console.log("✓ Screenshot salva: modal-novo-usuario-sem-cpf.png");

  // Fechar modal clicando no botão Cancelar
  await page.click('button:has-text("Cancelar")');
  await page.waitForTimeout(500);

  // 3. Abrir modal de Alterar Cargo clicando no escudo do primeiro editor
  console.log("6. Abrindo modal Alterar Cargo do colaborador...");
  const shieldBtn = page.locator('button[title="Alterar Cargo do Colaborador"]').first();
  if (await shieldBtn.isVisible()) {
    await shieldBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "modal-alterar-cargo-membro.png") });
    console.log("✓ Screenshot salva: modal-alterar-cargo-membro.png");
    await page.click('button:has-text("Cancelar")');
    await page.waitForTimeout(400);
  }

  console.log("Validação e capturas concluídas!");
  await browser.close();
}

run().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
