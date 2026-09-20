import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }
    const { name, description, price, categoryId, category, imageUrl, stock, isAvailable, cardBadgeId, isCombo, comboItems } = body || {};

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId || null;
    if (category !== undefined) dataToUpdate.category = category;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
    if (stock !== undefined) dataToUpdate.stock = stock !== null ? Number(stock) : null;
    if (isAvailable !== undefined) dataToUpdate.isAvailable = Boolean(isAvailable);
    if (cardBadgeId !== undefined) dataToUpdate.cardBadgeId = cardBadgeId || null;
    if (isCombo !== undefined) dataToUpdate.isCombo = Boolean(isCombo);
    if (isCombo && Array.isArray(comboItems)) {
      dataToUpdate.comboItems = {
        deleteMany: {}, // Clean old items
        create: comboItems.map((ci: any) => ({
          productId: ci.productId,
          quantity: ci.quantity || 1
        }))
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: {
        categoryRel: { select: { name: true } },
        cardBadge: true,
        comboItems: { include: { product: true } }
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
    });
  } catch (error: any) {
    console.error("Erro ao atualizar produto:", error);
    if (error.code === "P2025") {
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
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar produto:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 500 });
  }
}
