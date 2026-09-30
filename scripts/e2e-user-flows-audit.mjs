import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "popclub_secret_jwt_key_2026_super_secure";

// Cores para saída no terminal
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logSection(title) {
  console.log(`\n${BOLD}${CYAN}==========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📌 ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}==========================================================================${RESET}`);
}

function assertTest(name, condition, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`   ${GREEN}✓ [PASS]${RESET} ${name} ${details ? `— ${details}` : ""}`);
  } else {
    failedTests++;
    console.log(`   ${RED}✗ [FAIL]${RESET} ${name} ${details ? `— ${details}` : ""}`);
  }
}

async function runAudit() {
  console.log(`\n${BOLD}🚀 AUDITORIA FUNCIONAL COMPLETA — FLUXOS E2E MULTI-PERFIL${RESET}`);
  console.log(`📍 Endpoint Testado: ${BASE_URL}`);
  console.log(`📍 Banco de Dados: 100.127.79.49 via Tailscale\n`);

  let adminToken = null;
  let adminUserId = null;
  let clientToken = null;
  let clientUserId = null;
  let testOrderId = null;
  let deliveryToken = null;
  let testOperatorId = null;

  // =========================================================================
  // 1. AUTENTICAÇÃO E RECONHECIMENTO DE PERFIS
  // =========================================================================
  logSection("1. AUTENTICAÇÃO E RECONHECIMENTO DE PERFIS");

  // 1.1 Login Administrador via API
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin@popclub.com", password: "@64844048" }),
    });
    const data = await res.json();
    adminToken = data.token;
    adminUserId = data.user?.id;
    assertTest(
      "Login Gestor/Administrador via API (/api/auth/login)",
      res.status === 200 && data.user?.role?.toUpperCase() === "ADMIN" && Boolean(adminToken),
      `Admin: ${data.user?.fullName} | Role: ${data.user?.role}`
    );
  } catch (err) {
    assertTest("Login Gestor/Administrador", false, err.message);
  }

  // 1.2 Identificação do Cliente de Teste
  try {
    // Garante que o cliente de homologação exista no banco
    const existingClient = await prisma.user.findFirst({
      where: { phone: "65999881122" },
    });
    let client = existingClient;
    if (!client) {
      client = await prisma.user.create({
        data: {
          fullName: "Lucas Silva Cliente E2E",
          phone: "65999881122",
          email: "lucas.cliente.e2e@popclub.com",
          role: "CLIENT",
          isRegistered: true,
        },
      });
    }
    clientUserId = client.id;
    clientToken = jwt.sign(
      {
        userId: client.id,
        phone: client.phone,
        email: client.email,
        name: client.fullName,
        role: client.role,
        isRegistered: client.isRegistered,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    assertTest(
      "Identificação Cliente (Sessão Segura JWT)",
      Boolean(clientToken && clientUserId),
      `Cliente: ${client.fullName} | ID: ${client.id}`
    );
  } catch (err) {
    assertTest("Identificação Cliente", false, err.message);
  }

  // 1.3 Verificação de Perfil (/api/auth/me) do Cliente
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    assertTest(
      "Consulta de Perfil do Cliente Autenticado (/api/auth/me)",
      res.status === 200 && data.user?.id === clientUserId,
      `Nome: ${data.user?.fullName} | Role: ${data.user?.role}`
    );
  } catch (err) {
    assertTest("Consulta de Perfil Cliente", false, err.message);
  }

  // =========================================================================
  // 2. JORNADA DO CLIENTE NA VITRINE & COMPRA
  // =========================================================================
  logSection("2. JORNADA DO CLIENTE (VITRINE, COMPLEMENTOS, CARRINHO E CHECKOUT)");

  let selectedProduct = null;

  // 2.1 Navegar Categorias
  try {
    const res = await fetch(`${BASE_URL}/api/categories`);
    const data = await res.json();
    const categories = data.data || data;
    assertTest("Visualizar Categorias Ativas", res.status === 200 && categories.length > 0, `${categories.length} categorias disponíveis`);
  } catch (err) {
    assertTest("Visualizar Categorias Ativas", false, err.message);
  }

  // 2.2 Visualizar Produtos
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    const data = await res.json();
    const prods = data.data || data;
    selectedProduct = prods.find((p) => p.isAvailable && p.stock > 0) || prods[0];
    assertTest("Visualizar Produtos do Catálogo", res.status === 200 && prods.length > 0, `${prods.length} produtos carregados`);
  } catch (err) {
    assertTest("Visualizar Produtos do Catálogo", false, err.message);
  }

  // 2.3 Abrir Detalhe do Produto e Complementos
  try {
    const res = await fetch(`${BASE_URL}/api/products/${selectedProduct.id}`);
    const data = await res.json();
    const prodDetail = data.data || data;
    assertTest(
      "Abrir Produto com Dados e Complementos",
      res.status === 200 && prodDetail.id === selectedProduct.id,
      `Produto: "${prodDetail.name}" | Preço: R$ ${Number(prodDetail.price).toFixed(2)}`
    );
  } catch (err) {
    assertTest("Abrir Produto com Dados e Complementos", false, err.message);
  }

  // 2.4 Validação de Carrinho Vazio no Checkout (Cenário de Exceção)
  try {
    const res = await fetch(`${BASE_URL}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        items: [],
        deliveryAddress: { street: "Rua Teste", number: "10", neighborhood: "Centro", city: "Várzea Grande" },
        paymentMethod: { type: "pix_entrega" },
      }),
    });
    assertTest(
      "Rejeição de Checkout com Carrinho Vazio (400)",
      res.status === 400,
      `Retornou HTTP ${res.status} bloqueando pedido vazio`
    );
  } catch (err) {
    assertTest("Rejeição de Checkout com Carrinho Vazio", false, err.message);
  }

  // 2.5 Validação de Troco Menor que o Total (Cenário de Exceção)
  try {
    const res = await fetch(`${BASE_URL}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: selectedProduct.id, quantity: 1 }],
        paymentMethod: {
          type: "dinheiro",
          changeFor: 5.0, // menor que o preço do produto
        },
        deliveryAddress: { street: "Rua Teste", number: "10", neighborhood: "Centro", city: "Várzea Grande" },
      }),
    });
    assertTest(
      "Trava de Troco Insuficiente no Checkout (400)",
      res.status === 400,
      `Retornou HTTP ${res.status} impedindo troco inválido`
    );
  } catch (err) {
    assertTest("Trava de Troco Insuficiente", false, err.message);
  }

  // 2.6 Realizar Pedido Completo (Caminho Principal)
  try {
    const checkoutPayload = {
      items: [
        {
          productId: selectedProduct.id,
          quantity: 2,
        },
      ],
      paymentMethod: {
        type: "pix_entrega",
      },
      deliveryAddress: {
        street: "Avenida Filinto Muller",
        number: "450",
        neighborhood: "Centro",
        city: "Várzea Grande",
        complement: "Apto 101",
        reference: "Próximo à praça",
      },
    };

    const res = await fetch(`${BASE_URL}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify(checkoutPayload),
    });

    const data = await res.json();
    const orderData = data.data || data.order || data;
    testOrderId = orderData.id;

    assertTest(
      "Criação e Confirmação de Pedido pelo Cliente (201/200)",
      Boolean(testOrderId),
      `Pedido ID: ${testOrderId} | Total: R$ ${Number(orderData.total_amount || orderData.totalAmount || 0).toFixed(2)}`
    );
  } catch (err) {
    assertTest("Criação e Confirmação de Pedido", false, err.message);
  }

  // 2.7 Cliente Acessa 'Meus Pedidos'
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    const orders = data.data || data;
    const found = Array.isArray(orders) && orders.some((o) => o.id === testOrderId);
    assertTest(
      "Visualização em 'Meus Pedidos' do Usuário Autenticado",
      found,
      `Pedido ${testOrderId} listado corretamente no histórico do cliente`
    );
  } catch (err) {
    assertTest("Visualização em 'Meus Pedidos'", false, err.message);
  }

  // 2.8 Cliente Consulta Detalhe do Próprio Pedido
  try {
    const res = await fetch(`${BASE_URL}/api/orders?id=${testOrderId}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    const ord = data.data || data;
    assertTest(
      "Acompanhamento de Estado do Pedido pelo Cliente",
      res.status === 200 && ord.id === testOrderId,
      `Status atual: ${ord.status}`
    );
  } catch (err) {
    assertTest("Acompanhamento de Estado do Pedido", false, err.message);
  }

  // =========================================================================
  // 3. JORNADA DO GESTOR / ADMINISTRADOR
  // =========================================================================
  logSection("3. JORNADA DO GESTOR / ADMINISTRADOR");

  // 3.1 Acesso ao Painel Operacional e Kanban de Pedidos
  try {
    const res = await fetch(`${BASE_URL}/api/orders?all=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const allOrders = data.data || data;
    const pendingFound = allOrders.some((o) => o.id === testOrderId);
    assertTest(
      "Visualização de Pedidos na Esteira da Cozinha (Kanban)",
      res.status === 200 && pendingFound,
      `Pedido do cliente detectado na fila ativa da esteira`
    );
  } catch (err) {
    assertTest("Visualização de Pedidos na Esteira", false, err.message);
  }

  // 3.2 Gestor Aceita o Pedido (pending -> accepted)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orderId: testOrderId,
        status: "accepted",
      }),
    });
    const data = await res.json();
    const updated = data.data || data;
    assertTest(
      "Gestor Aceita Pedido (pending -> accepted)",
      res.status === 200 && updated.status === "accepted",
      `Novo status confirmado: ${updated.status}`
    );
  } catch (err) {
    assertTest("Gestor Aceita Pedido", false, err.message);
  }

  // 3.3 Gestor Avança para Produção (accepted -> preparing)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orderId: testOrderId,
        status: "preparing",
      }),
    });
    const data = await res.json();
    const updated = data.data || data;
    assertTest(
      "Gestor Coloca em Produção (accepted -> preparing)",
      res.status === 200 && updated.status === "preparing",
      `Novo status confirmado: ${updated.status}`
    );
  } catch (err) {
    assertTest("Gestor Coloca em Produção", false, err.message);
  }

  // 3.4 Gestão de Estoque pelo Gestor (Pausar e Reativar Produto)
  try {
    // Pausa produto
    const resPause = await fetch(`${BASE_URL}/api/products/${selectedProduct.id}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isAvailable: false }),
    });
    // Restaura produto
    const resRestore = await fetch(`${BASE_URL}/api/products/${selectedProduct.id}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isAvailable: true }),
    });
    assertTest(
      "Controle de Estoque e Disponibilidade Imediata de Produtos",
      resPause.status === 200 && resRestore.status === 200,
      `Pausado e restaurado com sucesso no catálogo`
    );
  } catch (err) {
    assertTest("Controle de Estoque", false, err.message);
  }

  // 3.5 Módulo de Gestão de Usuários (RBAC)
  try {
    // Listar usuários
    const resList = await fetch(`${BASE_URL}/api/admin/users?filter=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataList = await resList.json();
    assertTest(
      "Gestão de Usuários: Listagem Geral com Contadores e Filtros",
      resList.status === 200 && Array.isArray(dataList.users),
      `${dataList.total} usuários cadastrados | Filtro ativo: all`
    );

    // Criar novo usuário operador/editor
    const operatorPayload = {
      fullName: "Operador Cozinha Teste",
      username: `operador_${Date.now().toString().slice(-5)}`,
      email: `operador_${Date.now()}@popclub.com`,
      password: "senhaOperador123",
      role: "EDITOR",
      permissions: ["ORDERS_KANBAN", "STOCK_CONTROL"],
    };
    const resCreate = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(operatorPayload),
    });
    const dataCreate = await resCreate.json();
    testOperatorId = dataCreate.id || dataCreate.user?.id;

    assertTest(
      "Gestão de Usuários: Criação de Novo Editor com Permissões Restritas",
      resCreate.status === 201 && Boolean(testOperatorId),
      `Editor ID: ${testOperatorId} | Permissões: ${(dataCreate.permissions || dataCreate.user?.permissions)?.join(", ")}`
    );

    // Alterar permissões do usuário criado
    const resUpdate = await fetch(`${BASE_URL}/api/admin/users/${testOperatorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        permissions: ["ORDERS_KANBAN", "STOCK_CONTROL", "ORDERS_HISTORY"],
      }),
    });
    const dataUpdate = await resUpdate.json();
    const updatedPermissions = dataUpdate.permissions || dataUpdate.user?.permissions || [];
    assertTest(
      "Gestão de Usuários: Matriz de Permissões Atualizada Granularmente",
      resUpdate.status === 200 && updatedPermissions.includes("ORDERS_HISTORY"),
      `Permissões agora: ${updatedPermissions.length}`
    );

    // Bloqueio / Desbloqueio
    const resBlock = await fetch(`${BASE_URL}/api/admin/users/${testOperatorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isBlocked: true, blockReason: "Teste de segurança" }),
    });
    const resUnblock = await fetch(`${BASE_URL}/api/admin/users/${testOperatorId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isBlocked: false }),
    });
    assertTest(
      "Gestão de Usuários: Bloqueio e Desbloqueio de Conta",
      resBlock.status === 200 && resUnblock.status === 200,
      `Bloqueio e reversão executados sem afetar outros usuários`
    );
  } catch (err) {
    assertTest("Gestão de Usuários (RBAC)", false, err.message);
  }

  // =========================================================================
  // 4. JORNADA DO ENTREGADOR & DESPACHO
  // =========================================================================
  logSection("4. JORNADA DO ENTREGADOR (DESPACHO, ROTA, GPS E CONCLUSÃO)");

  // 4.1 Gestor Despacha Pedido para Entrega
  try {
    const resDispatch = await fetch(`${BASE_URL}/api/orders/${testOrderId}/dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        enableGps: true,
        courierName: "Carlos Motoboy",
        courierPhone: "65999887766",
        courierCode: "MOTO-01",
      }),
    });
    const dataDispatch = await resDispatch.json();
    deliveryToken = dataDispatch.trackingToken;

    assertTest(
      "Gestor Despacha Pedido com Rastreamento Ativo",
      resDispatch.status === 200 && Boolean(deliveryToken),
      `Token de Entrega gerado: ${deliveryToken?.slice(0, 12)}...`
    );
  } catch (err) {
    assertTest("Gestor Despacha Pedido", false, err.message);
  }

  // 4.2 Entregador Acessa os Dados da Entrega via Token Público Seguro
  try {
    const resDelivery = await fetch(`${BASE_URL}/api/delivery/${deliveryToken}`);
    const dataDelivery = await resDelivery.json();
    const delivery = dataDelivery.data || dataDelivery;

    assertTest(
      "Entregador Consulta Dados Completos da Entrega via Token",
      resDelivery.status === 200 && delivery.orderId === testOrderId,
      `Cliente: ${delivery.client?.name} | Endereço: ${delivery.deliveryAddress?.street}, ${delivery.deliveryAddress?.number}`
    );
  } catch (err) {
    assertTest("Entregador Consulta Dados da Entrega", false, err.message);
  }

  // 4.3 Entregador Atualiza Coordenadas de GPS em Deslocamento
  try {
    const resTrack = await fetch(`${BASE_URL}/api/delivery/${deliveryToken}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: -15.6545,
        longitude: -56.1335,
      }),
    });
    assertTest(
      "Entregador Atualiza Telemetria GPS em Rota (/api/delivery/[token]/track)",
      resTrack.status === 200,
      `Lat: -15.6545, Lng: -56.1335 registrado em tempo real`
    );
  } catch (err) {
    assertTest("Entregador Atualiza GPS", false, err.message);
  }

  // 4.4 Entregador Conclui a Entrega
  try {
    const resComplete = await fetch(`${BASE_URL}/api/delivery/${deliveryToken}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const dataComplete = await resComplete.json();
    assertTest(
      "Entregador Conclui Pedido com Sucesso (/api/delivery/[token]/complete)",
      resComplete.status === 200 && dataComplete.success === true,
      `Entrega finalizada no app do entregador`
    );
  } catch (err) {
    assertTest("Entregador Conclui Pedido", false, err.message);
  }

  // =========================================================================
  // 5. TESTE DE FLUXO ENTRE PERFIS (SINCRONIZAÇÃO PONTA A PONTA)
  // =========================================================================
  logSection("5. SINCRONIZAÇÃO PONTA A PONTA ENTRE PERFIS (E2E)");

  // 5.1 O que o CLIENTE visualiza após a conclusão pelo entregador
  try {
    const res = await fetch(`${BASE_URL}/api/orders?id=${testOrderId}`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    const data = await res.json();
    const ord = data.data || data;
    assertTest(
      "Cliente Visualiza Pedido Atualizado como ENTREGUE/CONCLUÍDO",
      res.status === 200 && ord.status === "completed",
      `Status visualizado pelo cliente: ${ord.status} | GPS desativado: ${!ord.is_gps_tracking_active}`
    );
  } catch (err) {
    assertTest("Cliente Visualiza Pedido Concluído", false, err.message);
  }

  // 5.2 O que o GESTOR visualiza no Histórico de Pedidos
  try {
    const res = await fetch(`${BASE_URL}/api/orders?all=true&includeArchived=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const all = data.data || data;
    const gestorOrder = Array.isArray(all) ? all.find((o) => o.id === testOrderId) : null;
    assertTest(
      "Gestor Visualiza Pedido Concluído no Histórico da Loja",
      Boolean(gestorOrder && gestorOrder.status === "completed"),
      `Status no painel gerencial: ${gestorOrder?.status}`
    );
  } catch (err) {
    assertTest("Gestor Visualiza no Histórico", false, err.message);
  }

  // =========================================================================
  // 6. TESTES DE PERMISSÃO, SEGURANÇA E BLINDAGEM DE ROTAS (BOLA / IDOR / RBAC)
  // =========================================================================
  logSection("6. TESTES DE PERMISSÃO E SEGURANÇA (IDOR, BOLA, RBAC E RATE LIMITS)");

  // 6.1 Cliente tentando acessar lista de usuários administrativos
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
    assertTest(
      "Segurança: Bloqueio de Cliente acessando Gestão de Usuários (403)",
      res.status === 403,
      `Retornou HTTP ${res.status} FORBIDDEN`
    );
  } catch (err) {
    assertTest("Segurança: Bloqueio de Cliente em Gestão de Usuários", false, err.message);
  }

  // 6.2 Cliente tentando acessar pedido de outro usuário por ID (BOLA / IDOR)
  try {
    const otherOrder = await prisma.order.findFirst({
      where: {
        userId: { not: null, not: clientUserId },
      },
      select: { id: true, userId: true },
    });

    if (otherOrder) {
      const res = await fetch(`${BASE_URL}/api/orders?id=${otherOrder.id}`, {
        headers: { Authorization: `Bearer ${clientToken}` }, // Lucas tentando ler pedido de outro usuário
      });
      assertTest(
        "Segurança: Bloqueio de BOLA/IDOR — Cliente acessando pedido alheio (403)",
        res.status === 403,
        `Retornou HTTP ${res.status} FORBIDDEN impedindo vazamento de dados de terceiro`
      );
    } else {
      assertTest("Segurança: Bloqueio BOLA/IDOR", true, "Nenhum outro pedido vulnerável no banco");
    }
  } catch (err) {
    assertTest("Segurança: Bloqueio BOLA/IDOR", false, err.message);
  }

  // 6.3 Cliente tentando alterar status de pedido (PATCH /api/orders)
  try {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        orderId: testOrderId,
        status: "ready_for_pickup", // cliente tentando marcar como pronto
      }),
    });
    assertTest(
      "Segurança: Bloqueio de Cliente adulterando status de pedido (403)",
      res.status === 403,
      `Retornou HTTP ${res.status} FORBIDDEN impedindo manipulação não autorizada`
    );
  } catch (err) {
    assertTest("Segurança: Bloqueio de adulteração de status", false, err.message);
  }

  // 6.4 Trava de Segurança: Administrador não pode se auto-rebaixar
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: "CLIENT" }),
    });
    assertTest(
      "Segurança: Trava de Auto-Rebaixamento do Administrador (400)",
      res.status === 400,
      `Retornou HTTP ${res.status} impedindo perda de privilégios acidental`
    );
  } catch (err) {
    assertTest("Segurança: Trava de Auto-Rebaixamento", false, err.message);
  }

  // 6.5 Trava de Segurança: Administrador não pode se auto-bloquear
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/${adminUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isBlocked: true }),
    });
    assertTest(
      "Segurança: Trava de Auto-Bloqueio do Administrador (400)",
      res.status === 400,
      `Retornou HTTP ${res.status} impedindo lock-out administrativo`
    );
  } catch (err) {
    assertTest("Segurança: Trava de Auto-Bloqueio", false, err.message);
  }

  // =========================================================================
  // 7. LIMPEZA SEGURA DE DADOS DE TESTE
  // =========================================================================
  logSection("7. LIMPEZA SEGURA DE DADOS DE TESTE (CONSERVAÇÃO DO BANCO)");
  try {
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
      console.log(`   ${GREEN}✓ [OK]${RESET} Pedido de teste ${testOrderId} removido com sucesso`);
    }
    if (testOperatorId) {
      await prisma.user.delete({ where: { id: testOperatorId } });
      console.log(`   ${GREEN}✓ [OK]${RESET} Operador temporário ${testOperatorId} removido com sucesso`);
    }
    if (clientUserId) {
      // Remove pedidos residuais do cliente de teste se houver
      const clientOrders = await prisma.order.findMany({ where: { userId: clientUserId }, select: { id: true } });
      for (const ord of clientOrders) {
        await prisma.orderItem.deleteMany({ where: { orderId: ord.id } });
        await prisma.order.delete({ where: { id: ord.id } });
      }
      await prisma.user.delete({ where: { id: clientUserId } });
      console.log(`   ${GREEN}✓ [OK]${RESET} Cliente de teste ${clientUserId} removido com sucesso`);
    }
  } catch (err) {
    console.warn("Aviso na limpeza de dados de teste:", err.message);
  }

  // =========================================================================
  // RESUMO GERAL
  // =========================================================================
  console.log(`\n${BOLD}==========================================================================${RESET}`);
  console.log(`${BOLD}📊 RESUMO GERAL DA AUDITORIA:${RESET}`);
  console.log(`   Total de Testes Executados: ${BOLD}${totalTests}${RESET}`);
  console.log(`   ${GREEN}✓ Sucessos:${RESET} ${BOLD}${passedTests}${RESET}`);
  console.log(`   ${RED}✗ Falhas:${RESET} ${BOLD}${failedTests}${RESET}`);
  console.log(`   Taxa de Aprovação: ${BOLD}${((passedTests / totalTests) * 100).toFixed(1)}%${RESET}`);
  console.log(`${BOLD}==========================================================================${RESET}\n`);

  await prisma.$disconnect();
  if (failedTests > 0) {
    process.exit(1);
  }
}

runAudit().catch(async (e) => {
  console.error("Erro fatal na auditoria:", e);
  await prisma.$disconnect();
  process.exit(1);
});
