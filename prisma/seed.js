"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// prisma/seed.ts
var import_client = require("@prisma/client");
var import_bcryptjs = __toESM(require("bcryptjs"));
var prisma = new import_client.PrismaClient();
var CUIABA_ADDRESSES = [
  { street: "Av. Isaac P\xF3voas", number: "1250", neighborhood: "Goiabeiras", zip: "78045-000" },
  { street: "Rua C\xE2ndido Mariano", number: "480", neighborhood: "Centro Norte", zip: "78005-150" },
  { street: "Av. Senador Metello", number: "920", neighborhood: "Porto", zip: "78025-100" },
  { street: "Rua das Amendoeiras", number: "310", neighborhood: "Bosque da Sa\xFAde", zip: "78050-020" },
  { street: "Av. Miguel Sutil", number: "4500", neighborhood: "Santa Rosa", zip: "78040-000" },
  { street: "Rua Buenos Aires", number: "215", neighborhood: "Jardim das Am\xE9ricas", zip: "78060-600" },
  { street: "Rua Estev\xE3o de Mendon\xE7a", number: "840", neighborhood: "Quilombo", zip: "78043-405" },
  { street: "Av. Ant\xE1rtica", number: "1120", neighborhood: "Santa Marta", zip: "78043-700" },
  { street: "Rua Almirante Barroso", number: "530", neighborhood: "Duque de Caxias", zip: "78043-300" },
  { street: "Rua Presidente Castelo Branco", number: "740", neighborhood: "Alvorada", zip: "78048-000" }
];
var CLIENT_PROFILES = [
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
  { name: "Amanda Rocha Albuquerque", email: "amanda.rocha@gmail.com", phone: "65992003388" }
];
async function main() {
  console.log("\u{1F368} [Pop Shake Sorveteria] Iniciando seed oficial completo...");
  console.log("\u{1F9F9} Limpando dados fict\xEDcios anteriores...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.userLocation.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { not: "admin@popclub.com" } }
  });
  const adminPasswordHash = await import_bcryptjs.default.hash("@64844048", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@popclub.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "admin",
      username: "admin",
      fullName: "Administrador Pop Shake"
    },
    create: {
      email: "admin@popclub.com",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "admin",
      fullName: "Administrador Pop Shake"
    }
  });
  console.log("\u2705 Admin oficial configurado:", admin.email);
  await prisma.storeSettings.upsert({
    where: { id: "store_config" },
    update: {
      deliveryFee: 5,
      freeDeliveryThreshold: 60,
      whatsappNumber: "5565999999999",
      whatsappMessage: "Ol\xE1! Gostaria de tirar uma d\xFAvida sobre os pedidos da Pop Shake Sorveteria."
    },
    create: {
      id: "store_config",
      deliveryFee: 5,
      freeDeliveryThreshold: 60,
      whatsappNumber: "5565999999999",
      whatsappMessage: "Ol\xE1! Gostaria de tirar uma d\xFAvida sobre os pedidos da Pop Shake Sorveteria."
    }
  });
  console.log("\u2705 Configura\xE7\xF5es da loja e WhatsApp comercial salvos");
  await prisma.highlightBanner.upsert({
    where: { id: "home_highlight" },
    update: {
      icon: "\u{1F368}",
      title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
      subtitle: "A\xE7a\xED batido na hora, cremoso e com frutas frescas, caldas e recheios artesanais.",
      badge: "Pop Shake Sorveteria"
    },
    create: {
      id: "home_highlight",
      icon: "\u{1F368}",
      title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
      subtitle: "A\xE7a\xED batido na hora, cremoso e com frutas frescas, caldas e recheios artesanais.",
      badge: "Pop Shake Sorveteria"
    }
  });
  console.log("\u{1F4C2} Cadastrando 6 categorias reais...");
  const catDestaques = await prisma.category.create({
    data: { name: "Destaques & Novidades", slug: "destaques-novidades" }
  });
  const catHits = await prisma.category.create({
    data: { name: "Linha Hits & Marmitas", slug: "linha-hits-marmitas" }
  });
  const catTradicional = await prisma.category.create({
    data: { name: "A\xE7a\xED Tradicional & Copos", slug: "acai-tradicional-copos" }
  });
  const catRecheio = await prisma.category.create({
    data: { name: "Explos\xE3o de Recheio", slug: "explosao-de-recheio" }
  });
  const catCombos = await prisma.category.create({
    data: { name: "Combos Fam\xEDlia", slug: "combos-familia" }
  });
  const catSorvetes = await prisma.category.create({
    data: { name: "Sorvetes Artesanais", slug: "sorvetes-artesanais" }
  });
  console.log("\u{1F4E6} Cadastrando 21 produtos oficiais com fotos reais...");
  const productsData = [
    // ── Destaques & Novidades
    {
      name: "A\xE7a\xED de Framboesa (Lan\xE7amento)",
      description: "A\xE7a\xED cremoso batido com framboesas frescas selecionadas e calda especial de frutas vermelhas. De R$ 15,00 por apenas R$ 10,00.",
      price: 10,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Os Gigantes do A\xE7a\xED (Barca & Marmita)",
      description: "Linha completa com barcas, marmitas e roletas fartas com acompanhamentos \xE0 vontade. A partir de R$ 18,99 (De R$ 99,99).",
      price: 18.99,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "A\xE7a\xED 500ml Do Seu Jeito",
      description: "Monte seu a\xE7a\xED escolhendo suas marcas, frutas e recheios favoritos. De R$ 15,00 por apenas R$ 10,00.",
      price: 10,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "A\xE7a\xED na Garrafa",
      description: "Praticidade e energia pura para levar onde quiser. A\xE7a\xED batido na textura ideal para beber a qualquer hora.",
      price: 10.01,
      categoryId: catDestaques.id,
      category: catDestaques.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80"
    },
    // ── Linha Hits & Marmitas
    {
      name: "Marmita Recheio Base + Topo Exclusivo Hits",
      description: "Camada dupla de recheio artesanal com a\xE7a\xED premium. De R$ 52,00 por apenas R$ 31,99.",
      price: 31.99,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "A\xE7a\xED 500ml Exclusivo Hits",
      description: "A\xE7a\xED batido na textura Hits com recheio especial no fundo e topo. De R$ 35,00 por R$ 17,98.",
      price: 17.98,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Hits em Dobro",
      description: "Combo promocional com dois copos Hits recheados. De R$ 42,00 por apenas R$ 28,00.",
      price: 28,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Monte Seu Hits (Copo/Marmita)",
      description: "Escolha o tamanho e monte sua combina\xE7\xE3o exclusiva Hits com seus recheios artesanais preferidos.",
      price: 16.5,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Marmita A\xE7a\xED Fam\xEDlia (1.1 Litros)",
      description: "Tamanho fam\xEDlia super caprichado com recheios fartos para compartilhar. De R$ 35,99 por R$ 26,99.",
      price: 26.99,
      categoryId: catHits.id,
      category: catHits.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80"
    },
    // ── Açaí Tradicional & Copos
    {
      name: "A\xE7a\xED 300ml Tradicional",
      description: "A\xE7a\xED puro batido na hora. Informe prefer\xEAncia por +Recheio ou +A\xE7a\xED nas observa\xE7\xF5es. De R$ 18,50 por R$ 16,50.",
      price: 16.5,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "A\xE7a\xED 500ml Tradicional",
      description: "A\xE7a\xED batido na hora com textura aveludada e ponto perfeito. De R$ 23,00 por apenas R$ 19,50.",
      price: 19.5,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "A\xE7a\xED 700ml Tradicional",
      description: "Copo generoso para quem tem fome de a\xE7a\xED puro. De R$ 28,00 por R$ 24,99.",
      price: 24.99,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "A\xE7a\xED Trufado 300ml",
      description: "Trufado com beijinho ou brigadeiro de panela artesanal. De R$ 22,00 por R$ 17,00.",
      price: 17,
      categoryId: catTradicional.id,
      category: catTradicional.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80"
    },
    // ── Explosão de Recheio
    {
      name: "Recheio \xE9 Vida 300ml",
      description: "Foco total em camadas fartas de recheio intercaladas com a\xE7a\xED aveludado.",
      price: 24,
      categoryId: catRecheio.id,
      category: catRecheio.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Recheio \xE9 Vida 500ml",
      description: "Recheios gourmet em todas as camadas e lateral completamente trufada.",
      price: 28,
      categoryId: catRecheio.id,
      category: catRecheio.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Recheio \xE9 Vida 700ml",
      description: "A experi\xEAncia m\xE1xima de a\xE7a\xED gourmet farto de recheios artesanais. De R$ 36,00 por R$ 29,99.",
      price: 29.99,
      categoryId: catRecheio.id,
      category: catRecheio.name,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"
    },
    // ── Combos Família
    {
      name: "Combo 3x A\xE7a\xED 300ml",
      description: "Sabores fixos artesanais com 3 copos de 300ml para saborear em conjunto.",
      price: 48,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Combo 5x A\xE7a\xED 300ml",
      description: "5 copos de a\xE7a\xED cremoso para compartilhar com amigos e a fam\xEDlia toda.",
      price: 70,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Combo 10x A\xE7a\xED 300ml",
      description: "O maior combo da Pop Shake: 10 copos de 300ml perfeito para encontros, confraterniza\xE7\xF5es e festas.",
      price: 120,
      categoryId: catCombos.id,
      category: catCombos.name,
      imageUrl: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80"
    },
    // ── Sorvetes Artesanais
    {
      name: "Copo de Sorvete Tradicional",
      description: "Sorvete artesanal extremamente cremoso servido em copo especial no ponto ideal.",
      price: 10.99,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80"
    },
    {
      name: "Sorvete Recheado Especial",
      description: "Sorvete cremoso com recheios artesanais de chocolate, leite condensado e castanhas selecionadas.",
      price: 13.98,
      categoryId: catSorvetes.id,
      category: catSorvetes.name,
      imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80"
    }
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
        stock: null,
        // Sob Demanda / Infinito
        isAvailable: true
      }
    });
    createdProducts.push(p);
  }
  console.log(`\u2705 ${createdProducts.length} produtos cadastrados com sucesso!`);
  console.log("\u{1F3F7}\uFE0F Cadastrando selos e vinculando a produtos...");
  await prisma.cardBadge.deleteMany();
  const badgeCombo = await prisma.cardBadge.create({
    data: { text: "Combo", icon: "\u26A1", bgColor: "#FEF3C7", textColor: "#B45309" }
  });
  const badgeMaisPedido = await prisma.cardBadge.create({
    data: { text: "Mais Pedido", icon: "\u{1F525}", bgColor: "#FEE2E2", textColor: "#DC2626" }
  });
  const badgeLancamento = await prisma.cardBadge.create({
    data: { text: "Lan\xE7amento", icon: "\u2728", bgColor: "#F3E8FF", textColor: "#7E22CE" }
  });
  const badgeRefrescante = await prisma.cardBadge.create({
    data: { text: "Refresc\xE2ncia Pura", icon: "\u2744\uFE0F", bgColor: "#E0F2FE", textColor: "#0369A1" }
  });
  const badgeOff = await prisma.cardBadge.create({
    data: { text: "20% OFF", icon: "\u{1F3F7}\uFE0F", bgColor: "#DCFCE7", textColor: "#15803D" }
  });
  const linkBadgeToProduct = async (badgeId, partialName) => {
    const prod = createdProducts.find(
      (p) => p.name.toLowerCase().includes(partialName.toLowerCase())
    );
    if (prod) {
      await prisma.product.update({ where: { id: prod.id }, data: { cardBadgeId: badgeId } });
    }
  };
  await linkBadgeToProduct(badgeLancamento.id, "Framboesa");
  await linkBadgeToProduct(badgeMaisPedido.id, "500ml Do Seu Jeito");
  await linkBadgeToProduct(badgeCombo.id, "Hits em Dobro");
  await linkBadgeToProduct(badgeCombo.id, "Combo");
  await linkBadgeToProduct(badgeRefrescante.id, "Recheio \xE9 Vida");
  await linkBadgeToProduct(badgeOff.id, "Sorvete Artesanal");
  await linkBadgeToProduct(badgeOff.id, "na Garrafa");
  console.log("\u2705 Selos criados e vinculados a produtos com sucesso!");
  console.log("\u{1F3A8} Cadastrando avatares oficiais...");
  const avatarPresetsData = [
    { name: "Sundae Amora", description: "Cl\xE1ssico sundae com calda de amora", imageUrl: "/avatars/avatar-sorvete.svg", category: "Sobremesas", order: 1 },
    { name: "Tigela de A\xE7a\xED", description: "A\xE7a\xED cremoso com banana e morango", imageUrl: "/avatars/avatar-acai.svg", category: "A\xE7a\xED", order: 2 },
    { name: "Milk Shake", description: "Milk shake cremoso refrescante", imageUrl: "/avatars/avatar-shake.svg", category: "Bebidas", order: 3 },
    { name: "Picol\xE9 Frutas", description: "Picol\xE9 artesanal de frutas tropicais", imageUrl: "/avatars/avatar-picole.svg", category: "Picol\xE9s", order: 4 },
    { name: "Morango Pop", description: "Morango doce e selecionado", imageUrl: "/avatars/avatar-morango.svg", category: "Frutas", order: 5 },
    { name: "Banana Split", description: "Banana ouro com toque especial", imageUrl: "/avatars/avatar-banana.svg", category: "Frutas", order: 6 },
    { name: "Cookie Choco", description: "Cookie crocante com gotas de chocolate", imageUrl: "/avatars/avatar-cookie.svg", category: "Gourmet", order: 7 },
    { name: "Cereja Pop", description: "Toque final irresist\xEDvel", imageUrl: "/avatars/avatar-cereja.svg", category: "Frutas", order: 8 },
    { name: "Casquinha Dupla", description: "Casquinha crocante com dois sabores", imageUrl: "/avatars/avatar-casquinha.svg", category: "Sorvetes", order: 9 },
    { name: "Mestre Gelateiro", description: "Toque profissional de confeitaria", imageUrl: "/avatars/avatar-chef.svg", category: "Especiais", order: 10 }
  ];
  for (const av of avatarPresetsData) {
    await prisma.avatarPreset.upsert({
      where: { id: `preset_${av.order}` },
      update: {
        name: av.name,
        description: av.description,
        imageUrl: av.imageUrl,
        category: av.category,
        order: av.order,
        isActive: true
      },
      create: {
        id: `preset_${av.order}`,
        name: av.name,
        description: av.description,
        imageUrl: av.imageUrl,
        category: av.category,
        order: av.order,
        isActive: true
      }
    });
  }
  console.log("\u2705 Avatares oficiais cadastrados com sucesso!");
  console.log("\u{1F39F}\uFE0F Cadastrando cupons...");
  await prisma.coupon.createMany({
    data: [
      {
        code: "BEMVINDO10",
        discountType: "percentage",
        discountValue: 10,
        minOrderValue: 20,
        isActive: true
      },
      {
        code: "POPSHAKE5",
        discountType: "fixed",
        discountValue: 5,
        minOrderValue: 25,
        isActive: true
      },
      {
        code: "QUEROACAI",
        discountType: "percentage",
        discountValue: 15,
        minOrderValue: 35,
        isActive: true
      }
    ]
  });
  console.log("\u{1F465} Cadastrando clientes com dados de contato e endere\xE7o...");
  const defaultPasswordHash = await import_bcryptjs.default.hash("cliente123", 10);
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
        role: "client"
      }
    });
    const addr = CUIABA_ADDRESSES[i % CUIABA_ADDRESSES.length];
    await prisma.userLocation.create({
      data: {
        userId: user.id,
        name: "Casa",
        addressLine: `${addr.street}, ${addr.number} - ${addr.neighborhood}, Cuiab\xE1 - MT`,
        latitude: -15.5989 + (Math.random() - 0.5) * 0.05,
        longitude: -56.0949 + (Math.random() - 0.5) * 0.05,
        isDefault: true
      }
    });
    createdUsers.push(user);
  }
  console.log("\u{1F4CA} Gerando massa de 105 pedidos hist\xF3ricos realistas (\xFAltimos 45 dias)...");
  const now = Date.now();
  const paymentTypes = ["pix_entrega", "cartao_maquininha", "dinheiro"];
  const activeOrderStatuses = ["pending", "accepted", "preparing", "preparing", "delivering"];
  const statusDelayMinutes = {
    pending: [3, 8],
    accepted: [6, 13],
    preparing: [12, 22],
    delivering: [18, 35],
    completed: [35, 65]
  };
  const ordersToCreate = [];
  for (let i = 0; i < 5; i++) {
    const status = activeOrderStatuses[i];
    const user = createdUsers[i % createdUsers.length];
    const addr = CUIABA_ADDRESSES[i % CUIABA_ADDRESSES.length];
    const isDelivery = i % 3 !== 0;
    const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
    const q1 = Math.floor(Math.random() * 2) + 1;
    const subtotal = Number(p1.price) * q1;
    const deliveryFee = isDelivery ? subtotal >= 60 ? 0 : 5 : 0;
    const totalAmount = subtotal + deliveryFee;
    const [minMins, maxMins] = statusDelayMinutes[status] || [5, 15];
    const delayMins = minMins + Math.floor(Math.random() * (maxMins - minMins + 1));
    const orderDate = new Date(now - delayMins * 60 * 1e3);
    ordersToCreate.push({
      userId: user.id,
      status,
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      paymentMethodType: paymentTypes[i % paymentTypes.length],
      paymentChangeFor: paymentTypes[i % paymentTypes.length] === "dinheiro" ? totalAmount + 20 : null,
      deliveryStreet: isDelivery ? addr.street : "Retirada no Balc\xE3o da Loja",
      deliveryNumber: isDelivery ? addr.number : "S/N",
      deliveryNeighborhood: isDelivery ? addr.neighborhood : "Balc\xE3o",
      deliveryCity: "Cuiab\xE1",
      deliveryZip: isDelivery ? addr.zip : null,
      createdAt: orderDate,
      updatedAt: orderDate,
      items: [{ productId: p1.id, quantity: q1, priceAtTime: Number(p1.price) }]
    });
  }
  for (let i = 0; i < 3; i++) {
    const user = createdUsers[(i + 5) % createdUsers.length];
    const addr = CUIABA_ADDRESSES[(i + 5) % CUIABA_ADDRESSES.length];
    const isDelivery = true;
    const p1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
    const p2 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
    const subtotal = Number(p1.price) + Number(p2.price);
    const deliveryFee = subtotal >= 60 ? 0 : 5;
    const totalAmount = subtotal + deliveryFee;
    const orderDate = new Date(now - (4 + i) * 60 * 60 * 1e3);
    ordersToCreate.push({
      userId: user.id,
      status: "completed",
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      paymentMethodType: "pix_entrega",
      paymentChangeFor: null,
      deliveryStreet: addr.street,
      deliveryNumber: addr.number,
      deliveryNeighborhood: addr.neighborhood,
      deliveryCity: "Cuiab\xE1",
      deliveryZip: addr.zip,
      createdAt: orderDate,
      updatedAt: orderDate,
      items: [
        { productId: p1.id, quantity: 1, priceAtTime: Number(p1.price) },
        { productId: p2.id, quantity: 1, priceAtTime: Number(p2.price) }
      ]
    });
  }
  const remainingCount = 97;
  for (let i = 0; i < remainingCount; i++) {
    const dayOffset = Math.floor(Math.pow(Math.random(), 1.4) * 44) + 1;
    const hour = Math.floor(15 + Math.random() * 7.5);
    const minute = Math.floor(Math.random() * 60);
    const orderDate = new Date(now - dayOffset * 864e5);
    orderDate.setHours(hour, minute, Math.floor(Math.random() * 60), 0);
    const isCancelled = Math.random() < 0.1;
    const status = isCancelled ? "cancelled" : "completed";
    const randPay = Math.random();
    let paymentMethodType = "pix_entrega";
    if (randPay > 0.65 && randPay <= 0.9) {
      paymentMethodType = "cartao_maquininha";
    } else if (randPay > 0.9) {
      paymentMethodType = "dinheiro";
    }
    const isDelivery = Math.random() < 0.7;
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const addr = CUIABA_ADDRESSES[Math.floor(Math.random() * CUIABA_ADDRESSES.length)];
    const itemCount = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const prod = createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const qty = Math.random() < 0.8 ? 1 : 2;
      items.push({
        productId: prod.id,
        quantity: qty,
        priceAtTime: Number(prod.price)
      });
      subtotal += Number(prod.price) * qty;
    }
    const deliveryFee = isDelivery ? subtotal >= 60 ? 0 : 5 : 0;
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
      deliveryStreet: isDelivery ? addr.street : "Retirada no Balc\xE3o da Loja",
      deliveryNumber: isDelivery ? addr.number : "S/N",
      deliveryNeighborhood: isDelivery ? addr.neighborhood : "Balc\xE3o",
      deliveryCity: "Cuiab\xE1",
      deliveryZip: isDelivery ? addr.zip : null,
      cancellationReason: isCancelled ? Math.random() < 0.5 ? "Cliente solicitou o cancelamento" : "Endere\xE7o fora da \xE1rea de entrega" : null,
      cancelledAt: isCancelled ? orderDate : null,
      createdAt: orderDate,
      updatedAt: orderDate,
      items
    });
  }
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
            createdAt: ord.createdAt
          }))
        }
      }
    });
  }
  console.log(`\u2705 ${ordersToCreate.length} pedidos hist\xF3ricos criados com sucesso!`);
  console.log("\u{1F389} Seed oficial da Pop Shake Sorveteria conclu\xEDdo com \xEAxito!");
}
main().catch((e) => {
  console.error("\u274C Erro ao executar seed:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
