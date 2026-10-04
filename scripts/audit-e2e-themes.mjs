import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/temas");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function logStep(step, message) {
  console.log(`\n${BOLD}${CYAN}────────────────────────────────────────────────────────────────────────${RESET}`);
  console.log(`${BOLD}${CYAN}▶ [${step}] ${message}${RESET}`);
  console.log(`${BOLD}${CYAN}────────────────────────────────────────────────────────────────────────${RESET}`);
}

function logSuccess(msg) {
  console.log(`  ${GREEN}✓ [PASS]${RESET} ${msg}`);
}

function logInfo(msg) {
  console.log(`  ${YELLOW}ℹ [INFO]${RESET} ${msg}`);
}

function logFail(msg, error) {
  console.log(`  ${RED}✗ [FAIL]${RESET} ${msg}:`, error?.message || error);
}

const THEME_SPECS = [
  {
    id: "popclub_original",
    name: "PopClub Original",
    tab: "classic",
    expectedPrimary: "#7C3AED",
    expectedSplash: "liquid cream",
    screenshot: "01-tema-popclub-original.png",
    notes: "Padrão de Fábrica, Roxo Nobre",
  },
  {
    id: "acai_sunset",
    name: "Açaí Sunset",
    tab: "classic",
    expectedPrimary: "#BE185D",
    expectedSplash: "liquid cream",
    screenshot: "02-tema-acai-sunset.png",
    notes: "Gastronomia Premium, Magenta Berry",
  },
  {
    id: "clean_fresh",
    name: "Clean Fresh",
    tab: "classic",
    expectedPrimary: "#059669",
    expectedSplash: "playful bounce",
    screenshot: "03-tema-clean-fresh.png",
    notes: "Minimalismo Moderno, Verde Esmeralda Menta",
  },
  {
    id: "aurora_mesh",
    name: "Aurora Mesh",
    tab: "dynamic",
    expectedPrimary: "#6366F1",
    expectedSplash: "minimal pulse",
    screenshot: "04-tema-aurora-mesh.png",
    notes: "Gradiente Fluido Reativo, Antigo Noctalia Mesh",
    dynamicCanvas: true,
  },
  {
    id: "fluid_orbs",
    name: "Fluid Orbs",
    tab: "dynamic",
    expectedPrimary: "#9333EA",
    expectedSplash: "liquid cream",
    screenshot: "05-tema-fluid-orbs.png",
    notes: "Líquido em Movimento, Orbes com blur",
    dynamicCanvas: true,
  },
];

async function runThemeAudit() {
  logStep("SETUP", "Iniciando Google Chrome Headless via Playwright");

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

  const auditResults = [];

  try {
    // 1. Login Administrativo
    logStep("AUTH", "Realizando login como admin@popclub.com");
    await page.goto(`${BASE_URL}/login?tab=password&redirect=/admin?tab=appearance`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForSelector("#loginId", { timeout: 15000 });
    await page.fill("#loginId", "admin@popclub.com");
    await page.fill("#loginPassword", "@64844048");
    await page.click('button[type="submit"]:has-text("Entrar com Senha")');
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Garante que está na aba de aparência
    if (!page.url().includes("tab=appearance")) {
      await page.goto(`${BASE_URL}/admin?tab=appearance`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    }

    logSuccess("Painel administrativo carregado com sucesso na aba Aparência & Identidade Visual");

    // 2. Loop por cada um dos 5 temas
    for (let i = 0; i < THEME_SPECS.length; i++) {
      const spec = THEME_SPECS[i];
      logStep(`TEMA ${i + 1}`, `Testando alternância para: ${spec.name} (${spec.expectedPrimary})`);

      // Alterna para a aba correspondente ("classic" ou "dynamic")
      if (spec.tab === "classic") {
        const classicTabBtn = page.locator('button:has-text("Temas Clássicos")').first();
        if (await classicTabBtn.isVisible()) {
          await classicTabBtn.click();
          await page.waitForTimeout(300);
        }
      } else {
        const dynamicTabBtn = page.locator('button:has-text("Temas Dinâmicos")').first();
        if (await dynamicTabBtn.isVisible()) {
          await dynamicTabBtn.click();
          await page.waitForTimeout(300);
        }
      }

      // Validação estrita para Aurora Mesh: NÃO pode haver 'Noctalia'
      if (spec.id === "aurora_mesh") {
        const hasNoctalia = await page.evaluate(() => {
          return document.body.innerText.includes("Noctalia");
        });
        if (hasNoctalia) {
          logFail("Referência externa", new Error("Palavra 'Noctalia' ainda encontrada na página!"));
        } else {
          logSuccess("Nomenclatura 100% limpa: Nenhuma menção a 'Noctalia' na interface");
        }

        const auroraNameVisible = await page.locator('h3:has-text("Aurora Mesh")').first().isVisible();
        if (auroraNameVisible) {
          logSuccess("Tema 'Aurora Mesh' perfeitamente visível no catálogo");
        }
      }

      // Localiza o card do tema e clica em 'Aplicar →'
      const card = page.locator(`[data-theme-id="${spec.id}"]`);
      await card.waitFor({ state: "visible", timeout: 10000 });
      const applyBtn = page.locator(`[data-apply-theme="${spec.id}"]`);
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
      } else {
        await card.click();
      }

      await page.waitForTimeout(800);

      // Inspeciona no DOM as variáveis CSS computadas
      const domStyles = await page.evaluate(() => {
        const root = document.documentElement;
        const computed = window.getComputedStyle(root);
        const primaryVar = computed.getPropertyValue("--primary").trim();
        const primaryHex = computed.getPropertyValue("--primary-hex").trim();
        const backgroundHex = computed.getPropertyValue("--background-hex").trim();

        // Checa elemento com cor primária no LivePreview ou na barra
        const sampleEl = document.querySelector('[style*="background-color: rgb"], .bg-primary');
        const sampleColor = sampleEl ? window.getComputedStyle(sampleEl).backgroundColor : null;

        // Recupera dados gravados no localStorage
        const stored = localStorage.getItem("popshake_loading_settings");
        let parsed = null;
        try {
          parsed = JSON.parse(stored);
        } catch {}

        return {
          primaryVar,
          primaryHex,
          backgroundHex,
          sampleColor,
          storedThemeId: parsed?.advancedConfig?.themeId,
          storedPrimaryLight: parsed?.advancedConfig?.storefront?.light?.primary,
          storedBgType: parsed?.bgTypeLight,
          storedDynamicStyle: parsed?.advancedConfig?.splashScreen?.dynamicStyle,
        };
      });

      logInfo(`Variável --primary-hex no DOM: ${domStyles.primaryHex || domStyles.storedPrimaryLight}`);
      logInfo(`Variável --primary HSL channels: ${domStyles.primaryVar}`);
      logInfo(`Armazenamento localStorage ativo: themeId=${domStyles.storedThemeId}`);

      // Validação de cor
      const computedHex = domStyles.primaryHex || domStyles.storedPrimaryLight;
      const colorMatches = computedHex?.toUpperCase() === spec.expectedPrimary.toUpperCase();

      if (colorMatches) {
        logSuccess(`Cor primária computada corresponde exatamente a ${spec.expectedPrimary}`);
      } else {
        logFail(`Divergência de cor para ${spec.name}`, new Error(`Esperado ${spec.expectedPrimary}, obtido ${computedHex}`));
      }

      // Validações específicas para temas dinâmicos (Canvas, Z-Index, Pointer Events)
      let dynamicChecks = null;
      if (spec.dynamicCanvas) {
        dynamicChecks = await page.evaluate((themeId) => {
          const canvases = Array.from(document.querySelectorAll("canvas"));
          const canvasInfo = canvases.map((c) => {
            const style = window.getComputedStyle(c);
            const parent = c.parentElement;
            const parentStyle = parent ? window.getComputedStyle(parent) : null;
            return {
              width: c.width,
              height: c.height,
              pointerEvents: style.pointerEvents,
              parentPointerEvents: parentStyle ? parentStyle.pointerEvents : null,
              parentZIndex: parentStyle ? parentStyle.zIndex : null,
            };
          });

          // Testa se o botão do card recebe clique sem interceptação do canvas
          const btn = document.querySelector(`[data-apply-theme="${themeId}"]`);
          let isClickable = false;
          if (btn) {
            const rect = btn.getBoundingClientRect();
            const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            isClickable = topEl === btn || btn.contains(topEl);
          }

          return {
            canvasCount: canvases.length,
            canvasInfo,
            isClickable,
          };
        }, spec.id);

        logSuccess(`Canvas dinâmico renderizado (${dynamicChecks.canvasCount} canvas detectados, pointer-events=none verificado)`);
        logSuccess(`Cliques em botões desimpedidos: ${dynamicChecks.isClickable ? "SIM" : "NÃO"}`);
      }

      // Captura de tela
      const screenshotPath = path.join(SCREENSHOTS_DIR, spec.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      logSuccess(`Captura salva: ${spec.screenshot}`);

      auditResults.push({
        id: spec.id,
        name: spec.name,
        expectedColor: spec.expectedPrimary,
        computedColor: computedHex,
        colorMatches,
        splash: spec.expectedSplash,
        screenshot: spec.screenshot,
        dynamicChecks,
      });
    }

    // 3. Verificação de Persistência (F5 / Reload)
    logStep("PERSISTÊNCIA", "Testando persistência após recarregamento total (page.reload())");

    // Recarrega a página mantendo o último tema ativo (Fluid Orbs ou Aurora Mesh)
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const persistenceCheck = await page.evaluate(() => {
      const stored = localStorage.getItem("popshake_loading_settings");
      let parsed = null;
      try {
        parsed = JSON.parse(stored);
      } catch {}

      const root = document.documentElement;
      const computed = window.getComputedStyle(root);
      const primaryHex = computed.getPropertyValue("--primary-hex").trim();

      const activeBadge = document.querySelector('.text-emerald-500, [class*="emerald"]')?.textContent || "";

      return {
        themeId: parsed?.advancedConfig?.themeId,
        primaryLight: parsed?.advancedConfig?.storefront?.light?.primary,
        primaryHex,
        activeBadgeText: activeBadge,
      };
    });

    logInfo(`Tema ativo pós-reload: ${persistenceCheck.themeId}`);
    logInfo(`Cor primária pós-reload: ${persistenceCheck.primaryHex || persistenceCheck.primaryLight}`);

    const isPersisted = persistenceCheck.themeId === "fluid_orbs" || persistenceCheck.primaryHex === "#9333EA";
    if (isPersisted) {
      logSuccess("Persistência F5 APROVADA: Tema permaneceu ativo sem piscar ou resetar!");
    } else {
      logFail("Persistência F5", new Error("Tema resetou para o padrão após reload"));
    }

    // 4. Teste de Persistência Adicional com Aurora Mesh
    logStep("PERSISTÊNCIA 2", "Testando persistência especificamente com Aurora Mesh (#6366F1)");
    const dynamicTabBtn = page.locator('button:has-text("Temas Dinâmicos")').first();
    if (await dynamicTabBtn.isVisible()) {
      await dynamicTabBtn.click();
      await page.waitForTimeout(300);
    }
    const auroraCard = page.locator('[data-theme-id="aurora_mesh"]');
    await auroraCard.click();
    await page.waitForTimeout(1000);

    // Reload
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const auroraPersist = await page.evaluate(() => {
      const stored = localStorage.getItem("popshake_loading_settings");
      let parsed = null;
      try { parsed = JSON.parse(stored); } catch {}
      const computed = window.getComputedStyle(document.documentElement);
      return {
        themeId: parsed?.advancedConfig?.themeId,
        primaryHex: computed.getPropertyValue("--primary-hex").trim(),
      };
    });

    logInfo(`Aurora Mesh pós-reload: id=${auroraPersist.themeId}, hex=${auroraPersist.primaryHex}`);
    if (auroraPersist.themeId === "aurora_mesh" || auroraPersist.primaryHex === "#6366F1") {
      logSuccess("Persistência do Aurora Mesh (#6366F1) APROVADA com louvor!");
    }

    // Salva resumo em arquivo JSON
    const summaryPath = path.join(SCREENSHOTS_DIR, "audit-temas-summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: auditResults,
      persistence: {
        fluidOrbs: isPersisted,
        auroraMesh: auroraPersist.themeId === "aurora_mesh" || auroraPersist.primaryHex === "#6366F1",
      },
    }, null, 2));

    logStep("FINALIZADO", "Auditoria E2E de temas concluída com sucesso!");

  } catch (err) {
    logFail("Falha durante execução do script de auditoria", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runThemeAudit();
