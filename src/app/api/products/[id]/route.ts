import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { productInclude, formatProduct } from "@/lib/productHelper";
import { resolveOrderedAddonGroupIds } from "@/lib/addonPersistenceHelper";
import { hasPermission } from "@/lib/permissions";
import { deleteOrSoftDeleteProduct } from "@/services/productDeletionService";
import { reconcileProductEditImpacts } from "@/services/productDependencyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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

    if (!product || product.deletedAt) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(formatProduct(product), { headers: NO_CACHE_HEADERS });
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
    if (categoryId !== undefined) {
      dataToUpdate.categoryId = categoryId || null;
      if (!categoryId && category === undefined) {
        dataToUpdate.category = null;
      } else if (categoryId) {
        const targetCategory = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true },
        });
        if (!targetCategory) {
          return NextResponse.json({ error: "A categoria selecionada não foi encontrada." }, { status: 400 });
        }
        dataToUpdate.category = targetCategory.name;
      }
    }
    if (category !== undefined && dataToUpdate.category === undefined) {
      dataToUpdate.category = category ? sanitizeText(category) : null;
    }
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

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        price: true,
        isCombo: true,
        isAvailable: true,
        stock: true,
        deletedAt: true,
        _count: { select: { comboItems: true } },
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const resultingIsCombo = isCombo !== undefined ? Boolean(isCombo) : Boolean(existing.isCombo);
    const resultingIsAvailable =
      isAvailable !== undefined ? Boolean(isAvailable) : Boolean(existing.isAvailable);
    const resultingComboItemsCount = Array.isArray(comboItems)
      ? comboItems.length
      : existing._count?.comboItems ?? 0;

    if (resultingIsCombo && resultingIsAvailable && resultingComboItemsCount === 0) {
      return NextResponse.json(
        { error: "Um combo não pode ser ativado sem pelo menos 1 produto vinculado." },
        { status: 400 }
      );
    }

    if (resultingIsCombo && Array.isArray(comboItems) && comboItems.length > 0) {
      const childIds = Array.from(new Set(comboItems.map((ci) => ci.productId).filter(Boolean)));
      if (childIds.includes(id)) {
        return NextResponse.json(
          { error: "Um combo não pode conter a si mesmo." },
          { status: 400 }
        );
      }
      const childProducts = await prisma.product.findMany({
        where: { id: { in: childIds }, deletedAt: null },
        select: { id: true, name: true, isCombo: true },
      });
      if (childProducts.length !== childIds.length) {
        return NextResponse.json(
          { error: "Um ou mais itens selecionados para o combo não existem ou foram removidos." },
          { status: 400 }
        );
      }
      const nestedCombo = childProducts.find((cp) => cp.isCombo);
      if (nestedCombo) {
        return NextResponse.json(
          { error: `O item "${nestedCombo.name}" já é um combo e não pode ser adicionado dentro de outro combo.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: productInclude,
    });

    const impactSummary = await reconcileProductEditImpacts({
      productId: id,
      previousProduct: {
        id: existing.id,
        name: existing.name,
        price: existing.price,
        isCombo: Boolean(existing.isCombo),
        isAvailable: Boolean(existing.isAvailable),
        stock: existing.stock ?? null,
      },
      updatedProduct: {
        id: updated.id,
        name: updated.name,
        price: updated.price,
        isCombo: Boolean(updated.isCombo),
        isAvailable: Boolean(updated.isAvailable),
        stock: updated.stock ?? null,
      },
      actor: user ? { id: user.id, role: user.role } : null,
    });

    return NextResponse.json(
      {
        ...formatProduct(updated),
        impactWarnings: impactSummary.warnings,
        impactSummary,
      },
      { headers: NO_CACHE_HEADERS }
    );
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
    const result = await deleteOrSoftDeleteProduct(id, user ? { id: user.id, role: user.role } : null);

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      softDeleted: result.softDeleted,
      linkedOrdersCount: result.linkedOrdersCount,
      impacts: result.impacts,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error("Erro ao excluir produto:", error);
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 500 });
  }
}
