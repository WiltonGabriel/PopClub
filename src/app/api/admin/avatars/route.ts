import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const avatars = await prisma.avatarPreset.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(avatars);
  } catch (error: any) {
    console.error("Erro ao listar avatares no admin:", error);
    return NextResponse.json({ error: "Erro ao listar avatares." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const countAvatars = await prisma.avatarPreset.count();
    if (countAvatars >= 30) {
      return NextResponse.json({ error: "Limite máximo de 30 presets de avatar atingido." }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { name, description, imageUrl, category, isActive, order } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "O nome do avatar é obrigatório." }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "O nome do avatar não pode exceder 100 caracteres." }, { status: 400 });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "A descrição do avatar é obrigatória." }, { status: 400 });
    }

    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json({ error: "A imagem/SVG do avatar é obrigatória." }, { status: 400 });
    }

    const newAvatar = await prisma.avatarPreset.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        category: category ? category.trim() : "Oficial",
        isActive: typeof isActive === "boolean" ? isActive : true,
        order: typeof order === "number" ? order : 0,
      },
    });

    return NextResponse.json(newAvatar, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao cadastrar avatar:", error);
    return NextResponse.json({ error: "Erro ao cadastrar avatar." }, { status: 500 });
  }
}
