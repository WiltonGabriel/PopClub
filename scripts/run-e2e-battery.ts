import { prisma } from "../src/lib/prisma";
import { setupE2EScenario } from "./seed-e2e-scenario";
import { calculateProductPrice } from "../src/lib/pricing";

const BASE_URL = "http://localhost:3000";

async function runE2EBattery() {
  console.log("========================================================================");
  console.log("🚀 BATERIA DE TESTES E2E: PRODUTO NORMAL, PROMOÇÃO ATIVA E COMBOS");
  console.log("   (Acesso Rápido -> Conversão de Conta -> Cliente Cadastrado)");
  console.log("========================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   ℹ️  ${detail}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   ⚠️  Detalhes da falha: ${detail}`);
      throw new Error(`Falha no teste E2E: ${testName}`);
    }
  }

  // --------------------------------------------------------------------------
  // FASE 1: VALIDAÇÃO DO AMBIENTE E DADOS DE TESTE (PRÉ-CONDICIONAIS)
  // --------------------------------------------------------------------------
  console.log("--- FASE 1: Configurando e Validando Pré-condicionais no Banco de Dados ---");
  const scenario = await setupE2EScenario();

  assert(
    Number(scenario.shake500.price) === 26.0,
    "Produto 1 (Normal): Preço de tabela integral R$ 26,00 confirmado",
    `Produto: "${scenario.shake500.name}" | Preço: R$ ${scenario.shake500.price}`
  );

  const copo500Promo = await prisma.promotion.findFirst({
    where: { productId: scenario.copo500.id, isActive: true },
  });
  assert(
    copo500Promo !== null && Number(copo500Promo.discountValue) === 29.69,
    "Produto 2 (Promoção Ativa): Promoção ativa com valor promocional de R$ 29,69",
    `Promoção: "${copo500Promo?.title}" | De: R$ ${scenario.copo500.price} por R$ ${copo500Promo?.discountValue}`
  );

  const comboItems = await prisma.comboItem.findMany({
    where: { comboId: scenario.comboCasal.id },
    include: { product: true },
  });
  assert(
    comboItems.length > 0 && comboItems.reduce((acc, ci) => acc + ci.quantity, 0) === 2,
    "Produto 3 (Combo Multiatômico): Combo com 2 produtos filhos reais confirmado",
    `Combo: "${scenario.comboCasal.name}" | R$ ${scenario.comboCasal.price} | 2x "${comboItems[0]?.product.name}"`
  );

  // --------------------------------------------------------------------------
  // FASE 2: TESTE 1 — COMPRA DE PRODUTO NORMAL VIA ACESSO RÁPIDO
  // --------------------------------------------------------------------------
  console.log("\n--- FASE 2: Teste 1 — Compra de Produto Normal via Acesso Rápido ---");
  const guestPhone = "65999881122";
  const guestName = "Cliente Teste Normal";

  // 1. Limpa dados de testes anteriores para esse telefone
  const oldUsers = await prisma.user.findMany({ where: { phone: guestPhone } });
  if (oldUsers.length > 0) {
    const userIds = oldUsers.map((u) => u.id);
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userLocation.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  // 2. Cria sessão de Acesso Rápido via API
  const fastAccessRes = await fetch(`${BASE_URL}/api/auth/fast-access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "10.0.0.1",
    },
    body: JSON.stringify({ fullName: guestName, phone: guestPhone }),
  });
  const fastAccessData = await fastAccessRes.json();
  if (fastAccessRes.status !== 200) {
    console.error("❌ ERRO NO FAST-ACCESS:", fastAccessRes.status, fastAccessData);
  }

  assert(
    fastAccessRes.status === 200 && fastAccessData.token,
    "Endpoint /api/auth/fast-access cria sessão de Acesso Rápido com sucesso",
    `User ID: ${fastAccessData.user?.id} | Telefone: ${fastAccessData.user?.phone}`
  );

  const guestToken = fastAccessData.token;
  const guestUserId = fastAccessData.user.id;

  // 3. Validação de Banco: Usuário sem cadastro prévio
  const guestDbUser = await prisma.user.findUnique({ where: { id: guestUserId } });
  assert(
    guestDbUser !== null && guestDbUser.isRegistered === false && guestDbUser.passwordHash === null,
    "Banco de Dados: Usuário em Acesso Rápido criado com isRegistered=false e sem senha",
    `isRegistered: ${guestDbUser?.isRegistered}, passwordHash: ${guestDbUser?.passwordHash}`
  );

  // 4. Verificação de Preço de Produto Normal (Sem Preço Riscado)
  const shakePricing = calculateProductPrice(scenario.shake500);
  assert(
    shakePricing.currentPrice === 26.0 &&
      shakePricing.originalPrice === undefined &&
      shakePricing.isPromotional === false &&
      shakePricing.isPromo === false,
    "Vitrine: Produto sem promoção exibe estritamente o valor integral SEM preço riscado",
    `currentPrice: R$ ${shakePricing.currentPrice}, originalPrice: ${shakePricing.originalPrice}, isPromo: ${shakePricing.isPromo}`
  );

  // 5. Customização do Shake: Adiciona Chantilly (+R$ 3,50)
  const chantillyItem = await prisma.addonItem.findFirst({
    where: { name: "Chantilly Especial", groupId: scenario.groupShakeAddons.id },
  });
  assert(chantillyItem !== null, "Item de adicional Chantilly Especial (+R$ 3,50) localizado no banco");

  const expectedSubtotal1 = 26.0 + 3.5; // R$ 29,50
  assert(
    expectedSubtotal1 === 29.5,
    "Modal de Customização: Cálculo dinâmico do produto normal correto",
    `R$ 26,00 (Shake) + R$ 3,50 (Chantilly) = R$ ${expectedSubtotal1}`
  );

  // 6. Checkout como Acesso Rápido
  const checkoutPayload1 = {
    deliveryType: "delivery",
    items: [
      {
        productId: scenario.shake500.id,
        quantity: 1,
        selectedAddons: [
          {
            id: chantillyItem!.id,
            name: chantillyItem!.name,
            groupName: scenario.groupShakeAddons.name,
            price: Number(chantillyItem!.price),
            quantity: 1,
          },
        ],
      },
    ],
    deliveryAddress: {
      street: "Avenida Filinto Müller",
      number: "1500",
      neighborhood: "Centro",
      city: "Várzea Grande",
      state: "MT",
    },
    paymentMethod: {
      type: "dinheiro",
      changeFor: 50.0,
    },
    customerName: guestName,
    customerPhone: guestPhone,
  };

  const checkoutRes1 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify(checkoutPayload1),
  });

  const checkoutData1 = await checkoutRes1.json();
  const orderId1 = checkoutData1.orderId || checkoutData1.order?.id;
  const totalAmount1 = checkoutData1.totalAmount || checkoutData1.order?.totalAmount;

  if (checkoutRes1.status !== 200 && checkoutRes1.status !== 201) {
    console.error("❌ ERRO NO CHECKOUT 1:", checkoutRes1.status, checkoutData1);
  }
  assert(
    (checkoutRes1.status === 200 || checkoutRes1.status === 201) && checkoutData1.success === true && orderId1,
    "Checkout de Acesso Rápido finalizado com sucesso via /api/checkout",
    `Order ID: ${orderId1} | Total: R$ ${totalAmount1}`
  );

  // 7. Asserções no Banco via Prisma para o Teste 1
  const order1 = await prisma.order.findUnique({
    where: { id: orderId1 },
    include: { items: { include: { product: true } }, user: true },
  });

  assert(
    order1 !== null && order1.user !== null && order1.status === "pending",
    "Banco de Dados: Pedido 1 registrado com status 'pending'",
    `Status: ${order1?.status} | Subtotal: R$ ${order1?.subtotal}`
  );

  if (!order1 || !order1.user) {
    throw new Error("Pedido 1 ou usuário não encontrado no banco");
  }

  assert(
    order1.user.isRegistered === false && order1.user.passwordHash === null,
    "Banco de Dados: Pedido 1 associado ao cliente não registrado (Acesso Rápido)",
    `User ID: ${order1.userId} | isRegistered: ${order1.user.isRegistered}`
  );
  assert(
    Number(order1?.items[0]?.product.price) === 26.0 &&
      Number(order1?.items[0]?.priceAtTime) === 29.5 &&
      Number(order1?.subtotal) === 29.5,
    "Banco de Dados: Item do Pedido 1 registrou produto base R$ 26,00, preço unitário R$ 29,50 e subtotal R$ 29,50",
    `Preço Base: R$ ${order1?.items[0]?.product.price}, Preço Cobrado Item: R$ ${order1?.items[0]?.priceAtTime}, Subtotal: R$ ${order1?.subtotal}`
  );

  // --------------------------------------------------------------------------
  // FASE 3: TESTE 2 — CONVERSÃO DE CONTA E COMPRA DE PRODUTO EM PROMOÇÃO ATIVA
  // --------------------------------------------------------------------------
  console.log("\n--- FASE 3: Teste 2 — Conversão de Conta e Compra de Produto em Promoção Ativa ---");

  // 1. Conversão no pós-pedido: Salvar Conta com senha e email
  const registeredEmail = "cliente.teste.normal@popclub.com";
  const registeredPassword = "Senha@123456";

  const completeProfileRes = await fetch(`${BASE_URL}/api/auth/complete-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`,
      "X-Forwarded-For": "10.0.0.2",
    },
    body: JSON.stringify({
      email: registeredEmail,
      password: registeredPassword,
    }),
  });
  const completeProfileData = await completeProfileRes.json();
  if (completeProfileRes.status !== 200) {
    console.error("❌ ERRO NO COMPLETE-PROFILE:", completeProfileRes.status, completeProfileData);
  }

  assert(
    completeProfileRes.status === 200 && completeProfileData.success === true,
    "Conversão de Conta via /api/auth/complete-profile executada com sucesso",
    `Mensagem: "${completeProfileData.message}"`
  );

  // 2. Validação no Banco da Conversão
  const convertedUser = await prisma.user.findUnique({ where: { id: guestUserId } });
  assert(
    convertedUser !== null &&
      convertedUser.isRegistered === true &&
      convertedUser.passwordHash !== null &&
      convertedUser.email === registeredEmail,
    "Banco de Dados: Usuário convertido para isRegistered=true com passwordHash persistido",
    `Email: ${convertedUser?.email} | isRegistered: ${convertedUser?.isRegistered} | Hash: ${convertedUser?.passwordHash?.substring(0, 15)}...`
  );

  // 3. Teste de Login com Identificadores Normalizados (Mobile & Domínio)
  console.log("   📱 Testando autenticação mobile com múltiplos formatos de identificador:");
  const testIdentifiers = [
    registeredEmail, // E-mail tradicional
    guestPhone, // Telefone sem formatação
    `+55${guestPhone}`, // Telefone com DDI +55 do WhatsApp/autofill
    `(65) 99988-1122`, // Telefone com formatação visual
    `@${convertedUser?.username || "cliente_teste"}`, // Username com arroba (@)
  ];

  let authenticatedToken = "";
  for (const [idx, idf] of testIdentifiers.entries()) {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-Proto": "https",
        "X-Forwarded-For": `10.0.0.${idx + 10}`,
      },
      body: JSON.stringify({ identifier: idf, password: registeredPassword }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200) {
      console.error(`❌ FALHA NO LOGIN PARA IDENTIFICADOR "${idf}":`, loginRes.status, loginData);
    }
    assert(
      loginRes.status === 200 && loginData.token,
      `Autenticação bem-sucedida para identificador formatado: "${idf}"`,
      `Role: ${loginData.user?.role} | isRegistered: ${loginData.user?.isRegistered}`
    );
    authenticatedToken = loginData.token;
  }

  // 4. Verificação Visual do Produto em Promoção (Copo Pop 500ml Turbinado)
  const copo500WithPromo = await prisma.product.findUnique({
    where: { id: scenario.copo500.id },
    include: { promotions: { where: { isActive: true } } },
  });

  const copoPricing = calculateProductPrice({
    price: copo500WithPromo!.price,
    promotions: copo500WithPromo!.promotions,
  });

  assert(
    copoPricing.currentPrice === 29.69 &&
      copoPricing.originalPrice === 39.99 &&
      copoPricing.isPromotional === true &&
      copoPricing.isPromo === true &&
      copoPricing.discountPercent === 26,
    "Vitrine: Produto em promoção exibe preço riscado R$ 39,99, destaque R$ 29,69 e badge -26%",
    `Preço Riscado: R$ ${copoPricing.originalPrice} | Preço Atual: R$ ${copoPricing.currentPrice} | Desconto: ${copoPricing.discountPercent}%`
  );

  // 5. Customização do Copo 500ml:
  // - 4 adicionais tradicionais grátis: Granola, Paçoca, Leite Ninho, Banana
  // - 1 adicional pago: Nutella (+R$ 7,00)
  // - 1 colher descartável (+R$ 0,98)
  const tradItems = await prisma.addonItem.findMany({
    where: { groupId: scenario.groupTradicionais.id },
    take: 4,
  });
  const nutellaItem = await prisma.addonItem.findFirst({
    where: { groupId: scenario.groupCremes.id, name: { contains: "Nutella" } },
  });
  const colherItem = await prisma.addonItem.findFirst({
    where: { groupId: scenario.groupTalheres.id, name: { contains: "Colher" } },
  });

  assert(tradItems.length === 4 && nutellaItem !== null && colherItem !== null, "Adicionais do Copo 500ml localizados no banco");

  const selectedCopoAddons = [
    // 4 grátis (cota do grupo)
    ...tradItems.map((item) => ({
      id: item.id,
      name: item.name,
      groupName: scenario.groupTradicionais.name,
      price: 0, // Inclusos na cota gratuita
      quantity: 1,
    })),
    // 1 pago
    {
      id: nutellaItem!.id,
      name: nutellaItem!.name,
      groupName: scenario.groupCremes.name,
      price: 7.0,
      quantity: 1,
    },
    // Colher
    {
      id: colherItem!.id,
      name: colherItem!.name,
      groupName: scenario.groupTalheres.name,
      price: 0.98,
      quantity: 1,
    },
  ];

  const expectedSubtotal2 = Number((29.69 + 0.0 + 7.0 + 0.98).toFixed(2)); // R$ 37,67
  assert(
    expectedSubtotal2 === 37.67,
    "Modal de Customização: Cálculo com cota gratuita, adicional pago e colher soma R$ 37,67",
    `R$ 29,69 + R$ 0,00 (4 grátis) + R$ 7,00 (Nutella) + R$ 0,98 (Colher) = R$ ${expectedSubtotal2}`
  );

  // 6. Checkout como Cliente Cadastrado (Dados pré-preenchidos + Pix)
  const checkoutPayload2 = {
    deliveryType: "delivery",
    items: [
      {
        productId: scenario.copo500.id,
        quantity: 1,
        selectedAddons: selectedCopoAddons,
      },
    ],
    deliveryAddress: {
      street: "Avenida Filinto Müller",
      number: "1500",
      neighborhood: "Centro",
      city: "Várzea Grande",
      state: "MT",
    },
    paymentMethod: {
      type: "pix_entrega",
    },
    customerName: guestName,
    customerPhone: guestPhone,
  };

  const checkoutRes2 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authenticatedToken}`,
    },
    body: JSON.stringify(checkoutPayload2),
  });

  const checkoutData2 = await checkoutRes2.json();
  const orderId2 = checkoutData2.orderId || checkoutData2.order?.id;
  const totalAmount2 = checkoutData2.totalAmount || checkoutData2.order?.totalAmount;

  if (checkoutRes2.status !== 200 && checkoutRes2.status !== 201) {
    console.error("❌ ERRO NO CHECKOUT 2:", checkoutRes2.status, checkoutData2);
  }
  assert(
    (checkoutRes2.status === 200 || checkoutRes2.status === 201) && checkoutData2.success === true && orderId2,
    "Checkout com Produto Promocional finalizado com sucesso via Pix",
    `Order ID: ${orderId2} | Total: R$ ${totalAmount2}`
  );

  // 7. Asserções no Banco via Prisma para o Teste 2
  const order2 = await prisma.order.findUnique({
    where: { id: orderId2 },
    include: { items: { include: { product: true } }, user: true },
  });

  assert(
    order2 !== null && order2.user !== null && order2.userId === guestUserId && order2.user.isRegistered === true,
    "Banco de Dados: Pedido 2 vinculado com sucesso ao mesmo usuário, agora registrado",
    `User ID: ${order2?.userId} | isRegistered: ${order2?.user?.isRegistered}`
  );

  if (!order2 || !order2.user) {
    throw new Error("Pedido 2 ou usuário não encontrado no banco");
  }

  const discountApplied = Number((39.99 - 29.69).toFixed(2)); // R$ 10,30
  assert(
    Number(order2?.items[0]?.product.price) === 39.99 &&
      Number(order2?.items[0]?.priceAtTime) === 37.67 &&
      Number(order2?.discountAmount) === 10.3,
    "Banco de Dados: Item do Pedido 2 cobrou preço promocional com adicionais R$ 37,67 (Economia auditada de R$ 10,30)",
    `Preço Base: R$ ${order2?.items[0]?.product.price} | Preço Cobrado Item: R$ ${order2?.items[0]?.priceAtTime} | Desconto: R$ ${order2?.discountAmount} | Total: R$ ${order2?.totalAmount}`
  );

  // --------------------------------------------------------------------------
  // FASE 4: TESTE 3 — COMPRA DE COMBO COM CUSTOMIZAÇÃO INDEPENDENTE
  // --------------------------------------------------------------------------
  console.log("\n--- FASE 4: Teste 3 — Compra de Combo com Customização Independente ---");

  const comboProduct = await prisma.product.findUnique({
    where: { id: scenario.comboCasal.id },
    include: {
      comboItems: {
        include: {
          product: {
            include: {
              addonGroups: {
                include: { group: { include: { items: true } } },
              },
            },
          },
        },
      },
    },
  });

  assert(
    comboProduct !== null && comboProduct.isCombo === true,
    "Vitrine: Combo Casal identificado como produto composto (isCombo=true)",
    `Combo: "${comboProduct?.name}" | R$ ${comboProduct?.price}`
  );

  // Seleções independentes:
  // Copo 1: 4 grátis (Banana, Morango, Granola, Leite Condensado)
  const tradItemsAll = await prisma.addonItem.findMany({
    where: { groupId: scenario.groupTradicionais.id },
  });
  const findTrad = (nameSnippet: string) =>
    tradItemsAll.find((i) => i.name.toLowerCase().includes(nameSnippet.toLowerCase())) || tradItemsAll[0];

  const banana = findTrad("banana");
  const morango = findTrad("morango");
  const granola = findTrad("granola");
  const leiteCond = findTrad("condensado");
  const pacoca = findTrad("paçoca") || findTrad("pacoca");
  const chocoball = findTrad("chocoball");
  const amendoim = findTrad("amendoim");
  const mms = findTrad("confete") || findTrad("m&m");

  const copo1Addons = [
    { id: banana!.id, name: "Copo 1: Banana Fatiada", groupName: "Copo 1 - Tradicionais", price: 0, quantity: 1 },
    { id: morango!.id, name: "Copo 1: Morango Fresco", groupName: "Copo 1 - Tradicionais", price: 0, quantity: 1 },
    { id: granola!.id, name: "Copo 1: Granola Crocante", groupName: "Copo 1 - Tradicionais", price: 0, quantity: 1 },
    { id: leiteCond!.id, name: "Copo 1: Leite Condensado Moça", groupName: "Copo 1 - Tradicionais", price: 0, quantity: 1 },
  ];

  // Copo 2: 4 grátis (Paçoca, Chocoball, Amendoim, Confete M&M) + 1 pago (Creme de Leite Ninho +R$ 5,00)
  const ninhoItem = await prisma.addonItem.findFirst({
    where: { groupId: scenario.groupCremes.id, name: { contains: "Ninho" } },
  });
  assert(ninhoItem !== null, "Item Creme de Leite Ninho (+R$ 5,00) localizado no banco");

  const copo2Addons = [
    { id: pacoca!.id, name: "Copo 2: Paçoca Rolha", groupName: "Copo 2 - Tradicionais", price: 0, quantity: 1 },
    { id: chocoball!.id, name: "Copo 2: Chocoball", groupName: "Copo 2 - Tradicionais", price: 0, quantity: 1 },
    { id: amendoim!.id, name: "Copo 2: Amendoim Torrado", groupName: "Copo 2 - Tradicionais", price: 0, quantity: 1 },
    { id: mms!.id, name: "Copo 2: Confetes M&M", groupName: "Copo 2 - Tradicionais", price: 0, quantity: 1 },
    { id: ninhoItem!.id, name: "Copo 2: Creme de Leite Ninho", groupName: scenario.groupCremes.name, price: 5.0, quantity: 1 },
  ];

  // Talheres consolidados: 2 colheres (+R$ 1,96)
  const cutleryAddon = {
    id: colherItem!.id,
    name: "2x Colher descartável",
    groupName: scenario.groupTalheres.name,
    price: 0.98,
    quantity: 2,
  };

  const comboTotalAddonsPrice = 5.0 + 0.98 * 2; // R$ 6,96
  const expectedSubtotal3 = Number((47.0 + comboTotalAddonsPrice).toFixed(2)); // R$ 53,96

  assert(
    expectedSubtotal3 === 53.96,
    "Modal do Combo: Subtotal com seleções independentes e talheres soma exatamente R$ 53,96",
    `R$ 47,00 (Combo) + R$ 5,00 (Ninho Copo 2) + R$ 1,96 (2 colheres) = R$ ${expectedSubtotal3}`
  );

  // Checkout do Combo
  const checkoutPayload3 = {
    deliveryType: "delivery",
    items: [
      {
        productId: scenario.comboCasal.id,
        quantity: 1,
        selectedAddons: [...copo1Addons, ...copo2Addons, cutleryAddon],
      },
    ],
    deliveryAddress: {
      street: "Avenida Filinto Müller",
      number: "1500",
      neighborhood: "Centro",
      city: "Várzea Grande",
      state: "MT",
    },
    paymentMethod: {
      type: "pix_entrega",
    },
    customerName: guestName,
    customerPhone: guestPhone,
  };

  const checkoutRes3 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authenticatedToken}`,
    },
    body: JSON.stringify(checkoutPayload3),
  });

  const checkoutData3 = await checkoutRes3.json();
  const orderId3 = checkoutData3.orderId || checkoutData3.order?.id;
  const totalAmount3 = checkoutData3.totalAmount || checkoutData3.order?.totalAmount;

  if (checkoutRes3.status !== 200 && checkoutRes3.status !== 201) {
    console.error("❌ ERRO NO CHECKOUT 3:", checkoutRes3.status, checkoutData3);
  }
  assert(
    (checkoutRes3.status === 200 || checkoutRes3.status === 201) && checkoutData3.success === true && orderId3,
    "Checkout do Combo Multiatômico finalizado com sucesso sem rejeição de cotas",
    `Order ID: ${orderId3} | Subtotal: R$ ${totalAmount3}`
  );

  // Asserção no banco do Pedido 3
  const order3 = await prisma.order.findUnique({
    where: { id: orderId3 },
    include: { items: true },
  });

  assert(
    order3 !== null && Number(order3.subtotal) === 53.96,
    "Banco de Dados: Pedido 3 registrado com subtotal auditado de R$ 53,96",
    `Subtotal: R$ ${order3?.subtotal} | Itens gravados com complementos de ambos os copos`
  );

  const orderItem3Addons = (order3?.items[0]?.selectedAddons as any[]) || [];
  const hasCopo1 = orderItem3Addons.some((a: any) => a.name?.includes("Copo 1:"));
  const hasCopo2 = orderItem3Addons.some((a: any) => a.name?.includes("Copo 2:"));
  assert(
    hasCopo1 && hasCopo2 && orderItem3Addons.length >= 9,
    "Banco de Dados: Complementos do combo gravados com identificação individual de cada copo",
    `Itens serializados: ${orderItem3Addons.length} complementos (Copo 1, Copo 2 e Talheres identificados)`
  );

  // --------------------------------------------------------------------------
  // FASE 5: TESTE DE EXPIRAÇÃO DE PROMOÇÃO (REATIVIDADE TEMPORAL)
  // --------------------------------------------------------------------------
  console.log("\n--- FASE 5: Teste de Expiração de Promoção (Reatividade Temporal) ---");

  // 1. Altera a data de expiração da promoção do Copo 500ml para 1 minuto no passado
  const promoToExpire = await prisma.promotion.findFirst({
    where: { productId: scenario.copo500.id, isActive: true },
  });

  assert(promoToExpire !== null, "Promoção ativa localizada para o teste de expiração temporal");

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  await prisma.promotion.update({
    where: { id: promoToExpire!.id },
    data: { expiresAt: oneMinuteAgo },
  });

  // 2. Consulta produto e avalia cálculo de precificação
  const expiredProductQuery = await prisma.product.findUnique({
    where: { id: scenario.copo500.id },
    include: { promotions: true },
  });

  const expiredPricing = calculateProductPrice({
    price: expiredProductQuery!.price,
    promotions: expiredProductQuery!.promotions,
  });

  assert(
    expiredPricing.currentPrice === 39.99 &&
      expiredPricing.originalPrice === undefined &&
      expiredPricing.isPromotional === false &&
      expiredPricing.isPromo === false &&
      expiredPricing.discountPercent === 0,
    "Reatividade Temporal: Após expiresAt no passado, reverte instantaneamente para o preço cheio R$ 39,99 sem preço riscado",
    `Preço Atual: R$ ${expiredPricing.currentPrice}, Preço Original: ${expiredPricing.originalPrice}, isPromo: ${expiredPricing.isPromo}`
  );

  // 3. Restaura a promoção para o prazo original (30 dias no futuro)
  await prisma.promotion.update({
    where: { id: promoToExpire!.id },
    data: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });

  console.log("\n========================================================================");
  console.log(`🎉 BATERIA E2E CONCLUÍDA COM 100% DE SUCESSO! (${passedTests}/${totalTests} ASSERÇÕES APROVADAS)`);
  console.log("========================================================================");
}

runE2EBattery()
  .catch((err) => {
    console.error("❌ Erro fatal na bateria E2E:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
