import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "STOCK_CONTROL") && !hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão de controle de estoque necessária." }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { stock, isAvailable } = body || {};

    const dataToUpdate: any = {};

    if (stock !== undefined) {
      if (stock === null || stock === "" || stock === "infinite") {
        dataToUpdate.stock = null;
      } else {
        const parsed = parseInt(String(stock), 10);
        dataToUpdate.stock = isNaN(parsed) ? null : Math.max(0, parsed);
      }
    }

    if (isAvailable !== undefined) {
      dataToUpdate.isAvailable = Boolean(isAvailable);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar informado." }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: {
        categoryRel: { select: { name: true } },
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
    });
  } catch (error: any) {
    console.error("Erro ao atualizar estoque do produto:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar estoque do produto." }, { status: 500 });
  }
}
