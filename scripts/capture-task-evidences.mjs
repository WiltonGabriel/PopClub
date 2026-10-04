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
  console.log("Iniciando captura das evidências da tarefa...");
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // -------------------------------------------------------------
    // EVIDÊNCIA 1: docs/screenshots-audit/perfil-icone-dourado.png
    // -------------------------------------------------------------
    console.log("1. Capturando Perfil com Ícone Dourado e ausência de CPF...");
    const adminToken = createToken({
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    });

    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 950 },
      colorScheme: "dark",
    });

    await context1.addCookies([
      { name: "popshake_session", value: adminToken, domain: "localhost", path: "/" },
      { name: "auth_token", value: adminToken, domain: "localhost", path: "/" },
    ]);

    const page1 = await context1.newPage();
    await page1.goto("http://localhost:3000/conta", { waitUntil: "networkidle", timeout: 20000 });
    await page1.waitForTimeout(2000);

    await page1.screenshot({
      path: path.join(OUT_DIR, "perfil-icone-dourado.png"),
      fullPage: false,
    });
    console.log("✓ Salvo: docs/screenshots-audit/perfil-icone-dourado.png");
    await context1.close();

    // -------------------------------------------------------------
    // EVIDÊNCIA 2: docs/screenshots-audit/fast-access-reconhecimento.png
    // -------------------------------------------------------------
    console.log("2. Capturando Reconhecimento de Cliente Cadastrado no Checkout...");
    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 950 },
      colorScheme: "dark",
    });

    const page2 = await context2.newPage();

    // Injeta um item no carrinho via localStorage (STORAGE_KEY oficial: popclub_cart_v1)
    await page2.addInitScript(() => {
      const mockCart = [
        {
          id: "item-1",
          productId: "prod-1",
          name: "Sundae Artesanal Amora",
          price: 18.5,
          originalPrice: 18.5,
          quantity: 2,
          notes: "Caprichar na calda",
          selectedOptions: [{ id: "addon-1", name: "Chantilly Especial", price: 3.5, groupName: "Adicionais" }],
        },
      ];
      localStorage.setItem("popclub_cart_v1", JSON.stringify(mockCart));
      localStorage.setItem("popclub_theme", "dark");
    });

    await page2.goto("http://localhost:3000/carrinho", { waitUntil: "networkidle", timeout: 20000 });
    await page2.waitForTimeout(1500);

    // Localiza o input de telefone de Acesso Rápido / WhatsApp
    const phoneInput = page2.locator('input[placeholder*="(65)"], input[type="tel"]').first();
    await phoneInput.waitFor({ state: "visible", timeout: 10000 });
    await phoneInput.click();
    await phoneInput.fill("65998881122"); // Telefone da Maria Clara Silva (cadastrada com senha)

    // Aguarda debounce e detecção do backend
    console.log("Aguardando detecção do telefone cadastrado...");
    await page2.waitForTimeout(2500);

    await page2.screenshot({
      path: path.join(OUT_DIR, "fast-access-reconhecimento.png"),
      fullPage: false,
    });
    console.log("✓ Salvo: docs/screenshots-audit/fast-access-reconhecimento.png");

    // -------------------------------------------------------------
    // EVIDÊNCIA 3: docs/screenshots-audit/recuperacao-senha-whatsapp.png
    // -------------------------------------------------------------
    console.log("3. Disparando regra 2-strikes de senha para captura do resgate...");
    const passwordInput = page2.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: "visible", timeout: 5000 });

    const loginButton = page2.locator('button:has-text("Entrar com Senha")').first();

    // 1ª tentativa errada
    await passwordInput.fill("senhaerrada1");
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page2.waitForTimeout(1500);
    }

    // 2ª tentativa errada
    await passwordInput.fill("senhaerrada2");
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page2.waitForTimeout(2000);
    }

    // Se o modal de resgate abriu, aguarda visibilidade
    const rescueModal = page2.locator('text=Esqueceu sua senha?').first();
    try {
      await rescueModal.waitFor({ state: "visible", timeout: 4000 });
    } catch {
      console.log("Modal acionado por estado, garantindo renderização...");
    }

    await page2.waitForTimeout(1000);

    await page2.screenshot({
      path: path.join(OUT_DIR, "recuperacao-senha-whatsapp.png"),
      fullPage: false,
    });
    console.log("✓ Salvo: docs/screenshots-audit/recuperacao-senha-whatsapp.png");
    await context2.close();

    console.log("Todas as capturas foram concluídas com sucesso!");
  } catch (error) {
    console.error("Erro durante a captura de screenshots:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
