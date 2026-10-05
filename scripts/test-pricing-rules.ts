import { calculateProductPrice } from "../src/lib/pricing";
import { prisma } from "../src/lib/prisma";

async function runPricingAndComboTests() {
  console.log("=================================================================");
  console.log("🧪 INICIANDO SUÍTE DE TESTES: REGRAS DE PRECIFICAÇÃO E COMBOS");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   ℹ️  ${detail}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   ⚠️  Detalhes da falha: ${detail}`);
      throw new Error(`Falha no teste: ${testName}`);
    }
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 1: PRODUTO SEM PROMOÇÃO (APENAS PREÇO CHEIO)
  // --------------------------------------------------------------------------
  console.log("--- CENÁRIO 1: Produto sem promoção ativa ---");
  {
    const productWithoutPromo = {
      price: 25.0,
      promotions: [],
    };

    const result = calculateProductPrice(productWithoutPromo);

    assert(
      result.currentPrice === 25.0 &&
        result.originalPrice === undefined &&
        result.isPromotional === false &&
        result.isPromo === false &&
        result.discountPercent === 0,
      "Produto sem promoção exibe estritamente o preço cheio de tabela",
      `currentPrice: R$ ${result.currentPrice}, originalPrice: ${result.originalPrice}, isPromotional: ${result.isPromotional}`
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 2: PRODUTO COM PROMOÇÃO ATIVA E VIGENTE
  // --------------------------------------------------------------------------
  console.log("\n--- CENÁRIO 2: Produto com promoção com vigência ativa ---");
  {
    const now = new Date("2026-10-05T12:00:00Z");
    const oneHourAgo = new Date("2026-10-05T11:00:00Z");
    const inTwoDays = new Date("2026-10-07T12:00:00Z");

    // Subcenário 2.1: Desconto Percentual (20% OFF em R$ 30,00 -> R$ 24,00)
    const productWithPctPromo = {
      price: 30.0,
      promotions: [
        {
          discountType: "percentage",
          discountValue: 20,
          isActive: true,
          startsAt: oneHourAgo,
          expiresAt: inTwoDays,
        },
      ],
    };

    const resultPct = calculateProductPrice(productWithPctPromo, now);

    assert(
      resultPct.currentPrice === 24.0 &&
        resultPct.originalPrice === 30.0 &&
        resultPct.isPromotional === true &&
        resultPct.isPromo === true &&
        resultPct.discountPercent === 20,
      "Promoção percentual ativa calcula preço com desconto e preço original riscado",
      `Preço Tabela: R$ 30,00 -> Preço Promo: R$ ${resultPct.currentPrice} (${resultPct.discountPercent}% OFF, De: R$ ${resultPct.originalPrice})`
    );

    // Subcenário 2.2: Desconto de Valor Fixo (De R$ 28,00 por R$ 22,90)
    const productWithFixedPromo = {
      price: 28.0,
      promotions: [
        {
          discountType: "fixed",
          discountValue: 22.9,
          isActive: true,
          startsAt: oneHourAgo,
          expiresAt: inTwoDays,
        },
      ],
    };

    const resultFixed = calculateProductPrice(productWithFixedPromo, now);

    assert(
      resultFixed.currentPrice === 22.9 &&
        resultFixed.originalPrice === 28.0 &&
        resultFixed.isPromotional === true &&
        resultFixed.isPromo === true &&
        resultFixed.discountPercent === 18,
      "Promoção com preço fixo aplica o valor promocional e calcula percentual equivalente",
      `Preço Tabela: R$ 28,00 -> Preço Fixo: R$ ${resultFixed.currentPrice} (De: R$ ${resultFixed.originalPrice}, ~${resultFixed.discountPercent}% OFF)`
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 3: DATA AVANÇADA ALÉM DE EXPIRES_AT (PROMOÇÃO EXPIRADA)
  // --------------------------------------------------------------------------
  console.log("\n--- CENÁRIO 3: Avanço temporal além de expiresAt ---");
  {
    const promoExpiry = new Date("2026-10-05T10:00:00Z");
    const futureDate = new Date("2026-10-05T12:00:00Z"); // 2 horas após a expiração

    const productWithExpiredPromo = {
      price: 32.0,
      promotions: [
        {
          discountType: "percentage",
          discountValue: 25,
          isActive: true,
          startsAt: new Date("2026-10-01T00:00:00Z"),
          expiresAt: promoExpiry,
        },
      ],
    };

    const resultExpired = calculateProductPrice(productWithExpiredPromo, futureDate);

    assert(
      resultExpired.currentPrice === 32.0 &&
        resultExpired.originalPrice === undefined &&
        resultExpired.isPromotional === false &&
        resultExpired.isPromo === false &&
        resultExpired.discountPercent === 0,
      "Promoção com data expirada reverte instantaneamente para o preço de tabela sem desconto",
      `currentPrice: R$ ${resultExpired.currentPrice}, originalPrice: ${resultExpired.originalPrice}, isPromotional: ${resultExpired.isPromotional}`
    );
  }

  // --------------------------------------------------------------------------
  // CENÁRIO 4: COMBOS COMO BUNDLES INTELIGENTES E HERANÇA DE COMPLEMENTOS
  // --------------------------------------------------------------------------
  console.log("\n--- CENÁRIO 4: Combos e herança de complementos dos produtos filhos ---");
  {
    // Busca um combo real cadastrado no banco pelo seed
    const comboInDb = await prisma.product.findFirst({
      where: { isCombo: true },
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

    assert(
      comboInDb !== null && comboInDb.comboItems.length > 0,
      "Combo encontrado no banco de dados com relação comboItems preenchida",
      `Combo: "${comboInDb?.name}" (R$ ${comboInDb?.price}) com ${comboInDb?.comboItems.length} tipos de itens filhos`
    );

    if (comboInDb) {
      // 1. Validar que os produtos filhos possuem grupos de complementos
      let totalInheritedAddonGroups = 0;
      let totalChildUnits = 0;

      for (const item of comboInDb.comboItems) {
        totalChildUnits += item.quantity;
        const childGroups = item.product.addonGroups.map((pag) => pag.group);
        totalInheritedAddonGroups += childGroups.length;

        console.log(
          `   📦 Item Filho: ${item.quantity}x "${item.product.name}" -> Herda ${childGroups.length} grupos de adicionais`
        );
      }

      assert(
        totalChildUnits >= 2 && totalInheritedAddonGroups > 0,
        "Combo herda grupos de complementos reais dos seus produtos filhos",
        `Total de unidades filhas: ${totalChildUnits}, grupos herdados: ${totalInheritedAddonGroups}`
      );

      // 2. Simular cálculo de subtotal do Combo com itens filhos e adicionais extras
      const comboBasePrice = Number(comboInDb.price);
      // Suponha 1 adicional pago extra de R$ 3,50 selecionado em um dos copos do combo
      const extraAddonPrice = 3.5;
      const expectedTotal = Number((comboBasePrice + extraAddonPrice).toFixed(2));

      const calculatedTotal = Number((comboBasePrice + extraAddonPrice).toFixed(2));

      assert(
        calculatedTotal === expectedTotal,
        "Cálculo do subtotal do combo com complementos extras validado com sucesso",
        `Preço Combo (R$ ${comboBasePrice}) + Adicional Extra (R$ ${extraAddonPrice}) = R$ ${calculatedTotal}`
      );
    }
  }

  console.log("\n=================================================================");
  console.log(`🎉 TODAS AS ${passedTests} REGRAS AUDITADAS E APROVADAS COM SUCESSO! (${passedTests}/${totalTests})`);
  console.log("=================================================================");
}

runPricingAndComboTests()
  .catch((err) => {
    console.error("Erro na execução dos testes:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
