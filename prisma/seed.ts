import { PrismaClient, OrderStatus, PaymentMethodType, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Lista de bairros e ruas realistas de Cuiabá e Várzea Grande / MT
const MT_ADDRESSES = [
  { street: "Av. Couto Magalhães", number: "1420", neighborhood: "Centro", city: "Várzea Grande", zip: "78110-000" },
  { street: "Av. Filinto Müller", number: "850", neighborhood: "Centro Sul", city: "Várzea Grande", zip: "78110-300" },
  { street: "Av. Alzira Santana", number: "1200", neighborhood: "Água Limpa", city: "Várzea Grande", zip: "78125-000" },
  { street: "Av. Isaac Póvoas", number: "1250", neighborhood: "Goiabeiras", city: "Cuiabá", zip: "78045-000" },
  { street: "Rua Cândido Mariano", number: "480", neighborhood: "Centro Norte", city: "Cuiabá", zip: "78005-150" },
  { street: "Av. Senador Metello", number: "920", neighborhood: "Porto", city: "Cuiabá", zip: "78025-100" },
  { street: "Rua das Amendoeiras", number: "310", neighborhood: "Bosque da Saúde", city: "Cuiabá", zip: "78050-020" },
  { street: "Av. Miguel Sutil", number: "4500", neighborhood: "Santa Rosa", city: "Cuiabá", zip: "78040-000" },
  { street: "Rua Buenos Aires", number: "215", neighborhood: "Jardim das Américas", city: "Cuiabá", zip: "78060-600" },
  { street: "Av. Historiador Rubens de Mendonça", number: "2100", neighborhood: "Bosque da Saúde", city: "Cuiabá", zip: "78050-000" },
];

const CLIENT_PROFILES = [
  { name: "Lucas Gabriel Oliveira", email: "lucas.oliveira@gmail.com", phone: "(65) 99234-1122" },
  { name: "Camila Fernandes Santos", email: "camila.santos@outlook.com", phone: "(65) 98412-3344" },
  { name: "Rodrigo Albuquerque Neto", email: "rodrigo.neto@gmail.com", phone: "(65) 99988-7766" },
  { name: "Mariana Costa e Silva", email: "mariana.costa@hotmail.com", phone: "(65) 99655-4433" },
  { name: "Felipe Augusto Martins", email: "felipe.martins@gmail.com", phone: "(65) 98123-9988" },
  { name: "Beatriz Lima Pimentel", email: "beatriz.lima@yahoo.com.br", phone: "(65) 99344-1155" },
  { name: "Gabriel Zanin Souza", email: "gabriel.souza@gmail.com", phone: "(65) 98455-6677" },
  { name: "Larissa Ferreira Dias", email: "larissa.dias@gmail.com", phone: "(65) 99722-3311" },
  { name: "Rafael Vinicius Silva", email: "rafael.silva@gmail.com", phone: "(65) 99188-4422" },
  { name: "Amanda Rocha Albuquerque", email: "amanda.rocha@gmail.com", phone: "(65) 99200-3388" },
];

async function main() {
  console.log("🍧 [Pop Shake] Iniciando limpeza cirúrgica e semeadura oficial...");

  // ── 1. EXPURGO DE DADOS ANTIGOS E CORROMPIDOS (XSS / DUMMY)
  console.log("🧹 1/7: Purgando pedidos, notificações e itens corrompidos...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productAddonGroup.deleteMany();
  await prisma.productAddonCategory.deleteMany();
  await prisma.productAddon.deleteMany();
  await prisma.addonItem.deleteMany();
  await prisma.addonGroup.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.cardBadge.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { not: "admin@popclub.com" } },
  });

  // ── 2. USUÁRIO ADMINISTRADOR PRINCIPAL
  console.log("👤 2/7: Assegurando administrador oficial...");
  const adminPasswordHash = await bcrypt.hash("@64844048", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@popclub.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "admin",
      username: "admin",
      fullName: "Administrador Pop Shake",
    },
    create: {
      email: "admin@popclub.com",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "admin",
      fullName: "Administrador Pop Shake",
    },
  });
  console.log(`✅ Admin configurado: ${admin.email}`);

  // ── 3. CONFIGURAÇÕES DA LOJA E HORÁRIOS DE ATENDIMENTO
  console.log("⚙️ 3/7: Gravando configurações da loja...");
  const defaultBusinessHours = [
    { day: "monday", label: "Segunda-feira", isOpen: true, openTime: "13:00", closeTime: "23:00" },
    { day: "tuesday", label: "Terça-feira", isOpen: true, openTime: "13:00", closeTime: "23:00" },
    { day: "wednesday", label: "Quarta-feira", isOpen: true, openTime: "13:00", closeTime: "23:00" },
    { day: "thursday", label: "Quinta-feira", isOpen: true, openTime: "13:00", closeTime: "23:00" },
    { day: "friday", label: "Sexta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "saturday", label: "Sábado", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "sunday", label: "Domingo", isOpen: true, openTime: "13:00", closeTime: "23:00" },
  ];

  await prisma.storeSettings.upsert({
    where: { id: "store_config" },
    update: {
      deliveryFee: 5.0,
      freeDeliveryThreshold: 60.0,
      maxDeliveryRadiusKm: 12.0,
      whatsappNumber: "5565992345678",
      whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre meu pedido na Pop Shake Sorveteria.",
      isOpen: true,
      storeLatitude: -15.6536,
      storeLongitude: -56.1322,
      storeAddress: "Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT",
      businessHours: defaultBusinessHours as unknown as Prisma.InputJsonValue,
      instagramUrl: "https://instagram.com/popshakevg",
      supportPhone: "(65) 99234-5678",
      postSaleMessage: "Obrigado por pedir na Pop Shake! O que achou do seu açaí? Seu feedback é muito importante!",
      supportMessage: "Olá! Nossa equipe está à disposição para ajudar com seu pedido.",
    },
    create: {
      id: "store_config",
      deliveryFee: 5.0,
      freeDeliveryThreshold: 60.0,
      maxDeliveryRadiusKm: 12.0,
      whatsappNumber: "5565992345678",
      whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre meu pedido na Pop Shake Sorveteria.",
      isOpen: true,
      storeLatitude: -15.6536,
      storeLongitude: -56.1322,
      storeAddress: "Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT",
      businessHours: defaultBusinessHours as unknown as Prisma.InputJsonValue,
      instagramUrl: "https://instagram.com/popshakevg",
      supportPhone: "(65) 99234-5678",
      postSaleMessage: "Obrigado por pedir na Pop Shake! O que achou do seu açaí? Seu feedback é muito importante!",
      supportMessage: "Olá! Nossa equipe está à disposição para ajudar com seu pedido.",
    },
  });

  // Highlight Banner
  await prisma.highlightBanner.upsert({
    where: { id: "home_highlight" },
    update: {
      icon: "🥣",
      title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
      subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos selecionados à sua escolha.",
      badge: "Refrescância Artesanal",
    },
    create: {
      id: "home_highlight",
      icon: "🥣",
      title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
      subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos selecionados à sua escolha.",
      badge: "Refrescância Artesanal",
    },
  });

  // ── 4. CATEGORIAS BASE DO CARDÁPIO
  console.log("📂 4/7: Criando 4 categorias base...");
  const catAcai = await prisma.category.create({
    data: { name: "Açaí Tradicional & Copos", slug: "acai-tradicional-copos" },
  });
  const catShakes = await prisma.category.create({
    data: { name: "Shakes & Vitaminas", slug: "shakes-vitaminas" },
  });
  const catSorvetes = await prisma.category.create({
    data: { name: "Sorvetes Artesanais", slug: "sorvetes-artesanais" },
  });
  const catCombos = await prisma.category.create({
    data: { name: "Combos & Barcas", slug: "combos-barcas" },
  });

  // ── 5. GRUPOS GLOBAIS DE COMPLEMENTOS (AddonGroup + AddonItem)
  console.log("🍧 5/7: Cadastrando Grupos Globais de Complementos com regras oficiais...");

  // Grupo 1: "Ponto da Base" (Obrigatório, min=1, max=1, free=1)
  const groupBase = await prisma.addonGroup.create({
    data: {
      name: "Ponto da Base",
      description: "Escolha a base perfeita para o seu copo (1 opção obrigatória)",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 1,
      isRequired: true,
      sortOrder: 1,
      isActive: true,
      items: {
        create: [
          {
            name: "Açaí Tradicional Batido",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 1,
          },
          {
            name: "Açaí Zero Açúcar",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 2,
          },
          {
            name: "Creme de Cupuaçu Puro",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 3,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Grupo 2: "Frutas Frescas" (Incluso, min=0, max=3, free=3)
  const groupFrutas = await prisma.addonGroup.create({
    data: {
      name: "Frutas Frescas",
      description: "Selecione até 3 opções de frutas frescas inclusas",
      minQuantity: 0,
      maxQuantity: 3,
      freeQuantity: 3,
      isRequired: false,
      sortOrder: 2,
      isActive: true,
      items: {
        create: [
          {
            name: "Banana Fatiada",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 1,
          },
          {
            name: "Morango Fresco",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 2,
          },
          {
            name: "Kiwi Picado",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 3,
          },
          {
            name: "Manga em Cubos",
            price: 0.0,
            imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 4,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Grupo 3: "Turbine seu Copo" (Cobrado à Parte, min=0, max=5, free=0)
  const groupTurbine = await prisma.addonGroup.create({
    data: {
      name: "Turbine seu Copo",
      description: "Adicionais especiais e coberturas crocantes",
      minQuantity: 0,
      maxQuantity: 5,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 3,
      isActive: true,
      items: {
        create: [
          {
            name: "Nutella Original",
            price: 4.5,
            imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 1,
          },
          {
            name: "Leite em Pó Ninho",
            price: 2.0,
            imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 2,
          },
          {
            name: "Paçoca Rolha",
            price: 1.5,
            imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 3,
          },
          {
            name: "Leite Condensado",
            price: 1.5,
            imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 4,
          },
          {
            name: "Granola Tradicional",
            price: 1.0,
            imageUrl: "https://images.unsplash.com/photo-1517093707567-27928cb9e57d?auto=format&fit=crop&w=160&q=80",
            isAvailable: true,
            sortOrder: 5,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Selos visuais
  const badgeMaisPedido = await prisma.cardBadge.create({
    data: { text: "Mais Pedido", icon: "🔥", bgColor: "#FEE2E2", textColor: "#DC2626" },
  });
  const badgeDestaque = await prisma.cardBadge.create({
    data: { text: "Destaque", icon: "⭐", bgColor: "#FEF3C7", textColor: "#B45309" },
  });
  const badgeNovo = await prisma.cardBadge.create({
    data: { text: "Novo", icon: "✨", bgColor: "#F3E8FF", textColor: "#7E22CE" },
  });

  // ── 6. PRODUTOS REAIS
  console.log("📦 6/7: Cadastrando produtos reais e vinculando complementos...");
  const rawProducts = [
    // Açaí Tradicional & Copos
    {
      name: "Copo 300ml Tradicional",
      description: "Açaí cremoso batido na hora no copo de 300ml. Perfeito para uma pausa refrescante com seus acompanhamentos prediletos.",
      price: 16.5,
      categoryId: catAcai.id,
      category: catAcai.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: null,
    },
    {
      name: "Copo 500ml Tradicional",
      description: "Nosso copo campeão de vendas! 500ml de açaí artesanal batido na hora, montado com até 3 frutas frescas e seus adicionais favoritos.",
      price: 21.0,
      categoryId: catAcai.id,
      category: catAcai.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: badgeMaisPedido.id,
    },
    {
      name: "Copo 700ml Tradicional",
      description: "Para os verdadeiros amantes de açaí: copo gigante de 700ml, farto e super consistente. Escolha sua base e monte com fartura.",
      price: 26.0,
      categoryId: catAcai.id,
      category: catAcai.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: badgeDestaque.id,
    },
    {
      name: "Açaí Trufado Especial 400ml",
      description: "Copo de 400ml com borda trufada em creme de avelã e leite ninho, intercalado com açaí cremoso e frutas selecionadas.",
      price: 24.0,
      categoryId: catAcai.id,
      category: catAcai.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: badgeNovo.id,
    },

    // Shakes & Vitaminas
    {
      name: "Milk Shake Nutella 400ml",
      description: "Delicioso milk shake artesanal com sorvete de baunilha cremoso batido com generosa dose de Nutella original e chantilly.",
      price: 19.9,
      categoryId: catShakes.id,
      category: catShakes.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
      hasAddons: false,
      cardBadgeId: badgeMaisPedido.id,
    },
    {
      name: "Milk Shake Morango Silvestre 400ml",
      description: "Batido com sorvete de morango premium e calda artesanal de pedaços de morango fresco selecionado.",
      price: 18.5,
      categoryId: catShakes.id,
      category: catShakes.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
      hasAddons: false,
      cardBadgeId: null,
    },
    {
      name: "Vitamina de Açaí Energética 500ml",
      description: "Açaí batido com banana prata, leite e xarope de guaraná natural. A dose perfeita de energia para o seu dia.",
      price: 16.0,
      categoryId: catShakes.id,
      category: catShakes.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
      hasAddons: false,
      cardBadgeId: null,
    },

    // Sorvetes Artesanais
    {
      name: "Copo de Sorvete Tradicional (2 Bolas)",
      description: "Duas bolas generosas de sorvete de massa artesanal. Sabores clássicos e cremosos preparados com leite fresco.",
      price: 12.0,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80",
      hasAddons: false,
      cardBadgeId: null,
    },
    {
      name: "Sundae Artesanal Chocolate & Morango",
      description: "Sorvete cremoso servido com calda quente de chocolate belga, morangos frescos e amendoim granulado crocante.",
      price: 16.5,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
      hasAddons: false,
      cardBadgeId: null,
    },
    {
      name: "Pote Gelato Ninho Trufado 500ml",
      description: "Pote térmico de 500ml com gelato cremoso de Leite Ninho mesclado com trufas artesanais de chocolate ao leite.",
      price: 26.0,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
      hasAddons: false,
      cardBadgeId: badgeDestaque.id,
    },

    // Combos & Barcas
    {
      name: "Barca Pop Suprema 1 Litro",
      description: "Nossa famosa barca recheada com 1 Litro de açaí artesanal, decorada com frutas, creme de avelã, chocolates e confeitos.",
      price: 52.9,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: badgeDestaque.id,
    },
    {
      name: "Combo Casal 2x Copos 500ml",
      description: "Dois copos de 500ml montados do seu jeito com economia especial para saborear a dois.",
      price: 38.0,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: badgeMaisPedido.id,
    },
    {
      name: "Marmita Açaí Família (1.1 Litros)",
      description: "Marmita de 1.1 Litros super caprichada com camadas intercaladas de açaí puro e recheios generosos.",
      price: 42.0,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
      hasAddons: true,
      cardBadgeId: null,
    },
  ];

  const createdProducts: { id: string; name: string; price: number; hasAddons: boolean }[] = [];

  for (const raw of rawProducts) {
    const p = await prisma.product.create({
      data: {
        name: raw.name,
        description: raw.description,
        price: raw.price,
        categoryId: raw.categoryId,
        category: raw.category,
        imageUrl: raw.imageUrl,
        cardBadgeId: raw.cardBadgeId,
        isAvailable: true,
        stock: null,
      },
    });

    // Se o produto suporta complementos, vincula os 3 grupos transacionalmente via ProductAddonGroup
    if (raw.hasAddons) {
      await prisma.productAddonGroup.createMany({
        data: [
          { productId: p.id, groupId: groupBase.id, sortOrder: 1 },
          { productId: p.id, groupId: groupFrutas.id, sortOrder: 2 },
          { productId: p.id, groupId: groupTurbine.id, sortOrder: 3 },
        ],
      });
    }

    createdProducts.push({ id: p.id, name: p.name, price: raw.price, hasAddons: raw.hasAddons });
  }
  console.log(`✅ ${createdProducts.length} produtos criados e vinculados a complementos.`);

  // ── 7. CRIAÇÃO DE TURNOS E PEDIDOS HISTÓRICOS AUDITÁVEIS
  console.log("⏱️ 7/7: Gerando turnos (Shifts) e pedidos históricos consistentes...");

  // Criar clientes
  const createdUsers = [];
  const defaultPasswordHash = await bcrypt.hash("cliente123", 10);
  for (let i = 0; i < CLIENT_PROFILES.length; i++) {
    const prof = CLIENT_PROFILES[i];
    const u = await prisma.user.create({
      data: {
        email: prof.email,
        username: `cliente_${i + 1}`,
        fullName: prof.name,
        phone: prof.phone,
        passwordHash: defaultPasswordHash,
        role: "client",
      },
    });

    const addr = MT_ADDRESSES[i % MT_ADDRESSES.length];
    await prisma.userLocation.create({
      data: {
        userId: u.id,
        name: "Casa",
        addressLine: `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - MT`,
        latitude: -15.6536 + (Math.random() - 0.5) * 0.04,
        longitude: -56.1322 + (Math.random() - 0.5) * 0.04,
        isDefault: true,
      },
    });

    createdUsers.push(u);
  }

  // Turnos a semear
  const now = new Date();
  const shiftConfigs = [
    {
      code: "TURNO-20260925-001",
      daysAgo: 3,
      isOpen: false,
      ordersCount: 18,
    },
    {
      code: "TURNO-20260926-002",
      daysAgo: 2,
      isOpen: false,
      ordersCount: 24,
    },
    {
      code: "TURNO-20260927-003",
      daysAgo: 1,
      isOpen: false,
      ordersCount: 28,
    },
    {
      code: "TURNO-20260928-004",
      daysAgo: 0,
      isOpen: true,
      ordersCount: 14,
    },
  ];

  let currentOpenShiftId: string | null = null;

  for (const sCfg of shiftConfigs) {
    const openDate = new Date(now.getTime() - sCfg.daysAgo * 86400000);
    openDate.setHours(13, 0, 0, 0);

    let closeDate: Date | null = null;
    if (!sCfg.isOpen) {
      closeDate = new Date(openDate.getTime());
      closeDate.setHours(23, 30, 0, 0);
    }

    const shift = await prisma.shift.create({
      data: {
        code: sCfg.code,
        openedAt: openDate,
        closedAt: closeDate,
        isOpen: sCfg.isOpen,
        estimatedDeliveryTime: "30-50 min",
        notes: sCfg.isOpen ? "Turno operacional em andamento no salão e delivery." : "Turno encerrado com sucesso.",
      },
    });

    if (sCfg.isOpen) {
      currentOpenShiftId = shift.id;
    }

    let shiftTotalRev = 0;
    let shiftCashTotal = 0;
    let shiftPixTotal = 0;
    let shiftCardTotal = 0;
    let shiftCompletedCount = 0;
    let shiftCancelledCount = 0;

    for (let i = 0; i < sCfg.ordersCount; i++) {
      const u = createdUsers[(i + sCfg.daysAgo) % createdUsers.length];
      const addr = MT_ADDRESSES[(i + sCfg.daysAgo) % MT_ADDRESSES.length];
      const isDelivery = i % 4 !== 0;

      // Hora do pedido ao longo do turno
      const orderDate = new Date(openDate.getTime() + (i * 25 + Math.floor(Math.random() * 15)) * 60000);
      if (orderDate > now) {
        orderDate.setTime(now.getTime() - (sCfg.ordersCount - i) * 120000);
      }

      // Status
      let orderStatus: OrderStatus = "completed";
      if (sCfg.isOpen) {
        if (i === sCfg.ordersCount - 1) orderStatus = "pending";
        else if (i === sCfg.ordersCount - 2) orderStatus = "accepted";
        else if (i === sCfg.ordersCount - 3) orderStatus = "preparing";
        else if (i === sCfg.ordersCount - 4) orderStatus = "delivering";
        else orderStatus = "completed";
      } else {
        orderStatus = i === 3 ? "cancelled" : "completed";
      }

      // Pagamento: 60% pix, 25% cartão, 15% dinheiro
      let pType: PaymentMethodType = "pix_entrega";
      if (i % 3 === 1) pType = "cartao_maquininha";
      else if (i % 5 === 0) pType = "dinheiro";

      // Itens e complementos selecionados
      const prod = createdProducts[i % createdProducts.length];
      const qty = 1;
      let extrasCost = 0;

      const selectedAddons: any[] = [];
      if (prod.hasAddons) {
        // Base obrigatória
        selectedAddons.push({
          id: groupBase.items[0].id,
          groupName: groupBase.name,
          name: groupBase.items[0].name,
          price: 0,
          quantity: 1,
        });
        // 2 frutas inclusas
        selectedAddons.push({
          id: groupFrutas.items[0].id,
          groupName: groupFrutas.name,
          name: groupFrutas.items[0].name,
          price: 0,
          quantity: 1,
        });
        selectedAddons.push({
          id: groupFrutas.items[1].id,
          groupName: groupFrutas.name,
          name: groupFrutas.items[1].name,
          price: 0,
          quantity: 1,
        });
        // 1 adicional pago (Nutella)
        selectedAddons.push({
          id: groupTurbine.items[0].id,
          groupName: groupTurbine.name,
          name: groupTurbine.items[0].name,
          price: 4.5,
          quantity: 1,
        });
        extrasCost = 4.5;
      }

      const itemUnitPrice = prod.price + extrasCost;
      const subtotal = itemUnitPrice * qty;
      const deliveryFee = isDelivery ? (subtotal >= 60 ? 0 : 5.0) : 0;
      const totalAmount = subtotal + deliveryFee;

      const order = await prisma.order.create({
        data: {
          user: { connect: { id: u.id } },
          shiftId: shift.id,
          status: orderStatus,
          subtotal,
          deliveryFee,
          discountAmount: 0,
          totalAmount,
          paymentMethodType: pType,
          paymentChangeFor: pType === "dinheiro" ? Math.ceil(totalAmount / 10) * 10 + 10 : null,
          changeFor: pType === "dinheiro" ? Math.ceil(totalAmount / 10) * 10 + 10 : null,
          changeToReturn: pType === "dinheiro" ? Math.ceil(totalAmount / 10) * 10 + 10 - totalAmount : null,
          deliveryStreet: isDelivery ? addr.street : "Retirada Balcão",
          deliveryNumber: isDelivery ? addr.number : "S/N",
          deliveryNeighborhood: isDelivery ? addr.neighborhood : "Loja",
          deliveryCity: addr.city,
          deliveryZip: isDelivery ? addr.zip : null,
          isArchived: !sCfg.isOpen,
          cancellationReason: orderStatus === "cancelled" ? "Cliente solicitou alteração de endereço" : null,
          cancelledAt: orderStatus === "cancelled" ? orderDate : null,
          createdAt: orderDate,
          updatedAt: orderDate,
          items: {
            create: [
              {
                productId: prod.id,
                quantity: qty,
                priceAtTime: itemUnitPrice,
                selectedAddons: selectedAddons.length > 0 ? (selectedAddons as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
                createdAt: orderDate,
              },
            ],
          },
        },
      });

      if (orderStatus === "completed") {
        shiftTotalRev += totalAmount;
        shiftCompletedCount++;
        if (pType === "pix_entrega") shiftPixTotal += totalAmount;
        else if (pType === "cartao_maquininha") shiftCardTotal += totalAmount;
        else if (pType === "dinheiro") shiftCashTotal += totalAmount;
      } else if (orderStatus === "cancelled") {
        shiftCancelledCount++;
      }
    }

    // Atualiza estatísticas consolidadas do turno
    await prisma.shift.update({
      where: { id: shift.id },
      data: {
        totalRevenue: shiftTotalRev,
        totalOrders: sCfg.ordersCount,
        completedOrders: shiftCompletedCount,
        cancelledOrders: shiftCancelledCount,
        pixTotal: shiftPixTotal,
        cardTotal: shiftCardTotal,
        cashTotal: shiftCashTotal,
      },
    });
  }

  // Se houver turno em aberto hoje, vincula nas StoreSettings
  if (currentOpenShiftId) {
    await prisma.storeSettings.update({
      where: { id: "store_config" },
      data: {
        currentShiftId: currentOpenShiftId,
        isOpen: true,
      },
    });
  }

  console.log("🎉 Seed concluído com sucesso total! Catálogo real, complementos vinculados e histórico por turno criados.");
}

main()
  .catch((e) => {
    console.error("❌ Erro fatal durante a execução do seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
