import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/dark-mode");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helpers para cores e logs
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

function logWarning(msg) {
  console.log(`  ${YELLOW}⚠️ [CONTRASTE]${RESET} ${msg}`);
}

// Scanner de contraste programático no contexto do navegador
async function scanContrastIssues(page, viewName) {
  const issues = await page.evaluate((view) => {
    const list = [];

    function parseRgb(colorStr) {
      if (!colorStr) return null;
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return null;
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }

    function getLuminance(rgb) {
      const a = [rgb.r, rgb.g, rgb.b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrastRatio(l1, l2) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function getEffectiveBg(el) {
      let current = el;
      while (current && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const bg = parseRgb(style.backgroundColor);
        if (bg && bg.a > 0.4) {
          return { color: bg, el: current, colorStr: style.backgroundColor };
        }
        current = current.parentElement;
      }
      return { color: { r: 15, g: 23, b: 42, a: 1 }, el: document.documentElement, colorStr: "rgb(15, 23, 42)" };
    }

    const elements = document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, span, label, input, textarea, button, a, div"
    );

    for (const el of elements) {
      // Ignora elementos invisíveis ou com 0 dimensões
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;

      let text = "";
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        text = el.value || el.placeholder || "";
      } else {
        // Apenas elementos terminais com texto direto para evitar falsos duplicados
        const hasTextChild = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
        if (!hasTextChild && el.tagName === "DIV") continue;
        text = (el.innerText || el.textContent || "").trim();
      }

      if (!text || text.length === 0) continue;
      if (text.length > 80) text = text.slice(0, 80) + "...";

      const fgRgb = parseRgb(style.color);
      if (!fgRgb) continue;

      const bgInfo = getEffectiveBg(el);
      const fgLum = getLuminance(fgRgb);
      const bgLum = getLuminance(bgInfo.color);
      const ratio = getContrastRatio(fgLum, bgLum);

      // Ignora gradientes de texto (bg-clip-text onde color é transparente por design)
      const isGradientText =
        style.webkitBackgroundClip === "text" ||
        style.backgroundClip === "text" ||
        (fgRgb.a === 0 && (el.className || "").includes("bg-clip-text"));
      if (isGradientText) continue;

      const isBgDark = bgLum < 0.25;
      const isFgVeryDark = (fgRgb.r < 80 && fgRgb.g < 80 && fgRgb.b < 80) || fgLum < 0.12;

      // Se o fundo for escuro e a fonte for preta/muito escura, ou contraste < 3.0:1
      if (isBgDark && (isFgVeryDark || ratio < 3.0)) {
        // Ignora botões com background claro próprio explícito
        const selfBg = parseRgb(style.backgroundColor);
        if (selfBg && selfBg.a > 0.8 && getLuminance(selfBg) > 0.4) {
          continue;
        }

        let selector = el.tagName.toLowerCase();
        if (el.id) selector += `#${el.id}`;
        if (el.className && typeof el.className === "string") {
          const firstClass = el.className.trim().split(/\s+/).slice(0, 2).join(".");
          if (firstClass) selector += `.${firstClass}`;
        }

        list.push({
          view,
          selector,
          text: text.replace(/\s+/g, " "),
          color: style.color,
          bgColor: bgInfo.colorStr,
          contrastRatio: ratio.toFixed(2),
          isBlackOnDark: isFgVeryDark,
        });
      }
    }

    return list;
  }, viewName);

  return issues;
}

async function runDarkModeAudit() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}🌙 AUDITORIA VISUAL E TESTE E2E EM MODO ESCURO (DARK MODE) COM ACESSO RÁPIDO${RESET}`);
  console.log(`📍 Endpoint Testado: ${BASE_URL}`);
  console.log(`📍 Google Chrome: /usr/local/bin/google-chrome`);
  console.log(`📍 Pasta de Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  const auditReport = {
    steps: [],
    contrastIssues: [],
    screenshots: [],
    order: {},
  };

  // 1. Setup no Banco de Dados: Garantir turno ativo
  logStep("SETUP", "Garantindo turno aberto e dados limpos no banco de dados");
  let activeShift = await prisma.shift.findFirst({ where: { isOpen: true } });
  if (!activeShift) {
    activeShift = await prisma.shift.create({
      data: {
        code: `TURNO-DARK-${Date.now().toString().slice(-4)}`,
        isOpen: true,
        openedAt: new Date(),
        initialCash: 150.0,
      },
    });
    logSuccess(`Novo turno criado: ${activeShift.code}`);
  } else {
    logSuccess(`Turno aberto detectado: ${activeShift.code}`);
  }

  // 2. Inicialização do Google Chrome em MODO ESCURO
  logStep("BROWSER", "Inicializando Google Chrome com colorScheme: 'dark' e tema forçado");
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,900",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
  });

  // Injeta script síncrono para garantir .dark na tag <html> e localStorage
  await context.addInitScript(() => {
    try {
      localStorage.setItem("popshake-theme", "dark");
      document.documentElement.classList.add("dark");
    } catch {}
  });

  const page = await context.newPage();

  async function takeScreenshot(filename, caption) {
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    logInfo(`📸 Screenshot salvo: ${filename} — ${caption}`);
    auditReport.screenshots.push({ filename, caption, path: filePath });
  }

  try {
    // =========================================================================
    // ETAPA 1: VITRINE INICIAL EM MODO ESCURO
    // =========================================================================
    logStep("ETAPA 1", "Auditoria de Contraste na Vitrine Inicial (/) em Dark Mode");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector(".product-card", { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Valida se a classe .dark está ativa no HTML
    const isDarkActive = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (!isDarkActive) {
      logFail("Classe .dark não encontrada no <html>", new Error("Tema escuro não ativado"));
    } else {
      logSuccess("Tag <html> com classe .dark ativa com sucesso.");
    }

    // Varredura de Contraste na Vitrine
    const vitrineIssues = await scanContrastIssues(page, "Vitrine Inicial (/)");
    if (vitrineIssues.length > 0) {
      logWarning(`${vitrineIssues.length} possíveis problemas de contraste detectados na Vitrine:`);
      vitrineIssues.forEach((iss) => {
        console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
      });
      auditReport.contrastIssues.push(...vitrineIssues);
    } else {
      logSuccess("Vitrine inicial com 100% de contraste adequado em Dark Mode.");
    }

    await takeScreenshot("01-vitrine-dark.png", "Vitrine inicial em modo escuro com cards e categorias");

    // =========================================================================
    // ETAPA 2: MODAL DE CUSTOMIZAÇÃO DE PRODUTO EM MODO ESCURO
    // =========================================================================
    logStep("ETAPA 2", "Modal de Customização de Produto (Copo 300ml) em Dark Mode");
    const acaiCard = page.locator('.product-card:has-text("Copo 300ml Tradicional")').first();
    await acaiCard.scrollIntoViewIfNeeded();
    await acaiCard.click();

    await page.waitForSelector("#kitchen-notes", { timeout: 10000 });
    await page.waitForTimeout(600);

    // Selecionar opções para validar estado ativo em Dark Mode
    const baseOpt = page.locator('button:has-text("Açaí Tradicional Batido")').first();
    if (await baseOpt.isVisible()) await baseOpt.click();

    const frutaOpt = page.locator('button:has-text("Banana Fatiada")').first();
    if (await frutaOpt.isVisible()) await frutaOpt.click();

    const nutellaOpt = page.locator('button:has-text("Nutella Original")').first();
    if (await nutellaOpt.isVisible()) await nutellaOpt.click();

    // Preenche observações para auditar textarea em dark mode
    await page.fill("#kitchen-notes", "Sem açúcar extra. Caprichar na banana.");
    await page.waitForTimeout(500);

    // Varredura de Contraste no Modal
    const modalIssues = await scanContrastIssues(page, "Modal Customização Produto");
    if (modalIssues.length > 0) {
      logWarning(`${modalIssues.length} problemas de contraste detectados no Modal de Customização:`);
      modalIssues.forEach((iss) => {
        console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
      });
      auditReport.contrastIssues.push(...modalIssues);
    } else {
      logSuccess("Modal de customização com contraste perfeito em Dark Mode.");
    }

    await takeScreenshot("02-modal-customizacao-dark.png", "Modal de customização do açaí em Dark Mode com seletores e textarea");

    // Adiciona o item à sacola
    const addProductBtn = page.locator('button:has-text("Adicionar"):not([disabled])').last();
    await addProductBtn.click();
    await page.waitForTimeout(1000);
    logSuccess("Item customizado adicionado à sacola.");

    // =========================================================================
    // ETAPA 3: CARRINHO EM MODO ESCURO
    // =========================================================================
    logStep("ETAPA 3", "Auditoria da Sacola / Carrinho (/carrinho) em Dark Mode");
    await page.goto(`${BASE_URL}/carrinho`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector("text=Itens Selecionados", { timeout: 10000 });
    await page.waitForTimeout(600);

    const carrinhoIssues = await scanContrastIssues(page, "Carrinho (/carrinho)");
    if (carrinhoIssues.length > 0) {
      logWarning(`${carrinhoIssues.length} problemas de contraste detectados no Carrinho:`);
      carrinhoIssues.forEach((iss) => {
        console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
      });
      auditReport.contrastIssues.push(...carrinhoIssues);
    } else {
      logSuccess("Carrinho com contraste adequado em Dark Mode.");
    }

    await takeScreenshot("03-carrinho-dark.png", "Visualização da sacola de compras com item e esteira em Dark Mode");

    // =========================================================================
    // ETAPA 4: FORMULÁRIO DE ACESSO RÁPIDO EM MODO ESCURO
    // =========================================================================
    logStep("ETAPA 4", "Auditoria do Formulário de Acesso Rápido em Dark Mode");

    // Preenche os campos inline de Acesso Rápido ou abre o FastAccessModal
    const inlineNameInput = page.locator('input[placeholder*="João da Silva"]').first();
    const inlinePhoneInput = page.locator('input[placeholder*="(65) 99999-9999"]').first();

    if (await inlineNameInput.isVisible()) {
      await inlineNameInput.fill("Mariana Costa QA");
      await inlinePhoneInput.fill("65999887766");
      await page.waitForTimeout(400);

      // Clica em Confirmar Identificação se o botão estiver visível
      const confirmIdBtn = page.locator('button:has-text("Confirmar Identificação")');
      if (await confirmIdBtn.isVisible()) {
        await confirmIdBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Se o modal FastAccessModal foi aberto, inspeciona ele
    const fastAccessModal = page.locator('.fixed.inset-0:has-text("Acesso Rápido")');
    if (await fastAccessModal.isVisible()) {
      logSuccess("FastAccessModal aberto.");
      await page.fill("#fast-access-name", "Mariana Costa QA");
      await page.fill("#fast-access-phone", "65999887766");
      await page.waitForTimeout(400);

      const fastAccessIssues = await scanContrastIssues(page, "FastAccessModal");
      if (fastAccessIssues.length > 0) {
        logWarning(`${fastAccessIssues.length} problemas de contraste no FastAccessModal:`);
        fastAccessIssues.forEach((iss) => {
          console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
        });
        auditReport.contrastIssues.push(...fastAccessIssues);
      }

      await takeScreenshot("04-fast-access-inputs-dark.png", "Modal de Acesso Rápido com inputs preenchidos em Dark Mode");

      const submitFastBtn = page.locator('button:has-text("Continuar para Entrega")');
      await submitFastBtn.click();
      await page.waitForTimeout(1200);
    } else {
      await takeScreenshot("04-fast-access-inputs-dark.png", "Campos de identificação de Acesso Rápido preenchidos no topo do checkout");
    }

    // =========================================================================
    // ETAPA 5: CHECKOUT, FORMAS DE PAGAMENTO E MODAL DE REVISÃO EM DARK MODE
    // =========================================================================
    logStep("ETAPA 5", "Auditoria de Endereço, Pagamento e Revisão do Pedido em Dark Mode");

    // Preenche endereço de entrega se necessário
    const streetInput = page.locator('input[placeholder*="Av. Beira Mar"]').first();
    if (await streetInput.isVisible()) {
      await streetInput.fill("Rua das Palmeiras");
      await page.locator('input[placeholder*="1420"]').first().fill("250");
      await page.locator('input[placeholder*="Centro"]').first().fill("Jardim Imperial");
      await page.locator('input[placeholder*="Cidade"]').first().fill("Várzea Grande");
      await page.waitForTimeout(400);
    }

    // Seleciona forma de pagamento: Dinheiro com troco para validar input de troco em Dark Mode
    const dinheiroBtn = page.locator('button:has-text("Dinheiro em Espécie")').first();
    await dinheiroBtn.scrollIntoViewIfNeeded();
    await dinheiroBtn.click();
    await page.waitForTimeout(500);

    const changeInput = page.locator("#input-change-for");
    if (await changeInput.isVisible()) {
      await changeInput.fill("50.00");
      await page.waitForTimeout(300);
    }

    // Alterna para Pix na Entrega para demonstrar ambos
    const pixBtn = page.locator('button:has-text("Pix na Entrega")').first();
    await pixBtn.click();
    await page.waitForTimeout(400);

    const checkoutIssues = await scanContrastIssues(page, "Checkout / Pagamento");
    if (checkoutIssues.length > 0) {
      logWarning(`${checkoutIssues.length} problemas de contraste no Checkout:`);
      checkoutIssues.forEach((iss) => {
        console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
      });
      auditReport.contrastIssues.push(...checkoutIssues);
    } else {
      logSuccess("Checkout e pagamentos com contraste adequado em Dark Mode.");
    }

    await takeScreenshot("05-checkout-pagamento-dark.png", "Checkout com seleção de endereço e Pix na Entrega em Dark Mode");

    // Abre Modal de Revisão do Pedido
    const reviewBtn = page.locator('button:has-text("Revisar e Confirmar Pedido")');
    await reviewBtn.scrollIntoViewIfNeeded();
    await reviewBtn.click();
    await page.waitForSelector("text=Revisão do Pedido", { timeout: 8000 });
    await page.waitForTimeout(500);

    const reviewModalIssues = await scanContrastIssues(page, "Modal Revisão Pedido");
    if (reviewModalIssues.length > 0) {
      logWarning(`${reviewModalIssues.length} problemas de contraste no Modal de Revisão:`);
      reviewModalIssues.forEach((iss) => {
        console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
      });
      auditReport.contrastIssues.push(...reviewModalIssues);
    }

    // Confirma Pedido
    const confirmOrderBtn = page.getByRole("button", { name: "Confirmar Pedido", exact: true });
    await confirmOrderBtn.click();

    // =========================================================================
    // ETAPA 6: TELA DE CONFIRMAÇÃO E RASTREAMENTO EM MODO ESCURO
    // =========================================================================
    logStep("ETAPA 6", "Auditoria da Linha do Tempo de Rastreamento em Dark Mode");
    await page.waitForSelector("text=Seu pedido foi recebido!", { timeout: 20000 });

    const trackLink = page.locator('a:has-text("Rastrear em Tempo Real")');
    await trackLink.click();
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await page.waitForSelector("text=Linha do Tempo", { timeout: 12000 });
    await page.waitForTimeout(1000);

    const rastreamentoIssues = await scanContrastIssues(page, "Tela Rastreamento");
    if (rastreamentoIssues.length > 0) {
      logWarning(`${rastreamentoIssues.length} problemas de contraste na Tela de Rastreamento:`);
      rastreamentoIssues.forEach((iss) => {
        console.log(`    • [${iss.selector}] "${iss.text}" | Cor: ${iss.color} | Fundo: ${iss.bgColor} | Ratio: ${iss.contrastRatio}:1`);
      });
      auditReport.contrastIssues.push(...rastreamentoIssues);
    } else {
      logSuccess("Tela de rastreamento com contraste adequado em Dark Mode.");
    }

    await takeScreenshot("06-rastreamento-dark.png", "Tela de rastreamento em tempo real e timeline em Dark Mode");

    logSuccess("Fluxo E2E completo em Dark Mode finalizado com sucesso.");

  } catch (err) {
    logFail("Falha na execução do teste em Dark Mode", err);
    await takeScreenshot("ERRO-dark-mode-falha.png", "Falha durante execução do Dark Mode");
    throw err;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  // Relatório Final de Contraste
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}📊 RESUMO DA AUDITORIA DE CONTRASTE EM MODO ESCURO${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}`);

  if (auditReport.contrastIssues.length === 0) {
    console.log(`${GREEN}${BOLD}🎉 NENHUM ELEMENTO COM FONTE PRETA OU BAIXO CONTRASTE FOI DETECTADO!${RESET}`);
  } else {
    console.log(`${YELLOW}${BOLD}⚠️ FORAM ENCONTRADOS ${auditReport.contrastIssues.length} ELEMENTOS COM POTENCIAL RISCO DE CONTRASTE:${RESET}\n`);
    console.table(auditReport.contrastIssues);
  }

  return auditReport;
}

runDarkModeAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro fatal:", err);
    process.exit(1);
  });
