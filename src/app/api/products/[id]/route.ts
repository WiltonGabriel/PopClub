import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { productInclude, formatProduct } from "@/lib/productHelper";
import { resolveOrderedAddonGroupIds } from "@/lib/addonPersistenceHelper";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    return NextResponse.json(formatProduct(product));
  } catch (error: unknown) {
    console.error("Erro ao buscar detalhes do produto:", error);
    return NextResponse.json({ error: "Erro ao buscar detalhes do produto." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar cardápio necessária." }, { status: 403 });
    }

    const { id } = await params;
    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }
    const {
      name,
      description,
      price,
      categoryId,
      category,
      imageUrl,
      stock,
      isAvailable,
      cardBadgeId,
      isCombo,
      comboItems,
      addonGroupIds,
      servesText,
      isHighlight,
      showScarcity,
      scarcityType,
      scarcityUnits,
      scarcityInitial,
      scarcitySold,
      showProgressBar,
      showDuration,
      urgencyType,
      expiresAt,
      sessionMinutes,
    } = (body || {}) as {
      name?: string;
      description?: string;
      price?: number | string;
      servesText?: string | null;
      isHighlight?: boolean;
      categoryId?: string;
      category?: string;
      imageUrl?: string;
      stock?: number | string;
      isAvailable?: boolean;
      cardBadgeId?: string;
      isCombo?: boolean;
      comboItems?: Array<{ productId: string; quantity?: number }>;
      addonGroupIds?: string[];
      showScarcity?: boolean;
      scarcityType?: string;
      scarcityUnits?: number | string;
      scarcityInitial?: number | string;
      scarcitySold?: number | string;
      showProgressBar?: boolean;
      showDuration?: boolean;
      urgencyType?: string;
      expiresAt?: string | null;
      sessionMinutes?: number | string;
    };

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = sanitizeText(name);
    if (description !== undefined) dataToUpdate.description = description ? sanitizeText(description) : null;
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return NextResponse.json({ error: "O preço deve ser um número positivo." }, { status: 400 });
      }
      dataToUpdate.price = parsedPrice;
    }
    if (servesText !== undefined) {
      dataToUpdate.servesText = servesText ? String(servesText) : null;
    }
    if (isHighlight !== undefined) {
      dataToUpdate.isHighlight = Boolean(isHighlight);
    }
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId || null;
    if (category !== undefined) dataToUpdate.category = category ? sanitizeText(category) : null;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
    if (stock !== undefined) dataToUpdate.stock = stock !== null && stock !== "" ? Number(stock) : null;
    if (isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(isAvailable);
    if (cardBadgeId !== undefined) dataToUpdate.cardBadgeId = cardBadgeId || null;
    if (isCombo !== undefined) dataToUpdate.isCombo = Boolean(isCombo);
    if (showScarcity !== undefined) dataToUpdate.showScarcity = Boolean(showScarcity);
    if (scarcityType !== undefined) dataToUpdate.scarcityType = String(scarcityType);
    if (scarcityUnits !== undefined) dataToUpdate.scarcityUnits = scarcityUnits !== null && scarcityUnits !== "" ? Number(scarcityUnits) : null;
    if (scarcityInitial !== undefined) dataToUpdate.scarcityInitial = scarcityInitial !== null && scarcityInitial !== "" ? Number(scarcityInitial) : null;
    if (scarcitySold !== undefined) dataToUpdate.scarcitySold = Number(scarcitySold || 0);
    if (showProgressBar !== undefined) dataToUpdate.showProgressBar = Boolean(showProgressBar);
    if (showDuration !== undefined) dataToUpdate.showDuration = Boolean(showDuration);
    if (urgencyType !== undefined) dataToUpdate.urgencyType = String(urgencyType);
    if (expiresAt !== undefined) dataToUpdate.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (sessionMinutes !== undefined) dataToUpdate.sessionMinutes = sessionMinutes !== null && sessionMinutes !== "" ? Number(sessionMinutes) : null;
    
    if (isCombo && Array.isArray(comboItems)) {
      dataToUpdate.comboItems = {
        deleteMany: {}, // Clean old items
        create: comboItems.map((ci) => ({
          productId: ci.productId,
          quantity: ci.quantity || 1,
        })),
      };
    }

    if (Array.isArray(addonGroupIds)) {
      const orderedGroupIds = await resolveOrderedAddonGroupIds(addonGroupIds);
      dataToUpdate.addonGroups = {
        deleteMany: {},
        create: orderedGroupIds.map((groupId: string, index: number) => ({
          groupId,
          sortOrder: index,
        })),
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: productInclude,
    });

    return NextResponse.json(formatProduct(updated));
  } catch (error: unknown) {
    console.error("Erro ao atualizar produto:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar produto." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar cardápio necessária." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Produto excluído com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir produto:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 500 });
  }
}
