import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed no PostgreSQL puro...");

  // 1. Criar usuário Admin padrão
  const adminPasswordHash = await bcrypt.hash("@64844048", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@popclub.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "admin",
      username: "admin",
      fullName: "Administrador PopClub",
    },
    create: {
      email: "admin@popclub.com",
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "admin",
      fullName: "Administrador PopClub",
    },
  });
  console.log("✅ Admin configurado:", admin.email);

  // 2. Categorias
  const catAcai = await prisma.category.upsert({
    where: { slug: "acai-tradicional" },
    update: {},
    create: { name: "Açaí Tradicional", slug: "acai-tradicional" },
  });

  const catShakes = await prisma.category.upsert({
    where: { slug: "pop-shakes" },
    update: {},
    create: { name: "Pop Shakes", slug: "pop-shakes" },
  });

  const catCombos = await prisma.category.upsert({
    where: { slug: "combos-promos" },
    update: {},
    create: { name: "Combos & Promos", slug: "combos-promos" },
  });

  console.log("✅ Categorias configuradas");

  // 3. Produtos
  const pAcai700 = await prisma.product.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Açaí 700ml Especial",
      description: "Açaí puro batido na hora com banana, morango e granola crocante.",
      price: 24.90,
      categoryId: catAcai.id,
      category: catAcai.name,
      imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pCupuacu500 = await prisma.product.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Copo Cupuaçu 500ml",
      description: "Creme de cupuaçu artesanal cremoso com leite condensado e castanhas.",
      price: 18.50,
      categoryId: catAcai.id,
      category: catAcai.name,
      imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pShakeMorango = await prisma.product.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Pop Shake Morango Crocante",
      description: "Milk-shake batido com calda de morango artesanal e pedaços de cookies.",
      price: 21.00,
      categoryId: catShakes.id,
      category: catShakes.name,
      imageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80",
    },
  });

  const pShakeAcai = await prisma.product.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Pop Shake Açaí Power",
      description: "Combinação energética de açaí expresso, paçoca e chantilly cremoso.",
      price: 22.50,
      categoryId: catShakes.id,
      category: catShakes.name,
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    },
  });

  console.log("✅ Produtos cadastrados");

  // 4. Cupons
  await prisma.coupon.upsert({
    where: { code: "BEMVINDO10" },
    update: {},
    create: {
      code: "BEMVINDO10",
      discountType: "percentage",
      discountValue: 10,
      minOrderValue: 20.00,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "POPSHAKE5" },
    update: {},
    create: {
      code: "POPSHAKE5",
      discountType: "fixed",
      discountValue: 5.00,
      minOrderValue: 25.00,
      isActive: true,
    },
  });

  console.log("✅ Cupons cadastrados");

  // 5. Promoções Dinâmicas Iniciais
  const promoGalactico = await prisma.promotion.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Combo Galáctico",
      badge: "Promo",
      description: "Açaí 700ml + Cupuaçu 500ml com 20% OFF imperdível!",
      gradientStart: "#9306CF",
      gradientEnd: "#881BAA",
      discountType: "percentage",
      discountValue: 20,
      isActive: true,
      bannerImageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80",
    },
  });

  await prisma.promotionItem.deleteMany({ where: { promotionId: promoGalactico.id } });
  await prisma.promotionItem.createMany({
    data: [
      { promotionId: promoGalactico.id, productId: pAcai700.id, quantity: 1 },
      { promotionId: promoGalactico.id, productId: pCupuacu500.id, quantity: 1 },
    ],
  });

  const promoShakes = await prisma.promotion.upsert({
    where: { id: "22222222-2222-2222-2222-222222222222" },
    update: {},
    create: {
      id: "22222222-2222-2222-2222-222222222222",
      title: "Festival Pop Shakes",
      badge: "Dupla Especial",
      description: "Leve o Morango Crocante + Açaí Power com desconto exclusivo de R$ 8,00!",
      gradientStart: "#940068",
      gradientEnd: "#881BAA",
      discountType: "fixed",
      discountValue: 8.00,
      isActive: true,
      bannerImageUrl: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80",
    },
  });

  await prisma.promotionItem.deleteMany({ where: { promotionId: promoShakes.id } });
  await prisma.promotionItem.createMany({
    data: [
      { promotionId: promoShakes.id, productId: pShakeMorango.id, quantity: 1 },
      { promotionId: promoShakes.id, productId: pShakeAcai.id, quantity: 1 },
    ],
  });

  console.log("✅ Promoções dinâmicas e itens vinculados cadastrados com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
