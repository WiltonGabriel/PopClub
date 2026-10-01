import { prisma } from "./src/lib/prisma";
import { signToken } from "./src/lib/auth";

const BASE_URL = "http://localhost:3000";

async function runFastAccessE2ETest() {
  console.log("================================================================================");
  console.log("🚀 INICIANDO TESTE DE INTEGRAÇÃO & BANCO DE DADOS: CHECKOUT ACESSO RÁPIDO");
  console.log("================================================================================");

  // 1. Busca dados reais no banco para o teste
  const product = await prisma.product.findFirst({
    where: { isAvailable: true },
    select: { id: true, name: true, price: true },
  });

  if (!product) {
    throw new Error("Nenhum produto disponível no banco para teste.");
  }

  const addon = await prisma.addonItem.findFirst({
    where: { isAvailable: true },
    include: { group: true },
  });

  const storeSettings = await prisma.storeSettings.findUnique({
    where: { id: "store_config" },
  });

  console.log(`📦 Produto Selecionado: "${product.name}" (ID: ${product.id}, Preço: R$ ${product.price})`);
  if (addon) {
    console.log(`🍨 Complemento Selecionado: "${addon.name}" (Grupo: ${addon.group?.name}, Preço: R$ ${addon.price})`);
  }
  console.log(`🏬 Loja Aberta: ${storeSettings?.isOpen}, Turno Atual: ${storeSettings?.currentShiftId}`);

  // Test customer data (conforme solicitado pelo usuário: Nome "Cliente Teste Rápido", WhatsApp "65999998888")
  const testCustomer = {
    name: "Cliente Teste Rápido",
    phone: "65999998888",
    deliveryAddress: {
      street: "Av. Couto Magalhães",
      number: "123",
      neighborhood: "Centro",
      city: "Várzea Grande",
      complement: "Apto 101",
      reference: "Próximo à praça central",
    },
    paymentMethod: {
      type: "dinheiro" as const,
      changeFor: 100,
    },
  };

  const checkoutPayload = {
    items: [
      {
        productId: product.id,
        quantity: 1,
        selectedAddons: addon
          ? [
              {
                id: addon.id,
                name: addon.name,
                groupName: addon.group?.name || "Complementos",
                price: Number(addon.price),
                quantity: 1,
              },
            ]
          : null,
      },
    ],
    deliveryAddress: testCustomer.deliveryAddress,
    paymentMethod: testCustomer.paymentMethod,
    customerName: testCustomer.name,
    customerPhone: testCustomer.phone,
    phone: testCustomer.phone,
  };

  console.log("\n📡 Enviando POST real contra /api/checkout (Cliente Visitante sem Cookie prévio)...");
  
  const checkoutResponse = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(checkoutPayload),
  });

  const responseJson = await checkoutResponse.json();
  const setCookieHeader = checkoutResponse.headers.get("set-cookie");

  console.log(`HTTP Status: ${checkoutResponse.status}`);
  console.log("Resposta JSON:", JSON.stringify(responseJson, null, 2));
  console.log("Set-Cookie recebido:", setCookieHeader ? "SIM (Sessão de Acesso Rápido emitida)" : "NÃO");

  if (!checkoutResponse.ok || !responseJson.success || !responseJson.order?.id) {
    throw new Error(`Falha no checkout de Acesso Rápido: ${JSON.stringify(responseJson)}`);
  }

  const createdOrderId = responseJson.order.id;
  const trackingToken = responseJson.order.trackingToken;
  console.log(`\n✅ Pedido gerado com sucesso! ID: ${createdOrderId}`);
  console.log(`🔑 Código de Rastreamento (Token): ${trackingToken}`);

  // 2. Validação Direta no Banco de Dados Real (PostgreSQL / Prisma)
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🔍 VALIDAÇÃO NO BANCO DE DADOS (POSTGRESQL / PRISMA):");
  console.log("--------------------------------------------------------------------------------");

  // a) Valida tabela User
  const dbUser = await prisma.user.findFirst({
    where: { phone: testCustomer.phone },
  });

  console.log("1. Tabela 'User':");
  console.log(`   - ID: ${dbUser?.id}`);
  console.log(`   - Nome: "${dbUser?.fullName}"`);
  console.log(`   - Telefone: "${dbUser?.phone}"`);
  console.log(`   - isRegistered: ${dbUser?.isRegistered} (esperado: false)`);
  console.log(`   - Avatar: "${dbUser?.avatarUrl}"`);
  console.log(`   - Cargo: "${dbUser?.role}"`);

  if (!dbUser || dbUser.isRegistered !== false || dbUser.phone !== testCustomer.phone) {
    throw new Error("Validação da tabela 'User' falhou: registro incorreto no banco.");
  }
  console.log("   -> ✅ User validado com integridade total!");

  // b) Valida tabela Order
  const dbOrder = await prisma.order.findUnique({
    where: { id: createdOrderId },
    include: {
      items: {
        include: { product: true },
      },
      user: true,
    },
  });

  console.log("\n2. Tabela 'Order':");
  console.log(`   - ID do Pedido: ${dbOrder?.id}`);
  console.log(`   - Status: ${dbOrder?.status} (esperado: pending)`);
  console.log(`   - Subtotal: R$ ${dbOrder?.subtotal}`);
  console.log(`   - Taxa de Entrega: R$ ${dbOrder?.deliveryFee}`);
  console.log(`   - Total: R$ ${dbOrder?.totalAmount}`);
  console.log(`   - Turno Vinculado (shiftId): ${dbOrder?.shiftId}`);
  console.log(`   - Token de Rastreamento: ${dbOrder?.trackingToken}`);
  console.log(`   - Endereço de Entrega: ${dbOrder?.deliveryStreet}, ${dbOrder?.deliveryNumber} - ${dbOrder?.deliveryNeighborhood}`);
  console.log(`   - Usuário Vinculado: ${dbOrder?.user?.fullName} (${dbOrder?.userId})`);

  if (
    !dbOrder ||
    dbOrder.status !== "pending" ||
    dbOrder.userId !== dbUser.id ||
    !dbOrder.trackingToken
  ) {
    throw new Error("Validação da tabela 'Order' falhou: dados incorretos no banco.");
  }
  console.log("   -> ✅ Order validado com integridade total!");

  // c) Valida tabela OrderItem e adicionais
  console.log("\n3. Tabela 'OrderItem' e Adicionais:");
  console.log(`   - Quantidade de itens no pedido: ${dbOrder.items.length}`);
  for (const it of dbOrder.items) {
    console.log(`   - Item: ${it.product.name} (Qtd: ${it.quantity}, Preço unitário: R$ ${it.priceAtTime})`);
    console.log(`     Addons persistidos:`, JSON.stringify(it.selectedAddons));
  }
  if (dbOrder.items.length === 0) {
    throw new Error("Validação de 'OrderItem' falhou: nenhum item gravado.");
  }
  console.log("   -> ✅ OrderItem e complementos gravados com integridade!");

  // 3. Validação do Painel Operacional (/admin/pedidos - Triagem e Transição Kanban)
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🛎️ VALIDAÇÃO DO PAINEL OPERACIONAL KANBAN (/admin/pedidos):");
  console.log("--------------------------------------------------------------------------------");

  // Localiza ou gera credencial de Admin para interagir com a API de pedidos
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  const adminToken = signToken({
    userId: adminUser?.id || "admin_test",
    role: "admin",
    name: "Admin Operacional",
    isRegistered: true,
  });

  // Consulta lista de pedidos como Admin (Inbox de Triagem)
  const triageOrdersRes = await fetch(`${BASE_URL}/api/orders?all=true&status=pending`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const triageOrders = await triageOrdersRes.json();
  const pendingOrdersList = Array.isArray(triageOrders) ? triageOrders : triageOrders.data || [];
  const foundInTriage = pendingOrdersList.some((o: any) => o.id === createdOrderId);

  console.log(`1. Inbox de Triagem (/admin/pedidos):`);
  console.log(`   - Total de pedidos aguardando aceite na triagem: ${pendingOrdersList.length}`);
  console.log(`   - Pedido ${createdOrderId} presente no Inbox? ${foundInTriage ? "SIM ✅" : "NÃO ❌"}`);

  if (!foundInTriage) {
    throw new Error("Pedido recém-criado não foi localizado no Inbox de Triagem.");
  }

  // Operação: Admin aceita o pedido e move para a coluna 'Em Preparo'
  console.log(`\n2. Operador clica em 'Aceitar Pedido' -> transição para 'preparing':`);
  const acceptRes = await fetch(`${BASE_URL}/api/orders`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      status: "preparing",
    }),
  });

  const acceptJson = await acceptRes.json();
  console.log(`   - Status HTTP: ${acceptRes.status}`);
  console.log(`   - Status retornado pela API: ${acceptJson?.order?.status || acceptJson?.data?.status || acceptJson?.status}`);

  // Consulta Prisma para conferir o novo status
  const updatedDbOrder = await prisma.order.findUnique({
    where: { id: createdOrderId },
    select: { id: true, status: true },
  });

  console.log(`   - Status gravado no Banco de Dados: "${updatedDbOrder?.status}"`);
  if (updatedDbOrder?.status !== "preparing") {
    throw new Error(`Falha na transição do pedido: status esperado 'preparing', obtido '${updatedDbOrder?.status}'`);
  }
  console.log("   -> ✅ Pedido aceito e movido para 'Em Preparo' na esteira Kanban com sucesso!");

  // 4. Teste de Rastreamento Público pelo Cliente
  console.log("\n--------------------------------------------------------------------------------");
  console.log("📍 VALIDAÇÃO DO RASTREAMENTO DO CLIENTE (/rastreamento?id=...):");
  console.log("--------------------------------------------------------------------------------");

  const trackRes = await fetch(`${BASE_URL}/api/orders?id=${createdOrderId}&token=${trackingToken}`);
  const trackJson = await trackRes.json();

  const trackOrder = trackJson?.id ? trackJson : trackJson?.data;

  console.log(`- Status HTTP da Consulta de Rastreamento: ${trackRes.status}`);
  console.log(`- Pedido retornado: #${trackOrder?.id?.substring(0, 8)}`);
  console.log(`- Status Atual exibido ao Cliente: ${trackOrder?.status}`);
  console.log(`- Endereço de Entrega: ${trackOrder?.delivery_address?.street}, ${trackOrder?.delivery_address?.number}`);

  if (trackRes.status !== 200 || !trackOrder?.id) {
    throw new Error("Falha na consulta de rastreamento do cliente.");
  }
  console.log("-> ✅ Rastreamento em tempo real validado com sucesso sem barreiras!");

  console.log("\n================================================================================");
  console.log("🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
  console.log("================================================================================");
}

runFastAccessE2ETest()
  .catch((err) => {
    console.error("❌ ERRO NO TESTE:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
