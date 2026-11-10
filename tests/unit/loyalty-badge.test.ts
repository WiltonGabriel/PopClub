import { describe, it, expect } from "vitest";
import {
  calculateAccountAgeMonths,
  isBadgeUnlocked,
  getUserBadge,
  formatLoyaltyBadgeRequirement,
  LoyaltyBadgeConfig,
} from "@/services/loyaltyBadgeService";

describe("LoyaltyBadgeService (Regras de Selos por Meses e Compras)", () => {
  const customBadges: LoyaltyBadgeConfig[] = [
    {
      id: "badge_1",
      level: 1,
      name: "Iniciante",
      icon: "🌱",
      minMonths: 0,
      minOrders: 0,
      criteriaMode: "either",
    },
    {
      id: "badge_2",
      level: 2,
      name: "Bronze",
      icon: "🥉",
      minMonths: 2,
      minOrders: 5,
      criteriaMode: "either",
    },
    {
      id: "badge_3",
      level: 3,
      name: "Ouro",
      icon: "👑",
      minMonths: 6,
      minOrders: 15,
      criteriaMode: "orders", // estritamente por compras
    },
    {
      id: "badge_4",
      level: 4,
      name: "VIP Mestre",
      icon: "💎",
      minMonths: 12,
      minOrders: 30,
      criteriaMode: "both", // exige ambos
    },
  ];

  it("calcula idade da conta em meses decorridos", () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    expect(calculateAccountAgeMonths(sixMonthsAgo)).toBeGreaterThanOrEqual(5);

    const today = new Date();
    expect(calculateAccountAgeMonths(today)).toBe(0);
  });

  it("desbloqueia selo no modo 'either' tanto por meses quanto por compras", () => {
    const bronze = customBadges[1]; // minMonths: 2, minOrders: 5

    // Atingiu por compras (5 compras), mesmo com 0 meses
    expect(isBadgeUnlocked(bronze, { months: 0, completedOrders: 5 })).toBe(true);

    // Atingiu por meses (2 meses), mesmo com 0 compras
    expect(isBadgeUnlocked(bronze, { months: 2, completedOrders: 0 })).toBe(true);

    // Não atingiu nenhum dos dois
    expect(isBadgeUnlocked(bronze, { months: 1, completedOrders: 4 })).toBe(false);
  });

  it("desbloqueia selo no modo 'orders' apenas se cumprir a quantidade de compras", () => {
    const ouro = customBadges[2]; // minOrders: 15, criteriaMode: "orders"

    // Tem 24 meses de conta, mas só 10 compras -> BLOQUEADO
    expect(isBadgeUnlocked(ouro, { months: 24, completedOrders: 10 })).toBe(false);

    // Tem 0 meses de conta, mas 15 compras -> DESBLOQUEADO
    expect(isBadgeUnlocked(ouro, { months: 0, completedOrders: 15 })).toBe(true);
  });

  it("desbloqueia selo no modo 'both' somente se cumprir meses E compras simultaneamente", () => {
    const vip = customBadges[3]; // minMonths: 12, minOrders: 30, criteriaMode: "both"

    // Tem 12 meses mas só 20 compras
    expect(isBadgeUnlocked(vip, { months: 12, completedOrders: 20 })).toBe(false);

    // Tem 40 compras mas só 6 meses
    expect(isBadgeUnlocked(vip, { months: 6, completedOrders: 40 })).toBe(false);

    // Tem ambos
    expect(isBadgeUnlocked(vip, { months: 12, completedOrders: 30 })).toBe(true);
  });

  it("determina o maior selo que o usuário tem direito via getUserBadge", () => {
    // Cliente com 20 compras e 0 meses de conta ganha Ouro (nível 3)
    const userBadge = getUserBadge({ months: 0, completedOrders: 20 }, customBadges);
    expect(userBadge.level).toBe(3);
    expect(userBadge.name).toBe("Ouro");
  });

  it("formata critérios de meses, compras e modo de exigência com formatLoyaltyBadgeRequirement", () => {
    expect(formatLoyaltyBadgeRequirement(customBadges[0])).toBe("Novo membro");
    expect(formatLoyaltyBadgeRequirement(customBadges[1])).toBe("2 meses ou 5 pedidos");
    expect(formatLoyaltyBadgeRequirement(customBadges[2])).toBe("15 pedidos");
    expect(formatLoyaltyBadgeRequirement(customBadges[3])).toBe("12 meses e 30 pedidos");
  });
});
