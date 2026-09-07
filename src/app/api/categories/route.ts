import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Erro ao listar categorias:", error);
    return NextResponse.json({ error: "Erro ao buscar categorias." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { name, slug } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "O nome da categoria é obrigatório." }, { status: 400 });
    }

    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const category = await prisma.category.create({
      data: {
        name,
        slug: autoSlug,
      },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json({ error: "Erro ao criar categoria." }, { status: 500 });
  }
}
