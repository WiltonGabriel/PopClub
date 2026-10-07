import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { addonCrudLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { deleteAddonImageFile } from "@/lib/addonStorage";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await prisma.addonGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        products: {
          include: {
            product: {
              select: { id: true, name: true, price: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Grupo de complementos não encontrado." }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error("Erro ao buscar grupo de complementos:", error);
    return NextResponse.json({ error: "Erro ao buscar grupo de complementos." }, { status: 500 });
  }
}

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

    const { name, description, minQuantity, maxQuantity, freeQuantity, isRequired, allowItemQuantity, sortOrder, isActive } = body || {};

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (description !== undefined) dataToUpdate.description = description ? String(description).trim() : null;
    if (minQuantity !== undefined) dataToUpdate.minQuantity = Math.max(0, parseInt(String(minQuantity), 10) || 0);
    if (maxQuantity !== undefined) dataToUpdate.maxQuantity = Math.max(1, parseInt(String(maxQuantity), 10) || 1);
    if (freeQuantity !== undefined) dataToUpdate.freeQuantity = Math.max(0, parseInt(String(freeQuantity), 10) || 0);
    if (isRequired !== undefined) dataToUpdate.isRequired = Boolean(isRequired);
    if (allowItemQuantity !== undefined) dataToUpdate.allowItemQuantity = Boolean(allowItemQuantity);
    if (sortOrder !== undefined) dataToUpdate.sortOrder = parseInt(String(sortOrder), 10) || 0;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    // Ajusta min vs max se necessário
    if (dataToUpdate.minQuantity !== undefined && dataToUpdate.maxQuantity !== undefined) {
      if ((dataToUpdate.maxQuantity as number) < (dataToUpdate.minQuantity as number)) {
        dataToUpdate.maxQuantity = dataToUpdate.minQuantity;
      }
    }

    const updated = await prisma.addonGroup.update({
      where: { id },
      data: dataToUpdate,
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      productsCount: updated._count.products,
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar grupo de complementos:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Grupo de complementos não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar grupo de complementos." }, { status: 500 });
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

    // Busca itens para limpar imagens associadas do disco
    const groupItems = await prisma.addonItem.findMany({
      where: { groupId: id },
      select: { imageUrl: true },
    });

    for (const item of groupItems) {
      if (item.imageUrl) {
        await deleteAddonImageFile(item.imageUrl);
      }
    }

    await prisma.addonGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Grupo de complementos removido com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir grupo de complementos:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Grupo de complementos não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir grupo de complementos." }, { status: 500 });
  }
}
