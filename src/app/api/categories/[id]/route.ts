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
    const body = await request.json().catch(() => ({}));
    const { name, slug } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nome da categoria é obrigatório." }, { status: 400 });
    }

    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: autoSlug,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar categoria:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar categoria." }, { status: 500 });
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
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar categoria:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir categoria." }, { status: 500 });
  }
}
