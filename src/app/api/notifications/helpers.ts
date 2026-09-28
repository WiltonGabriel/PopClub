import { prisma } from "@/lib/prisma";
import { 
  DEFAULT_LOYALTY_BADGES, 
  LoyaltyBadgeConfig, 
  calculateAccountAgeMonths, 
  getBadgeForMonths 
} from "@/services/loyaltyBadgeService";

export type TargetAudienceType =
  | "ALL"
  | "LOYALTY"
  | "NEW_CUSTOMERS"
  | "ACTIVATION"
  | "VIP"
  | "INACTIVE_15"
  | "INACTIVE_30"
  | "INACTIVE_60";

export async function getTargetClients(audience: TargetAudienceType | string, loyaltyBadgeIds?: string[]) {
  const now = new Date();

  // Todos os usuários com perfil de cliente (ou todos os usuários caso só haja admin em teste)
  const allUsers = await prisma.user.findMany({
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

  // Se houver clientes específicos, filtra por role === 'client', senão inclui todos
  const clients = allUsers.filter((u) => u.role === "client");
  const baseList = clients.length > 0 ? clients : allUsers;

  if (audience === "LOYALTY" || (loyaltyBadgeIds && loyaltyBadgeIds.length > 0)) {
    // Obter configuração de selos
    const record = await prisma.notificationTemplate.findFirst({
      where: { category: "loyalty_badges" },
      orderBy: { updatedAt: "desc" },
    });

    let badges: LoyaltyBadgeConfig[] = DEFAULT_LOYALTY_BADGES;
    if (record?.message) {
      try {
        const parsed = JSON.parse(record.message);
        if (Array.isArray(parsed) && parsed.length > 0) {
          badges = parsed;
        }
      } catch {}
    }

    const selectedIds = new Set(loyaltyBadgeIds || []);

    return baseList.filter((u) => {
      const months = calculateAccountAgeMonths(u.createdAt);
      const userBadge = getBadgeForMonths(months, badges);
      return selectedIds.has(userBadge.id) || selectedIds.has(String(userBadge.level));
    });
  }

  switch (audience) {
    case "NEW_CUSTOMERS": {
      // 0 pedidos realizados não-cancelados
      return baseList.filter((u) => u.orders.length === 0);
    }
    case "ACTIVATION": {
      // 1 a 2 pedidos realizados
      return baseList.filter((u) => u.orders.length >= 1 && u.orders.length <= 2);
    }
    case "VIP": {
      // 3 ou mais pedidos realizados
      return baseList.filter((u) => u.orders.length >= 3);
    }
    case "INACTIVE_15": {
      // Clientes que já pediram, mas sem pedidos nos últimos 15 dias
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      return baseList.filter((u) => {
        if (u.orders.length === 0) return false;
        const lastOrderDate = new Date(u.orders[0].createdAt);
        return lastOrderDate < fifteenDaysAgo;
      });
    }
    case "INACTIVE_30": {
      // Clientes que já pediram, mas sem pedidos nos últimos 30 dias
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return baseList.filter((u) => {
        if (u.orders.length === 0) return false;
        const lastOrderDate = new Date(u.orders[0].createdAt);
        return lastOrderDate < thirtyDaysAgo;
      });
    }
    case "INACTIVE_60": {
      // Clientes que já pediram, mas sem pedidos nos últimos 60 dias
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      return baseList.filter((u) => {
        if (u.orders.length === 0) return false;
        const lastOrderDate = new Date(u.orders[0].createdAt);
        return lastOrderDate < sixtyDaysAgo;
      });
    }
    case "ALL":
    default:
      return baseList;
  }
}
