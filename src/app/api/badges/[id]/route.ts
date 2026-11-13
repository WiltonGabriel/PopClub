import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const patchBadgeSchema = z.object({
  text: z.string().trim().min(1).max(40).optional(),
  icon: z.string().trim().max(24).nullish(),
  bgColor: z.string().trim().regex(hexColorRegex, "Cor de fundo inválida.").optional(),
  textColor: z.string().trim().regex(hexColorRegex, "Cor de texto inválida.").optional(),
  addProductId: z.string().trim().min(1).optional(),
  removeProductId: z.string().trim().min(1).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(user, "theme_manage") && !hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar selos necessária." }, { status: 403 });
    }

    const { id } = await params;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const parsed = patchBadgeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dados do selo inválidos." },
        { status: 400 }
      );
    }

    const { text, icon, bgColor, textColor, addProductId, removeProductId } = parsed.data;

    // Vincular produto ao selo
    if (addProductId) {
      await prisma.product.update({
        where: { id: addProductId },
        data: { cardBadgeId: id },
      });
      const updated = await prisma.cardBadge.findUnique({
        where: { id },
        include: {
          _count: { select: { products: true } },
          products: { select: { id: true, name: true, imageUrl: true }, orderBy: { name: "asc" } },
        },
      });
      return NextResponse.json(updated);
    }

    // Desvincular produto do selo
    if (removeProductId) {
      await prisma.product.update({
        where: { id: removeProductId },
        data: { cardBadgeId: null },
      });
      const updated = await prisma.cardBadge.findUnique({
        where: { id },
        include: {
          _count: { select: { products: true } },
          products: { select: { id: true, name: true, imageUrl: true }, orderBy: { name: "asc" } },
        },
      });
      return NextResponse.json(updated);
    }

    // Atualizar campos do selo
    const dataToUpdate: any = {};
    if (text !== undefined) dataToUpdate.text = text.trim();
    if (icon !== undefined) dataToUpdate.icon = icon ? icon.trim() : null;
    if (bgColor !== undefined) dataToUpdate.bgColor = bgColor;
    if (textColor !== undefined) dataToUpdate.textColor = textColor;

    const updated = await prisma.cardBadge.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: { select: { products: true } },
        products: { select: { id: true, name: true, imageUrl: true }, orderBy: { name: "asc" } },
      },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_CARD_BADGE",
      resourceType: "card_badge",
      resourceId: id,
      summary: `Atualizou selo visual "${updated?.text || id}".`,
      diffKeys: Object.keys(dataToUpdate),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar selo:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Selo não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar selo." }, { status: 500 });
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
    if (!hasPermission(user, "theme_manage") && !hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar selos necessária." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.cardBadge.delete({
      where: { id },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "DELETE_CARD_BADGE",
      resourceType: "card_badge",
      resourceId: id,
      summary: "Excluiu selo visual de card.",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar selo:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Selo não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir selo." }, { status: 500 });
  }
}
