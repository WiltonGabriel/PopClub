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
    const body = await request.json();
    const { name, description, price, categoryId, category, imageUrl } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = Number(price);
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId || null;
    if (category !== undefined) dataToUpdate.category = category;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { categoryRel: { select: { name: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description || "",
      price: Number(updated.price),
      categoryId: updated.categoryId,
      category: updated.categoryRel?.name || updated.category || "Outros",
      imageUrl: updated.imageUrl || "",
    });
  } catch (error: any) {
    console.error("Erro ao atualizar produto:", error);
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
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 500 });
  }
}
