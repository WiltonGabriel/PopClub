import { PromotionDomainService } from "@/domain/services/PromotionDomainService";

export interface ProductPromotionCandidate {
  id?: string;
  discountType: "percentage" | "fixed" | string;
  discountValue: number | string | any;
  isActive?: boolean;
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
}

export interface PricingResult {
  currentPrice: number;
  originalPrice?: number;
  isPromotional: boolean;
  isPromo: boolean;
  discountPercent: number;
}

export function calculateProductPrice(
  product: {
    price: number | string | any;
    promotions?: ProductPromotionCandidate[] | null;
    promotion?: ProductPromotionCandidate | null;
    // Suporte retrocompatível legado se ainda houver resquício
    originalPrice?: number | string | any | null;
    promotionalPrice?: number | string | any | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    isPromoActive?: boolean | null;
  },
  now: Date = new Date()
): PricingResult {
  const basePrice = Number(product.price || 0);

  // 1. Prioridade: Promoções formais da tabela `Promotion`
  const promoList: ProductPromotionCandidate[] = [];
  if (Array.isArray(product.promotions)) {
    promoList.push(...product.promotions);
  }
  if (product.promotion) {
    promoList.push(product.promotion);
  }

  // Encontra a primeira promoção ativa e vigente
  const activePromo = promoList.find((p) => {
    if (p.isActive === false) return false;

    const startsAt = p.startsAt ? new Date(p.startsAt) : null;
    const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;

    const isStarted = !startsAt || now >= startsAt;
    const isNotExpired = !expiresAt || now <= expiresAt;

    return isStarted && isNotExpired;
  });

  if (activePromo && basePrice > 0) {
    const pricing = PromotionDomainService.calculatePromotionPricing(
      basePrice,
      activePromo.discountType,
      Number(activePromo.discountValue || 0)
    );

    if (pricing.isPromotional) {
      return {
        currentPrice: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        isPromotional: true,
        isPromo: true,
        discountPercent: pricing.discountPercent,
      };
    }
  }

  // 2. Fallback legado se ainda fornecido diretamente no produto (durante transição)
  const legacyPromo =
    product.promotionalPrice !== null && product.promotionalPrice !== undefined
      ? Number(product.promotionalPrice)
      : null;
  const legacyIsActive = product.isPromoActive !== false;

  if (legacyPromo !== null && !isNaN(legacyPromo) && legacyIsActive && basePrice > 0) {
    const start = product.startsAt ? new Date(product.startsAt) : null;
    const end = product.endsAt ? new Date(product.endsAt) : null;

    const afterStart = !start || now >= start;
    const beforeEnd = !end || now <= end;

    if (afterStart && beforeEnd && legacyPromo < basePrice) {
      const discount = Math.round(((basePrice - legacyPromo) / basePrice) * 100);
      return {
        currentPrice: legacyPromo,
        originalPrice: basePrice,
        isPromotional: true,
        isPromo: true,
        discountPercent: discount,
      };
    }
  }

  // 3. Sem promoção válida
  return {
    currentPrice: basePrice,
    originalPrice: undefined,
    isPromotional: false,
    isPromo: false,
    discountPercent: 0,
  };
}
