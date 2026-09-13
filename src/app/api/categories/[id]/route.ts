import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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
