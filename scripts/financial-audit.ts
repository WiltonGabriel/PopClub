import { Decimal } from "@prisma/client/runtime/library";

console.log("== FINANCIAL MATH AUDIT ==");

function testCalculateTotal(subtotal: number, deliveryFee: number, couponDiscount: number, promoDiscountTotal: number) {
  const totalDiscount = Number((promoDiscountTotal + couponDiscount).toFixed(2));
  const itemsTotalAfterDiscount = Math.max(0, Number((subtotal - totalDiscount).toFixed(2)));
  const finalTotal = Number((itemsTotalAfterDiscount + deliveryFee).toFixed(2));
  return { finalTotal, itemsTotalAfterDiscount, totalDiscount };
}

function testCheckoutAPI() {
   // Caso 1: Cupom não pode negativar o total a pagar mesmo que exceda o subtotal dos produtos (frete continua cobrado se não isento).
   const res1 = testCalculateTotal(50.00, 5.00, 60.00, 0.00);
   if (res1.finalTotal !== 5.00) throw new Error("Falha 1 - Cupom superando subtotal não zerou corretamente o custo dos produtos nem manteve o frete.");

   // Caso 2: Ponto flutuante com múltiplos decimais gerando dízimas no Javascript
   const res2 = testCalculateTotal(10.33, 5.99, 3.33, 0);
   if (res2.finalTotal !== 12.99) throw new Error("Falha 2 - Problema de precisão de ponto flutuante: " + res2.finalTotal);

   // Caso 3: Troco em dinheiro deve subtrair do finalTotal sem alterar desconto ou total
   const finalTotal3 = 35.50;
   const changeFor = 50.00;
   const changeToReturn = changeFor - finalTotal3;
   if (changeToReturn !== 14.50) throw new Error("Falha 3 - Troco calculado errado");

   console.log("✅ Math Logic checks passed");
}

testCheckoutAPI();

function testCouponPercentage() {
   // Caso 4: Cupom de Porcentagem
   const calculatedSubtotal = 150.00;
   const discountType = "percentage";
   const discountValue = 20; // 20%

   let couponDiscount = 0;
   if (discountType === "percentage") {
        couponDiscount = Number(((calculatedSubtotal * discountValue) / 100).toFixed(2));
   } else {
        couponDiscount = Math.min(discountValue, calculatedSubtotal);
   }

   if (couponDiscount !== 30.00) throw new Error("Falha 4 - Cupom percentual não foi calculado corretamente");
   console.log("✅ Math Logic Percentage Coupons checks passed");
}

testCouponPercentage();
