import { prisma } from "../src/lib/prisma";
import { calculateProductPrice } from "../src/lib/pricing";

async function main() {
  console.log("🔍 [Auditoria Pop Shake] Iniciando verificação completa do catálogo...");

  let hasErrors = false;

  // 1. Contagem exata de categorias criadas (8 categorias)
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: {
      products: true,
    },
  });

  console.log("\n==================================================");
  console.log(`📂 CATEGORIAS REGISTRADAS (${categories.length}/8):`);
  console.log("==================================================");

  if (categories.length !== 8) {
    console.error(`❌ ERRO: Esperava exatamente 8 categorias, encontrou ${categories.length}.`);
    hasErrors = true;
  } else {
    console.log(`✅ Contagem de categorias correta: 8 categorias.`);
  }

  // 2. Contagem de produtos por categoria
  for (const cat of categories) {
    console.log(`  [Ordem ${cat.order}] ${cat.name} ${cat.isDynamic ? "(Dinâmica: " + cat.dynamicType + ")" : ""}: ${cat.products.length} produtos cadastrados`);
  }

  // 3. Validação do cálculo de promoção temporal (preço original vs. promocional)
  console.log("\n==================================================");
  console.log("⚡ TESTE DE PROMOÇÃO TEMPORAL (calculateProductPrice):");
  console.log("==================================================");

  const promoProduct = await prisma.product.findFirst({
    where: {
      promotionalPrice: { not: null },
      isPromoActive: true,
    },
  });

  if (!promoProduct) {
    console.error("❌ ERRO: Nenhum produto com preço promocional encontrado para teste.");
    hasErrors = true;
  } else {
    console.log(`Testando produto: "${promoProduct.name}"`);
    console.log(`  Original: R$ ${promoProduct.originalPrice} | Promo: R$ ${promoProduct.promotionalPrice}`);
    console.log(`  Janela: ${promoProduct.startsAt?.toISOString()} até ${promoProduct.endsAt?.toISOString()}`);

    // Cenário A: Durante a vigência
    const pricingActive = calculateProductPrice(promoProduct as any);
    console.log(`  -> Durante a promoção: Preço Vigente = R$ ${pricingActive.currentPrice.toFixed(2)}, Preço Original = R$ ${pricingActive.originalPrice.toFixed(2)}, Promocional? ${pricingActive.isPromotional}, Desconto = ${pricingActive.discountPercent}%`);

    if (!pricingActive.isPromotional || pricingActive.currentPrice !== Number(promoProduct.promotionalPrice)) {
      console.error("❌ ERRO: Cálculo de promoção ativa falhou!");
      hasErrors = true;
    } else {
      console.log("  ✅ Cálculo em vigência aprovado com sucesso.");
    }

    // Cenário B: Promoção expirada (simulada)
    const expiredProduct = {
      ...promoProduct,
      endsAt: new Date(Date.now() - 3600000), // Expirou há 1 hora
    };
    const pricingExpired = calculateProductPrice(expiredProduct as any);
    console.log(`  -> Após expiração (endsAt < agora): Preço Vigente = R$ ${pricingExpired.currentPrice.toFixed(2)}, Promocional? ${pricingExpired.isPromotional}`);

    if (pricingExpired.isPromotional || pricingExpired.currentPrice !== Number(promoProduct.originalPrice)) {
      console.error("❌ ERRO: Promoção expirada não reverteu para o originalPrice!");
      hasErrors = true;
    } else {
      console.log("  ✅ Reversão automática pós-expiração aprovada com sucesso.");
    }
  }

  // 4. Validação da montagem independente de sub-itens no Combo Casal
  console.log("\n==================================================");
  console.log("⚡ TESTE DE MONTAGEM INDEPENDENTE (Combo Casal):");
  console.log("==================================================");

  const comboCasal = await prisma.product.findFirst({
    where: {
      name: { contains: "Combo Casal" },
    },
    include: {
      addonGroups: {
        include: {
          group: {
            include: {
              items: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!comboCasal) {
    console.error("❌ ERRO: Combo Casal não encontrado no banco de dados.");
    hasErrors = true;
  } else {
    console.log(`Produto encontrado: "${comboCasal.name}" (${comboCasal.servesText || "Sem rendimento"})`);
    console.log(`Grupos de adicionais vinculados: ${comboCasal.addonGroups.length}`);

    const copo1Group = comboCasal.addonGroups.find((g) => g.group.name.includes("Copo 1"));
    const copo2Group = comboCasal.addonGroups.find((g) => g.group.name.includes("Copo 2"));
    const talheresGroup = comboCasal.addonGroups.find((g) => g.group.name.includes("Talheres"));

    if (!copo1Group) {
      console.error("❌ ERRO: Grupo do Copo 1 ausente no Combo Casal.");
      hasErrors = true;
    } else {
      console.log(`  ✅ Grupo Copo 1 presente: "${copo1Group.group.name}" (Cota grátis: ${copo1Group.group.freeQuantity}, Itens: ${copo1Group.group.items.length})`);
    }

    if (!copo2Group) {
      console.error("❌ ERRO: Grupo do Copo 2 ausente no Combo Casal.");
      hasErrors = true;
    } else {
      console.log(`  ✅ Grupo Copo 2 presente: "${copo2Group.group.name}" (Cota grátis: ${copo2Group.group.freeQuantity}, Itens: ${copo2Group.group.items.length})`);
    }

    if (copo1Group && copo2Group && copo1Group.groupId === copo2Group.groupId) {
      console.error("❌ ERRO: Copo 1 e Copo 2 compartilham o mesmo grupo em vez de grupos independentes!");
      hasErrors = true;
    } else if (copo1Group && copo2Group) {
      console.log(`  ✅ Grupos independentes confirmados: Copo 1 (${copo1Group.groupId}) != Copo 2 (${copo2Group.groupId})`);
    }

    if (!talheresGroup) {
      console.error("❌ ERRO: Grupo de talheres ausente no Combo Casal.");
      hasErrors = true;
    } else {
      console.log(`  ✅ Grupo Talheres presente: "${talheresGroup.group.name}"`);
    }
  }

  // 5. Verificação da categoria dinâmica de Destaques
  console.log("\n==================================================");
  console.log("⭐ VERIFICAÇÃO DE DESTAQUES DA CASA:");
  console.log("==================================================");
  const highlights = await prisma.product.findMany({
    where: {
      OR: [
        { isHighlight: true },
        { isPromoActive: true, promotionalPrice: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      price: true,
      promotionalPrice: true,
      originalPrice: true,
      isHighlight: true,
    },
  });

  console.log(`Total de produtos elegíveis para a categoria dinâmica: ${highlights.length}`);
  highlights.forEach((h) => {
    console.log(`  - [${h.isHighlight ? "⭐ DESTAQUE" : "⚡ PROMO"}] ${h.name} -> R$ ${h.promotionalPrice || h.price}`);
  });

  console.log("\n==================================================");
  if (hasErrors) {
    console.error("❌ AUDITORIA CONCLUÍDA COM FALHAS.");
    process.exit(1);
  } else {
    console.log("🎉 AUDITORIA CONCLUÍDA COM SUCESSO TOTAL! TODOS OS TESTES PASSARAM.");
  }
}

main()
  .catch((e) => {
    console.error("Erro no script de verificação:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
