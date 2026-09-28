import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots-audit");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log("Iniciando captura de screenshots de auditoria...");
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // 1. Desktop Dark Mode Header
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      colorScheme: "dark",
    });
    const desktopPage = await desktopContext.newPage();
    
    // Configura localStorage para modo escuro
    await desktopPage.addInitScript(() => {
      localStorage.setItem("popshake_theme", "dark");
      document.documentElement.classList.add("dark");
    });

    console.log("Navegando para Desktop Storefront...");
    await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 20000 });
    await desktopPage.waitForTimeout(2000);

    // Garante classe dark no html
    await desktopPage.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await desktopPage.waitForTimeout(500);

    // 1. Desktop Header
    await desktopPage.screenshot({
      path: path.join(OUT_DIR, "01-desktop-header-dark.png"),
      clip: { x: 0, y: 0, width: 1280, height: 180 },
    });
    console.log("✓ Salvo: 01-desktop-header-dark.png");

    // 2. Vitrine e Títulos de Categorias
    // Rola para a seção de catálogo
    await desktopPage.evaluate(() => {
      window.scrollTo(0, 400);
    });
    await desktopPage.waitForTimeout(1000);

    await desktopPage.screenshot({
      path: path.join(OUT_DIR, "02-category-titles-dark.png"),
      clip: { x: 0, y: 350, width: 1280, height: 600 },
    });
    console.log("✓ Salvo: 02-category-titles-dark.png");

    // 3. Rodapé / Footer com Logo Adaptativo
    await desktopPage.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await desktopPage.waitForTimeout(1000);

    await desktopPage.screenshot({
      path: path.join(OUT_DIR, "03-footer-logo-dark.png"),
    });
    console.log("✓ Salvo: 03-footer-logo-dark.png");

    // 4. Mobile Header Dark Mode
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript(() => {
      localStorage.setItem("popshake_theme", "dark");
      document.documentElement.classList.add("dark");
    });

    console.log("Navegando para Mobile Storefront...");
    await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 20000 });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await mobilePage.waitForTimeout(500);

    await mobilePage.screenshot({
      path: path.join(OUT_DIR, "04-mobile-header-dark.png"),
      clip: { x: 0, y: 0, width: 390, height: 200 },
    });
    console.log("✓ Salvo: 04-mobile-header-dark.png");

    // 5. Conta / Perfil Header e Menu
    console.log("Navegando para /conta...");
    await mobilePage.goto("http://localhost:3000/conta", { waitUntil: "networkidle", timeout: 20000 });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await mobilePage.waitForTimeout(500);

    await mobilePage.screenshot({
      path: path.join(OUT_DIR, "05-profile-page-mobile-dark.png"),
    });
    console.log("✓ Salvo: 05-profile-page-mobile-dark.png");

    console.log("Todos os screenshots foram capturados com sucesso!");
  } catch (err) {
    console.error("Erro durante captura:", err);
  } finally {
    await browser.close();
  }
}

run();
