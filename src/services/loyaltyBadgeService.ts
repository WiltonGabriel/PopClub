export interface LoyaltyBadgeConfig {
  id: string;
  level: number;
  name: string;
  icon: string;
  minMonths: number;
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
    description: "Menos de 1 mês de conta",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  {
    id: "badge_bronze",
    level: 2,
    name: "Cliente Bronze",
    icon: "🥉",
    minMonths: 1,
    description: "A partir de 1 mês de conta",
    badgeClass: "bg-amber-700/10 text-amber-800 dark:text-amber-300 border-amber-700/30",
  },
  {
    id: "badge_prata",
    level: 3,
    name: "Cliente Prata",
    icon: "🥈",
    minMonths: 6,
    description: "A partir de 6 meses de conta",
    badgeClass: "bg-slate-200/70 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border-slate-300 dark:border-slate-700",
  },
  {
    id: "badge_ouro",
    level: 4,
    name: "Cliente Ouro VIP",
    icon: "👑",
    minMonths: 12,
    description: "A partir de 1 ano de conta",
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

export function getBadgeForMonths(months: number, badges: LoyaltyBadgeConfig[] = DEFAULT_LOYALTY_BADGES): LoyaltyBadgeConfig {
  const sorted = [...badges].sort((a, b) => b.minMonths - a.minMonths);
  return sorted.find((b) => months >= b.minMonths) || sorted[sorted.length - 1];
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
