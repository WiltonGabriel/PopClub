import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const DEFAULT_TEMPLATES = [
  {
    title: "Bem-vindo(a) ao PopClub! 🍧",
    message: "Olá {NOME}, preparamos um presente especial para sua primeira experiência com a gente! Aproveite o cupom exclusivo {CUPOM}.",
    category: "welcome",
  },
  {
    title: "Novidade Refrescante na Área! ✨",
    message: "Tem novidade refrescante chegando na esteira hoje! Venha conferir os lançamentos.",
    category: "news",
  },
  {
    title: "Que tal matar a saudade? 💜",
    message: "Faz um tempinho que você não pede seu açaí favorito! Que tal matar a saudade hoje?",
    category: "reengagement",
  },
];

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "settings_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar notificações necessária." }, { status: 403 });
    }

    let templates = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Se a tabela estiver vazia, popula com os modelos de fábrica solicitados
    if (templates.length === 0) {
      for (const def of DEFAULT_TEMPLATES) {
        await prisma.notificationTemplate.create({
          data: def,
        });
      }
      templates = await prisma.notificationTemplate.findMany({
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("Erro ao listar modelos de notificação:", error);
    return NextResponse.json({ error: "Erro ao buscar templates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "settings_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar notificações necessária." }, { status: 403 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { title, message, category = "custom", couponId = null } = body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "O título do modelo é obrigatório." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "O texto do modelo é obrigatório." }, { status: 400 });
    }

    const currentCount = await prisma.notificationTemplate.count();
    if (currentCount >= 5) {
      return NextResponse.json({ error: "Limite atingido: Você já possui 5 modelos de mensagem salvos. Exclua ou substitua um modelo existente para salvar um novo." }, { status: 400 });
    }

    const created = await prisma.notificationTemplate.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        category,
        couponId: couponId || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar modelo de notificação:", error);
    return NextResponse.json({ error: "Erro ao salvar modelo." }, { status: 500 });
  }
}
