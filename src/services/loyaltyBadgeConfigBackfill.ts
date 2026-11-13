import { prisma } from "@/lib/prisma";
import { DEFAULT_LOYALTY_BADGES, LoyaltyBadgeConfig } from "@/services/loyaltyBadgeService";

const LEGACY_TEMPLATE_CATEGORY = "loyalty_badges";
const LEGACY_TEMPLATE_TITLE = "loyalty_badges_config";

function normalizeBadgeRows(rawBadges: Partial<LoyaltyBadgeConfig>[]): LoyaltyBadgeConfig[] {
  const sorted = [...rawBadges].sort(
    (a, b) => (a.level ?? a.minMonths ?? 0) - (b.level ?? b.minMonths ?? 0)
  );

  return sorted.map((b, index) => {
    const level =
      typeof b.level === "number" && b.level >= 1 && b.level <= 6 ? b.level : index + 1;
    const minMonths = Math.max(0, parseInt(String(b.minMonths ?? 0), 10) || 0);
    const minOrders = Math.max(0, parseInt(String(b.minOrders ?? 0), 10) || 0);
    const criteriaMode: LoyaltyBadgeConfig["criteriaMode"] =
      b.criteriaMode === "orders" ||
      b.criteriaMode === "months" ||
      b.criteriaMode === "both" ||
      b.criteriaMode === "either"
        ? b.criteriaMode
        : "either";

    let badgeClass = b.badgeClass;
    if (!badgeClass) {
      if (minMonths === 0 && minOrders === 0) {
        badgeClass = "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30";
      } else if (minMonths <= 3 || minOrders <= 5) {
        badgeClass = "bg-amber-700/10 text-amber-800 dark:text-amber-300 border-amber-700/30";
      } else if (minMonths <= 8 || minOrders <= 15) {
        badgeClass =
          "bg-slate-200/70 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border-slate-300 dark:border-slate-700";
      } else if (minMonths <= 18 || minOrders <= 30) {
        badgeClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs";
      } else if (minMonths <= 30 || minOrders <= 50) {
        badgeClass = "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 shadow-xs";
      } else {
        badgeClass = "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/40 shadow-xs";
      }
    }

    let description = b.description;
    if (!description) {
      if (minMonths > 0 && minOrders > 0) {
        description = `A partir de ${minOrders} pedidos ou ${minMonths} meses`;
      } else if (minOrders > 0) {
        description = `A partir de ${minOrders} pedidos concluídos`;
      } else if (minMonths > 0) {
        description = `A partir de ${minMonths} meses de conta`;
      } else {
        description = "Novo membro";
      }
    }

    return {
      id: String(b.id || `badge_level_${level}`),
      level,
      name: String(b.name || `Selo Nível ${level}`).trim(),
      icon: String(b.icon || "🌟").trim(),
      minMonths,
      minOrders,
      criteriaMode,
      description,
      badgeClass,
    };
  });
}

function mapDbRowToConfig(row: {
  id: string;
  level: number;
  name: string;
  icon: string;
  minMonths: number;
  minOrders: number;
  criteriaMode: string;
  description: string | null;
  badgeClass: string | null;
}): LoyaltyBadgeConfig {
  return {
    id: row.id,
    level: row.level,
    name: row.name,
    icon: row.icon,
    minMonths: row.minMonths,
    minOrders: row.minOrders,
    criteriaMode:
      row.criteriaMode === "orders" ||
      row.criteriaMode === "months" ||
      row.criteriaMode === "both" ||
      row.criteriaMode === "either"
        ? row.criteriaMode
        : "either",
    description: row.description ?? undefined,
    badgeClass: row.badgeClass ?? undefined,
  };
}

/**
 * Lê selos da tabela dedicada `loyalty_badge_configs`; caso vazia, executa backfill idempotente
 * a partir de NotificationTemplate[category='loyalty_badges'] sem apagar o registro legado.
 */
export async function getOrBackfillLoyaltyBadges(): Promise<LoyaltyBadgeConfig[]> {
  try {
    const dedicatedRows = await prisma.loyaltyBadgeConfig.findMany({
      orderBy: { level: "asc" },
    });

    if (dedicatedRows.length > 0) {
      return dedicatedRows.map(mapDbRowToConfig);
    }

    const legacyRecord = await prisma.notificationTemplate.findFirst({
      where: { category: LEGACY_TEMPLATE_CATEGORY },
      orderBy: { updatedAt: "desc" },
    });

    if (legacyRecord?.message) {
      const parsed = JSON.parse(legacyRecord.message);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = normalizeBadgeRows(parsed);
        await saveLoyaltyBadgesToTable(normalized, { mirrorLegacyTemplate: false });
        return normalized;
      }
    }
  } catch {
    // Fallback seguro caso o banco esteja indisponível ou registro legado inválido
  }

  return DEFAULT_LOYALTY_BADGES;
}

/**
 * Salva os selos de fidelidade na tabela dedicada `loyalty_badge_configs` de forma atômica.
 * Mantém espelho opcional no template legado apenas para compatibilidade durante transição.
 */
export async function saveLoyaltyBadgesToTable(
  badges: LoyaltyBadgeConfig[],
  options: { mirrorLegacyTemplate?: boolean } = { mirrorLegacyTemplate: true }
): Promise<LoyaltyBadgeConfig[]> {
  const normalized = normalizeBadgeRows(badges);

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyBadgeConfig.deleteMany({});
    for (const badge of normalized) {
      await tx.loyaltyBadgeConfig.create({
        data: {
          id: badge.id,
          level: badge.level,
          name: badge.name,
          icon: badge.icon,
          minMonths: badge.minMonths,
          minOrders: badge.minOrders ?? 0,
          criteriaMode: badge.criteriaMode ?? "either",
          description: badge.description ?? null,
          badgeClass: badge.badgeClass ?? null,
        },
      });
    }

    if (options.mirrorLegacyTemplate !== false) {
      const existing = await tx.notificationTemplate.findFirst({
        where: { category: LEGACY_TEMPLATE_CATEGORY },
      });
      if (existing) {
        await tx.notificationTemplate.update({
          where: { id: existing.id },
          data: {
            title: LEGACY_TEMPLATE_TITLE,
            message: JSON.stringify(normalized),
          },
        });
      }
    }
  });

  return normalized;
}
