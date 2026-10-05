import { prisma } from "../src/lib/prisma";

export async function setupE2EScenario() {
  console.log("🔧 [E2E Setup] Configurando dados dos 3 cenários de teste...");

  // 1. Categoria Shakes & Categoria Açaís
  const shakeCategory = await prisma.category.findFirst({
    where: { slug: "milk-shakes-cremosos" },
  }) || await prisma.category.findFirst();

  const acaiCategory = await prisma.category.findFirst({
    where: { slug: "copos-acai-tradicionais" },
  }) || await prisma.category.findFirst();

  const comboCategory = await prisma.category.findFirst({
    where: { slug: "combos-popclub" },
  }) || await prisma.category.findFirst();

  // -------------------------------------------------------------
  // PRODUTO 1: Milk Shake Ovomaltine 500ml (Sem promoção, R$ 26,00)
  // -------------------------------------------------------------
  let shake500 = await prisma.product.findFirst({
    where: { name: "Milk Shake Ovomaltine 500ml" },
  });

  if (!shake500) {
    shake500 = await prisma.product.create({
      data: {
        name: "Milk Shake Ovomaltine 500ml",
        description: "Delicioso milk shake artesanal com generosa dose de Ovomaltine suíço crocante.",
        price: 26.00,
        servesText: "Serve 1 pessoa",
        categoryId: shakeCategory?.id,
        category: shakeCategory?.name || "Shakes",
        imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
        isAvailable: true,
      },
    });
  } else {
    shake500 = await prisma.product.update({
      where: { id: shake500.id },
      data: {
        price: 26.00,
        servesText: "Serve 1 pessoa",
        isAvailable: true,
      },
    });
  }

  // Remove qualquer promoção associada ao Produto 1 para garantir preço cheio integral
  await prisma.promotion.deleteMany({
    where: { productId: shake500.id },
  });

  // Grupo de complementos do Shake (Chantilly Especial +R$ 3,50 e Canudo/Colher)
  let groupShakeAddons = await prisma.addonGroup.findFirst({
    where: { name: "Complementos do Shake (Opcional)" },
    include: { items: true },
  });

  if (!groupShakeAddons) {
    groupShakeAddons = await prisma.addonGroup.create({
      data: {
        name: "Complementos do Shake (Opcional)",
        description: "Adicione coberturas e extras ao seu milk shake",
        minQuantity: 0,
        maxQuantity: 5,
        freeQuantity: 0,
        isRequired: false,
        sortOrder: 1,
        items: {
          create: [
            { name: "Chantilly Especial", price: 3.50, sortOrder: 1 },
            { name: "Calda Extra de Chocolate", price: 2.50, sortOrder: 2 },
            { name: "Farofa de Ovomaltine Extra", price: 3.00, sortOrder: 3 },
          ],
        },
      },
      include: { items: true },
    });
  } else {
    // Garante que o item Chantilly Especial existe com R$ 3,50
    const chantilly = groupShakeAddons.items.find(i => i.name.includes("Chantilly"));
    if (!chantilly) {
      await prisma.addonItem.create({
        data: {
          groupId: groupShakeAddons.id,
          name: "Chantilly Especial",
          price: 3.50,
          sortOrder: 1,
        },
      });
    } else {
      await prisma.addonItem.update({
        where: { id: chantilly.id },
        data: { price: 3.50 },
      });
    }
  }

  // Vincula o grupo ao Produto 1 se ainda não estiver
  await prisma.productAddonGroup.upsert({
    where: {
      productId_groupId: {
        productId: shake500.id,
        groupId: groupShakeAddons.id,
      },
    },
    create: {
      productId: shake500.id,
      groupId: groupShakeAddons.id,
      sortOrder: 1,
    },
    update: {},
  });

  // -------------------------------------------------------------
  // PRODUTO 2: Copo 500ml com Promoção Ativa (De R$ 39,99 por R$ 29,69)
  // -------------------------------------------------------------
  let copo500 = await prisma.product.findFirst({
    where: {
      name: "Copo Pop 500ml Turbinado",
    },
  });

  if (!copo500) {
    copo500 = await prisma.product.create({
      data: {
        name: "Copo Pop 500ml Turbinado",
        description: "Copo clássico de 500ml de açaí artesanal super cremoso batido na hora.",
        price: 39.99,
        servesText: "Serve 1 pessoa",
        categoryId: acaiCategory?.id,
        category: acaiCategory?.name || "Açaís",
        imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
        isHighlight: true,
        isAvailable: true,
      },
    });
  } else {
    copo500 = await prisma.product.update({
      where: { id: copo500.id },
      data: {
        price: 39.99,
        servesText: "Serve 1 pessoa",
        isHighlight: true,
        isAvailable: true,
      },
    });
  }

  // Garante a promoção ativa e vigente para o Copo 500ml
  await prisma.promotion.deleteMany({
    where: { productId: copo500.id },
  });

  const now = new Date();
  const startsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 dia atrás
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Daqui a 30 dias

  await prisma.promotion.create({
    data: {
      title: "Super Promoção Copo 500ml",
      badge: "-26%",
      description: "De R$ 39,99 por apenas R$ 29,69 por tempo limitado!",
      productId: copo500.id,
      discountType: "fixed",
      discountValue: 29.69,
      startsAt,
      expiresAt,
      isActive: true,
    },
  });

  // Garante grupos de adicionais do Copo 500ml:
  // - Tradicionais (4 grátis): Granola, Paçoca, Leite em Pó, Banana, Morango Fresco, etc.
  // - Cremes Nobres: Nutella Original (+R$ 7,00)
  // - Talheres: Colher (+R$ 0,98)
  let groupTradicionais = await prisma.addonGroup.findFirst({
    where: { name: { contains: "Tradicionais (Até 4 grátis)" } },
    include: { items: true },
  });

  if (!groupTradicionais) {
    groupTradicionais = await prisma.addonGroup.create({
      data: {
        name: "Acompanhamentos Tradicionais (Até 4 grátis)",
        description: "Escolha até 4 acompanhamentos tradicionais inclusos sem custo extra.",
        minQuantity: 0,
        maxQuantity: 10,
        freeQuantity: 4,
        isRequired: false,
        sortOrder: 1,
        items: {
          create: [
            { name: "Granola Tradicional Crocante", price: 1.5, sortOrder: 1 },
            { name: "Paçoca Rolha Esfarelada", price: 1.5, sortOrder: 2 },
            { name: "Leite em Pó Ninho", price: 1.5, sortOrder: 3 },
            { name: "Banana Fatiada", price: 1.5, sortOrder: 4 },
            { name: "Morango Fresco", price: 1.5, sortOrder: 5 },
            { name: "Leite Condensado Moça", price: 1.5, sortOrder: 6 },
            { name: "Chocoball Crocante", price: 1.5, sortOrder: 7 },
            { name: "Amendoim Torrado", price: 1.5, sortOrder: 8 },
            { name: "Confetes de Chocolate M&M", price: 1.5, sortOrder: 9 },
          ],
        },
      },
      include: { items: true },
    });
  }

  let groupCremes = await prisma.addonGroup.findFirst({
    where: { name: { contains: "Cremes & Frutas Nobres" } },
    include: { items: true },
  });

  if (!groupCremes) {
    groupCremes = await prisma.addonGroup.create({
      data: {
        name: "Cremes & Frutas Nobres (Opcional)",
        description: "Adicionais gourmet preparados com ingredientes nobres",
        minQuantity: 0,
        maxQuantity: 5,
        freeQuantity: 0,
        isRequired: false,
        sortOrder: 2,
        items: {
          create: [
            { name: "Nutella Original Pura (+R$ 7,00)", price: 7.00, sortOrder: 1 },
            { name: "Creme de Leite Ninho (+R$ 5,00)", price: 5.00, sortOrder: 2 },
          ],
        },
      },
      include: { items: true },
    });
  } else {
    const nutella = groupCremes.items.find(i => i.name.includes("Nutella"));
    if (!nutella) {
      await prisma.addonItem.create({
        data: {
          groupId: groupCremes.id,
          name: "Nutella Original Pura (+R$ 7,00)",
          price: 7.00,
          sortOrder: 1,
        },
      });
    }
    const ninho = groupCremes.items.find(i => i.name.includes("Ninho"));
    if (!ninho) {
      await prisma.addonItem.create({
        data: {
          groupId: groupCremes.id,
          name: "Creme de Leite Ninho (+R$ 5,00)",
          price: 5.00,
          sortOrder: 2,
        },
      });
    }
  }

  let groupTalheres = await prisma.addonGroup.findFirst({
    where: { name: { contains: "Talheres e Descartáveis" } },
    include: { items: true },
  });

  if (!groupTalheres) {
    groupTalheres = await prisma.addonGroup.create({
      data: {
        name: "Talheres e Descartáveis",
        description: "Precisa de colher ou guardanapo?",
        minQuantity: 0,
        maxQuantity: 5,
        freeQuantity: 0,
        isRequired: false,
        sortOrder: 3,
        items: {
          create: [
            { name: "Colher reforçada descartável", price: 0.98, sortOrder: 1 },
          ],
        },
      },
      include: { items: true },
    });
  }

  // Vincula grupos ao Copo 500ml
  for (const [idx, g] of [groupTradicionais, groupCremes, groupTalheres].entries()) {
    await prisma.productAddonGroup.upsert({
      where: {
        productId_groupId: {
          productId: copo500.id,
          groupId: g.id,
        },
      },
      create: {
        productId: copo500.id,
        groupId: g.id,
        sortOrder: idx + 1,
      },
      update: {},
    });
  }

  // -------------------------------------------------------------
  // PRODUTO 3: Combo Casal (2 Copos de 400ml - R$ 47,00)
  // -------------------------------------------------------------
  // 3.1 Produto Filho: Copo 400ml Tradicional (R$ 25,90)
  let copo400 = await prisma.product.findFirst({
    where: { name: "Copo 400ml Tradicional" },
  });

  if (!copo400) {
    copo400 = await prisma.product.create({
      data: {
        name: "Copo 400ml Tradicional",
        description: "Copo médio de 400ml de açaí artesanal super cremoso batido na hora.",
        price: 25.90,
        servesText: "Serve 1 pessoa",
        categoryId: acaiCategory?.id,
        category: acaiCategory?.name || "Açaís",
        imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80",
        isAvailable: true,
      },
    });
  }

  // Vincula os grupos de complementos ao copo filho de 400ml
  for (const [idx, g] of [groupTradicionais, groupCremes, groupTalheres].entries()) {
    await prisma.productAddonGroup.upsert({
      where: {
        productId_groupId: {
          productId: copo400.id,
          groupId: g.id,
        },
      },
      create: {
        productId: copo400.id,
        groupId: g.id,
        sortOrder: idx + 1,
      },
      update: {},
    });
  }

  // 3.2 O Combo Pai: "Combo Casal (2 Copos de 400ml)"
  let comboCasal = await prisma.product.findFirst({
    where: {
      OR: [
        { name: "Combo Casal (2 Copos de 400ml)" },
        { name: { contains: "Combo Casal" } },
      ],
      isCombo: true,
    },
  });

  if (!comboCasal) {
    comboCasal = await prisma.product.create({
      data: {
        name: "Combo Casal (2 Copos de 400ml)",
        description: "2 Copos de 400ml caprichados com acompanhamentos independentes à sua escolha.",
        price: 47.00,
        servesText: "Serve 2 pessoas",
        isCombo: true,
        categoryId: comboCategory?.id,
        category: comboCategory?.name || "Combos",
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
        isAvailable: true,
      },
    });
  } else {
    comboCasal = await prisma.product.update({
      where: { id: comboCasal.id },
      data: {
        name: "Combo Casal (2 Copos de 400ml)",
        price: 47.00,
        servesText: "Serve 2 pessoas",
        isCombo: true,
        isAvailable: true,
      },
    });
  }

  // Garante a relação comboItems com 2 unidades do Copo 400ml
  await prisma.comboItem.deleteMany({
    where: { comboId: comboCasal.id },
  });

  await prisma.comboItem.create({
    data: {
      comboId: comboCasal.id,
      productId: copo400.id,
      quantity: 2,
    },
  });

  console.log("✅ [E2E Setup] Produtos e cenários preparados com sucesso:");
  console.log(`   1. Produto Normal: "${shake500.name}" -> R$ ${shake500.price}`);
  console.log(`   2. Produto em Promoção: "${copo500.name}" -> De R$ ${copo500.price} por R$ 29,69 (-26%)`);
  console.log(`   3. Combo Casal: "${comboCasal.name}" -> R$ ${comboCasal.price} (2x ${copo400.name})`);

  return {
    shake500,
    copo500,
    copo400,
    comboCasal,
    groupTradicionais,
    groupCremes,
    groupTalheres,
    groupShakeAddons,
  };
}

if (require.main === module) {
  setupE2EScenario()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Erro ao configurar cenário E2E:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
