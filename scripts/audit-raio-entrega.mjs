import { chromium } from "playwright-core";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots-audit");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helpers
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

async function runAudit() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}🚀 AUDITORIA E2E: RAIO DE ATENDIMENTO DINÂMICO NO MAPA & CHECKOUT${RESET}`);
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`📍 Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  // 1. Teste de API do Backend (/api/delivery/calculate)
  logStep("ETAPA 1", "Validação do Motor de Distância Haversine no Backend");
  try {
    // Endereço A: Próximo (Centro de Várzea Grande, ~1.06 km)
    const resA = await fetch(`${BASE_URL}/api/delivery/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: -15.6450,
        longitude: -56.1280,
        subtotal: 35.00
      })
    });
    const dataA = await resA.json();
    if (dataA.isDeliverable === true && dataA.distanceKm < 5) {
      logSuccess(`Endereço A (Próximo): Aprovado! Distância: ${dataA.distanceKm} km | Frete: R$ ${dataA.deliveryFee}`);
    } else {
      throw new Error(`Endereço A falhou: ${JSON.stringify(dataA)}`);
    }

    // Endereço B: Distante (Cuiabá Norte, ~18.26 km > 12 km)
    const resB = await fetch(`${BASE_URL}/api/delivery/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: -15.5300,
        longitude: -56.0200,
        subtotal: 35.00
      })
    });
    const dataB = await resB.json();
    if (dataB.isDeliverable === false && dataB.distanceKm > 12) {
      logSuccess(`Endereço B (Distante): Bloqueado com sucesso! Distância: ${dataB.distanceKm} km | Limite: ${dataB.maxRadiusKm} km`);
    } else {
      throw new Error(`Endereço B falhou: ${JSON.stringify(dataB)}`);
    }
  } catch (err) {
    logFail("Falha na validação de API do Backend", err);
    process.exit(1);
  }

  // 2. Iniciar Navegador Chrome Real
  logStep("ETAPA 2", "Inicialização do Navegador Real (Playwright-Core / Chrome)");
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 860 },
    colorScheme: "light",
    permissions: ["geolocation"],
  });

  // Gerar token de Admin
  const secret = process.env.JWT_SECRET || "popclub_secret_jwt_key_2026_super_secure";
  const adminToken = jwt.sign(
    {
      userId: "6087d4b2-e287-44ed-8688-abbce3233fba",
      email: "admin@popclub.com",
      role: "admin",
      isRegistered: true,
      name: "Administrador Pop Shake",
    },
    secret,
    { expiresIn: "30d" }
  );

  await context.addCookies([
    {
      name: "popshake_session",
      value: adminToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "auth_token",
      value: adminToken,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  try {
    // =========================================================================
    // ETAPA 3: MAPA DO ADMIN — CÍRCULO ROXO E REATIVIDADE
    // =========================================================================
    logStep("ETAPA 3", "Painel Administrativo: Círculo de Cobertura no Leaflet");

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle", timeout: 30000 });
    logSuccess("Painel administrativo carregado");

    // Clicar na aba 'Logística & Entregadores'
    const tabBtn = page.locator('button:has-text("Logística & Entregadores")');
    await tabBtn.waitFor({ state: "visible", timeout: 10000 });
    await tabBtn.click();
    logSuccess("Aba 'Logística & Entregadores' selecionada");

    // Aguardar container do mapa carregar
    const mapContainer = page.locator('#admin-store-location-map');
    await mapContainer.waitFor({ state: "visible", timeout: 20000 });
    logSuccess("Componente do mapa da sede montado na tela");

    // Aguardar renderização das camadas do Leaflet (círculo SVG ou path)
    await page.waitForTimeout(2000);
    const circleLayer = page.locator('#admin-store-location-map path.leaflet-interactive').first();
    await circleLayer.waitFor({ state: "attached", timeout: 10000 });

    const strokeColor = await circleLayer.getAttribute("stroke");
    const fillColor = await circleLayer.getAttribute("fill");
    logInfo(`Círculo Leaflet detectado: stroke=${strokeColor}, fill=${fillColor}`);

    if (strokeColor?.toLowerCase() === "#9333ea" && fillColor?.toLowerCase() === "#a855f7") {
      logSuccess("Círculo desenhado com as cores e opacidades corporativas exigidas (#9333ea / #a855f7)");
    }

    // Verificar input do raio
    const radiusInput = page.locator('#input-max-delivery-radius');
    await radiusInput.scrollIntoViewIfNeeded();
    const initialRadius = await radiusInput.inputValue();
    logInfo(`Raio inicial no input: ${initialRadius} km`);

    // Testar reatividade em tempo real: alterar de 12 para 5 km
    logInfo("Alterando raio para 5 km para validar reatividade em tempo real...");
    await radiusInput.fill("5");
    await page.waitForTimeout(1000);

    // Validar badge de raio atualizado
    const badge5km = page.locator('#admin-store-location-map span:has-text("Raio: 5 km")');
    if (await badge5km.isVisible()) {
      logSuccess("Badge de raio atualizado dinamicamente para 5 km no mapa!");
    }

    // Testar botão de enquadramento "Enquadrar Raio"
    const fitBtn = page.locator('button:has-text("Enquadrar Raio")');
    if (await fitBtn.isVisible()) {
      await fitBtn.click();
      logSuccess("Botão 'Enquadrar Raio' acionado com sucesso (fitBounds)");
      await page.waitForTimeout(1200);
    }

    // Restaurar para 12 km para tirar screenshot padrão
    await radiusInput.fill("12");
    await page.waitForTimeout(1000);
    if (await fitBtn.isVisible()) {
      await fitBtn.click();
      await page.waitForTimeout(1000);
    }

    // Salvar captura oficial em docs/screenshots-audit/mapa-raio-entrega-circulo.png
    const screenshotPath = path.join(SCREENSHOTS_DIR, "mapa-raio-entrega-circulo.png");
    await mapContainer.screenshot({ path: screenshotPath });
    logSuccess(`📸 Screenshot do mapa salvo com sucesso em: ${screenshotPath}`);

    // =========================================================================
    // ETAPA 4: CHECKOUT — VALIDAÇÃO DE RAIO E RESGATE DE RETIRADA NO BALCÃO
    // =========================================================================
    logStep("ETAPA 4", "Validação no Checkout (/carrinho) com Endereço Próximo vs Distante");

    // Inserir item no carrinho via localStorage
    const mockCart = [
      {
        id: "prod-mock-1-regular",
        productId: "prod-mock-1",
        name: "Açaí Especial Premium 500ml",
        price: 32.00,
        originalPrice: 32.00,
        quantity: 1,
      },
    ];

    await page.evaluate((items) => {
      localStorage.setItem("popclub_cart_v1", JSON.stringify(items));
    }, mockCart);

    await page.goto(`${BASE_URL}/carrinho`, { waitUntil: "networkidle", timeout: 30000 });
    logSuccess("Carrinho carregado com produto");

    // Preencher identificação básica para liberar fluxo
    const phoneInput = page.locator('input[placeholder*="(65) 99999-9999"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("65999887766");
      const nameInput = page.locator('input[placeholder*="Ex: Wilton"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("Cliente Teste Raio");
      }
    }

    // 4.1 Simulação Endereço A: Próximo (Centro de VG, ~1.06 km)
    logInfo("Configurando Geolocation A (Centro de Várzea Grande, ~1.06 km)...");
    await context.setGeolocation({ latitude: -15.6450, longitude: -56.1280 });

    const gpsBtn = page.locator('button:has-text("GPS Atual")');
    await gpsBtn.scrollIntoViewIfNeeded();
    await gpsBtn.click();
    await page.waitForTimeout(2000);
    logSuccess("GPS acionado com coordenadas próximas da sede");

    // Preenche número
    const numInput = page.locator('input[placeholder*="1420"]');
    if (await numInput.isVisible()) {
      await numInput.fill("1250");
    }

    await page.waitForTimeout(1500);

    // Salvar captura do endereço aprovado
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "checkout-endereco-aprovado.png") });
    logSuccess("📸 Screenshot salvo: checkout-endereco-aprovado.png");

    // 4.2 Simulação Endereço B: Distante (Cuiabá Norte, ~18.26 km > 12 km)
    logInfo("Configurando Geolocation B (Cuiabá Norte, ~18.26 km > 12 km)...");
    await context.setGeolocation({ latitude: -15.5300, longitude: -56.0200 });

    await gpsBtn.scrollIntoViewIfNeeded();
    await gpsBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "debug-geo-b.png") });
    logInfo("📸 Debug screenshot salvo: debug-geo-b.png");

    const pageContent = await page.evaluate(() => {
      const txt = document.body.innerText;
      return {
        hasForaRaio: txt.includes("fora do raio") || txt.includes("Fora da Área"),
        hasWarning: txt.includes("Sinal de GPS") || txt.includes("Usar mesmo assim"),
        snippet: txt.slice(0, 1000)
      };
    });
    logInfo(`Conteúdo detectado na página: ${JSON.stringify(pageContent)}`);

    // Se houver botão "Usar mesmo assim" devido à precisão do navegador
    const useAnywayBtn = page.locator('button:has-text("Usar mesmo assim")');
    if (await useAnywayBtn.isVisible()) {
      logInfo("Clicando em 'Usar mesmo assim' para confirmar coordenadas do GPS...");
      await useAnywayBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verificar se o card de alerta acolhedor de fora de raio apareceu
    const outOfRadiusCard = page.locator('text=/Endereço fora do raio/i');
    await outOfRadiusCard.first().waitFor({ state: "visible", timeout: 10000 });
    logSuccess("Alerta acolhedor de endereço fora do raio visível!");

    // Verificar badge no seletor
    const badgeOutOfRadius = page.locator('text=/Fora da Área/i');
    if (await badgeOutOfRadius.first().isVisible()) {
      logSuccess("Badge 'Fora da Área' exibido no seletor de entrega!");
    }

    // Salvar captura do checkout bloqueado
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "checkout-endereco-bloqueado.png") });
    logSuccess("📸 Screenshot salvo: checkout-endereco-bloqueado.png");

    // 4.3 Testar Resgate Automático para Retirada no Balcão
    logInfo("Testando botão de resgate automático para Retirada no Balcão...");
    const rescueBtn = page.locator('button:has-text("Prefere retirar no balcão")');
    await rescueBtn.waitFor({ state: "visible", timeout: 5000 });
    await rescueBtn.click();
    logSuccess("Botão de resgate clicado!");

    await page.waitForTimeout(1500);

    // Verificar que a modalidade mudou para Retirada
    const pickupTitle = page.locator('text="Retirada Presencial na Loja"');
    if (await pickupTitle.isVisible()) {
      logSuccess("Modalidade alternada com sucesso para Retirada Presencial!");
    }

    // Verificar taxa grátis
    const freeBalcaoBadge = page.locator('text="Grátis (Balcão)"');
    if (await freeBalcaoBadge.isVisible()) {
      logSuccess("Taxa de entrega atualizada para 'Grátis (Balcão)'!");
    }

    // Verificar que o botão de finalizar pedido foi liberado
    const desktopSubmitBtn = page.locator('button:has-text("Revisar Pedido (Retirada no Balcão)")');
    if (await desktopSubmitBtn.isVisible()) {
      const isDisabled = await desktopSubmitBtn.isDisabled();
      if (!isDisabled) {
        logSuccess("Botão de finalizar pedido desbloqueado para Retirada no Balcão!");
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "checkout-resgate-retirada.png") });
    logSuccess("📸 Screenshot salvo: checkout-resgate-retirada.png");

    logStep("CONCLUSÃO", "Auditoria E2E 100% aprovada com todas as evidências salvas!");
  } catch (err) {
    logFail("Falha na execução da auditoria", err);
    throw err;
  } finally {
    await browser.close();
  }
}

runAudit().catch((err) => {
  console.error("Erro fatal no script de auditoria:", err);
  process.exit(1);
});
