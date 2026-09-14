import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    let badges = await prisma.cardBadge.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Se a tabela estiver vazia, popula com os selos padrão solicitados
    if (badges.length === 0) {
      const defaultBadges = [
        { text: "Combo", icon: "⚡", bgColor: "#FEF3C7", textColor: "#B45309" },
        { text: "Mais Pedido", icon: "🔥", bgColor: "#FEE2E2", textColor: "#DC2626" },
        { text: "Lançamento", icon: "✨", bgColor: "#F3E8FF", textColor: "#7E22CE" },
        { text: "Refrescância Pura", icon: "❄️", bgColor: "#E0F2FE", textColor: "#0369A1" },
        { text: "20% OFF", icon: "🏷️", bgColor: "#DCFCE7", textColor: "#15803D" },
      ];

      for (const b of defaultBadges) {
        await prisma.cardBadge.create({ data: b });
      }

      badges = await prisma.cardBadge.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json(badges);
  } catch (error: any) {
    console.error("Erro ao buscar selos dos cards:", error);
    return NextResponse.json({ error: "Erro ao buscar selos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { text, icon, bgColor, textColor } = body || {};
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "O texto do selo é obrigatório." }, { status: 400 });
    }

    const badge = await prisma.cardBadge.create({
      data: {
        text: text.trim(),
        icon: icon ? icon.trim() : null,
        bgColor: bgColor || "#FEF3C7",
        textColor: textColor || "#B45309",
      },
    });

    return NextResponse.json(badge);
  } catch (error: any) {
    console.error("Erro ao criar selo do card:", error);
    return NextResponse.json({ error: "Erro ao criar selo." }, { status: 500 });
  }
}
