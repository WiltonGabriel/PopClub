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
    if (!hasPermission(user, "menu_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar cardápio necessária." }, { status: 403 });
    }

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
      include: {
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Erro ao alternar status da categoria:", error);
    return NextResponse.json(
      { error: "Erro ao alternar status da categoria." },
      { status: 500 }
    );
  }
}
