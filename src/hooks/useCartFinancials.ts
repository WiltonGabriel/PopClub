import { useMemo } from "react";
import { ValidatedCoupon } from "@/services/couponService";
import { StoreSettings } from "@/services/storeSettingsService";
import { CartItem } from "@/contexts/CartContext";

export interface CartFinancialsInput {
  items: CartItem[];
  itemsTotal: number;
  promoDiscount: number;
  appliedCoupon: ValidatedCoupon | null;
  storeSettings: Partial<StoreSettings> | null;
  deliveryMode: "delivery" | "retirada";
  deliveryFee: number;
  paymentType: "dinheiro" | "cartao_maquininha" | "pix_entrega";
  changeFor: string;
  addressSummary?: string;
}

export interface CartFinancialsResult {
  couponDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  amountToFreeShipping: number;
  changeToReturn: number | null;
  cartSummaryText: string;
}

/**
 * Função pura responsável exclusivamente pelos cálculos financeiros e formatação
 * do carrinho de compras (Princípio da Responsabilidade Única - SRP).
 */
export function calculateCartFinancials(input: CartFinancialsInput): CartFinancialsResult {
  const {
    items,
    itemsTotal,
    promoDiscount,
    appliedCoupon,
    storeSettings,
    deliveryMode,
    deliveryFee,
    paymentType,
    changeFor,
    addressSummary = "A combinar",
  } = input;

  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalDiscount = Number((promoDiscount + couponDiscount).toFixed(2));
  const finalTotal = Math.max(0, Number((itemsTotal - couponDiscount + deliveryFee).toFixed(2)));

  let amountToFreeShipping = 0;
  if (
    deliveryMode !== "retirada" &&
    storeSettings &&
    typeof storeSettings.freeDeliveryThreshold === "number"
  ) {
    if (itemsTotal < storeSettings.freeDeliveryThreshold) {
      amountToFreeShipping = Math.max(0, Number((storeSettings.freeDeliveryThreshold - itemsTotal).toFixed(2)));
    }
  }

  let changeToReturn: number | null = null;
  if (paymentType === "dinheiro" && changeFor.trim()) {
    const changeVal = parseFloat(changeFor);
    if (!isNaN(changeVal) && changeVal > finalTotal) {
      changeToReturn = Number((changeVal - finalTotal).toFixed(2));
    }
  }

  let cartSummaryText = "";
  if (items.length > 0) {
    const itemsList = items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace(".", ",")}`
      )
      .join("\n");

    const paymentStr =
      paymentType === "dinheiro"
        ? `Dinheiro${changeFor ? ` (Troco para R$ ${parseFloat(changeFor).toFixed(2).replace(".", ",")})` : ""}`
        : paymentType === "cartao_maquininha"
        ? "Cartão na Maquininha"
        : "Pix na Entrega";

    const modalidadeStr =
      deliveryMode === "retirada"
        ? "*Modalidade:* Retirada no Balcão (Frete Grátis)"
        : "*Modalidade:* Entrega em Domicílio";

    cartSummaryText = `*Novo Pedido PopClub*\n\n*Itens:*\n${itemsList}\n\n${modalidadeStr}\n*Endereço/Local:* ${addressSummary}\n*Forma de Pagamento:* ${paymentStr}\n*Total:* R$ ${finalTotal.toFixed(2).replace(".", ",")}`;
  }

  return {
    couponDiscount,
    totalDiscount,
    finalTotal,
    amountToFreeShipping,
    changeToReturn,
    cartSummaryText,
  };
}

/**
 * Hook customizado React que memoriza os cálculos do carrinho
 */
export function useCartFinancials(input: CartFinancialsInput): CartFinancialsResult {
  const {
    items,
    itemsTotal,
    promoDiscount,
    appliedCoupon,
    storeSettings,
    deliveryMode,
    deliveryFee,
    paymentType,
    changeFor,
    addressSummary,
  } = input;

  return useMemo(() => calculateCartFinancials({
    items,
    itemsTotal,
    promoDiscount,
    appliedCoupon,
    storeSettings,
    deliveryMode,
    deliveryFee,
    paymentType,
    changeFor,
    addressSummary,
  }), [
    items,
    itemsTotal,
    promoDiscount,
    appliedCoupon,
    storeSettings,
    deliveryMode,
    deliveryFee,
    paymentType,
    changeFor,
    addressSummary,
  ]);
}
