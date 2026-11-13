import { CouponModel } from "@/domain/services/CouponDomainService";
import {
  LoyaltyBadgeConfig,
  getUserBadge,
} from "@/services/loyaltyBadgeService";
import { getOrBackfillLoyaltyBadges } from "@/services/loyaltyBadgeConfigBackfill";

/**
 * Carrega os selos de fidelidade da tabela dedicada LoyaltyBadgeConfig
 * (com backfill idempotente do template legado e fallback seguro para padrão).
 */
export async function loadLoyaltyBadgesConfig(): Promise<LoyaltyBadgeConfig[]> {
  return getOrBackfillLoyaltyBadges();
}

export interface CouponLoyaltyContext {
  badges: LoyaltyBadgeConfig[];
  requiredBadge?: LoyaltyBadgeConfig;
  requiredBadgeName: string;
  requiredBadgeLevel?: number;
  userBadge: LoyaltyBadgeConfig;
}

/**
 * Resolve o selo exigido por um cupom e o selo real conquistado pelo cliente
 * com base em tempo de conta e pedidos concluídos.
 */
export async function resolveCouponLoyaltyContext(
  coupon: Pick<CouponModel, "minLoyaltyLevel" | "loyaltyBadgeId">,
  stats: { userMonths: number; completedOrdersCount: number }
): Promise<CouponLoyaltyContext> {
  const badges = await loadLoyaltyBadgesConfig();

  const requiredBadge = badges.find(
    (b) =>
      (coupon.loyaltyBadgeId && b.id === coupon.loyaltyBadgeId) ||
      (coupon.minLoyaltyLevel && b.level === coupon.minLoyaltyLevel)
  );

  const userBadge = getUserBadge(
    { months: stats.userMonths, completedOrders: stats.completedOrdersCount },
    badges
  );

  return {
    badges,
    requiredBadge,
    requiredBadgeName: requiredBadge?.name || "VIP",
    requiredBadgeLevel: requiredBadge?.level ?? coupon.minLoyaltyLevel ?? undefined,
    userBadge,
  };
}
