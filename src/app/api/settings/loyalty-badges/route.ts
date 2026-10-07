import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { DEFAULT_LOYALTY_BADGES, LoyaltyBadgeConfig } from "@/services/loyaltyBadgeService";

const TEMPLATE_CATEGORY = "loyalty_badges";
const TEMPLATE_TITLE = "loyalty_badges_config";

export async function GET() {
  try {
    const record = await prisma.notificationTemplate.findFirst({
      where: { category: TEMPLATE_CATEGORY },
      orderBy: { updatedAt: "desc" },
    });

    if (record && record.message) {
      try {
        const parsed = JSON.parse(record.message);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json(parsed);
        }
      } catch (err) {
        console.warn("Aviso ao decodificar selos salvos:", err);
      }
    }

    return NextResponse.json(DEFAULT_LOYALTY_BADGES);
  } catch (error: unknown) {
    console.error("Erro ao buscar selos de fidelidade:", error);
    return NextResponse.json(DEFAULT_LOYALTY_BADGES);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "settings_manage") && !hasPermission(user, "promotions_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar selos de fidelidade necessária." }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const rawBadges = Array.isArray(body?.badges) ? body.badges : [];
    if (rawBadges.length === 0) {
      return NextResponse.json({ error: "É necessário ao menos 1 selo de fidelidade configurado." }, { status: 400 });
    }

    if (rawBadges.length > 6) {
      return NextResponse.json({ error: "O limite máximo é de 6 níveis de selos de fidelidade." }, { status: 400 });
    }

    // Ordena do menor para o maior tempo mínimo
    const sortedBadges = [...rawBadges].sort((a: Partial<LoyaltyBadgeConfig>, b: Partial<LoyaltyBadgeConfig>) => (a.minMonths ?? 0) - (b.minMonths ?? 0));

    // Validação e normalização dos selos
    const validatedBadges: LoyaltyBadgeConfig[] = sortedBadges.map((b: Partial<LoyaltyBadgeConfig>, index: number) => {
      const level = typeof b.level === "number" && b.level >= 1 && b.level <= 6 ? b.level : (index + 1);
      const name = String(b.name || `Selo Nível ${level}`).trim();
      const icon = String(b.icon || "🌟").trim();
      const minMonths = Math.max(0, parseInt(String(b.minMonths ?? 0), 10) || 0);

      // Classes visuais automáticas caso não venha definida
      let badgeClass = b.badgeClass;
      if (!badgeClass) {
        if (minMonths === 0) {
          badgeClass = "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30";
        } else if (minMonths <= 3) {
          badgeClass = "bg-amber-700/10 text-amber-800 dark:text-amber-300 border-amber-700/30";
        } else if (minMonths <= 8) {
          badgeClass = "bg-slate-200/70 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border-slate-300 dark:border-slate-700";
        } else if (minMonths <= 18) {
          badgeClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs";
        } else if (minMonths <= 30) {
          badgeClass = "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 shadow-xs";
        } else {
          badgeClass = "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/40 shadow-xs";
        }
      }

      return {
        id: b.id || `badge_level_${level}`,
        level,
        name,
        icon,
        minMonths,
        description: b.description || (minMonths === 0 ? "Novo membro" : `A partir de ${minMonths} meses`),
        badgeClass,
      };
    });

    // Persiste no banco de dados através da tabela de configurações
    const existing = await prisma.notificationTemplate.findFirst({
      where: { category: TEMPLATE_CATEGORY },
    });

    if (existing) {
      await prisma.notificationTemplate.update({
        where: { id: existing.id },
        data: {
          title: TEMPLATE_TITLE,
          message: JSON.stringify(validatedBadges),
        },
      });
    } else {
      await prisma.notificationTemplate.create({
        data: {
          title: TEMPLATE_TITLE,
          category: TEMPLATE_CATEGORY,
          message: JSON.stringify(validatedBadges),
        },
      });
    }

    return NextResponse.json({
      success: true,
      badges: validatedBadges,
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar selos de fidelidade:", error);
    return NextResponse.json({ error: "Erro ao salvar selos de fidelidade." }, { status: 500 });
  }
}
