import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        categoryRel: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: Number(p.price),
      categoryId: p.categoryId,
      category: p.categoryRel?.name || p.category || "Outros",
      imageUrl: p.imageUrl || "",
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json({ error: "Erro ao buscar produtos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, categoryId, category, imageUrl } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Nome e preço são obrigatórios." }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: Number(price),
        categoryId: categoryId || null,
        category: category || null,
        imageUrl: imageUrl || null,
      },
      include: {
        categoryRel: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      categoryId: product.categoryId,
      category: product.categoryRel?.name || product.category || "Outros",
      imageUrl: product.imageUrl || "",
    });
  } catch (error: any) {
    console.error("Erro ao criar produto:", error);
    return NextResponse.json({ error: "Erro ao criar produto." }, { status: 500 });
  }
}
