import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface ReorderItem {
  id: string;
  order: number;
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar cardápio necessária." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const items = Array.isArray(body)
      ? (body as ReorderItem[])
      : Array.isArray(body?.items)
      ? (body.items as ReorderItem[])
      : null;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Lista de reordenação inválida ou vazia." }, { status: 400 });
    }

    // Executa as atualizações em uma única transação atômica
    await prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { order: Number(item.order) },
        })
      )
    );

    const updatedCategories = await prisma.category.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      categories: updatedCategories,
    });
  } catch (error: unknown) {
    console.error("Erro na reordenação de categorias:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar a ordem das categorias." },
      { status: 500 }
    );
  }
}
