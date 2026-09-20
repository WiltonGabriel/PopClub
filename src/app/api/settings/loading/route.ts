import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import { handleApiError } from "@/lib/apiResponse";

const DEFAULT_LOADING = {
  id: "global_loading",
  theme: "liquid_cream",
  centerIcon: "🥣",
  phrases: [
    "Batendo o açaí artesanal na cremosidade perfeita...",
    "Separando os acompanhamentos mais fresquinhos...",
    "Preparando as receitas mais deliciosas do cardápio...",
    "Quase pronto! Seu momento doce está chegando...",
  ],
  rotationInterval: 2400,
  minDuration: 800,
};

const loadingSchema = z.object({
  theme: z.enum(["liquid_cream", "playful_bounce", "minimal_pulse"]).default("liquid_cream"),
  centerIcon: z.string().trim().min(1, "O ícone central não pode ser vazio").max(20).default("🥣"),
  phrases: z.array(z.string().trim().min(1)).min(1, "Insira ao menos uma mensagem de carregamento").max(30),
  rotationInterval: z.number().int().min(1000, "Intervalo mínimo de 1.0s").max(10000, "Intervalo máximo de 10s").default(2400),
  minDuration: z.number().int().min(0, "Duração mínima não pode ser negativa").max(5000, "Duração máxima de 5s").default(800),
});

export async function GET() {
  try {
    if (!prisma.loadingSettings) {
      return NextResponse.json(DEFAULT_LOADING);
    }

    const settings = await prisma.loadingSettings.findUnique({
      where: { id: "global_loading" },
    });

    if (!settings) {
      return NextResponse.json(DEFAULT_LOADING);
    }

    return NextResponse.json({
      id: settings.id,
      theme: settings.theme || DEFAULT_LOADING.theme,
      centerIcon: settings.centerIcon || DEFAULT_LOADING.centerIcon,
      phrases: Array.isArray(settings.phrases) && settings.phrases.length > 0 ? settings.phrases : DEFAULT_LOADING.phrases,
      rotationInterval: settings.rotationInterval || DEFAULT_LOADING.rotationInterval,
      minDuration: settings.minDuration ?? DEFAULT_LOADING.minDuration,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.warn("Erro ao buscar configurações de loading, usando padrão:", error);
    return NextResponse.json(DEFAULT_LOADING);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem personalizar o loading." },
        { status: 403 }
      );
    }

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido ou vazio." },
        { status: 400 }
      );
    }

    const validation = loadingSchema.safeParse(rawBody);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Dados inválidos.";
      return NextResponse.json(
        { error: firstIssue, details: validation.error.format() },
        { status: 400 }
      );
    }

    const { theme, centerIcon, phrases, rotationInterval, minDuration } = validation.data;

    const updated = await prisma.loadingSettings.upsert({
      where: { id: "global_loading" },
      create: {
        id: "global_loading",
        theme,
        centerIcon,
        phrases,
        rotationInterval,
        minDuration,
      },
      update: {
        theme,
        centerIcon,
        phrases,
        rotationInterval,
        minDuration,
      },
    });

    return NextResponse.json({
      id: updated.id,
      theme: updated.theme,
      centerIcon: updated.centerIcon,
      phrases: updated.phrases,
      rotationInterval: updated.rotationInterval,
      minDuration: updated.minDuration,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    return handleApiError(error, "Falha ao salvar personalização da tela de loading");
  }
}
