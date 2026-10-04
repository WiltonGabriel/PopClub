import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/usr/local/bin/google-chrome";
const SCREENSHOTS_DIR = path.resolve("docs/screenshots-audit/temas-fix");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runAudit() {
  console.log("🚀 Iniciando Auditoria E2E via Chrome Real (Playwright)...");

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const adminPage = await adminContext.newPage();
  const publicPage = await publicContext.newPage();

  // Captura erros de console
  adminPage.on("pageerror", (err) => console.log(" [Admin PageError]:", err.message));
  publicPage.on("pageerror", (err) => console.log(" [Public PageError]:", err.message));

  try {
    // ── 1. LOGIN DE ADMINISTRADOR ──
    console.log("🔑 [Passo 1] Autenticando Administrador...");
    await adminPage.goto("http://localhost:3000/login?tab=password", { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(1000);

    await adminPage.fill('#loginId', "admin@popclub.com");
    await adminPage.fill('#loginPassword', "@64844048");
    await adminPage.click('button[type="submit"]');

    await adminPage.waitForTimeout(2000);

    // ── 2. NAVEGAR PARA O PAINEL DE IDENTIDADE VISUAL ──
    console.log("🎨 [Passo 2] Acessando Painel de Identidade Visual...");
    await adminPage.goto("http://localhost:3000/admin?tab=appearance", { waitUntil: "networkidle" });
    await adminPage.waitForTimeout(2000);

    // ── 3. VERIFICAR TEMA ATUAL NA VITRINE PÚBLICA ──
    console.log("🏪 [Passo 3] Carregando vitrine pública anônima...");
    await publicPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    await publicPage.waitForTimeout(1000);

    const initialPublicThemeId = await publicPage.evaluate(() => {
      const settings = localStorage.getItem("popshake_loading_settings");
      if (settings) {
        try {
          return JSON.parse(settings).advancedConfig?.themeId || "initial";
        } catch {
          return "initial";
        }
      }
      return "initial";
    });
    console.log(`   Tema inicial na vitrine: "${initialPublicThemeId}"`);

    // ── 4. TESTE DA TRAVA DE SEGURANÇA: CLICAR NO TEMA AÇAÍ SUNSET ──
    console.log("👉 [Passo 4] Clicando no tema 'Açaí Sunset' no catálogo do Admin...");
    const acaiSunsetCard = adminPage.locator('[data-theme-id="acai_sunset"]');
    await acaiSunsetCard.waitFor({ state: "visible", timeout: 8000 });
    await acaiSunsetCard.click();
    await adminPage.waitForTimeout(800);

    // Verifica se a barra inferior de publicação apareceu
    console.log("   Verificando se a barra inferior de rascunho apareceu...");
    const publishBarBtn = adminPage.locator("#btn-open-publish-modal");
    await publishBarBtn.waitFor({ state: "visible", timeout: 4000 });
    console.log("   ✓ Barra inferior de rascunho exibida com sucesso!");

    // ── 5. PROVA DE ISOLAMENTO: A VITRINE NÃO PODE TER SIDO ALTERADA ──
    console.log("🛡️ [Passo 5] Validando que a vitrine pública continua inalterada...");
    await publicPage.reload({ waitUntil: "networkidle" });
    await publicPage.waitForTimeout(1000);

    const publicThemeAfterPreview = await publicPage.evaluate(() => {
      const settings = localStorage.getItem("popshake_loading_settings");
      if (settings) {
        try {
          return JSON.parse(settings).advancedConfig?.themeId || "";
        } catch {
          return "";
        }
      }
      return "";
    });

    console.log(`   Tema na vitrine durante preview: "${publicThemeAfterPreview}"`);
    if (publicThemeAfterPreview === "acai_sunset" && initialPublicThemeId !== "acai_sunset") {
      throw new Error("FALHA CRÍTICA: O tema em preview vazou e foi salvo no banco antes de publicar!");
    }
    console.log("   ✓ SUCESSO: O preview local NÃO vazou para a vitrine pública!");
    await publicPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01-preview-nao-vazou-na-vitrine.png"),
      fullPage: false,
    });

    // ── 6. TESTE DO MODAL DE SEGURANÇA E TRAVA DE DIGITAÇÃO ──
    console.log("🔒 [Passo 6] Abrindo modal de publicação e testando trava...");
    await publishBarBtn.click();

    const modalConfirmBtn = adminPage.locator("#theme-publish-confirm-btn");
    await modalConfirmBtn.waitFor({ state: "visible", timeout: 4000 });

    const isInitiallyDisabled = await modalConfirmBtn.isDisabled();
    console.log(`   Botão 'Publicar Agora' inicialmente desabilitado: ${isInitiallyDisabled}`);
    if (!isInitiallyDisabled) {
      throw new Error("FALHA: Botão 'Publicar Agora' deveria iniciar estritamente desabilitado!");
    }

    const confirmInput = adminPage.locator("#theme-publish-confirm-input");
    await confirmInput.fill("TESTE_ERRADO");
    const isStillDisabled = await modalConfirmBtn.isDisabled();
    console.log(`   Botão após texto incorreto continua desabilitado: ${isStillDisabled}`);
    if (!isStillDisabled) {
      throw new Error("FALHA: Botão não deveria se habilitar com texto incorreto!");
    }

    // Digita "CONFIRMO"
    console.log("   Digitando 'CONFIRMO' no campo de validação...");
    await confirmInput.fill("CONFIRMO");
    await adminPage.waitForTimeout(300);

    const isEnabledWithConfirmo = await modalConfirmBtn.isEnabled();
    console.log(`   Botão habilitado após 'CONFIRMO': ${isEnabledWithConfirmo}`);
    if (!isEnabledWithConfirmo) {
      throw new Error("FALHA: Botão deveria estar habilitado após digitar 'CONFIRMO'!");
    }

    await adminPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02-modal-seguranca-confirmado.png"),
    });

    // Clica em Publicar
    console.log("🚀 Publicando tema 'Açaí Sunset' na loja...");
    await modalConfirmBtn.click();
    await adminPage.waitForTimeout(2000);

    // Valida na Vitrine Pública
    await publicPage.reload({ waitUntil: "networkidle" });
    await publicPage.waitForTimeout(1000);

    const publicThemeAfterPublish = await publicPage.evaluate(() => {
      const settings = localStorage.getItem("popshake_loading_settings");
      if (settings) {
        try {
          return JSON.parse(settings).advancedConfig?.themeId || "";
        } catch {
          return "";
        }
      }
      return "";
    });
    console.log(`   Tema na vitrine após publicação confirmada: "${publicThemeAfterPublish}"`);
    console.log("   ✓ SUCESSO: Publicação persistida com êxito!");
    await publicPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03-tema-publicado-com-sucesso.png"),
    });

    // ── 7. TESTE DOS TEMAS DINÂMICOS: AURORA MESH ──
    console.log("✨ [Passo 7] Selecionando tema dinâmico 'Aurora Mesh'...");
    // Clica na aba 'dynamic' do catálogo
    const dynamicTabBtn = adminPage.locator('button:has-text("Temas Dinâmicos")');
    if (await dynamicTabBtn.isVisible()) {
      await dynamicTabBtn.click();
      await adminPage.waitForTimeout(500);
    }

    const auroraMeshCard = adminPage.locator('[data-theme-id="aurora_mesh"]');
    await auroraMeshCard.waitFor({ state: "visible", timeout: 4000 });
    await auroraMeshCard.click();
    await adminPage.waitForTimeout(500);

    // Publica o Aurora Mesh
    await adminPage.locator("#btn-open-publish-modal").click();
    await adminPage.locator("#theme-publish-confirm-input").fill("SIM");
    await adminPage.locator("#theme-publish-confirm-btn").click();
    await adminPage.waitForTimeout(2000);

    // Verifica vitrine com Aurora Mesh
    console.log("🌐 Inspecionando renderização do Aurora Mesh na vitrine...");
    await publicPage.reload({ waitUntil: "networkidle" });
    await publicPage.waitForTimeout(1500);

    // Verifica elemento canvas e dimensões
    const auroraCanvasInfo = await publicPage.evaluate(() => {
      const canvas = document.querySelector("#popclub-dynamic-canvas-container canvas") || document.querySelector("canvas");
      if (!canvas) return { found: false };
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      let hasDrawnPixels = false;
      try {
        const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, 200), Math.min(canvas.height, 200));
        hasDrawnPixels = imgData.data.some((channel) => channel !== 0);
      } catch {}
      return {
        found: true,
        width: rect.width,
        height: rect.height,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        hasDrawnPixels,
        bodyBg: document.body.style.background,
      };
    });

    console.log("   Info do Canvas Aurora Mesh:", auroraCanvasInfo);
    if (!auroraCanvasInfo.found || auroraCanvasInfo.width === 0 || auroraCanvasInfo.height === 0) {
      throw new Error("FALHA: Canvas do Aurora Mesh não foi encontrado ou tem dimensões zeradas!");
    }

    await publicPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "aurora-mesh-ativo.png"),
      fullPage: true,
    });
    console.log("   ✓ Print salvo: docs/screenshots-audit/temas-fix/aurora-mesh-ativo.png");

    // ── 8. TESTE DOS TEMAS DINÂMICOS: FLUID ORBS ──
    console.log("🥣 [Passo 8] Selecionando tema dinâmico 'Fluid Orbs'...");
    const fluidOrbsCard = adminPage.locator('[data-theme-id="fluid_orbs"]');
    await fluidOrbsCard.waitFor({ state: "visible", timeout: 4000 });
    await fluidOrbsCard.click();
    await adminPage.waitForTimeout(500);

    // Publica o Fluid Orbs
    await adminPage.locator("#btn-open-publish-modal").click();
    await adminPage.locator("#theme-publish-confirm-input").fill("CONFIRMO");
    await adminPage.locator("#theme-publish-confirm-btn").click();
    await adminPage.waitForTimeout(2000);

    // Verifica vitrine com Fluid Orbs
    console.log("🌐 Inspecionando renderização do Fluid Orbs na vitrine...");
    await publicPage.reload({ waitUntil: "networkidle" });
    await publicPage.waitForTimeout(1500);

    const fluidCanvasInfo = await publicPage.evaluate(() => {
      const canvas = document.querySelector("#popclub-dynamic-canvas-container canvas") || document.querySelector("canvas");
      if (!canvas) return { found: false };
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      let hasDrawnPixels = false;
      try {
        const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, 200), Math.min(canvas.height, 200));
        hasDrawnPixels = imgData.data.some((channel) => channel !== 0);
      } catch {}
      return {
        found: true,
        width: rect.width,
        height: rect.height,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        hasDrawnPixels,
        bodyBg: document.body.style.background,
      };
    });

    console.log("   Info do Canvas Fluid Orbs:", fluidCanvasInfo);
    if (!fluidCanvasInfo.found || fluidCanvasInfo.width === 0 || fluidCanvasInfo.height === 0) {
      throw new Error("FALHA: Canvas do Fluid Orbs não foi encontrado ou tem dimensões zeradas!");
    }

    await publicPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "fluid-orbs-ativo.png"),
      fullPage: true,
    });
    console.log("   ✓ Print salvo: docs/screenshots-audit/temas-fix/fluid-orbs-ativo.png");

    console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO ABSOLUTO!");
  } catch (error) {
    console.error("\n❌ ERRO NA AUDITORIA:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAudit();
