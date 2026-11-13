import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const createBadgeSchema = z.object({
  text: z.string().trim().min(1, "O texto do selo é obrigatório.").max(40),
  icon: z.string().trim().max(24).nullish(),
  bgColor: z.string().trim().regex(hexColorRegex, "Cor de fundo inválida.").optional().default("#FEF3C7"),
  textColor: z.string().trim().regex(hexColorRegex, "Cor de texto inválida.").optional().default("#B45309"),
});

export async function GET() {
  try {
    const badges = await prisma.cardBadge.findMany({
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          select: { id: true, name: true, imageUrl: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(badges);
  } catch (error: unknown) {
    console.error("Erro ao buscar selos dos cards:", error);
    return NextResponse.json({ error: "Erro ao buscar selos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "theme_manage") && !hasPermission(user, "menu_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão theme_manage ou menu_manage necessária." },
        { status: 403 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const parsed = createBadgeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do selo inválidos." },
        { status: 400 }
      );
    }

    const badge = await prisma.cardBadge.create({
      data: {
        text: parsed.data.text,
        icon: parsed.data.icon || null,
        bgColor: parsed.data.bgColor,
        textColor: parsed.data.textColor,
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "CREATE_CARD_BADGE",
      resourceType: "card_badge",
      resourceId: badge.id,
      summary: `Criou selo visual de card "${badge.text}".`,
      diffKeys: ["text", "icon", "bgColor", "textColor"],
    });

    return NextResponse.json(badge);
  } catch (error: unknown) {
    console.error("Erro ao criar selo do card:", error);
    return NextResponse.json({ error: "Erro ao criar selo." }, { status: 500 });
  }
}
