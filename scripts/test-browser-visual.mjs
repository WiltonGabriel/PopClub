import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  console.log("Iniciando navegador Chrome para teste e validação visual...");
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 850 }
  });

  const consoleLogs = [];
  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  const pageErrors = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  try {
    console.log("Navegando para http://localhost:3000/carrinho com timeout de 60s...");
    await page.goto("http://localhost:3000/carrinho", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Aguarda montagem do React
    await page.waitForTimeout(3000);

    const title = await page.title();
    console.log("✔ Título da página:", title);

    const outDir = path.resolve(process.cwd(), "docs/screenshots-audit");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const screenshotPath = path.join(outDir, "carrinho-visual-test.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`✔ Screenshot do Carrinho salvo em: ${screenshotPath}`);

    // Navega para a home para teste visual e inspeção de console
    console.log("Navegando para http://localhost:3000/...");
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    const homeScreenshot = path.join(outDir, "home-visual-test.png");
    await page.screenshot({ path: homeScreenshot, fullPage: false });
    console.log(`✔ Screenshot da Home salvo em: ${homeScreenshot}`);

    console.log("\n=== CONSOLE LOGS CAPTURADOS DO NAVEGADOR ===");
    consoleLogs.forEach((l) => console.log(`[${l.type.toUpperCase()}] ${l.text}`));

    console.log("\n=== PAGE ERRORS CAPTURADOS DO NAVEGADOR ===");
    if (pageErrors.length === 0) {
      console.log("✔ Nenhum erro de página detectado! Console do navegador limpo.");
    } else {
      pageErrors.forEach((e) => console.error(`[ERROR] ${e}`));
    }

  } catch (err) {
    console.error("Erro durante execução do teste no navegador:", err);
  } finally {
    await browser.close();
  }
}

run();
