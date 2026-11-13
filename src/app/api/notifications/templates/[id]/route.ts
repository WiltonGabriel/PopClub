import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";

const updateTemplateSchema = z.object({
  title: z.string().trim().min(1, "O título não pode ser vazio.").max(120).optional(),
  message: z.string().trim().min(1, "A mensagem não pode ser vazia.").max(1000).optional(),
  category: z.enum(["welcome", "news", "reengagement", "custom", "promo"]).optional(),
  couponId: z.string().trim().min(1).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existing = await prisma.notificationTemplate.findUnique({ where: { id } });
    if (!existing || existing.category === "loyalty_badges") {
      return NextResponse.json({ error: "Modelo de notificação não encontrado." }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const parsed = updateTemplateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do modelo inválidos." },
        { status: 400 }
      );
    }

    const { title, message, category, couponId } = parsed.data;

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(message !== undefined && { message }),
        ...(category !== undefined && { category }),
        ...(couponId !== undefined && { couponId }),
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_NOTIFICATION_TEMPLATE",
      resourceType: "notification_template",
      resourceId: updated.id,
      summary: `Atualizou modelo de notificação "${updated.title}".`,
      diffKeys: Object.keys(parsed.data),
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Erro ao atualizar modelo de notificação:", error);
    return NextResponse.json({ error: "Erro ao atualizar modelo." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existing = await prisma.notificationTemplate.findUnique({ where: { id } });
    if (!existing || existing.category === "loyalty_badges") {
      return NextResponse.json({ error: "Modelo de notificação não encontrado." }, { status: 404 });
    }

    await prisma.notificationTemplate.delete({
      where: { id },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "DELETE_NOTIFICATION_TEMPLATE",
      resourceType: "notification_template",
      resourceId: id,
      summary: `Excluiu modelo de notificação "${existing.title}".`,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao deletar modelo de notificação:", error);
    return NextResponse.json({ error: "Erro ao excluir modelo." }, { status: 500 });
  }
}
