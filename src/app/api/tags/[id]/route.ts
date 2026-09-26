import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
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

    const { text, icon, bgColor, textColor, addProductId, removeProductId } = body || {};

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
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.cardBadge.delete({
      where: { id },
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
