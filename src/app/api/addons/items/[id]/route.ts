import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addonCrudLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { deleteAddonImageIfUnused } from "@/lib/addonStorage";
import { hasPermission } from "@/lib/permissions";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = addonCrudLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json({ error: "Muitas requisições. Aguarde um instante." }, { status: 429 });
    }

    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar complementos necessária." }, { status: 403 });
    }

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const existing = await prisma.addonItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }

    const { groupId, catalogKey, name, price, imageUrl, isAvailable, sortOrder } = body || {};

    const dataToUpdate: Record<string, unknown> = {};
    if (groupId !== undefined) {
      if (typeof groupId !== "string" || !groupId.trim()) {
        return NextResponse.json({ error: "ID do grupo de destino inválido." }, { status: 400 });
      }
      const targetGroupId = groupId.trim();
      if (targetGroupId !== existing.groupId) {
        const targetGroup = await prisma.addonGroup.findUnique({
          where: { id: targetGroupId },
          select: { id: true },
        });
        if (!targetGroup) {
          return NextResponse.json({ error: "Grupo de destino não encontrado." }, { status: 404 });
        }
        dataToUpdate.groupId = targetGroupId;
      }
    }
    if (catalogKey !== undefined) {
      dataToUpdate.catalogKey =
        typeof catalogKey === "string" && catalogKey.trim()
          ? catalogKey.trim().slice(0, 120)
          : null;
    }
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (price !== undefined) dataToUpdate.price = Math.max(0, parseFloat(String(price)) || 0);
    if (isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(isAvailable);
    if (sortOrder !== undefined) dataToUpdate.sortOrder = parseInt(String(sortOrder), 10) || 0;

    let cleanImg: string | null | undefined;
    if (imageUrl !== undefined) {
      cleanImg = imageUrl ? String(imageUrl).trim() : null;
      dataToUpdate.imageUrl = cleanImg;
    }

    const updated = await prisma.addonItem.update({
      where: { id },
      data: dataToUpdate,
    });

    if (
      cleanImg !== undefined &&
      existing.imageUrl &&
      existing.imageUrl !== cleanImg
    ) {
      await deleteAddonImageIfUnused(prisma, existing.imageUrl);
    }

    return NextResponse.json({
      ...updated,
      price: Number(updated.price),
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar item de complemento:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar item de complemento." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = addonCrudLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json({ error: "Muitas requisições. Aguarde um instante." }, { status: 429 });
    }

    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar complementos necessária." }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.addonItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }

    await prisma.addonItem.delete({ where: { id } });

    // Exclui a imagem física somente se não houver outro item usando o mesmo arquivo
    if (existing.imageUrl) {
      await deleteAddonImageIfUnused(prisma, existing.imageUrl);
    }

    return NextResponse.json({ success: true, message: "Item de complemento removido com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir item de complemento:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Item de complemento não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir item de complemento." }, { status: 500 });
  }
}
