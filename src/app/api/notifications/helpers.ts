import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  calculateAccountAgeMonths,
  getUserBadge,
} from "@/services/loyaltyBadgeService";
import { loadLoyaltyBadgesConfig } from "@/services/couponLoyaltyService";

export const VALID_TARGET_AUDIENCES = [
  "ALL",
  "LOYALTY",
  "NEW_CUSTOMERS",
  "ACTIVATION",
  "VIP",
  "INACTIVE_15",
  "INACTIVE_30",
  "INACTIVE_60",
  "CUSTOM",
] as const;

export type TargetAudienceType = (typeof VALID_TARGET_AUDIENCES)[number];

export function isValidTargetAudience(value: string): value is TargetAudienceType {
  return (VALID_TARGET_AUDIENCES as readonly string[]).includes(value);
}

export async function getTargetClients(
  audience: TargetAudienceType | string,
  loyaltyBadgeIds?: string[],
  customUserIds?: string[]
) {
  if (!isValidTargetAudience(audience)) {
    return [];
  }

  const now = new Date();

  const allUsers = await prisma.user.findMany({
    where: {
      role: Role.CLIENT,
      isActive: true,
      deletedAt: null,
    },
    include: {
      orders: {
        where: {
          status: { not: "cancelled" },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
        },
      },
    },
  });

  // Garantia defensiva mesmo quando testes mockam findMany() ignorando filtros
  const baseList = allUsers.filter(
    (u) =>
      u.role === Role.CLIENT &&
      u.isActive !== false &&
      (u.deletedAt === undefined || u.deletedAt === null)
  );

  if (audience === "CUSTOM") {
    if (!Array.isArray(customUserIds) || customUserIds.length === 0) {
      return [];
    }
    const allowedSet = new Set(customUserIds);
    return baseList.filter((u) => allowedSet.has(u.id));
  }

  if (audience === "LOYALTY" || (loyaltyBadgeIds && loyaltyBadgeIds.length > 0)) {
    const badges = await loadLoyaltyBadgesConfig();
    const selectedIds = new Set(loyaltyBadgeIds || []);

    return baseList.filter((u) => {
      const months = calculateAccountAgeMonths(u.createdAt);
      const completedOrders = u.orders.filter((o) => o.status === "completed").length;
      const userBadge = getUserBadge({ months, completedOrders }, badges);
      return selectedIds.has(userBadge.id) || selectedIds.has(String(userBadge.level));
    });
  }

  switch (audience) {
    case "NEW_CUSTOMERS":
      return baseList.filter((u) => u.orders.length === 0);
    case "ACTIVATION":
      return baseList.filter((u) => u.orders.length >= 1 && u.orders.length <= 2);
    case "VIP":
      return baseList.filter((u) => u.orders.length >= 3);
    case "INACTIVE_15": {
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      return baseList.filter((u) => {
        if (u.orders.length === 0) return false;
        const lastOrderDate = new Date(u.orders[0].createdAt);
        return lastOrderDate < fifteenDaysAgo;
      });
    }
    case "INACTIVE_30": {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return baseList.filter((u) => {
        if (u.orders.length === 0) return false;
        const lastOrderDate = new Date(u.orders[0].createdAt);
        return lastOrderDate < thirtyDaysAgo;
      });
    }
    case "INACTIVE_60": {
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return baseList.filter((u) => {
        if (u.orders.length === 0) return false;
        const lastOrderDate = new Date(u.orders[0].createdAt);
        return lastOrderDate < sixtyDaysAgo;
      });
    }
    case "ALL":
      return baseList;
    default:
      return [];
  }
}
