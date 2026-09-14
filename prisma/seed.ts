import { PrismaClient, OrderStatus, PaymentMethodType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Lista de bairros e ruas realistas de Cuiabá/MT
const CUIABA_ADDRESSES = [
  { street: "Av. Isaac Póvoas", number: "1250", neighborhood: "Goiabeiras", zip: "78045-000" },
  { street: "Rua Cândido Mariano", number: "480", neighborhood: "Centro Norte", zip: "78005-150" },
  { street: "Av. Senador Metello", number: "920", neighborhood: "Porto", zip: "78025-100" },
  { street: "Rua das Amendoeiras", number: "310", neighborhood: "Bosque da Saúde", zip: "78050-020" },
  { street: "Av. Miguel Sutil", number: "4500", neighborhood: "Santa Rosa", zip: "78040-000" },
  { street: "Rua Buenos Aires", number: "215", neighborhood: "Jardim das Américas", zip: "78060-600" },
  { street: "Rua Estevão de Mendonça", number: "840", neighborhood: "Quilombo", zip: "78043-405" },
  { street: "Av. Antártica", number: "1120", neighborhood: "Santa Marta", zip: "78043-700" },
  { street: "Rua Almirante Barroso", number: "530", neighborhood: "Duque de Caxias", zip: "78043-300" },
  { street: "Rua Presidente Castelo Branco", number: "740", neighborhood: "Alvorada", zip: "78048-000" },
];

const CLIENT_PROFILES = [
  { name: "Lucas Gabriel Oliveira", email: "lucas.oliveira@gmail.com", phone: "65992341122" },
  { name: "Camila Fernandes Santos", email: "camila.santos@outlook.com", phone: "65984123344" },
  { name: "Rodrigo Albuquerque Neto", email: "rodrigo.neto@gmail.com", phone: "65999887766" },
  { name: "Mariana Costa e Silva", email: "mariana.costa@hotmail.com", phone: "65996554433" },
  { name: "Felipe Augusto Martins", email: "felipe.martins@gmail.com", phone: "65981239988" },
  { name: "Beatriz Lima Pimentel", email: "beatriz.lima@yahoo.com.br", phone: "65993441155" },
  { name: "Gabriel Zanin Souza", email: "gabriel.souza@gmail.com", phone: "65984556677" },
  { name: "Larissa Ferreira Dias", email: "larissa.dias@gmail.com", phone: "65997223311" },
  { name: "Rafael Vinicius Silva", email: "rafael.silva@gmail.com", phone: "65991884422" },
  { name: "Fernanda Ribeiro Dantas", email: "fernanda.dantas@gmail.com", phone: "65984332211" },
  { name: "Thiago Pereira Chaves", email: "thiago.chaves@gmail.com", phone: "65996115599" },
  { name: "Amanda Rocha Albuquerque", email: "amanda.rocha@gmail.com", phone: "65992003388" },
];

async function main() {
  console.log("🍨 [Pop Shake Sorveteria] Iniciando seed oficial completo...");

  // 1. Limpeza de dados antigos para evitar inconsistências
  console.log("🧹 Limpando dados fictícios anteriores...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promotionItem.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { not: "admin@popclub.com" } },
  });

  // 2. Criar ou Atualizar Usuário Administrador
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
  console.log("✅ Admin oficial configurado:", admin.email);

  // 3. Configurações da Loja com WhatsApp Comercial
  await prisma.storeSettings.upsert({
    where: { id: "store_config" },
    update: {
      deliveryFee: 5.0,
      freeDeliveryThreshold: 60.0,
      whatsappNumber: "5565999999999",
      whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.",
    },
    create: {
      id: "store_config",
      deliveryFee: 5.0,
      freeDeliveryThreshold: 60.0,
      whatsappNumber: "5565999999999",
      whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.",
    },
  });
  console.log("✅ Configurações da loja e WhatsApp comercial salvos");

  // 4. Banner de Destaque Oficial
  await prisma.highlightBanner.upsert({
    where: { id: "home_highlight" },
    update: {
      icon: "🍨",
      title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
      subtitle: "Açaí batido na hora, cremoso e com frutas frescas, caldas e recheios artesanais.",
      badge: "Pop Shake Sorveteria",
    },
    create: {
      id: "home_highlight",
      icon: "🍨",
      title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
      subtitle: "Açaí batido na hora, cremoso e com frutas frescas, caldas e recheios artesanais.",
      badge: "Pop Shake Sorveteria",
    },
  });

  // 5. Categorias Oficiais
  console.log("📂 Cadastrando 6 categorias reais...");
  const catDestaques = await prisma.category.create({
    data: { name: "Destaques & Novidades", slug: "destaques-novidades" },
  });
  const catHits = await prisma.category.create({
    data: { name: "Linha Hits & Marmitas", slug: "linha-hits-marmitas" },
  });
  const catTradicional = await prisma.category.create({
    data: { name: "Açaí Tradicional & Copos", slug: "acai-tradicional-copos" },
  });
  const catRecheio = await prisma.category.create({
    data: { name: "Explosão de Recheio", slug: "explosao-de-recheio" },
  });
  const catCombos = await prisma.category.create({
    data: { name: "Combos Família", slug: "combos-familia" },
  });
  const catSorvetes = await prisma.category.create({
    data: { name: "Sorvetes Artesanais", slug: "sorvetes-artesanais" },
  });

  // 6. Cadastro dos 21 Produtos Reais
  console.log("📦 Cadastrando 21 produtos oficiais com fotos reais...");
  const productsData = [
    // ── Destaques & Novidades
    {
      name: "Açaí de Framboesa (Lançamento)",
      description: "Açaí cremoso batido com framboesas frescas selecionadas e calda especial de frutas vermelhas. De R$ 15,00 por apenas R$ 10,00.",
      price: 10.0,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Os Gigantes do Açaí (Barca & Marmita)",
      description: "Linha completa com barcas, marmitas e roletas fartas com acompanhamentos à vontade. A partir de R$ 18,99 (De R$ 99,99).",
      price: 18.99,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Açaí 500ml Do Seu Jeito",
      description: "Monte seu açaí escolhendo suas marcas, frutas e recheios favoritos. De R$ 15,00 por apenas R$ 10,00.",
      price: 10.0,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Açaí na Garrafa",
      description: "Praticidade e energia pura para levar onde quiser. Açaí batido na textura ideal para beber a qualquer hora.",
      price: 10.01,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
    },

    // ── Linha Hits & Marmitas
    {
      name: "Marmita Recheio Base + Topo Exclusivo Hits",
      description: "Camada dupla de recheio artesanal com açaí premium. De R$ 52,00 por apenas R$ 31,99.",
      price: 31.99,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Açaí 500ml Exclusivo Hits",
      description: "Açaí batido na textura Hits com recheio especial no fundo e topo. De R$ 35,00 por R$ 17,98.",
      price: 17.98,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Hits em Dobro",
      description: "Combo promocional com dois copos Hits recheados. De R$ 42,00 por apenas R$ 28,00.",
      price: 28.0,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Monte Seu Hits (Copo/Marmita)",
      description: "Escolha o tamanho e monte sua combinação exclusiva Hits com seus recheios artesanais preferidos.",
      price: 16.5,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Marmita Açaí Família (1.1 Litros)",
      description: "Tamanho família super caprichado com recheios fartos para compartilhar. De R$ 35,99 por R$ 26,99.",
      price: 26.99,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
    },

    // ── Açaí Tradicional & Copos
    {
      name: "Açaí 300ml Tradicional",
      description: "Açaí puro batido na hora. Informe preferência por +Recheio ou +Açaí nas observações. De R$ 18,50 por R$ 16,50.",
      price: 16.5,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Açaí 500ml Tradicional",
      description: "Açaí batido na hora com textura aveludada e ponto perfeito. De R$ 23,00 por apenas R$ 19,50.",
      price: 19.5,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Açaí 700ml Tradicional",
      description: "Copo generoso para quem tem fome de açaí puro. De R$ 28,00 por R$ 24,99.",
      price: 24.99,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Açaí Trufado 300ml",
      description: "Trufado com beijinho ou brigadeiro de panela artesanal. De R$ 22,00 por R$ 17,00.",
      price: 17.0,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    },

    // ── Explosão de Recheio
    {
      name: "Recheio é Vida 300ml",
      description: "Foco total em camadas fartas de recheio intercaladas com açaí aveludado.",
      price: 24.0,
      categoryId: catRecheio.id,
      category: catRecheio.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Recheio é Vida 500ml",
      description: "Recheios gourmet em todas as camadas e lateral completamente trufada.",
      price: 28.0,
      categoryId: catRecheio.id,
      category: catRecheio.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Recheio é Vida 700ml",
      description: "A experiência máxima de açaí gourmet farto de recheios artesanais. De R$ 36,00 por R$ 29,99.",
      price: 29.99,
      categoryId: catRecheio.id,
      category: catRecheio.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    },

    // ── Combos Família
    {
      name: "Combo 3x Açaí 300ml",
      description: "Sabores fixos artesanais com 3 copos de 300ml para saborear em conjunto.",
      price: 48.0,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Combo 5x Açaí 300ml",
      description: "5 copos de açaí cremoso para compartilhar com amigos e a família toda.",
      price: 70.0,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Combo 10x Açaí 300ml",
      description: "O maior combo da Pop Shake: 10 copos de 300ml perfeito para encontros, confraternizações e festas.",
      price: 120.0,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
    },

    // ── Sorvetes Artesanais
    {
      name: "Copo de Sorvete Tradicional",
      description: "Sorvete artesanal extremamente cremoso servido em copo especial no ponto ideal.",
      price: 10.99,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Sorvete Recheado Especial",
      description: "Sorvete cremoso com recheios artesanais de chocolate, leite condensado e castanhas selecionadas.",
      price: 13.98,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const createdProducts = [];
  for (const prod of productsData) {
    const p = await prisma.product.create({
      data: {
        name: prod.name,
        description: prod.description,
        price: prod.price,
        categoryId: prod.categoryId,
        category: prod.category,
        imageUrl: prod.imageUrl,
        stock: null, // Sob Demanda / Infinito
        isAvailable: true,
      },
    });
    createdProducts.push(p);
  }
  console.log(`✅ ${createdProducts.length} produtos cadastrados com sucesso!`);

  // 7. Cupons Promocionais
  console.log("🎟️ Cadastrando cupons...");
  await prisma.coupon.createMany({
    data: [
      {
        code: "BEMVINDO10",
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 20.0,
        isActive: true,
      },
      {
        code: "POPSHAKE5",
        discountType: "fixed",
        discountValue: 5.0,
        minOrderValue: 25.0,
        isActive: true,
      },
      {
        code: "QUEROACAI",
        discountType: "percentage",
        discountValue: 15,
        minOrderValue: 35.0,
        isActive: true,
      },
    ],
  });

  // 8. Cadastrar Clientes Fictícios Realistas
  console.log("👥 Cadastrando clientes com dados de contato e endereço...");
  const defaultPasswordHash = await bcrypt.hash("cliente123", 10);
  const createdUsers = [];

  for (let i = 0; i < CLIENT_PROFILES.length; i++) {
    const profile = CLIENT_PROFILES[i];
    const username = `cliente_${i + 1}`;
    const user = await prisma.user.create({
      data: {
        email: profile.email,
        username,
        passwordHash: defaultPasswordHash,
        fullName: profile.name,
        phone: profile.phone,
        role: "client",
      },
    });

    // Endereço salvo para o cliente
    const addr = CUIABA_ADDRESSES[i % CUIABA_ADDRESSES.length];
    await prisma.userLocation.create({
      data: {
        userId: user.id,
        name: "Casa",
        addressLine: `${addr.street}, ${addr.number} - ${addr.neighborhood}, Cuiabá - MT`,
        latitude: -15.5989 + (Math.random() - 0.5) * 0.05,
        longitude: -56.0949 + (Math.random() - 0.5) * 0.05,
        isDefault: true,
      },
    });

    createdUsers.push(user);
  }

  // 9. Geração de 105 Pedidos Históricos Distribuídos nos Últimos 45 Dias
  console.log("📊 Gerando massa de 105 pedidos históricos realistas (últimos 45 dias)...");

  const now = Date.now();
  const paymentTypes: PaymentMethodType[] = ["pix_entrega", "cartao_maquininha", "dinheiro"];

  // 5 Pedidos ativos para o dia de hoje na esteira Kanban
  const activeOrderStatuses: OrderStatus[] = ["pending", "accepted", "preparing", "preparing", "delivering"];

  const ordersToCreate = [];

  // Criar os 5 pedidos ativos de hoje
  for (let i = 0; i < 5; i++) {
    const status = activeOrderStatuses[i];
    const user = createdUsers[i % createdUsers.length];
    const addr = CUIABA_ADDRESSES[i % CUIABA_ADDRESSES.length];
    const isDelivery = i % 3 !== 0;

    // Itens aleatórios (1 a 2 itens)
    const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
    const q1 = Math.floor(Math.random() * 2) + 1;
    const subtotal = Number(p1.price) * q1;
    const deliveryFee = isDelivery ? (subtotal >= 60 ? 0 : 5.0) : 0;
    const totalAmount = subtotal + deliveryFee;

    // Horário de hoje entre 15h e agora
    const orderDate = new Date(now - (5 - i) * 15 * 60 * 1000); // últimos 75 minutos

    ordersToCreate.push({
      userId: user.id,
      status,
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      paymentMethodType: paymentTypes[i % paymentTypes.length],
      paymentChangeFor: paymentTypes[i % paymentTypes.length] === "dinheiro" ? totalAmount + 20 : null,
      deliveryStreet: isDelivery ? addr.street : "Retirada no Balcão da Loja",
      deliveryNumber: isDelivery ? addr.number : "S/N",
      deliveryNeighborhood: isDelivery ? addr.neighborhood : "Balcão",
      deliveryCity: "Cuiabá",
      deliveryZip: isDelivery ? addr.zip : null,
      createdAt: orderDate,
      updatedAt: orderDate,
      items: [{ productId: p1.id, quantity: q1, priceAtTime: Number(p1.price) }],
    });
  }

  // 3 Pedidos concluídos de hoje
  for (let i = 0; i < 3; i++) {
    const user = createdUsers[(i + 5) % createdUsers.length];
    const addr = CUIABA_ADDRESSES[(i + 5) % CUIABA_ADDRESSES.length];
    const isDelivery = true;

    const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
    const p2 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
    const subtotal = Number(p1.price) + Number(p2.price);
    const deliveryFee = subtotal >= 60 ? 0 : 5.0;
    const totalAmount = subtotal + deliveryFee;

    const orderDate = new Date(now - (4 + i) * 60 * 60 * 1000); // 4 a 6 horas atrás

    ordersToCreate.push({
      userId: user.id,
      status: "completed" as OrderStatus,
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      paymentMethodType: "pix_entrega" as PaymentMethodType,
      paymentChangeFor: null,
      deliveryStreet: addr.street,
      deliveryNumber: addr.number,
      deliveryNeighborhood: addr.neighborhood,
      deliveryCity: "Cuiabá",
      deliveryZip: addr.zip,
      createdAt: orderDate,
      updatedAt: orderDate,
      items: [
        { productId: p1.id, quantity: 1, priceAtTime: Number(p1.price) },
        { productId: p2.id, quantity: 1, priceAtTime: Number(p2.price) },
      ],
    });
  }

  // 97 Pedidos restantes espalhados pelos últimos 44 dias
  const remainingCount = 97;
  for (let i = 0; i < remainingCount; i++) {
    // Distribuição de dias: mais pedidos em dias recentes
    const dayOffset = Math.floor(Math.pow(Math.random(), 1.4) * 44) + 1; // 1 a 44 dias atrás

    // Pico de horário entre 15h e 22h
    const hour = Math.floor(15 + Math.random() * 7.5); // 15 às 22h
    const minute = Math.floor(Math.random() * 60);

    const orderDate = new Date(now - dayOffset * 86400000);
    orderDate.setHours(hour, minute, Math.floor(Math.random() * 60), 0);

    // Distribuição de status: ~90% completed, ~10% cancelled
    const isCancelled = Math.random() < 0.1;
    const status: OrderStatus = isCancelled ? "cancelled" : "completed";

    // Formas de pagamento: 65% pix, 25% cartão, 10% dinheiro
    const randPay = Math.random();
    let paymentMethodType: PaymentMethodType = "pix_entrega";
    if (randPay > 0.65 && randPay <= 0.9) {
      paymentMethodType = "cartao_maquininha";
    } else if (randPay > 0.9) {
      paymentMethodType = "dinheiro";
    }

    // Modalidade: 70% delivery, 30% balcão
    const isDelivery = Math.random() < 0.7;
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const addr = CUIABA_ADDRESSES[Math.floor(Math.random() * CUIABA_ADDRESSES.length)];

    // Itens: 1 a 3 itens variados
    const itemCount = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const prod = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const qty = Math.random() < 0.8 ? 1 : 2;
      items.push({
        productId: prod.id,
        quantity: qty,
        priceAtTime: Number(prod.price),
      });
      subtotal += Number(prod.price) * qty;
    }

    const deliveryFee = isDelivery ? (subtotal >= 60 ? 0 : 5.0) : 0;
    const totalAmount = subtotal + deliveryFee;

    ordersToCreate.push({
      userId: user.id,
      status,
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      paymentMethodType,
      paymentChangeFor: paymentMethodType === "dinheiro" ? Math.ceil(totalAmount / 10) * 10 + 10 : null,
      deliveryStreet: isDelivery ? addr.street : "Retirada no Balcão da Loja",
      deliveryNumber: isDelivery ? addr.number : "S/N",
      deliveryNeighborhood: isDelivery ? addr.neighborhood : "Balcão",
      deliveryCity: "Cuiabá",
      deliveryZip: isDelivery ? addr.zip : null,
      cancellationReason: isCancelled ? (Math.random() < 0.5 ? "Cliente solicitou o cancelamento" : "Endereço fora da área de entrega") : null,
      cancelledAt: isCancelled ? orderDate : null,
      createdAt: orderDate,
      updatedAt: orderDate,
      items,
    });
  }

  // Inserção no banco em ordem cronológica
  ordersToCreate.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const ord of ordersToCreate) {
    await prisma.order.create({
      data: {
        userId: ord.userId,
        status: ord.status,
        subtotal: ord.subtotal,
        deliveryFee: ord.deliveryFee,
        discountAmount: ord.discountAmount,
        totalAmount: ord.totalAmount,
        paymentMethodType: ord.paymentMethodType,
        paymentChangeFor: ord.paymentChangeFor,
        deliveryStreet: ord.deliveryStreet,
        deliveryNumber: ord.deliveryNumber,
        deliveryNeighborhood: ord.deliveryNeighborhood,
        deliveryCity: ord.deliveryCity,
        deliveryZip: ord.deliveryZip,
        cancellationReason: ord.cancellationReason,
        cancelledAt: ord.cancelledAt,
        createdAt: ord.createdAt,
        updatedAt: ord.updatedAt,
        items: {
          create: ord.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            priceAtTime: it.priceAtTime,
            createdAt: ord.createdAt,
          })),
        },
      },
    });
  }

  console.log(`✅ ${ordersToCreate.length} pedidos históricos criados com sucesso!`);
  console.log("🎉 Seed oficial da Pop Shake Sorveteria concluído com êxito!");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
