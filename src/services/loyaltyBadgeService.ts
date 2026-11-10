export interface LoyaltyBadgeConfig {
  id: string;
  level: number;
  name: string;
  icon: string;
  minMonths: number;
  minOrders?: number;
  criteriaMode?: "months" | "orders" | "either" | "both";
  description?: string;
  badgeClass?: string;
}

export const DEFAULT_LOYALTY_BADGES: LoyaltyBadgeConfig[] = [
  {
    id: "badge_novo",
    level: 1,
    name: "Novo Membro",
    icon: "🌟",
    minMonths: 0,
    minOrders: 0,
    criteriaMode: "either",
    description: "Menos de 1 mês de conta ou novos pedidos",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  {
    id: "badge_bronze",
    level: 2,
    name: "Cliente Bronze",
    icon: "🥉",
    minMonths: 1,
    minOrders: 3,
    criteriaMode: "either",
    description: "A partir de 1 mês de conta ou 3 pedidos concluídos",
    badgeClass: "bg-amber-700/10 text-amber-800 dark:text-amber-300 border-amber-700/30",
  },
  {
    id: "badge_prata",
    level: 3,
    name: "Cliente Prata",
    icon: "🥈",
    minMonths: 6,
    minOrders: 10,
    criteriaMode: "either",
    description: "A partir de 6 meses de conta ou 10 pedidos concluídos",
    badgeClass: "bg-slate-200/70 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border-slate-300 dark:border-slate-700",
  },
  {
    id: "badge_ouro",
    level: 4,
    name: "Cliente Ouro VIP",
    icon: "👑",
    minMonths: 12,
    minOrders: 25,
    criteriaMode: "either",
    description: "A partir de 1 ano de conta ou 25 pedidos concluídos",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs",
  },
];

export function calculateAccountAgeMonths(createdAt: string | Date): number {
  const created = new Date(createdAt);
  const now = new Date();
  let months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  if (now.getDate() < created.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

export function isBadgeUnlocked(
  badge: LoyaltyBadgeConfig,
  userStats: { months: number; completedOrders?: number }
): boolean {
  const months = Math.max(0, userStats.months || 0);
  const completedOrders = Math.max(0, userStats.completedOrders || 0);
  const minOrders = badge.minOrders !== undefined && badge.minOrders !== null ? badge.minOrders : 0;
  const mode = badge.criteriaMode || "either";

  if (mode === "orders") {
    return completedOrders >= minOrders;
  }
  if (mode === "months") {
    return months >= badge.minMonths;
  }
  if (mode === "both") {
    return months >= badge.minMonths && completedOrders >= minOrders;
  }
  // "either": se cumpriu pelo menos um dos critérios configurados (> 0)
  if (minOrders > 0 && badge.minMonths > 0) {
    return months >= badge.minMonths || completedOrders >= minOrders;
  }
  if (minOrders > 0) {
    return completedOrders >= minOrders;
  }
  return months >= badge.minMonths;
}

export function getUserBadge(
  userStats: { months: number; completedOrders?: number },
  badges: LoyaltyBadgeConfig[] = DEFAULT_LOYALTY_BADGES
): LoyaltyBadgeConfig {
  const sorted = [...badges].sort((a, b) => b.level - a.level);
  for (const b of sorted) {
    if (isBadgeUnlocked(b, userStats)) {
      return b;
    }
  }
  return sorted[sorted.length - 1] || DEFAULT_LOYALTY_BADGES[0];
}

export function getBadgeForMonths(months: number, badges: LoyaltyBadgeConfig[] = DEFAULT_LOYALTY_BADGES): LoyaltyBadgeConfig {
  return getUserBadge({ months, completedOrders: 0 }, badges);
}

export const loyaltyBadgeService = {
  async getBadges(): Promise<LoyaltyBadgeConfig[]> {
    try {
      const res = await fetch("/api/settings/loyalty-badges", {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        return DEFAULT_LOYALTY_BADGES;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return DEFAULT_LOYALTY_BADGES;
    } catch (err) {
      console.warn("Aviso ao buscar selos de fidelidade (usando padrão):", err);
      return DEFAULT_LOYALTY_BADGES;
    }
  },

  async updateBadges(badges: LoyaltyBadgeConfig[]): Promise<LoyaltyBadgeConfig[]> {
    const res = await fetch("/api/settings/loyalty-badges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ badges }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao salvar selos de fidelidade.");
    }
    return data.badges;
  },
};
