import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const lists = await prisma.customAudienceList.findMany({
      orderBy: { createdAt: "desc" },
    });

    const users = await prisma.user.findMany({
      where: { role: "client" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        orders: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        fullName: "asc",
      },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.fullName || "Sem Nome",
      phone: u.phone,
      totalOrders: u.orders.length,
      lastOrderAt: u.orders.length > 0 ? u.orders[0].createdAt : null,
    }));

    return NextResponse.json({ lists, users: formattedUsers });
  } catch (error: any) {
    console.error("Erro ao buscar dados de audiência:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, userIds } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
    }

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: "userIds deve ser um array." }, { status: 400 });
    }

    const currentCount = await prisma.customAudienceList.count();
    if (currentCount >= 6) {
      return NextResponse.json(
        { error: "Limite atingido: Você já possui 6 listas personalizadas salvas." },
        { status: 400 }
      );
    }

    const created = await prisma.customAudienceList.create({
      data: {
        name,
        userIds,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar lista personalizada:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
