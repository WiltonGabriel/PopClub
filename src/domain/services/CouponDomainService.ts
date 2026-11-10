import { InvalidCouponException } from "@/domain/errors";

export interface CouponModel {
  id: string;
  code: string;
  isActive: boolean;
  expiresAt?: Date | string | null;
  maxUses?: number | null;
  uses: number;
  minLoyaltyLevel?: number | null;
  loyaltyBadgeId?: string | null;
  oncePerUser?: boolean;
  requiresRegistration?: boolean;
  minOrderValue: unknown;
  discountType: "percentage" | "fixed" | string;
  discountValue: unknown;
  productIds?: string[] | null;
}

export interface CouponEligibilityParams {
  coupon: CouponModel | null | undefined;
  subtotal: number;
  isRegisteredUser?: boolean;
  userMonths?: number;
  completedOrdersCount?: number;
  userBadgeLevel?: number;
  userBadgeId?: string;
  requiredBadgeName?: string;
  requiredBadgeLevel?: number;
  hasPriorUsage?: boolean;
  cartProductIds?: string[];
  referenceDate?: Date;
}

export class CouponDomainService {
  /**
   * Valida integralmente as regras de negócio de um cupom.
   * Lança InvalidCouponException detalhada se qualquer critério falhar.
   */
  public static validateEligibility(params: CouponEligibilityParams): void {
    const {
      coupon,
      subtotal,
      isRegisteredUser = false,
      userMonths = 0,
      completedOrdersCount = 0,
      userBadgeLevel,
      userBadgeId,
      requiredBadgeName = "VIP",
      requiredBadgeLevel,
      hasPriorUsage = false,
      cartProductIds = [],
      referenceDate = new Date(),
    } = params;

    if (!coupon || !coupon.isActive) {
      throw new InvalidCouponException(
        coupon?.code || "UNKNOWN",
        "Cupom inválido ou expirado.",
        { code: "COUPON_NOT_FOUND_OR_INACTIVE" }
      );
    }

    // 1. Validação de Expiração Temporal
    if (coupon.expiresAt) {
      const expDate = new Date(coupon.expiresAt);
      if (referenceDate > expDate) {
        throw new InvalidCouponException(
          coupon.code,
          "Este cupom já expirou.",
          { code: "COUPON_EXPIRED", expiresAt: coupon.expiresAt }
        );
      }
    }

    // 2. Limite Global de Usos
    if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
      throw new InvalidCouponException(
        coupon.code,
        "Limite de utilizações deste cupom atingido.",
        { code: "COUPON_MAX_USES_REACHED", uses: coupon.uses, maxUses: coupon.maxUses }
      );
    }

    // 3. Exclusividade para Usuários Cadastrados (Apenas quando explicitamente configurado no cupom)
    if (coupon.requiresRegistration && !isRegisteredUser) {
      throw new InvalidCouponException(
        coupon.code,
        "🏷️ Cupom indisponível: Descontos e cupons são exclusivos para clientes com cadastro completo.",
        { code: "REQUIRES_REGISTRATION" }
      );
    }

    // 4. Nível Mínimo de Fidelidade / Selo (avaliado pelo selo resolvido ou fallback legado em testes diretos)
    if (coupon.minLoyaltyLevel || coupon.loyaltyBadgeId) {
      const requiredLevel = requiredBadgeLevel ?? coupon.minLoyaltyLevel ?? 0;
      const passedByBadgeId = Boolean(coupon.loyaltyBadgeId && userBadgeId && userBadgeId === coupon.loyaltyBadgeId);

      let isEligible = false;
      if (userBadgeLevel !== undefined) {
        const passedByLevel = requiredLevel > 0 ? userBadgeLevel >= requiredLevel : false;
        isEligible = passedByLevel || passedByBadgeId;
      } else {
        const passedByMonths = userMonths >= requiredLevel;
        const passedByOrders = completedOrdersCount > 0 && completedOrdersCount >= requiredLevel;
        isEligible = passedByBadgeId || passedByMonths || passedByOrders;
      }
      if (!isEligible) {
        throw new InvalidCouponException(
          coupon.code,
          `Este cupom é exclusivo para clientes com selo ${requiredBadgeName} ou superior.`,
          {
            code: "COUPON_REQUIRES_LOYALTY_BADGE",
            requiredBadge: requiredBadgeName,
            userMonths,
            requiredMonths: requiredLevel,
            completedOrdersCount,
          }
        );
      }
    }

    // 5. Uso Único por Usuário
    if (coupon.oncePerUser && hasPriorUsage) {
      throw new InvalidCouponException(
        coupon.code,
        "Este cupom é de uso único por cliente e já foi utilizado anteriormente.",
        { code: "COUPON_ONCE_PER_USER" }
      );
    }

    // 6. Pedido Mínimo
    const minVal = Number(coupon.minOrderValue || 0);
    if (subtotal < minVal) {
      throw new InvalidCouponException(
        coupon.code,
        `Este cupom exige pedido mínimo de R$ ${minVal.toFixed(2).replace(".", ",")}.`,
        {
          code: "MINIMUM_ORDER_VALUE_NOT_MET",
          currentSubtotal: subtotal,
          minOrderValue: minVal,
        }
      );
    }

    // 7. Escopo de Produtos Específicos
    if (coupon.productIds && coupon.productIds.length > 0) {
      if (cartProductIds.length === 0) {
        throw new InvalidCouponException(
          coupon.code,
          "Este cupom é exclusivo para produtos específicos. Adicione itens ao carrinho.",
          { code: "COUPON_PRODUCT_SCOPE_EMPTY" }
        );
      }

      const hasMatchingProduct = cartProductIds.some((pId) => coupon.productIds!.includes(pId));
      if (!hasMatchingProduct) {
        throw new InvalidCouponException(
          coupon.code,
          "Este cupom é exclusivo para produtos específicos que não estão no seu carrinho.",
          { code: "COUPON_PRODUCT_SCOPE_MISMATCH", allowedProductIds: coupon.productIds }
        );
      }
    }
  }

  /**
   * Cálculo matemático puro do valor do desconto concedido pelo cupom.
   * Suporta subtotal específico elegível (para evitar descontos excessivos em combos sem barrar o pedido).
   */
  public static calculateDiscount(
    coupon: CouponModel,
    subtotal: number,
    options?: { eligibleSubtotal?: number }
  ): number {
    const rawValue = Number(coupon.discountValue || 0);
    if (rawValue <= 0 || subtotal <= 0) return 0;

    const baseAmount = options?.eligibleSubtotal !== undefined ? options.eligibleSubtotal : subtotal;
    if (baseAmount <= 0) return 0;

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (baseAmount * rawValue) / 100;
    } else {
      discount = Math.min(rawValue, baseAmount);
    }

    return Math.max(0, Number(discount.toFixed(2)));
  }
}
