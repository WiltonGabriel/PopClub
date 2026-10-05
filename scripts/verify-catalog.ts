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

  // 3. Validação do cálculo de promoção temporal (modelo oficial Promotion)
  console.log("\n==================================================");
  console.log("⚡ TESTE DE PROMOÇÃO TEMPORAL (calculateProductPrice via Promotion):");
  console.log("==================================================");

  const promoProduct = await prisma.product.findFirst({
    where: {
      promotions: {
        some: { isActive: true },
      },
    },
    include: {
      promotions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!promoProduct || !promoProduct.promotions || promoProduct.promotions.length === 0) {
    console.error("❌ ERRO: Nenhum produto com promoção ativa encontrado para teste.");
    hasErrors = true;
  } else {
    const promo = promoProduct.promotions[0];
    console.log(`Testando produto: "${promoProduct.name}" (Preço Base: R$ ${promoProduct.price})`);
    console.log(`  Promoção: "${promo.title}" | Tipo: ${promo.discountType} | Valor: ${promo.discountValue}`);
    console.log(`  Janela: ${promo.startsAt.toISOString()} até ${promo.expiresAt?.toISOString() || "Sem expiração"}`);

    // Cenário A: Durante a vigência
    const pricingActive = calculateProductPrice({
      price: promoProduct.price,
      promotions: promoProduct.promotions,
    });
    console.log(`  -> Durante a promoção: Preço Vigente = R$ ${pricingActive.currentPrice.toFixed(2)}, Preço Original = R$ ${pricingActive.originalPrice?.toFixed(2)}, Promocional? ${pricingActive.isPromotional}, Desconto = ${pricingActive.discountPercent}%`);

    if (!pricingActive.isPromotional) {
      console.error("❌ ERRO: Cálculo de promoção ativa falhou!");
      hasErrors = true;
    } else {
      console.log("  ✅ Cálculo em vigência aprovado com sucesso.");
    }

    // Cenário B: Promoção expirada (simulada)
    const expiredProduct = {
      price: promoProduct.price,
      promotions: [
        {
          ...promo,
          expiresAt: new Date(Date.now() - 3600000), // Expirou há 1 hora
        },
      ],
    };
    const pricingExpired = calculateProductPrice(expiredProduct);
    console.log(`  -> Após expiração (expiresAt < agora): Preço Vigente = R$ ${pricingExpired.currentPrice.toFixed(2)}, Promocional? ${pricingExpired.isPromotional}`);

    if (pricingExpired.isPromotional || pricingExpired.currentPrice !== Number(promoProduct.price)) {
      console.error("❌ ERRO: Promoção expirada não reverteu para o preço de tabela original!");
      hasErrors = true;
    } else {
      console.log("  ✅ Reversão automática pós-expiração aprovada com sucesso.");
    }
  }

  // 4. Validação da montagem do Combo e itens filhos reais
  console.log("\n==================================================");
  console.log("⚡ TESTE DE BUNDLE INTELIGENTE (Combo com ComboItems):");
  console.log("==================================================");

  const comboCasal = await prisma.product.findFirst({
    where: {
      isCombo: true,
    },
    include: {
      comboItems: {
        include: {
          product: {
            include: {
              addonGroups: {
                include: {
                  group: {
                    include: {
                      items: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!comboCasal) {
    console.error("❌ ERRO: Combo não encontrado no banco de dados.");
    hasErrors = true;
  } else {
    console.log(`Produto encontrado: "${comboCasal.name}" (${comboCasal.servesText || "Sem rendimento"})`);
    console.log(`Itens filhos no combo: ${comboCasal.comboItems.length}`);

    if (comboCasal.comboItems.length === 0) {
      console.error("❌ ERRO: Combo sem comboItems vinculados.");
      hasErrors = true;
    } else {
      for (const ci of comboCasal.comboItems) {
        console.log(`  ✅ Item filho: ${ci.quantity}x "${ci.product.name}" (R$ ${ci.product.price}) com ${ci.product.addonGroups.length} grupos de adicionais herdados`);
      }
    }
  }

  // 5. Verificação de Destaques
  console.log("\n==================================================");
  console.log("⭐ VERIFICAÇÃO DE PRODUTOS EM DESTAQUE:");
  console.log("==================================================");
  const highlights = await prisma.product.findMany({
    where: {
      OR: [
        { isHighlight: true },
        { promotions: { some: { isActive: true } } },
      ],
    },
    include: {
      promotions: {
        where: { isActive: true },
      },
    },
  });

  console.log(`Total de produtos elegíveis para destaque: ${highlights.length}`);
  highlights.forEach((h) => {
    const hasPromo = h.promotions.length > 0;
    console.log(`  - [${h.isHighlight ? "⭐ DESTAQUE" : ""}${hasPromo ? " 🏷️ PROMO" : ""}] ${h.name} -> R$ ${h.price}`);
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
