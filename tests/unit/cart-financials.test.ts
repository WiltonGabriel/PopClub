import { describe, it, expect } from "vitest";
import { calculateCartFinancials, CartFinancialsInput } from "@/hooks/useCartFinancials";

describe("calculateCartFinancials (Lógica Pura de Finanças do Carrinho - SRP)", () => {
  const mockBaseInput: CartFinancialsInput = {
    items: [
      {
        id: "cart-1",
        productId: "prod-1",
        name: "Copão de Açaí 500ml",
        price: 25.0,
        originalPrice: 25.0,
        quantity: 2,
        selectedOptions: [],
      },
    ],
    itemsTotal: 50.0,
    promoDiscount: 0,
    appliedCoupon: null,
    storeSettings: {
      deliveryFee: 8.0,
      freeDeliveryThreshold: 70.0,
    },
    deliveryMode: "delivery",
    deliveryFee: 8.0,
    paymentType: "dinheiro",
    changeFor: "60.00",
    addressSummary: "Av. Couto Magalhães, 100",
  };

  it("calcula finalTotal, troco e valor faltante para frete grátis com precisão", () => {
    // itemsTotal: 50.0, frete: 8.0 -> finalTotal: 58.0
    // troco para 60.00 -> changeToReturn: 2.00
    // threshold: 70.0 - 50.0 = 20.00 para frete grátis
    const result = calculateCartFinancials(mockBaseInput);

    expect(result.finalTotal).toBe(58.0);
    expect(result.couponDiscount).toBe(0);
    expect(result.totalDiscount).toBe(0);
    expect(result.changeToReturn).toBe(2.0);
    expect(result.amountToFreeShipping).toBe(20.0);
    expect(result.cartSummaryText).toContain("Copão de Açaí 500ml");
    expect(result.cartSummaryText).toContain("Total:* R$ 58,00");
  });

  it("deduz desconto de cupom e recalcula finalTotal e troco", () => {
    const inputWithCoupon: CartFinancialsInput = {
      ...mockBaseInput,
      appliedCoupon: {
        id: "coup-1",
        code: "DEZREAIS",
        discountType: "fixed",
        discountValue: 10.0,
        discountAmount: 10.0,
      },
      changeFor: "50.00",
    };

    // itemsTotal 50 - cupom 10 + frete 8 = 48.0
    // troco para 50 - 48 = 2.0
    const result = calculateCartFinancials(inputWithCoupon);
    expect(result.couponDiscount).toBe(10.0);
    expect(result.finalTotal).toBe(48.0);
    expect(result.changeToReturn).toBe(2.0);
  });

  it("zera valor para frete grátis quando a modalidade é retirada", () => {
    const pickupInput: CartFinancialsInput = {
      ...mockBaseInput,
      deliveryMode: "retirada",
      deliveryFee: 0,
    };

    const result = calculateCartFinancials(pickupInput);
    expect(result.amountToFreeShipping).toBe(0);
    expect(result.finalTotal).toBe(50.0);
    expect(result.cartSummaryText).toContain("Retirada no Balcão");
  });
});
