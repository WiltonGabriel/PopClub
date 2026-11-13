import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";

const DEFAULT_TEMPLATES = [
  {
    title: "Bem-vindo(a) ao PopClub! 🍧",
    message:
      "Olá {NOME}, preparamos um presente especial para sua primeira experiência com a gente! Aproveite o cupom exclusivo {CUPOM}.",
    category: "welcome",
  },
  {
    title: "Novidade Refrescante na Área! ✨",
    message:
      "Tem novidade refrescante chegando na esteira hoje! Venha conferir os lançamentos.",
    category: "news",
  },
  {
    title: "Que tal matar a saudade? 💜",
    message:
      "Faz um tempinho que você não pede seu açaí favorito! Que tal matar a saudade hoje?",
    category: "reengagement",
  },
];

const createTemplateSchema = z.object({
  title: z.string().trim().min(1, "O título do modelo é obrigatório.").max(120),
  message: z.string().trim().min(1, "O texto do modelo é obrigatório.").max(1000),
  category: z
    .enum(["welcome", "news", "reengagement", "custom", "promo"])
    .optional()
    .default("custom"),
  couponId: z.string().trim().min(1).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "notifications_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão notifications_manage necessária." },
        { status: 403 }
      );
    }

    let templates = await prisma.notificationTemplate.findMany({
      where: { category: { not: "loyalty_badges" } },
      orderBy: { createdAt: "asc" },
    });

    // Se ainda não houver templates de mensagem, popula com modelos padrão
    if (templates.length === 0) {
      for (const def of DEFAULT_TEMPLATES) {
        await prisma.notificationTemplate.create({
          data: def,
        });
      }
      templates = await prisma.notificationTemplate.findMany({
        where: { category: { not: "loyalty_badges" } },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json(templates);
  } catch (error: unknown) {
    console.error("Erro ao listar modelos de notificação:", error);
    return NextResponse.json({ error: "Erro ao buscar templates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "notifications_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão notifications_manage necessária." },
        { status: 403 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsed = createTemplateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do modelo inválidos." },
        { status: 400 }
      );
    }

    const currentCount = await prisma.notificationTemplate.count({
      where: { category: { not: "loyalty_badges" } },
    });
    if (currentCount >= 5) {
      return NextResponse.json(
        {
          error:
            "Limite atingido: Você já possui 5 modelos de mensagem salvos. Exclua ou substitua um modelo existente para salvar um novo.",
        },
        { status: 400 }
      );
    }

    const created = await prisma.notificationTemplate.create({
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
        category: parsed.data.category,
        couponId: parsed.data.couponId ?? null,
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "CREATE_NOTIFICATION_TEMPLATE",
      resourceType: "notification_template",
      resourceId: created.id,
      summary: `Criou modelo de notificação "${created.title}".`,
      diffKeys: ["title", "message", "category"],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar modelo de notificação:", error);
    return NextResponse.json({ error: "Erro ao salvar modelo." }, { status: 500 });
  }
}
