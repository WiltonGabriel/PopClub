import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";
import { repairMojibake } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bannerUpdateSchema = z.object({
  icon: z.string().trim().max(500).optional(),
  title: z.string().trim().max(200).optional(),
  subtitle: z.string().trim().max(400).optional(),
  badge: z.string().trim().max(80).optional(),
});

const DEFAULT_BANNER = {
  id: "home_highlight",
  icon: "🥣",
  title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
  subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha.",
  badge: "Refrescância Artesanal",
};

export async function GET() {
  try {
    if (!prisma.highlightBanner) {
      return NextResponse.json(DEFAULT_BANNER);
    }

    const banner = await prisma.highlightBanner.findUnique({
      where: { id: "home_highlight" },
    });

    if (!banner) {
      return NextResponse.json(DEFAULT_BANNER);
    }

    return NextResponse.json({
      id: banner.id,
      icon: repairMojibake(banner.icon || DEFAULT_BANNER.icon),
      title: repairMojibake(banner.title || DEFAULT_BANNER.title),
      subtitle: repairMojibake(banner.subtitle || DEFAULT_BANNER.subtitle),
      badge: repairMojibake(banner.badge || DEFAULT_BANNER.badge),
    });
  } catch (error) {
    console.error("Erro ao buscar banner de destaque:", error);
    // Em caso de erro no banco, retorna os padrões de fallback
    return NextResponse.json(DEFAULT_BANNER);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (
      !hasPermission(user, "theme_manage") &&
      !hasPermission(user, "promotions_manage") &&
      !hasPermission(user, "storefront_edit")
    ) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão theme_manage necessária para editar o banner." },
        { status: 403 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const parsed = bannerUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do banner inválidos." },
        { status: 400 }
      );
    }

    const { icon, title, subtitle, badge } = parsed.data;

    const banner = await prisma.highlightBanner.upsert({
      where: { id: "home_highlight" },
      update: {
        icon: (icon && typeof icon === "string" ? icon.trim() : "") || DEFAULT_BANNER.icon,
        title: (title && typeof title === "string" ? title.trim() : "") || DEFAULT_BANNER.title,
        subtitle: (subtitle && typeof subtitle === "string" ? subtitle.trim() : "") || DEFAULT_BANNER.subtitle,
        badge: (badge && typeof badge === "string" ? badge.trim() : "") || DEFAULT_BANNER.badge,
      },
      create: {
        id: "home_highlight",
        icon: (icon && typeof icon === "string" ? icon.trim() : "") || DEFAULT_BANNER.icon,
        title: (title && typeof title === "string" ? title.trim() : "") || DEFAULT_BANNER.title,
        subtitle: (subtitle && typeof subtitle === "string" ? subtitle.trim() : "") || DEFAULT_BANNER.subtitle,
        badge: (badge && typeof badge === "string" ? badge.trim() : "") || DEFAULT_BANNER.badge,
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_HIGHLIGHT_BANNER",
      resourceType: "highlight_banner",
      resourceId: banner.id,
      summary: "Atualizou banner de destaque da vitrine.",
      diffKeys: ["icon", "title", "subtitle", "badge"],
    });

    return NextResponse.json({
      id: banner.id,
      icon: banner.icon,
      title: banner.title,
      subtitle: banner.subtitle,
      badge: banner.badge,
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar banner de destaque:", error);
    return NextResponse.json(
      { error: "Erro ao salvar alterações do banner." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
