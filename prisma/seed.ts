import { PrismaClient, Role, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🍧 [Pop Shake] Iniciando limpeza controlada (Clean Slate) e novo catálogo oficial...");

  // ── FASE 1: LIMPEZA CONTROLADA DO BANCO DE DADOS (CLEAN SLATE)
  console.log("🧹 1/6: Purgando histórico transacional e catálogo legado...");
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

  // Limpeza de clientes de teste (preservando rigorosamente ADMIN e EDITOR)
  console.log("👥 Purgando clientes de teste/rápidos e preservando contas administrativas...");
  await prisma.userLocation.deleteMany({
    where: {
      user: {
        role: Role.CLIENT,
      },
    },
  });
  await prisma.userNotification.deleteMany({
    where: {
      user: {
        role: Role.CLIENT,
      },
    },
  });
  const deletedClients = await prisma.user.deleteMany({
    where: {
      role: Role.CLIENT,
    },
  });
  console.log(`✅ ${deletedClients.count} usuários de teste removidos. Administradores e Operadores preservados.`);

  // Assegura conta do administrador principal
  const adminPasswordHash = await bcrypt.hash("@64844048", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@popclub.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      username: "admin",
      fullName: "Administrador Pop Shake",
    },
    create: {
      email: "admin@popclub.com",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      fullName: "Administrador Pop Shake",
    },
  });
  console.log(`✅ Admin verificado: ${admin.email} (${admin.fullName})`);

  // Configurações da Loja
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

  // Banner destaque da home
  await prisma.highlightBanner.upsert({
    where: { id: "home_highlight" },
    update: {
      icon: "🥣",
      title: "Cardápio Oficial Pop Shake: Açaí Puro, Milk Shakes e Sorvetes Artesanais",
      subtitle: "Monte do seu jeito com acompanhamentos selecionados ou aproveite nossas super promoções.",
      badge: "Qualidade Premium",
    },
    create: {
      id: "home_highlight",
      icon: "🥣",
      title: "Cardápio Oficial Pop Shake: Açaí Puro, Milk Shakes e Sorvetes Artesanais",
      subtitle: "Monte do seu jeito com acompanhamentos selecionados ou aproveite nossas super promoções.",
      badge: "Qualidade Premium",
    },
  });

  // Selos visuais (Badges)
  const badgeDestaque = await prisma.cardBadge.create({
    data: { text: "Destaque", icon: "⭐", bgColor: "#FEF3C7", textColor: "#B45309" },
  });
  const badgeMaisVendido = await prisma.cardBadge.create({
    data: { text: "Mais Pedido", icon: "🔥", bgColor: "#FEE2E2", textColor: "#DC2626" },
  });
  const badgePromo = await prisma.cardBadge.create({
    data: { text: "Super Promoção", icon: "⚡", bgColor: "#E0E7FF", textColor: "#3730A3" },
  });

  // ── FASE 2: GESTÃO DE CATEGORIAS ESTÁTICAS E DINÂMICAS (8 CATEGORIAS OFICIAIS)
  console.log("📂 2/6: Criando as 8 categorias oficiais do cardápio...");

  const cat1 = await prisma.category.create({
    data: {
      name: "⭐ Destaques da Casa",
      slug: "destaques-da-casa",
      order: 0,
      isDynamic: true,
      dynamicType: "HIGHLIGHTS",
      isActive: true,
    },
  });

  const cat2 = await prisma.category.create({
    data: {
      name: "🫐 Copos de Açaí Tradicionais",
      slug: "copos-de-acai-tradicionais",
      order: 1,
      isDynamic: false,
      isActive: true,
    },
  });

  const cat3 = await prisma.category.create({
    data: {
      name: "🍱 Marmitas & Roletas Especiais",
      slug: "marmitas-roletas-especiais",
      order: 2,
      isDynamic: false,
      isActive: true,
    },
  });

  const cat4 = await prisma.category.create({
    data: {
      name: "🍾 Açaí Batido na Garrafa",
      slug: "acai-batido-na-garrafa",
      order: 3,
      isDynamic: false,
      isActive: true,
    },
  });

  const cat5 = await prisma.category.create({
    data: {
      name: "🥤 Milk Shakes Cremosos",
      slug: "milk-shakes-cremosos",
      order: 4,
      isDynamic: false,
      isActive: true,
    },
  });

  const cat6 = await prisma.category.create({
    data: {
      name: "🍨 Sorvetes & Casquinhas",
      slug: "sorvetes-casquinhas",
      order: 5,
      isDynamic: false,
      isActive: true,
    },
  });

  const cat7 = await prisma.category.create({
    data: {
      name: "🫙 Potes Família (Açaí Puro Artesanal)",
      slug: "potes-familia-acai-puro-artesanal",
      order: 6,
      isDynamic: false,
      isActive: true,
    },
  });

  const cat8 = await prisma.category.create({
    data: {
      name: "⚡ Combos PopClub",
      slug: "combos-popclub",
      order: 7,
      isDynamic: false,
      isActive: true,
    },
  });

  console.log(`✅ 8 categorias criadas com sucesso.`);

  // ── FASE 4: MODELAGEM DE GRUPOS REUTILIZÁVEIS DE COMPLEMENTOS
  console.log("🍧 3/6: Criando grupos de complementos e regras de cotas gratuitas...");

  // Itens padrão de Acompanhamentos Tradicionais
  const traditionalItems = [
    { name: "Banana Fatiada", price: 1.5, sortOrder: 1 },
    { name: "Morango Fresco", price: 1.5, sortOrder: 2 },
    { name: "Uva Thompson", price: 1.5, sortOrder: 3 },
    { name: "Kiwi Fatiado", price: 1.5, sortOrder: 4 },
    { name: "Abacaxi em Calda", price: 1.5, sortOrder: 5 },
    { name: "Manga em Cubos", price: 1.5, sortOrder: 6 },
    { name: "Granola Tradicional Crocante", price: 1.5, sortOrder: 7 },
    { name: "Paçoca Rolha Esfarelada", price: 1.5, sortOrder: 8 },
    { name: "Leite em Pó Ninho", price: 1.5, sortOrder: 9 },
    { name: "Leite Condensado Moça", price: 1.5, sortOrder: 10 },
    { name: "Mel Silvestre Puro", price: 1.5, sortOrder: 11 },
    { name: "Flocos de Arroz Crocante", price: 1.5, sortOrder: 12 },
    { name: "Aveia em Flocos Finos", price: 1.5, sortOrder: 13 },
    { name: "Chocoball Crocante", price: 1.5, sortOrder: 14 },
    { name: "Gotas de Chocolate Nobre", price: 1.5, sortOrder: 15 },
    { name: "Confetes de Chocolate Coloridos", price: 1.5, sortOrder: 16 },
  ];

  // 1. Grupo Acompanhamentos Tradicionais (4 Grátis)
  const groupTradicionais4 = await prisma.addonGroup.create({
    data: {
      name: "Acompanhamentos Tradicionais (4 Grátis)",
      description: "Escolha até 4 adicionais inclusos. Itens adicionais por apenas R$ 1,50 cada.",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 4,
      isRequired: false,
      sortOrder: 1,
      items: {
        create: traditionalItems,
      },
    },
  });

  // 2. Grupo Acompanhamentos Tradicionais (5 Grátis)
  const groupTradicionais5 = await prisma.addonGroup.create({
    data: {
      name: "Acompanhamentos Tradicionais (5 Grátis)",
      description: "Escolha até 5 adicionais inclusos no copo Giga.",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 5,
      isRequired: false,
      sortOrder: 1,
      items: {
        create: traditionalItems,
      },
    },
  });

  // 3. Grupo Acompanhamentos Tradicionais (6 Grátis)
  const groupTradicionais6 = await prisma.addonGroup.create({
    data: {
      name: "Acompanhamentos Tradicionais (6 Grátis)",
      description: "Escolha até 6 adicionais inclusos na marmita.",
      minQuantity: 0,
      maxQuantity: 12,
      freeQuantity: 6,
      isRequired: false,
      sortOrder: 1,
      items: {
        create: traditionalItems,
      },
    },
  });

  // 4. Cremes Nobres & Frutas Especiais (Cobrança à parte)
  const groupCremesNobres = await prisma.addonGroup.create({
    data: {
      name: "Cremes Nobres & Frutas Especiais",
      description: "Adicionais nobres selecionados para turbinar sua experiência",
      minQuantity: 0,
      maxQuantity: 6,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 2,
      items: {
        create: [
          { name: "Nutella Original Pura", price: 7.0, sortOrder: 1 },
          { name: "Creme de Leite Ninho Artesanal", price: 5.0, sortOrder: 2 },
          { name: "Creme de Pistache Nobre Italiano", price: 8.0, sortOrder: 3 },
          { name: "Doce de Leite Viçosa", price: 4.5, sortOrder: 4 },
          { name: "Pasta de Amendoim Integral", price: 4.0, sortOrder: 5 },
          { name: "Creme de Avelã Branco", price: 6.0, sortOrder: 6 },
          { name: "Dose Extra de Morango Selecionado", price: 5.0, sortOrder: 7 },
          { name: "Amoras Silvestres", price: 6.0, sortOrder: 8 },
        ],
      },
    },
  });

  // 5. Caldas & Coberturas (+R$ 2,00 por unidade)
  const groupCaldas = await prisma.addonGroup.create({
    data: {
      name: "Caldas & Coberturas Extras",
      description: "Caldas deliciosas (+R$ 2,00 por unidade)",
      minQuantity: 0,
      maxQuantity: 4,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 3,
      items: {
        create: [
          { name: "Calda de Chocolate Belga", price: 2.0, sortOrder: 1 },
          { name: "Calda de Morango Especial", price: 2.0, sortOrder: 2 },
          { name: "Calda de Caramelo Toffee Salgado", price: 2.0, sortOrder: 3 },
          { name: "Cobertura de Maracujá com Sementes", price: 2.0, sortOrder: 4 },
        ],
      },
    },
  });

  // 6. Crocantes Especiais (+R$ 3,00 por unidade)
  const groupCrocantes = await prisma.addonGroup.create({
    data: {
      name: "Crocantes Especiais",
      description: "Toppings crocantes selecionados (+R$ 3,00 por unidade)",
      minQuantity: 0,
      maxQuantity: 4,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 4,
      items: {
        create: [
          { name: "Ovomaltine Crocante", price: 3.0, sortOrder: 1 },
          { name: "Castanha de Caju Moída", price: 3.0, sortOrder: 2 },
          { name: "Amendoim Torrado sem Pele", price: 3.0, sortOrder: 3 },
          { name: "Granulado Belga Meio Amargo", price: 3.0, sortOrder: 4 },
          { name: "Biscoito Oreo em Pedaços", price: 3.0, sortOrder: 5 },
        ],
      },
    },
  });

  // 7. Talheres / Descartáveis (Escolha única obrigatória)
  const groupTalheres = await prisma.addonGroup.create({
    data: {
      name: "Talheres / Descartáveis",
      description: "Selecione se precisa de colher descartável",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 0,
      isRequired: true,
      sortOrder: 5,
      items: {
        create: [
          { name: "Quero colher descartável reforçada (+R$ 0,98)", price: 0.98, sortOrder: 1 },
          { name: "Não preciso de colher (Tenho em casa 🌱)", price: 0.0, sortOrder: 2 },
        ],
      },
    },
  });

  // 8. Customização Garrafa (Açaí Batido na Garrafa)
  const groupGarrafaModo = await prisma.addonGroup.create({
    data: {
      name: "Como deseja os acompanhamentos?",
      description: "Escolha a forma de preparo da sua garrafa",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 0,
      isRequired: true,
      sortOrder: 1,
      items: {
        create: [
          { name: "Batido junto com o açaí", price: 0.0, sortOrder: 1 },
          { name: "Montado em camadas", price: 0.0, sortOrder: 2 },
        ],
      },
    },
  });

  // 9. Complementos de Milk Shake
  const groupComplementosShake = await prisma.addonGroup.create({
    data: {
      name: "Complementos de Milk Shake",
      description: "Turbine seu milk shake com bordas e coberturas cremosas",
      minQuantity: 0,
      maxQuantity: 4,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 2,
      items: {
        create: [
          { name: "Chantilly artesanal", price: 3.5, sortOrder: 1 },
          { name: "Borda de Nutella", price: 4.0, sortOrder: 2 },
          { name: "Borda de Doce de Leite", price: 3.5, sortOrder: 3 },
          { name: "Calda de Chocolate extra", price: 2.0, sortOrder: 4 },
        ],
      },
    },
  });

  // 10. Seletor de Tamanho para Shakes
  const groupTamanhoShake = await prisma.addonGroup.create({
    data: {
      name: "Escolha o Tamanho do Milk Shake",
      description: "Selecione o tamanho desejado para o shake",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 0,
      isRequired: true,
      sortOrder: 1,
      items: {
        create: [
          { name: "300ml (Pequeno)", price: 0.0, sortOrder: 1 },
          { name: "500ml (Médio)", price: 5.0, sortOrder: 2 },
          { name: "700ml (Grande)", price: 11.0, sortOrder: 3 },
        ],
      },
    },
  });

  // 11. Sabores de Massa de Sorvete (9 Sabores)
  const sorveteFlavors = [
    { name: "Baunilha Tradicional", price: 0.0, sortOrder: 1 },
    { name: "Chocolate Belga", price: 0.0, sortOrder: 2 },
    { name: "Flocos", price: 0.0, sortOrder: 3 },
    { name: "Ninho Trufado", price: 0.0, sortOrder: 4 },
    { name: "Morango Especial", price: 0.0, sortOrder: 5 },
    { name: "Maracujá Tropical", price: 0.0, sortOrder: 6 },
    { name: "Torta de Limão", price: 0.0, sortOrder: 7 },
    { name: "Chiclete Kids", price: 0.0, sortOrder: 8 },
    { name: "Pistache Italiano", price: 0.0, sortOrder: 9 },
  ];

  const groupSorvete1Bola = await prisma.addonGroup.create({
    data: {
      name: "Escolha o Sabor da Massa (1 Bola)",
      description: "Escolha 1 sabor artesanal",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 1,
      isRequired: true,
      sortOrder: 1,
      items: { create: sorveteFlavors },
    },
  });

  const groupSorvete2Bolas = await prisma.addonGroup.create({
    data: {
      name: "Escolha os Sabores de Massa (Até 2 Sabores)",
      description: "Escolha até 2 sabores para compor suas bolas",
      minQuantity: 1,
      maxQuantity: 2,
      freeQuantity: 2,
      isRequired: true,
      sortOrder: 1,
      items: { create: sorveteFlavors },
    },
  });

  const groupSorvete3Bolas = await prisma.addonGroup.create({
    data: {
      name: "Escolha os Sabores de Massa (Até 3 Sabores)",
      description: "Escolha até 3 sabores para compor suas bolas",
      minQuantity: 1,
      maxQuantity: 3,
      freeQuantity: 3,
      isRequired: true,
      sortOrder: 1,
      items: { create: sorveteFlavors },
    },
  });

  const groupRecipienteSorvete = await prisma.addonGroup.create({
    data: {
      name: "Escolha o Recipiente",
      description: "Casquinha crocante ou no copinho descartável?",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 1,
      isRequired: true,
      sortOrder: 2,
      items: {
        create: [
          { name: "Casquinha Tradicional Crocante", price: 0.0, sortOrder: 1 },
          { name: "Copinho Descartável com Colherzinha", price: 0.0, sortOrder: 2 },
        ],
      },
    },
  });

  const groupCascãoTrufadoRecheio = await prisma.addonGroup.create({
    data: {
      name: "Recheio da Borda do Cascão Trufado",
      description: "Escolha o recheio trufado da borda e fundo do cascão",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 1,
      isRequired: true,
      sortOrder: 2,
      items: {
        create: [
          { name: "Trufado de Nutella Original", price: 0.0, sortOrder: 1 },
          { name: "Trufado de Doce de Leite Cremoso", price: 0.0, sortOrder: 2 },
          { name: "Trufado de Brigadeiro Artesanal", price: 0.0, sortOrder: 3 },
        ],
      },
    },
  });

  // ── GRUPOS ESPECÍFICOS PARA OS COMBOS (FASE 5)
  // Combo Casal: Grupos totalmente independentes para Copo 1 e Copo 2
  const groupComboCasalCopo1Trad = await prisma.addonGroup.create({
    data: {
      name: "Copo 1 (400ml) - Adicionais Tradicionais (Até 4 grátis)",
      description: "Escolha até 4 adicionais inclusos para o primeiro copo.",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 4,
      isRequired: false,
      sortOrder: 1,
      items: { create: traditionalItems },
    },
  });

  const groupComboCasalCopo1Premium = await prisma.addonGroup.create({
    data: {
      name: "Copo 1 (400ml) - Cremes & Frutas Nobres (Opcional)",
      description: "Adicionais especiais pagos para o Copo 1",
      minQuantity: 0,
      maxQuantity: 5,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 2,
      items: {
        create: [
          { name: "Nutella Original Pura (+R$ 7,00)", price: 7.0, sortOrder: 1 },
          { name: "Creme de Leite Ninho (+R$ 5,00)", price: 5.0, sortOrder: 2 },
          { name: "Creme de Pistache Italiano (+R$ 8,00)", price: 8.0, sortOrder: 3 },
          { name: "Morango em Dobro (+R$ 5,00)", price: 5.0, sortOrder: 4 },
        ],
      },
    },
  });

  const groupComboCasalCopo2Trad = await prisma.addonGroup.create({
    data: {
      name: "Copo 2 (400ml) - Adicionais Tradicionais (Até 4 grátis)",
      description: "Escolha até 4 adicionais inclusos para o segundo copo (independente do Copo 1).",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 4,
      isRequired: false,
      sortOrder: 3,
      items: { create: traditionalItems },
    },
  });

  const groupComboCasalCopo2Premium = await prisma.addonGroup.create({
    data: {
      name: "Copo 2 (400ml) - Cremes & Frutas Nobres (Opcional)",
      description: "Adicionais especiais pagos para o Copo 2",
      minQuantity: 0,
      maxQuantity: 5,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 4,
      items: {
        create: [
          { name: "Nutella Original Pura (+R$ 7,00)", price: 7.0, sortOrder: 1 },
          { name: "Creme de Leite Ninho (+R$ 5,00)", price: 5.0, sortOrder: 2 },
          { name: "Creme de Pistache Italiano (+R$ 8,00)", price: 8.0, sortOrder: 3 },
          { name: "Morango em Dobro (+R$ 5,00)", price: 5.0, sortOrder: 4 },
        ],
      },
    },
  });

  const groupComboCasalTalheres = await prisma.addonGroup.create({
    data: {
      name: "Talheres do Combo Casal (0 a 2 colheres)",
      description: "Selecione quantas colheres reforçadas precisa para o casal (R$ 0,98 cada)",
      minQuantity: 0,
      maxQuantity: 2,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 5,
      items: {
        create: [
          { name: "Colher reforçada descartável", price: 0.98, sortOrder: 1 },
        ],
      },
    },
  });

  // Combo Família: Marmita 750ml (6 grátis) + Copo 1 300ml (4 grátis) + Copo 2 300ml (4 grátis) + Talheres (0 a 3)
  const groupComboFamMarmitaTrad = await prisma.addonGroup.create({
    data: {
      name: "Marmita 750ml - Adicionais Tradicionais em Camadas (Até 6 grátis)",
      description: "Escolha até 6 adicionais inclusos montados em camadas generosas.",
      minQuantity: 0,
      maxQuantity: 12,
      freeQuantity: 6,
      isRequired: false,
      sortOrder: 1,
      items: { create: traditionalItems },
    },
  });

  const groupComboFamMarmitaPremium = await prisma.addonGroup.create({
    data: {
      name: "Marmita 750ml - Cremes & Frutas Nobres (Opcional)",
      description: "Turbine a marmita de 750ml com cremes nobres",
      minQuantity: 0,
      maxQuantity: 5,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 2,
      items: {
        create: [
          { name: "Nutella Original Pura (+R$ 7,00)", price: 7.0, sortOrder: 1 },
          { name: "Creme de Leite Ninho (+R$ 5,00)", price: 5.0, sortOrder: 2 },
          { name: "Creme de Pistache Italiano (+R$ 8,00)", price: 8.0, sortOrder: 3 },
          { name: "Morango em Dobro (+R$ 5,00)", price: 5.0, sortOrder: 4 },
        ],
      },
    },
  });

  const groupComboFamCopo1Trad = await prisma.addonGroup.create({
    data: {
      name: "Copo 1 (300ml) - Adicionais Tradicionais (Até 4 grátis)",
      description: "Escolha até 4 adicionais inclusos para o primeiro copo de 300ml.",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 4,
      isRequired: false,
      sortOrder: 3,
      items: { create: traditionalItems },
    },
  });

  const groupComboFamCopo2Trad = await prisma.addonGroup.create({
    data: {
      name: "Copo 2 (300ml) - Adicionais Tradicionais (Até 4 grátis)",
      description: "Escolha até 4 adicionais inclusos para o segundo copo de 300ml.",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 4,
      isRequired: false,
      sortOrder: 4,
      items: { create: traditionalItems },
    },
  });

  const groupComboFamTalheres = await prisma.addonGroup.create({
    data: {
      name: "Talheres do Combo Família (0 a 3 colheres)",
      description: "Selecione quantas colheres reforçadas precisa para a família (R$ 0,98 cada)",
      minQuantity: 0,
      maxQuantity: 3,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 5,
      items: {
        create: [
          { name: "Colher reforçada descartável", price: 0.98, sortOrder: 1 },
        ],
      },
    },
  });

  // Combo Shake & Açaí: Copo 500ml + Milk Shake 500ml
  const groupComboShakeCopoTrad = await prisma.addonGroup.create({
    data: {
      name: "Copo 500ml - Adicionais Tradicionais (Até 4 grátis)",
      description: "Escolha até 4 adicionais inclusos para o copo de 500ml.",
      minQuantity: 0,
      maxQuantity: 10,
      freeQuantity: 4,
      isRequired: false,
      sortOrder: 1,
      items: { create: traditionalItems },
    },
  });

  const groupComboShakeCopoPremium = await prisma.addonGroup.create({
    data: {
      name: "Copo 500ml - Cremes & Frutas Nobres (Opcional)",
      description: "Adicionais especiais pagos para o Copo 500ml",
      minQuantity: 0,
      maxQuantity: 5,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 2,
      items: {
        create: [
          { name: "Nutella Original Pura (+R$ 7,00)", price: 7.0, sortOrder: 1 },
          { name: "Creme de Leite Ninho (+R$ 5,00)", price: 5.0, sortOrder: 2 },
          { name: "Creme de Pistache Italiano (+R$ 8,00)", price: 8.0, sortOrder: 3 },
          { name: "Morango em Dobro (+R$ 5,00)", price: 5.0, sortOrder: 4 },
        ],
      },
    },
  });

  const groupComboShakeSaborBase = await prisma.addonGroup.create({
    data: {
      name: "Milk Shake 500ml - Escolha o Sabor Base (Obrigatório)",
      description: "Selecione o sabor artesanal do milk shake de 500ml",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 1,
      isRequired: true,
      sortOrder: 3,
      items: {
        create: [
          { name: "Ovomaltine Crocante", price: 0.0, sortOrder: 1 },
          { name: "Ninho com Nutella", price: 0.0, sortOrder: 2 },
          { name: "Morango Silvestre", price: 0.0, sortOrder: 3 },
          { name: "Oreo & Cookies", price: 0.0, sortOrder: 4 },
        ],
      },
    },
  });

  const groupComboShakeOpcionais = await prisma.addonGroup.create({
    data: {
      name: "Milk Shake 500ml - Opcionais de Shake",
      description: "Opcionais especiais para o shake do combo",
      minQuantity: 0,
      maxQuantity: 4,
      freeQuantity: 0,
      isRequired: false,
      sortOrder: 4,
      items: {
        create: [
          { name: "Chantilly artesanal (+R$ 3,50)", price: 3.5, sortOrder: 1 },
          { name: "Borda de Nutella (+R$ 4,00)", price: 4.0, sortOrder: 2 },
          { name: "Borda de Doce de Leite (+R$ 3,50)", price: 3.5, sortOrder: 3 },
        ],
      },
    },
  });

  const groupComboShakeTalheres = await prisma.addonGroup.create({
    data: {
      name: "Talheres e Canudos (Combo Shake & Açaí)",
      description: "Canudo incluso! Selecione se deseja colher para o açaí",
      minQuantity: 1,
      maxQuantity: 1,
      freeQuantity: 0,
      isRequired: true,
      sortOrder: 5,
      items: {
        create: [
          { name: "Canudo Incluso + Sem Colher (R$ 0,00)", price: 0.0, sortOrder: 1 },
          { name: "Canudo Incluso + Quero Colher de Açaí (+R$ 0,98)", price: 0.98, sortOrder: 2 },
        ],
      },
    },
  });

  console.log("✅ Todos os grupos de complementos criados com sucesso.");

  // ── FASE 3 E FASE 6: SEED DO CARDÁPIO COMPLETO POP SHAKE COM PROMOÇÕES TEMPORAIS
  console.log("📦 4/6: Cadastrando catálogo completo com promoções temporais e rendimento...");

  const now = new Date();
  const startsAt = new Date(now.getTime() - 2 * 86400000); // 2 dias atrás (ativa)
  const endsAt = new Date(now.getTime() + 30 * 86400000); // válida por 30 dias

  // 2. CATEGORIA: 🫐 Copos de Açaí Tradicionais
  const pCopo300 = await prisma.product.create({
    data: {
      name: "Copo 300ml Tradicional",
      description: "Açaí artesanal super cremoso batido na hora no copo de 300ml. Acompanha até 4 adicionais tradicionais grátis.",
      price: 21.90,
      originalPrice: 35.99,
      promotionalPrice: 21.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 1 pessoa",
      categoryId: cat2.id,
      category: cat2.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  const pCopo400 = await prisma.product.create({
    data: {
      name: "Copo 400ml Tradicional",
      description: "Copo de 400ml com açaí artesanal bem consistente e geladinho. Acompanha até 4 adicionais tradicionais grátis.",
      price: 25.90,
      originalPrice: 37.99,
      promotionalPrice: 25.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 1 pessoa",
      categoryId: cat2.id,
      category: cat2.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  const pCopo500 = await prisma.product.create({
    data: {
      name: "Copo Pop 500ml Turbinado",
      description: "O campeão absoluto de vendas! 500ml de açaí artesanal aveludado batido na hora com até 4 adicionais grátis.",
      price: 29.69,
      originalPrice: 39.99,
      promotionalPrice: 29.69,
      startsAt,
      endsAt,
      isPromoActive: true,
      isHighlight: true,
      servesText: "Serve 1 pessoa",
      categoryId: cat2.id,
      category: cat2.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgeMaisVendido.id,
    },
  });

  const pCopo700 = await prisma.product.create({
    data: {
      name: "Copo 700ml (Giga)",
      description: "Tamanho Giga para os verdadeiros apaixonados por açaí! Copo gigante de 700ml com até 5 adicionais tradicionais grátis inclusos.",
      price: 36.90,
      originalPrice: 46.90,
      promotionalPrice: 36.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 1 a 2 pessoas",
      categoryId: cat2.id,
      category: cat2.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  // Vincula complementos dos copos tradicionais
  for (const p of [pCopo300, pCopo400, pCopo500]) {
    await prisma.productAddonGroup.createMany({
      data: [
        { productId: p.id, groupId: groupTradicionais4.id, sortOrder: 1 },
        { productId: p.id, groupId: groupCremesNobres.id, sortOrder: 2 },
        { productId: p.id, groupId: groupCaldas.id, sortOrder: 3 },
        { productId: p.id, groupId: groupCrocantes.id, sortOrder: 4 },
        { productId: p.id, groupId: groupTalheres.id, sortOrder: 5 },
      ],
    });
  }

  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pCopo700.id, groupId: groupTradicionais5.id, sortOrder: 1 },
      { productId: pCopo700.id, groupId: groupCremesNobres.id, sortOrder: 2 },
      { productId: pCopo700.id, groupId: groupCaldas.id, sortOrder: 3 },
      { productId: pCopo700.id, groupId: groupCrocantes.id, sortOrder: 4 },
      { productId: pCopo700.id, groupId: groupTalheres.id, sortOrder: 5 },
    ],
  });

  // 3. CATEGORIA: 🍱 Marmitas & Roletas Especiais
  const pMarmita500 = await prisma.product.create({
    data: {
      name: "Marmita 500ml (P)",
      description: "Marmita de 500ml montada com generosidade em camadas de açaí cremoso. Inclui até 4 adicionais tradicionais grátis.",
      price: 32.90,
      originalPrice: 42.00,
      promotionalPrice: 32.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 1 a 2 pessoas",
      categoryId: cat3.id,
      category: cat3.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  const pMarmita750 = await prisma.product.create({
    data: {
      name: "Marmita 750ml (M)",
      description: "Marmita de 750ml montada em camadas generosas com até 6 adicionais tradicionais grátis inclusos.",
      price: 45.99,
      originalPrice: 55.00,
      promotionalPrice: 45.99,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 2 pessoas",
      categoryId: cat3.id,
      category: cat3.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgeMaisVendido.id,
    },
  });

  const pMarmita1000 = await prisma.product.create({
    data: {
      name: "Marmita 1000ml (1 Litro)",
      description: "Marmita gigante de 1 Litro! Uma explosão de açaí artesanal intercalado com até 6 acompanhamentos tradicionais grátis.",
      price: 58.00,
      originalPrice: 69.90,
      promotionalPrice: 58.00,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 3 pessoas",
      categoryId: cat3.id,
      category: cat3.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  const pRoletaP = await prisma.product.create({
    data: {
      name: "Roleta Gourmet P (G540ml)",
      description: "Embalagem gourmet com divisórias independentes para saborear cada acompanhamento de forma impecável. Até 4 adicionais inclusos.",
      price: 35.50,
      originalPrice: 50.00,
      promotionalPrice: 35.50,
      startsAt,
      endsAt,
      isPromoActive: true,
      isHighlight: true,
      servesText: "Serve 1 a 2 pessoas",
      categoryId: cat3.id,
      category: cat3.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgeDestaque.id,
    },
  });

  const pRoletaM = await prisma.product.create({
    data: {
      name: "Roleta Gourmet M (G800ml)",
      description: "Roleta especial de 800ml com divisórias para fartura em família. Açaí puro ao centro e acompanhamentos selecionados em volta.",
      price: 52.90,
      originalPrice: 68.00,
      promotionalPrice: 52.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      servesText: "Serve 2 a 3 pessoas",
      categoryId: cat3.id,
      category: cat3.name,
      imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  // Vincula complementos de marmitas e roletas
  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pMarmita500.id, groupId: groupTradicionais4.id, sortOrder: 1 },
      { productId: pMarmita500.id, groupId: groupCremesNobres.id, sortOrder: 2 },
      { productId: pMarmita500.id, groupId: groupCaldas.id, sortOrder: 3 },
      { productId: pMarmita500.id, groupId: groupCrocantes.id, sortOrder: 4 },
      { productId: pMarmita500.id, groupId: groupTalheres.id, sortOrder: 5 },

      { productId: pMarmita750.id, groupId: groupTradicionais6.id, sortOrder: 1 },
      { productId: pMarmita750.id, groupId: groupCremesNobres.id, sortOrder: 2 },
      { productId: pMarmita750.id, groupId: groupCaldas.id, sortOrder: 3 },
      { productId: pMarmita750.id, groupId: groupCrocantes.id, sortOrder: 4 },
      { productId: pMarmita750.id, groupId: groupTalheres.id, sortOrder: 5 },

      { productId: pMarmita1000.id, groupId: groupTradicionais6.id, sortOrder: 1 },
      { productId: pMarmita1000.id, groupId: groupCremesNobres.id, sortOrder: 2 },
      { productId: pMarmita1000.id, groupId: groupCaldas.id, sortOrder: 3 },
      { productId: pMarmita1000.id, groupId: groupCrocantes.id, sortOrder: 4 },
      { productId: pMarmita1000.id, groupId: groupTalheres.id, sortOrder: 5 },

      { productId: pRoletaP.id, groupId: groupTradicionais4.id, sortOrder: 1 },
      { productId: pRoletaP.id, groupId: groupCremesNobres.id, sortOrder: 2 },
      { productId: pRoletaP.id, groupId: groupCaldas.id, sortOrder: 3 },
      { productId: pRoletaP.id, groupId: groupCrocantes.id, sortOrder: 4 },
      { productId: pRoletaP.id, groupId: groupTalheres.id, sortOrder: 5 },

      { productId: pRoletaM.id, groupId: groupTradicionais6.id, sortOrder: 1 },
      { productId: pRoletaM.id, groupId: groupCremesNobres.id, sortOrder: 2 },
      { productId: pRoletaM.id, groupId: groupCaldas.id, sortOrder: 3 },
      { productId: pRoletaM.id, groupId: groupCrocantes.id, sortOrder: 4 },
      { productId: pRoletaM.id, groupId: groupTalheres.id, sortOrder: 5 },
    ],
  });

  // 4. CATEGORIA: 🍾 Açaí Batido na Garrafa
  const pGarrafa300 = await prisma.product.create({
    data: {
      name: "Garrafinha 300ml",
      description: "Açaí cremoso batido na garrafinha prática selada. Leve para qualquer lugar sem vazamento e consuma geladinho!",
      price: 30.99,
      servesText: "Serve 1 pessoa",
      categoryId: cat4.id,
      category: cat4.name,
      imageUrl: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pGarrafa500 = await prisma.product.create({
    data: {
      name: "Garrafa 500ml",
      description: "Garrafa de 500ml de açaí artesanal com textura densa batido na hora. Escolha se prefere batido junto ou em camadas.",
      price: 36.00,
      servesText: "Serve 1 pessoa",
      categoryId: cat4.id,
      category: cat4.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
    },
  });

  for (const p of [pGarrafa300, pGarrafa500]) {
    await prisma.productAddonGroup.createMany({
      data: [
        { productId: p.id, groupId: groupGarrafaModo.id, sortOrder: 1 },
        { productId: p.id, groupId: groupTradicionais4.id, sortOrder: 2 },
        { productId: p.id, groupId: groupCremesNobres.id, sortOrder: 3 },
        { productId: p.id, groupId: groupTalheres.id, sortOrder: 4 },
      ],
    });
  }

  // 5. CATEGORIA: 🥤 Milk Shakes Cremosos
  const pShakeOvomaltine = await prisma.product.create({
    data: {
      name: "Milk Shake Ovomaltine Crocante",
      description: "Sorvete artesanal batido com generosa dose de Ovomaltine suíço crocante. Disponível em 300ml (R$ 21,00), 500ml (R$ 26,00) e 700ml (R$ 32,00).",
      price: 21.00,
      servesText: "Serve 1 pessoa",
      categoryId: cat5.id,
      category: cat5.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    },
  });

  // O item de 500ml em destaque promocional oficial
  const pShakeNinhoNutella500 = await prisma.product.create({
    data: {
      name: "Milk Shake Ninho com Nutella 500ml",
      description: "Sorvete cremoso de Leite Ninho batido com farta dose de Nutella original italiana. Edição especial de 500ml em promoção!",
      price: 24.90,
      originalPrice: 29.90,
      promotionalPrice: 24.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      isHighlight: true,
      servesText: "Serve 1 pessoa",
      categoryId: cat5.id,
      category: cat5.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgeDestaque.id,
    },
  });

  const pShakeMorango = await prisma.product.create({
    data: {
      name: "Milk Shake Morango Silvestre",
      description: "Sorvete de massa artesanal batido com morangos frescos selecionados e calda especial. Disponível em 300ml (R$ 20,00), 500ml (R$ 25,00) e 700ml (R$ 30,00).",
      price: 20.00,
      servesText: "Serve 1 pessoa",
      categoryId: cat5.id,
      category: cat5.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pShakePacoca = await prisma.product.create({
    data: {
      name: "Milk Shake Paçoca com Caramelo",
      description: "Sorvete artesanal batido com paçoca rolha esfarelada e cobertura de caramelo toffee salgado. Disponível em 300ml (R$ 21,00), 500ml (R$ 26,00) e 700ml (R$ 32,00).",
      price: 21.00,
      servesText: "Serve 1 pessoa",
      categoryId: cat5.id,
      category: cat5.name,
      imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pShakeOreo = await prisma.product.create({
    data: {
      name: "Milk Shake Oreo & Cookies",
      description: "Sorvete super cremoso batido com biscoito Oreo de verdade em pedacinhos crocantes. Disponível em 300ml (R$ 22,00), 500ml (R$ 27,50) e 700ml (R$ 33,00).",
      price: 22.00,
      servesText: "Serve 1 pessoa",
      categoryId: cat5.id,
      category: cat5.name,
      imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    },
  });

  // Vincula seletor de tamanho e complementos de shakes
  for (const p of [pShakeOvomaltine, pShakeMorango, pShakePacoca, pShakeOreo]) {
    await prisma.productAddonGroup.createMany({
      data: [
        { productId: p.id, groupId: groupTamanhoShake.id, sortOrder: 1 },
        { productId: p.id, groupId: groupComplementosShake.id, sortOrder: 2 },
      ],
    });
  }
  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pShakeNinhoNutella500.id, groupId: groupComplementosShake.id, sortOrder: 1 },
    ],
  });

  // 6. CATEGORIA: 🍨 Sorvetes & Casquinhas
  const pCasquinhaSimples = await prisma.product.create({
    data: {
      name: "Casquinha Simples (1 Bola)",
      description: "Uma bola caprichada de sorvete de massa artesanal. Escolha se prefere na casquinha crocante ou no copinho descartável.",
      price: 7.50,
      servesText: "Serve 1 pessoa",
      categoryId: cat6.id,
      category: cat6.name,
      imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pCascaoTrufado = await prisma.product.create({
    data: {
      name: "Cascão Trufado (2 Bolas)",
      description: "Cascão artesanal com borda e fundo recheados de Nutella ou Doce de Leite + 2 bolas de sorvete de massa.",
      price: 16.90,
      servesText: "Serve 1 pessoa",
      categoryId: cat6.id,
      category: cat6.name,
      imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pCascaoEspecial = await prisma.product.create({
    data: {
      name: "Cascão Especial (3 Bolas)",
      description: "Cascão crocante reforçado com 3 bolas generosas de sorvete artesanal à sua escolha.",
      price: 22.00,
      servesText: "Serve 1 a 2 pessoas",
      categoryId: cat6.id,
      category: cat6.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pPoteSorvete500 = await prisma.product.create({
    data: {
      name: "Pote de Sorvete Artesanal 500ml",
      description: "Pote térmico lacrado de 500ml com textura cremosa para saborear em casa. Escolha até 2 sabores artesanais.",
      price: 26.00,
      servesText: "Serve 2 pessoas",
      categoryId: cat6.id,
      category: cat6.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pPoteSorvete1L = await prisma.product.create({
    data: {
      name: "Pote de Sorvete Artesanal 1 Litro",
      description: "Pote familiar de 1 Litro com sorvete de massa artesanal batido com leite puro. Escolha até 3 sabores prediletos.",
      price: 44.90,
      servesText: "Serve 3 a 4 pessoas",
      categoryId: cat6.id,
      category: cat6.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
    },
  });

  // Vincula grupos aos sorvetes
  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pCasquinhaSimples.id, groupId: groupSorvete1Bola.id, sortOrder: 1 },
      { productId: pCasquinhaSimples.id, groupId: groupRecipienteSorvete.id, sortOrder: 2 },

      { productId: pCascaoTrufado.id, groupId: groupSorvete2Bolas.id, sortOrder: 1 },
      { productId: pCascaoTrufado.id, groupId: groupCascãoTrufadoRecheio.id, sortOrder: 2 },

      { productId: pCascaoEspecial.id, groupId: groupSorvete3Bolas.id, sortOrder: 1 },

      { productId: pPoteSorvete500.id, groupId: groupSorvete2Bolas.id, sortOrder: 1 },
      { productId: pPoteSorvete500.id, groupId: groupCaldas.id, sortOrder: 2 },

      { productId: pPoteSorvete1L.id, groupId: groupSorvete3Bolas.id, sortOrder: 1 },
      { productId: pPoteSorvete1L.id, groupId: groupCaldas.id, sortOrder: 2 },
    ],
  });

  // 7. CATEGORIA: 🫙 Potes Família (Açaí Puro Artesanal)
  const pPotePuro500 = await prisma.product.create({
    data: {
      name: "Pote 500ml Puro",
      description: "Pote lacrado de 500ml com açaí artesanal de polpa pura e consistência densa. Perfeito para servir como preferir em casa.",
      price: 28.90,
      servesText: "Serve 1 a 2 pessoas",
      categoryId: cat7.id,
      category: cat7.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pPotePuro1L = await prisma.product.create({
    data: {
      name: "Pote 1 Litro Puro",
      description: "1 Litro de açaí artesanal sem conservantes, textura aveludada e rendimento excelente para toda a família.",
      price: 47.90,
      servesText: "Serve 3 a 4 pessoas",
      categoryId: cat7.id,
      category: cat7.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pBaldePuro2L = await prisma.product.create({
    data: {
      name: "Balde 2 Litros Puro",
      description: "Balde econômico familiar de 2 Litros de puro açaí artesanal. Máxima economia e fartura para sua casa.",
      price: 85.00,
      servesText: "Serve 5+ pessoas",
      categoryId: cat7.id,
      category: cat7.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
    },
  });

  for (const p of [pPotePuro500, pPotePuro1L, pBaldePuro2L]) {
    await prisma.productAddonGroup.createMany({
      data: [
        { productId: p.id, groupId: groupCremesNobres.id, sortOrder: 1 },
        { productId: p.id, groupId: groupCaldas.id, sortOrder: 2 },
        { productId: p.id, groupId: groupCrocantes.id, sortOrder: 3 },
        { productId: p.id, groupId: groupTalheres.id, sortOrder: 4 },
      ],
    });
  }

  // 8. CATEGORIA: ⚡ Combos PopClub (FASE 5)
  const pComboCasal = await prisma.product.create({
    data: {
      name: "Combo Casal (2 Copos de 400ml)",
      description: "Dois copos de 400ml com montagens totalmente independentes! Cada pessoa escolhe seus 4 adicionais tradicionais grátis e cremes prediletos.",
      price: 47.00,
      originalPrice: 50.00,
      promotionalPrice: 47.00,
      startsAt,
      endsAt,
      isPromoActive: true,
      isHighlight: true,
      isCombo: true,
      servesText: "Serve 2 pessoas",
      categoryId: cat8.id,
      category: cat8.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgeDestaque.id,
    },
  });

  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pComboCasal.id, groupId: groupComboCasalCopo1Trad.id, sortOrder: 1 },
      { productId: pComboCasal.id, groupId: groupComboCasalCopo1Premium.id, sortOrder: 2 },
      { productId: pComboCasal.id, groupId: groupComboCasalCopo2Trad.id, sortOrder: 3 },
      { productId: pComboCasal.id, groupId: groupComboCasalCopo2Premium.id, sortOrder: 4 },
      { productId: pComboCasal.id, groupId: groupComboCasalTalheres.id, sortOrder: 5 },
    ],
  });

  const pComboFamilia = await prisma.product.create({
    data: {
      name: "Combo Família (1 Marmita 750ml + 2 Copos 300ml)",
      description: "O combo mais farto e econômico! 1 Marmita de 750ml em camadas com 6 adicionais grátis + 2 Copos de 300ml com 4 adicionais grátis cada.",
      price: 79.90,
      originalPrice: 98.00,
      promotionalPrice: 79.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      isCombo: true,
      servesText: "Serve 3 a 4 pessoas",
      categoryId: cat8.id,
      category: cat8.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pComboFamilia.id, groupId: groupComboFamMarmitaTrad.id, sortOrder: 1 },
      { productId: pComboFamilia.id, groupId: groupComboFamMarmitaPremium.id, sortOrder: 2 },
      { productId: pComboFamilia.id, groupId: groupComboFamCopo1Trad.id, sortOrder: 3 },
      { productId: pComboFamilia.id, groupId: groupComboFamCopo2Trad.id, sortOrder: 4 },
      { productId: pComboFamilia.id, groupId: groupComboFamTalheres.id, sortOrder: 5 },
    ],
  });

  const pComboShakeAcai = await prisma.product.create({
    data: {
      name: "Combo Shake & Açaí (1 Copo 500ml + 1 Milk Shake 500ml)",
      description: "O melhor dos dois mundos: 1 Copo de 500ml com até 4 adicionais grátis + 1 Milk Shake artesanal de 500ml no sabor que preferir.",
      price: 49.90,
      originalPrice: 64.00,
      promotionalPrice: 49.90,
      startsAt,
      endsAt,
      isPromoActive: true,
      isCombo: true,
      servesText: "Serve 2 pessoas",
      categoryId: cat8.id,
      category: cat8.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
      cardBadgeId: badgePromo.id,
    },
  });

  await prisma.productAddonGroup.createMany({
    data: [
      { productId: pComboShakeAcai.id, groupId: groupComboShakeCopoTrad.id, sortOrder: 1 },
      { productId: pComboShakeAcai.id, groupId: groupComboShakeCopoPremium.id, sortOrder: 2 },
      { productId: pComboShakeAcai.id, groupId: groupComboShakeSaborBase.id, sortOrder: 3 },
      { productId: pComboShakeAcai.id, groupId: groupComboShakeOpcionais.id, sortOrder: 4 },
      { productId: pComboShakeAcai.id, groupId: groupComboShakeTalheres.id, sortOrder: 5 },
    ],
  });

  console.log("✅ Produtos e Combos cadastrados e complementos vinculados com sucesso.");

  // ── RESUMO FINAL
  const totalCategories = await prisma.category.count();
  const totalProducts = await prisma.product.count();
  const totalGroups = await prisma.addonGroup.count();
  const totalItems = await prisma.addonItem.count();
  const totalUsers = await prisma.user.count();

  console.log("==================================================");
  console.log("🎉 SEED COMPLETO E AUDITADO:");
  console.log(`📂 Categorias no Banco: ${totalCategories}`);
  console.log(`📦 Produtos no Banco: ${totalProducts}`);
  console.log(`🍨 Grupos de Complementos: ${totalGroups}`);
  console.log(`🍫 Itens de Adicionais: ${totalItems}`);
  console.log(`👤 Usuários preservados (Equipe): ${totalUsers}`);
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Erro fatal durante a execução do seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
