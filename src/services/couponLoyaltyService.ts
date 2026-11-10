import { prisma } from "@/lib/prisma";
import { CouponModel } from "@/domain/services/CouponDomainService";
import {
  DEFAULT_LOYALTY_BADGES,
  LoyaltyBadgeConfig,
  getUserBadge,
} from "@/services/loyaltyBadgeService";

/**
 * Carrega os selos de fidelidade configurados na tabela NotificationTemplate,
 * usando DEFAULT_LOYALTY_BADGES como fallback seguro.
 */
export async function loadLoyaltyBadgesConfig(): Promise<LoyaltyBadgeConfig[]> {
  const record = await prisma.notificationTemplate.findFirst({
    where: { category: "loyalty_badges" },
    orderBy: { updatedAt: "desc" },
  });

  if (record?.message) {
    try {
      const parsed = JSON.parse(record.message);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as LoyaltyBadgeConfig[];
      }
    } catch {
      // fallback para configuração padrão
    }
  }

  return DEFAULT_LOYALTY_BADGES;
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
