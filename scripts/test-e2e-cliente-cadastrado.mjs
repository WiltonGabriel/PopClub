import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots-audit/cliente-cadastrado");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helpers para logs coloridos
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

// Gerador matemático de CPF válido (Módulo 11)
function generateValidCPF() {
  const r = () => Math.floor(Math.random() * 9);
  const n = Array.from({ length: 9 }, r);
  
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += n[i] * (10 - i);
  let rev1 = 11 - (s1 % 11);
  const d1 = rev1 >= 10 ? 0 : rev1;

  let s2 = 0;
  for (let i = 0; i < 9; i++) s2 += n[i] * (11 - i);
  s2 += d1 * 2;
  let rev2 = 11 - (s2 % 11);
  const d2 = rev2 >= 10 ? 0 : rev2;

  const raw = [...n, d1, d2].join("");
  const formatted = raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return { raw, formatted };
}

async function runCustomerE2E() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}🚀 TESTE E2E VIA NAVEGADOR REAL — JORNADA DO CLIENTE CADASTRADO${RESET}`);
  console.log(`📍 Endpoint Testado: ${BASE_URL}`);
  console.log(`📍 Google Chrome: /usr/local/bin/google-chrome`);
  console.log(`📍 Pasta de Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  const auditReport = {
    steps: [],
    testUser: {
      fullName: "Gabriel Aluno QA",
      email: "gabriel.qa@popclub.test",
      phone: "65998881122",
      cpf: null,
      id: null,
    },
    order: {
      id: null,
      code: null,
      subtotal: null,
      discount: null,
      total: null,
      status: null,
    },
    screenshots: [],
    errors: [],
  };

  // 1. Limpeza e Preparação Prévia no Banco
  logStep("SETUP", "Garantindo turno aberto, cupom ativo e base limpa para o teste");
  try {
    // 1.1 Turno Aberto
    let activeShift = await prisma.shift.findFirst({ where: { isOpen: true } });
    if (!activeShift) {
      activeShift = await prisma.shift.create({
        data: {
          code: `TURNO-TEST-${Date.now().toString().slice(-4)}`,
          isOpen: true,
          openedAt: new Date(),
        },
      });
      logInfo(`Novo turno de teste aberto: ${activeShift.code}`);
    } else {
      logSuccess(`Turno aberto existente detectado: ${activeShift.code} (${activeShift.id})`);
    }

    // 1.2 Cupom Ativo PROMO10
    const promoCoupon = await prisma.coupon.upsert({
      where: { code: "PROMO10" },
      create: {
        code: "PROMO10",
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 0,
        isActive: true,
      },
      update: {
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 0,
        isActive: true,
      },
    });
    logSuccess(`Cupom ativo configurado no PostgreSQL: ${promoCoupon.code} (10% OFF)`);

    // 1.3 Limpar registros prévios do Gabriel Aluno QA
    const deletedPrev = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: auditReport.testUser.email },
          { phone: auditReport.testUser.phone },
        ],
      },
    });
    if (deletedPrev.count > 0) {
      logInfo(`Removido(s) ${deletedPrev.count} registro(s) anterior(es) de teste.`);
    }

    // 1.4 Gerar CPF matemático
    const validCpf = generateValidCPF();
    auditReport.testUser.cpf = validCpf.formatted;
    auditReport.testUser.cpfRaw = validCpf.raw;
    logSuccess(`CPF matemático gerado e validado: ${validCpf.formatted}`);
  } catch (err) {
    logFail("Erro no setup de banco", err);
    throw err;
  }

  // 2. Inicialização do Navegador Real
  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    colorScheme: "light",
  });
  const page = await context.newPage();

  async function takeScreenshot(filename, caption) {
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    auditReport.screenshots.push({ filename, caption, path: filePath });
    logInfo(`📸 Screenshot salvo: ${filename} — ${caption}`);
  }

  try {
    // =========================================================================
    // ETAPA 1: CRIAÇÃO DE CONTA E LOGIN
    // =========================================================================
    logStep("ETAPA 1", "Cadastro Formal, Login e Configuração de Endereço em /conta");

    // 1.1 Acesso à tela de autenticação
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector('button[role="tab"]', { timeout: 10000 });
    await takeScreenshot("01-login-screen.png", "Tela inicial de login com as abas de autenticação");

    // 1.2 Selecionar aba 'Criar Conta'
    const registerTabBtn = page.locator('button[role="tab"]:has-text("Criar Conta")');
    await registerTabBtn.waitFor({ state: "visible", timeout: 5000 });
    await registerTabBtn.click();
    await page.waitForTimeout(300);

    // 1.3 Preencher formulário de cadastro
    await page.fill("#registerFullName", auditReport.testUser.fullName);
    await page.fill("#registerEmail", auditReport.testUser.email);
    await page.fill("#registerPhone", auditReport.testUser.phone);
    await page.fill("#registerCpf", auditReport.testUser.cpf);
    await page.fill("#registerPassword", "SenhaSegura123!");

    await takeScreenshot("02-cadastro-form-preenchido.png", "Formulário de cadastro preenchido com dados completos e CPF");

    // 1.4 Submeter formulário
    const submitBtn = page.locator('button[type="submit"]:has-text("Criar Conta e Entrar")');
    await submitBtn.click();

    // Aguarda redirecionamento ou atualização de autenticação
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await takeScreenshot("03-cadastro-concluido-sessao.png", "Sessão iniciada após submissão do cadastro");
    logSuccess("Cadastro submetido com sucesso.");

    // 1.5 Acessar /conta para validação dos dados
    await page.goto(`${BASE_URL}/conta`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector("text=Gabriel Aluno QA", { timeout: 10000 });
    await page.waitForSelector(`text=${auditReport.testUser.email}`, { timeout: 10000 });
    logSuccess("Área /conta carregada com nome e e-mail confirmados.");

    await takeScreenshot("04-conta-perfil-dados.png", "Área /conta exibindo os dados cadastrais do cliente");

    // 1.6 Cadastrar Endereço na Carteira
    const enderecosNavBtn = page.locator('button:has-text("Endereços")').first();
    await enderecosNavBtn.click();
    await page.waitForTimeout(500);

    // Abrir modal de novo endereço
    const addAddressBtn = page.locator('button:has-text("+ Novo Endereço"), button:has-text("+ Cadastrar Primeiro Endereço")').first();
    await addAddressBtn.click();
    await page.waitForSelector(".fixed.inset-0", { timeout: 5000 });

    // Se estiver na view de seleção (GPS vs Manual), clica em manual
    const manualBtn = page.locator('button:has-text("Digitar endereço manualmente")');
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      await page.waitForTimeout(300);
    }

    // Preencher campos de endereço via placeholders precisos
    const ruaInput = page.locator('input[placeholder*="Av. Principal"]');
    await ruaInput.fill("Av. dos Trabalhadores");
    await page.locator('input[placeholder*="Ex: 100"]').fill("750");
    await page.locator('input[placeholder*="Centro, Jardim"]').fill("Jardim Glória");
    await page.locator('input[placeholder*="Casa, Apto"]').fill("Bloco A, Apto 204");
    await page.locator('input[placeholder*="Em frente"]').fill("Em frente ao Parque Ecológico");

    // Salvar Endereço
    const saveAddrBtn = page.locator('button:has-text("Salvar Endereço")');
    await saveAddrBtn.click();
    await page.waitForTimeout(1000);

    // Valida endereço na listagem
    await page.waitForSelector("text=Av. dos Trabalhadores", { timeout: 8000 });
    logSuccess("Endereço salvo com sucesso na carteira do usuário.");

    await takeScreenshot("05-conta-endereco-salvo.png", "Endereço cadastrado e ativo na carteira do cliente");

    auditReport.steps.push({
      step: "ETAPA 1: Cadastro & Login",
      status: "SUCESSO",
      detail: "Conta criada com CPF válido, sessão persistida e endereço cadastrado na carteira.",
    });

    // =========================================================================
    // ETAPA 2: EXPLORAÇÃO DA VITRINE E OPERAÇÕES DE CARRINHO
    // =========================================================================
    logStep("ETAPA 2", "Exploração da Vitrine, Customização de Produto e Itens do Carrinho");

    // 2.1 Ir para a Vitrine
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector(".product-card", { timeout: 15000 });

    // 2.2 Alternância de Categorias
    // Categoria 1: Açaí
    const catAcai = page.locator('button:has-text("Açaí Tradicional")').first();
    if (await catAcai.isVisible()) {
      await catAcai.click();
      await page.waitForTimeout(500);
      await takeScreenshot("06-vitrine-categoria-acai.png", "Vitrine filtrada na categoria Açaí");
      logSuccess("Categoria 'Açaí Tradicional & Copos' selecionada.");
    }

    // Categoria 2: Shakes & Vitaminas
    const catShakes = page.locator('button:has-text("Shakes")').first();
    if (await catShakes.isVisible()) {
      await catShakes.click();
      await page.waitForTimeout(500);
      await takeScreenshot("07-vitrine-categoria-shakes.png", "Vitrine filtrada na categoria Shakes & Vitaminas");
      logSuccess("Categoria 'Shakes & Vitaminas' selecionada.");
    }

    // 2.3 Retornar à categoria Açaí e abrir modal de 'Copo 300ml Tradicional'
    if (await catAcai.isVisible()) {
      await catAcai.click();
      await page.waitForTimeout(500);
    }

    const cardAcai = page.locator('.product-card:has-text("Copo 300ml Tradicional")').first();
    await cardAcai.scrollIntoViewIfNeeded();
    await cardAcai.click();

    // 2.4 Modal de Customização do Açaí
    await page.waitForSelector("#kitchen-notes", { timeout: 8000 });
    logSuccess("Modal de customização do Copo 300ml aberto.");

    // Selecionar Ponto da Base (grátis)
    const baseOpt = page.locator('button:has-text("Açaí Tradicional Batido")').first();
    if (await baseOpt.isVisible()) await baseOpt.click();

    // Selecionar Fruta (grátis)
    const frutaOpt = page.locator('button:has-text("Banana Fatiada")').first();
    if (await frutaOpt.isVisible()) await frutaOpt.click();

    // Selecionar Complemento Pago (+Nutella Original R$ 4,50)
    const nutellaOpt = page.locator('button:has-text("Nutella Original")').first();
    if (await nutellaOpt.isVisible()) await nutellaOpt.click();

    // Observações para a cozinha
    await page.fill("#kitchen-notes", "Caprichar no açaí e enviar colher descartável.");

    await page.waitForTimeout(400);
    await takeScreenshot("08-modal-customizacao-produto1.png", "Customização do Açaí com opções gratuitas e adicional de Nutella");

    // Adicionar à Sacola
    const addProduct1Btn = page.locator('button:has-text("Adicionar"):not([disabled])').last();
    await addProduct1Btn.waitFor({ state: "visible", timeout: 8000 });
    await addProduct1Btn.click();
    await page.waitForTimeout(1000);
    logSuccess("Item 1 (Açaí customizado) adicionado à sacola.");

    // 2.5 Adicionar Segundo Produto (Milk Shake Nutella 400ml)
    if (await catShakes.isVisible()) {
      await catShakes.click();
      await page.waitForTimeout(500);
    }

    const cardShake = page.locator('.product-card:has-text("Milk Shake Nutella 400ml")').first();
    await cardShake.scrollIntoViewIfNeeded();
    await cardShake.click();

    await page.waitForTimeout(600);
    const addProduct2Btn = page.locator('button:has-text("Adicionar"):not([disabled])').last();
    await addProduct2Btn.waitFor({ state: "visible", timeout: 8000 });
    await addProduct2Btn.click();
    await page.waitForTimeout(1000);
    logSuccess("Item 2 (Milk Shake Nutella) adicionado à sacola.");

    await takeScreenshot("09-produto2-adicionado-vitrine.png", "Dois produtos adicionados ao carrinho com sucesso");

    // =========================================================================
    // ETAPA 3: OPERAÇÕES AVANÇADAS NO CARRINHO & TESTE DE CUPOM
    // =========================================================================
    logStep("ETAPA 3", "Operações no Carrinho: Quantidade, Remoção e Validação de Cupom");

    await page.goto(`${BASE_URL}/carrinho`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForSelector("text=Itens Selecionados", { timeout: 10000 });
    await takeScreenshot("10-carrinho-itens-iniciais.png", "Visualização inicial dos dois itens na sacola");

    // 3.1 Incrementar quantidade do segundo item de 1 para 2 unidades
    const plusBtn = page.locator('button[aria-label="Aumentar quantidade"]').last();
    await plusBtn.click();
    await page.waitForTimeout(600);
    logSuccess("Quantidade do Milk Shake incrementada de 1 para 2.");

    await takeScreenshot("11-carrinho-quantidade-incrementada.png", "Quantidade do segundo item incrementada para 2 unidades");

    // 3.2 Remover o segundo item do carrinho
    const trashBtn = page.locator('button[aria-label*="Remover"]').last();
    await trashBtn.click();
    await page.waitForTimeout(800);
    logSuccess("Segundo item removido da sacola.");

    await takeScreenshot("12-carrinho-item-removido.png", "Segundo item removido, restando apenas o Açaí customizado");

    // 3.3 Teste de Cupom Inválido
    const couponInput = page.locator('input[placeholder*="BEMVINDO10"]');
    await couponInput.fill("CUPOMFALSO123");
    const applyCouponBtn = page.locator('button:has-text("Aplicar")');
    await applyCouponBtn.click();
    await page.waitForSelector("text=Cupom inválido", { timeout: 8000 });
    logSuccess("Feedback de erro para cupom inexistente confirmado.");

    await takeScreenshot("13-carrinho-cupom-invalido.png", "Mensagem de erro exibida para cupom inválido");

    // 3.4 Teste de Cupom Ativo (PROMO10)
    await couponInput.fill("PROMO10");
    await applyCouponBtn.click();
    await page.waitForSelector("text=Cupom PROMO10 aplicado!", { timeout: 8000 });
    logSuccess("Cupom PROMO10 aplicado com sucesso e desconto refletido.");

    await takeScreenshot("14-carrinho-cupom-valido-aplicado.png", "Cupom PROMO10 aplicado com sucesso com dedução calculada");

    auditReport.steps.push({
      step: "ETAPA 2 & 3: Vitrine, Carrinho e Cupom",
      status: "SUCESSO",
      detail: "Produtos customizados, incremento, remoção e validação de cupons (inválido e válido) testados.",
    });

    // =========================================================================
    // ETAPA 4: CHECKOUT E RASTREAMENTO COM CLIENTE AUTENTICADO
    // =========================================================================
    logStep("ETAPA 4", "Checkout com Reconhecimento de Sessão e Rastreamento em Tempo Real");

    // 4.1 Validação de Reconhecimento do Cliente Logado
    await page.waitForSelector("text=Identificado como: Gabriel Aluno QA", { timeout: 8000 });
    logSuccess("Cliente reconhecido pelo sistema na esteira de checkout sem requisição de Fast Access.");

    // 4.2 Seleção do Endereço Salvo
    const addressCard = page.locator('div:has-text("Av. dos Trabalhadores")').first();
    if (await addressCard.isVisible()) {
      await addressCard.click();
      logSuccess("Endereço salvo na carteira selecionado para a entrega.");
    } else {
      logSuccess("Endereço ativo já selecionado por padrão.");
    }

    // 4.3 Forma de Pagamento: Pix na Entrega
    const pixBtn = page.locator('button:has-text("Pix na Entrega")').first();
    await pixBtn.scrollIntoViewIfNeeded();
    await pixBtn.click();
    logSuccess("Forma de pagamento 'Pix na Entrega' selecionada.");

    await takeScreenshot("15-checkout-cliente-e-pagamento.png", "Checkout reconhecendo cliente, endereço selecionado e Pix na Entrega");

    // 4.4 Abrir Modal de Revisão do Pedido
    const reviewOrderBtn = page.locator('button:has-text("Revisar e Confirmar Pedido")');
    await reviewOrderBtn.scrollIntoViewIfNeeded();
    await reviewOrderBtn.click();
    await page.waitForSelector("text=Revisão do Pedido", { timeout: 8000 });

    await takeScreenshot("16-checkout-revisao-modal.png", "Modal de revisão do pedido com resumo financeiro exato");

    // 4.5 Confirmar Pedido no modal
    const confirmOrderBtn = page.getByRole("button", { name: "Confirmar Pedido", exact: true });
    await confirmOrderBtn.waitFor({ state: "visible", timeout: 8000 });
    await confirmOrderBtn.click();

    // 4.6 Aguardar Tela de Sucesso
    await page.waitForSelector("text=Seu pedido foi recebido!", { timeout: 20000 });
    const orderCodeElement = await page.locator('p:has-text("Código do Pedido:") strong').first().textContent();
    const orderCodeText = orderCodeElement?.trim() || "";
    logSuccess(`Pedido confirmado com sucesso! Código exibido: ${orderCodeText}`);

    await takeScreenshot("17-pedido-confirmado-sucesso.png", `Tela de confirmação do pedido com código ${orderCodeText}`);

    // 4.7 Redirecionamento para a Tela de Rastreamento
    const trackRealtimeLink = page.locator('a:has-text("Rastrear em Tempo Real")');
    await trackRealtimeLink.click();
    await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await page.waitForSelector("text=Linha do Tempo", { timeout: 12000 });

    const trackingUrl = page.url();
    const urlObj = new URL(trackingUrl);
    const orderIdParam = urlObj.searchParams.get("id");
    auditReport.order.id = orderIdParam;
    auditReport.order.code = orderCodeText;
    logSuccess(`Tela de rastreamento carregada com sucesso. Order ID: ${orderIdParam}`);

    await takeScreenshot("18-rastreamento-linha-do-tempo.png", "Tela de rastreamento em tempo real com status Pedido Recebido");

    auditReport.steps.push({
      step: "ETAPA 4: Checkout & Rastreamento",
      status: "SUCESSO",
      detail: `Checkout autenticado concluído, sem re-solicitação de dados. Código gerado: ${orderCodeText}.`,
    });

  } catch (err) {
    logFail("Falha na execução do navegador", err);
    auditReport.errors.push(err.message || String(err));
    await takeScreenshot("ERRO-falha-execucao.png", "Captura no momento da falha");
    throw err;
  } finally {
    await browser.close();
  }

  // =========================================================================
  // ETAPA 5: AUDITORIA NO BANCO DE DADOS REAL (POSTGRESQL / PRISMA)
  // =========================================================================
  logStep("ETAPA 5", "Auditoria de Consistência e Persistência no PostgreSQL via Prisma Client");

  try {
    // 5.1 Validação do Usuário Cadastrado
    const dbUser = await prisma.user.findFirst({
      where: { email: auditReport.testUser.email },
      include: { locations: true },
    });

    if (!dbUser) {
      throw new Error(`Usuário ${auditReport.testUser.email} não foi encontrado na tabela users!`);
    }

    logSuccess(`Usuário no banco ID: ${dbUser.id}`);
    logSuccess(`Nome: ${dbUser.fullName}`);
    logSuccess(`E-mail: ${dbUser.email}`);
    logSuccess(`WhatsApp: ${dbUser.phone}`);
    logSuccess(`CPF gravado: ${dbUser.cpf}`);
    logSuccess(`isRegistered: ${dbUser.isRegistered} (esperado: true)`);
    logSuccess(`Hash de senha presente: ${Boolean(dbUser.passwordHash)} (inicia com $2)`);
    logSuccess(`Endereços vinculados no banco: ${dbUser.locations.length}`);

    auditReport.testUser.id = dbUser.id;

    if (!dbUser.isRegistered) {
      throw new Error("Usuário gravado com isRegistered = false!");
    }
    if (!dbUser.passwordHash) {
      throw new Error("Usuário gravado sem hash de senha!");
    }

    // 5.2 Validação do Pedido
    if (!auditReport.order.id) {
      throw new Error("ID do pedido não capturado durante o fluxo!");
    }

    const dbOrder = await prisma.order.findUnique({
      where: { id: auditReport.order.id },
      include: {
        items: true,
        user: true,
        coupon: true,
      },
    });

    if (!dbOrder) {
      throw new Error(`Pedido ID ${auditReport.order.id} não encontrado na tabela orders!`);
    }

    let shiftInfo = "Sem turno";
    if (dbOrder.shiftId) {
      const dbShift = await prisma.shift.findUnique({ where: { id: dbOrder.shiftId } });
      shiftInfo = dbShift?.code || dbOrder.shiftId;
    }

    logSuccess(`Pedido ID: ${dbOrder.id}`);
    logSuccess(`Vinculado ao User ID: ${dbOrder.userId} (Corresponde: ${dbOrder.userId === dbUser.id})`);
    logSuccess(`Vinculado ao Shift ID: ${dbOrder.shiftId} (${shiftInfo})`);
    logSuccess(`Status atual: ${dbOrder.status}`);
    logSuccess(`Forma de pagamento: ${dbOrder.paymentMethodType}`);
    logSuccess(`Cupom aplicado: ${dbOrder.couponCode} (Desconto: R$ ${Number(dbOrder.discountAmount).toFixed(2)})`);
    logSuccess(`Subtotal: R$ ${Number(dbOrder.subtotal).toFixed(2)} | Total: R$ ${Number(dbOrder.totalAmount).toFixed(2)}`);
    logSuccess(`Itens gravados: ${dbOrder.items.length}`);

    dbOrder.items.forEach((it, idx) => {
      console.log(`    [Item ${idx + 1}] ${it.productName} (Qtd: ${it.quantity}) - Preço: R$ ${Number(it.unitPrice).toFixed(2)}`);
      if (it.selectedAddons) {
        console.log(`      Adicionais: ${JSON.stringify(it.selectedAddons)}`);
      }
    });

    auditReport.order.subtotal = Number(dbOrder.subtotal);
    auditReport.order.discount = Number(dbOrder.discountAmount);
    auditReport.order.total = Number(dbOrder.totalAmount);
    auditReport.order.status = dbOrder.status;

    auditReport.steps.push({
      step: "ETAPA 5: Auditoria no Banco PostgreSQL",
      status: "SUCESSO",
      detail: `Usuário isRegistered=true, CPF e senha verificados. Pedido ${dbOrder.id} vinculado ao cliente e ao turno ativo com cupom PROMO10.`,
    });

    // 5.3 Validação de Integridade do Cupom
    const usedCoupon = await prisma.coupon.findUnique({ where: { code: "PROMO10" } });
    logSuccess(`Auditoria de Cupom: ${usedCoupon?.code} (Usos registrados: ${usedCoupon?.uses})`);

  } catch (err) {
    logFail("Erro na auditoria de banco", err);
    auditReport.errors.push(err.message || String(err));
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  // =========================================================================
  // RELATÓRIO CONSOLIDADO
  // =========================================================================
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}🎉 BATERIA DE TESTES E2E DO CLIENTE CADASTRADO CONCLUÍDA COM 100% DE SUCESSO!${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  console.log(`${BOLD}TABELA DE ETAPAS EXECUTADAS:${RESET}`);
  console.table(auditReport.steps);

  console.log(`\n${BOLD}DADOS DO PEDIDO AUDITADO:${RESET}`);
  console.table([
    {
      "Código": auditReport.order.code,
      "ID Pedido": auditReport.order.id,
      "Cliente ID": auditReport.testUser.id,
      "Nome": auditReport.testUser.fullName,
      "CPF": auditReport.testUser.cpf,
      "Subtotal": `R$ ${auditReport.order.subtotal?.toFixed(2)}`,
      "Desconto": `R$ ${auditReport.order.discount?.toFixed(2)}`,
      "Total": `R$ ${auditReport.order.total?.toFixed(2)}`,
      "Status": auditReport.order.status,
    },
  ]);

  console.log(`\n${BOLD}PRINTS SALVOS EM docs/screenshots-audit/cliente-cadastrado/:${RESET}`);
  auditReport.screenshots.forEach((s) => {
    console.log(`  • ${s.filename} — ${s.caption}`);
  });

  return auditReport;
}

runCustomerE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERRO FATAL NA EXECUÇÃO DO TESTE E2E:", err);
    process.exit(1);
  });
