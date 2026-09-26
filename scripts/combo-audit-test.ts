// scripts/combo-audit-test.ts
// Testes simulados da regra de negócio de combos e promoções do PopClub
// Ambiente: Mocks em memória (Sem Prisma instanciado)

import assert from "assert";

// ==========================================
// MOCKS DO BANCO DE DADOS (Simulação)
// ==========================================
const MOCK_DB = {
  products: [
    { id: "p1", name: "Açaí Tradicional 300ml", price: 15.00, isCombo: false },
    { id: "p2", name: "Cupuaçu 300ml", price: 15.00, isCombo: false },
    { id: "c1", name: "Combo Casal (2x 300ml)", price: 25.00, isCombo: true }, // Combo promocional fixo
  ],
  comboItems: [
    { comboId: "c1", productId: "p1", quantity: 2 },
  ],
  promotions: [
    { id: "promo1", productId: "p1", discountType: "percentage", discountValue: 10, isActive: true }
  ],
  coupons: [
    { id: "cupom1", code: "BEMVINDO10", discountType: "percentage", discountValue: 10, minOrderValue: 20, isActive: true }
  ]
};

// ==========================================
// FUNÇÕES DE CÁLCULO (Simulando API / Checkout)
// ==========================================
function calculateCheckoutTotal(
  payloadItems: { productId: string; quantity: number; extrasTotal: number; priceSentByFrontend: number }[],
  couponCode?: string
) {
  let subtotal = 0;
  let hasCombosInCart = false;

  // Nova Regra de Backend Checkout (Atualizado para a solução da falha)
  for (const item of payloadItems) {
    const product = MOCK_DB.products.find(p => p.id === item.productId);
    if (!product) throw new Error("Produto não encontrado");

    if (product.isCombo) {
       hasCombosInCart = true;
    }

    // O backend recusa o preço do frontend e sempre pega do banco
    // AQUI ESTÁ A CORREÇÃO (Onde ele passa a ler `extrasTotal`)
    let unitPrice = product.price + item.extrasTotal;

    subtotal += (unitPrice * item.quantity);
  }

  let totalDiscount = 0;
  // Simulação da trava Anti-Double-Dipping (novo código)
  if (couponCode === "BEMVINDO10") {
    if (hasCombosInCart) {
        throw new Error("Este cupom não pode ser acumulado com pedidos que contenham Combos Promocionais.");
    }

    if (subtotal >= 20) {
      totalDiscount = subtotal * 0.10;
    }
  }

  return {
    subtotal,
    discount: totalDiscount,
    finalTotal: subtotal - totalDiscount
  };
}

// ==========================================
// SUITE DE TESTES DE ESTRESSE
// ==========================================
function runTests() {
  console.log("🔥 INICIANDO AUDITORIA DE COMBOS E PRECIFICAÇÃO...");

  // Teste 1: Manipulação de Preço no Checkout
  try {
    const maliciousPayload = [
      { productId: "c1", quantity: 1, extrasTotal: 0, priceSentByFrontend: 5.00 } // Tenta passar combo por R$ 5
    ];
    const result = calculateCheckoutTotal(maliciousPayload);
    // Deve recalcular com base no banco (25.00) e não 5.00
    assert.strictEqual(result.subtotal, 25.00, "FALHA: Backend acatou o preço malicioso do frontend!");
    console.log("✅ TESTE 1 (Segurança de Preço): PASSOU (Backend bloqueia price tampering).");
  } catch (e: any) {
    console.error("❌ TESTE 1 FALHOU:", e.message);
  }

  // Teste 2: Combo base R$ 25,00 + adicional pago R$ 5,00 (Ex: Adicional de Nutella)
  try {
    const payloadComAdicional = [
      { productId: "c1", quantity: 1, extrasTotal: 5.00, priceSentByFrontend: 30.00 }
    ];
    const result = calculateCheckoutTotal(payloadComAdicional);
    // Deveria ser 30.00, mas o backend atual só lê o product.price base.
    console.log(`⚠️  TESTE 2 (Adicionais no Checkout): O subtotal calculado foi R$ ${result.subtotal.toFixed(2)}. Esperado era R$ 30.00.`);
    if (result.subtotal !== 30.00) {
      console.log("   -> DIAGNÓSTICO: O checkout atual NÃO processa adicionais atrelados a combos/produtos. Eles se perdem.");
    }
  } catch (e: any) {
    console.error("❌ TESTE 2 FALHOU:", e.message);
  }

  // Teste 3: Cupom em cima de Combo Promocional (Duplo desconto)
  try {
    const payload = [
      { productId: "c1", quantity: 1, extrasTotal: 0, priceSentByFrontend: 25.00 } // Combo R$25
    ];
    const result = calculateCheckoutTotal(payload, "BEMVINDO10");
    console.log(`⚠️  TESTE 3 (Acúmulo de Desconto): Combo de R$ 25.00 recebeu cupom de 10% (R$ -${result.discount.toFixed(2)}). Total Final: R$ ${result.finalTotal.toFixed(2)}.`);
    console.log("   -> DIAGNÓSTICO: O sistema atual PERMITE aplicar cupons em cima de combos que já possuem preço reduzido, o que pode espremer a margem do lojista (double-dipping).");
  } catch (e: any) {
    if (e.message.includes("não pode ser acumulado")) {
       console.log("✅ TESTE 3 (Anti Double-Dipping): PASSOU. Backend rejeitou o cupom percentual sobre o carrinho com combo promocional.");
    } else {
       console.error("❌ TESTE 3 FALHOU:", e.message);
    }
  }

  console.log("\n✅ AUDITORIA CONCLUÍDA.");
}

runTests();
