import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { DEFAULT_LOYALTY_BADGES, LoyaltyBadgeConfig } from "@/services/loyaltyBadgeService";
import {
  getOrBackfillLoyaltyBadges,
  saveLoyaltyBadgesToTable,
} from "@/services/loyaltyBadgeConfigBackfill";
import { recordAdminAudit } from "@/services/auditLogService";

export async function GET() {
  try {
    const badges = await getOrBackfillLoyaltyBadges();
    return NextResponse.json(badges);
  } catch (error: unknown) {
    console.error("Erro ao buscar selos de fidelidade:", error);
    return NextResponse.json(DEFAULT_LOYALTY_BADGES);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "loyalty_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão loyalty_manage necessária para gerenciar selos de fidelidade." },
        { status: 403 }
      );
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

    const validatedBadges = await saveLoyaltyBadgesToTable(rawBadges as LoyaltyBadgeConfig[], {
      mirrorLegacyTemplate: true,
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_LOYALTY_BADGES",
      resourceType: "loyalty_badge_config",
      resourceId: "store_loyalty_badges",
      summary: `Atualizou ${validatedBadges.length} selos de fidelidade.`,
      diffKeys: ["badges"],
      metadata: { count: validatedBadges.length },
    });

    return NextResponse.json({
      success: true,
      badges: validatedBadges,
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar selos de fidelidade:", error);
    return NextResponse.json({ error: "Erro ao salvar selos de fidelidade." }, { status: 500 });
  }
}
