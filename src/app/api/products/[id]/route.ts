import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        categoryRel: { select: { name: true } },
        cardBadge: true,
        comboItems: { include: { product: true } },
        addonGroups: {
          include: {
            group: {
              include: {
                items: {
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      categoryId: product.categoryId,
      category: product.categoryRel?.name || product.category || "Outros",
      imageUrl: product.imageUrl || "",
      stock: product.stock,
      isAvailable: product.isAvailable,
      cardBadgeId: product.cardBadgeId,
      cardBadge: product.cardBadge,
      isCombo: product.isCombo,
      comboItems: product.comboItems?.map((ci) => ({
        id: ci.id,
        productId: ci.productId,
        quantity: ci.quantity,
        product: {
          id: ci.product.id,
          name: ci.product.name,
          price: Number(ci.product.price),
          imageUrl: ci.product.imageUrl || "",
        },
      })) || [],
      addonGroupIds: product.addonGroups?.map((ag) => ag.groupId) || [],
      addonGroups: product.addonGroups?.map((ag) => ag.group) || [],
    });
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
    } = (body || {}) as {
      name?: string;
      description?: string;
      price?: number | string;
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

    const dataToUpdate: Prisma.ProductUncheckedUpdateInput = {};
    if (name !== undefined) dataToUpdate.name = sanitizeText(name);
    if (description !== undefined) dataToUpdate.description = description ? sanitizeText(description) : null;
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return NextResponse.json({ error: "O preço deve ser um número positivo." }, { status: 400 });
      }
      dataToUpdate.price = parsedPrice;
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
      include: {
        categoryRel: { select: { name: true } },
        cardBadge: true,
        comboItems: { include: { product: true } },
        addonGroups: {
          include: {
            group: {
              include: {
                items: {
                  orderBy: { sortOrder: "asc" }
                }
              }
            }
          },
          orderBy: { sortOrder: "asc" }
        }
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description || "",
      price: Number(updated.price),
      categoryId: updated.categoryId,
      category: updated.categoryRel?.name || updated.category || "Outros",
      imageUrl: updated.imageUrl || "",
      stock: updated.stock,
      isAvailable: updated.isAvailable,
      cardBadgeId: updated.cardBadgeId,
      cardBadge: updated.cardBadge,
      isCombo: updated.isCombo,
      comboItems: updated.comboItems?.map(ci => ({
        id: ci.id,
        productId: ci.productId,
        quantity: ci.quantity,
        product: {
          id: ci.product.id,
          name: ci.product.name,
          price: Number(ci.product.price),
          imageUrl: ci.product.imageUrl || ""
        }
      })) || [],
      addonGroupIds: updated.addonGroups?.map(ag => ag.groupId) || [],
      addonGroups: updated.addonGroups?.map(ag => ag.group) || [],
    });
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
