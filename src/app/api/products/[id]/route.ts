import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";

const productInclude = {
  categoryRel: { select: { name: true } },
  cardBadge: true,
  comboItems: { include: { product: true } },
  addonGroups: {
    include: {
      group: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
};

function formatProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
    promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
    startsAt: product.startsAt ? (product.startsAt instanceof Date ? product.startsAt.toISOString() : product.startsAt) : null,
    endsAt: product.endsAt ? (product.endsAt instanceof Date ? product.endsAt.toISOString() : product.endsAt) : null,
    isPromoActive: product.isPromoActive ?? true,
    servesText: product.servesText || null,
    isHighlight: Boolean(product.isHighlight),
    categoryId: product.categoryId,
    category: product.categoryRel?.name || product.category || "Outros",
    imageUrl: product.imageUrl || "",
    stock: product.stock,
    isAvailable: product.isAvailable,
    cardBadgeId: product.cardBadgeId,
    cardBadge: product.cardBadge,
    isCombo: product.isCombo,
    comboItems: product.comboItems?.map((ci: any) => ({
      id: ci.id,
      productId: ci.productId,
      quantity: ci.quantity,
      product: ci.product ? {
        id: ci.product.id,
        name: ci.product.name,
        price: Number(ci.product.price),
        imageUrl: ci.product.imageUrl || "",
      } : undefined,
    })) || [],
    addonGroupIds: product.addonGroups?.map((ag: any) => ag.groupId) || [],
    addonGroups: product.addonGroups?.map((ag: any) => ag.group) || [],
  };
}

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
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
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
      originalPrice,
      promotionalPrice,
      startsAt,
      endsAt,
      isPromoActive,
      servesText,
      isHighlight,
    } = (body || {}) as {
      name?: string;
      description?: string;
      price?: number | string;
      originalPrice?: number | string | null;
      promotionalPrice?: number | string | null;
      startsAt?: string | null;
      endsAt?: string | null;
      isPromoActive?: boolean;
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
    if (originalPrice !== undefined) {
      dataToUpdate.originalPrice = originalPrice !== null && originalPrice !== "" ? Number(originalPrice) : null;
    }
    if (promotionalPrice !== undefined) {
      dataToUpdate.promotionalPrice = promotionalPrice !== null && promotionalPrice !== "" ? Number(promotionalPrice) : null;
    }
    if (startsAt !== undefined) {
      dataToUpdate.startsAt = startsAt ? new Date(startsAt) : null;
    }
    if (endsAt !== undefined) {
      dataToUpdate.endsAt = endsAt ? new Date(endsAt) : null;
    }
    if (isPromoActive !== undefined) {
      dataToUpdate.isPromoActive = Boolean(isPromoActive);
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
    if (isCombo && Array.isArray(comboItems)) {
      dataToUpdate.comboItems = {
        deleteMany: {}, // Clean old items
        create: comboItems.map((ci) => ({
          productId: ci.productId,
          quantity: ci.quantity || 1
        }))
      };
    }

    if (Array.isArray(addonGroupIds)) {
      dataToUpdate.addonGroups = {
        deleteMany: {},
        create: addonGroupIds.map((groupId: string, index: number) => ({
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
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
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
