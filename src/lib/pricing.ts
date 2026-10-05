import { Decimal } from "@prisma/client/runtime/library";

export interface PricingResult {
  currentPrice: number;
  originalPrice: number;
  isPromotional: boolean;
  discountPercent: number;
}

export function calculateProductPrice(
  product: {
    price: number | string | Decimal;
    originalPrice?: number | string | Decimal | null;
    promotionalPrice?: number | string | Decimal | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    isPromoActive?: boolean | null;
  },
  now: Date = new Date()
): PricingResult {
  const base = Number(product.price || 0);
  const orig =
    product.originalPrice !== null && product.originalPrice !== undefined
      ? Number(product.originalPrice)
      : base;
  const promo =
    product.promotionalPrice !== null && product.promotionalPrice !== undefined
      ? Number(product.promotionalPrice)
      : null;

  const isPromoActive = product.isPromoActive !== false;

  if (promo !== null && !isNaN(promo) && isPromoActive) {
    const start = product.startsAt ? new Date(product.startsAt) : null;
    const end = product.endsAt ? new Date(product.endsAt) : null;

    const afterStart = !start || now >= start;
    const beforeEnd = !end || now <= end;

    if (afterStart && beforeEnd) {
      const discount = orig > promo ? Math.round(((orig - promo) / orig) * 100) : 0;
      return {
        currentPrice: promo,
        originalPrice: orig,
        isPromotional: true,
        discountPercent: discount,
      };
    }
  }

  return {
    currentPrice: orig,
    originalPrice: orig,
    isPromotional: false,
    discountPercent: 0,
  };
}
