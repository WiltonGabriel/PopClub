import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

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

  bgTypeLight: "gradient",
  bgValueLight: "preset_cream",
  bgCustomLight: "#FBF8FD",

  bgTypeDark: "gradient",
  bgValueDark: "preset_dark_violet",
  bgCustomDark: "hsl(var(--background))",

  faviconUrl: "/favicon.ico",
};

const loadingSchema = z.object({
  theme: z.enum(["liquid_cream", "playful_bounce", "minimal_pulse"]).default("liquid_cream"),
  centerIcon: z.string().trim().min(1, "O ícone central não pode ser vazio").max(20).default("🥣"),
  phrases: z.array(z.string().trim().min(1)).min(1, "Insira ao menos uma mensagem de carregamento").max(30),
  rotationInterval: z.number().int().min(1000, "Intervalo mínimo de 1.0s").max(10000, "Intervalo máximo de 10s").default(2400),
  minDuration: z.number().int().min(0, "Duração mínima não pode ser negativa").max(5000, "Duração máxima de 5s").default(800),

  // Fundo
  bgTypeLight: z.enum(["gradient", "solid", "pattern", "dynamic"]).default("gradient"),
  bgValueLight: z.string().trim().default("preset_cream"),
  bgCustomLight: z.string().trim().nullable().optional(),
  advancedConfig: z.any().optional(),

  bgTypeDark: z.enum(["gradient", "solid", "pattern", "dynamic"]).default("gradient"),
  bgValueDark: z.string().trim().default("preset_dark_violet"),
  bgCustomDark: z.string().trim().nullable().optional(),

  // Favicon Customizado
  faviconUrl: z.string().trim().nullable().optional(),
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

      bgTypeLight: settings.bgTypeLight || DEFAULT_LOADING.bgTypeLight,
      bgValueLight: settings.bgValueLight || DEFAULT_LOADING.bgValueLight,
      bgCustomLight: settings.bgCustomLight ?? DEFAULT_LOADING.bgCustomLight,
      advancedConfig: settings.bgCustomDark && settings.bgCustomDark.startsWith('{') ? JSON.parse(settings.bgCustomDark) : undefined,

      bgTypeDark: settings.bgTypeDark || DEFAULT_LOADING.bgTypeDark,
      bgValueDark: settings.bgValueDark || DEFAULT_LOADING.bgValueDark,
      bgCustomDark: settings.bgCustomDark ?? DEFAULT_LOADING.bgCustomDark,

      faviconUrl: settings.faviconUrl || DEFAULT_LOADING.faviconUrl,

      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.warn("Erro ao buscar configurações de visual/loading, usando padrão:", error);
    return NextResponse.json(DEFAULT_LOADING);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem personalizar a identidade visual." },
        { status: 403 }
      );
    }

    let rawBody: unknown;
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

    const {
      theme,
      centerIcon,
      phrases,
      rotationInterval,
      minDuration,
      bgTypeLight,
      bgValueLight,
      bgCustomLight,
      bgTypeDark,
      bgValueDark,
      bgCustomDark,
      advancedConfig,
      faviconUrl,
    } = validation.data;

    const updated = await prisma.loadingSettings.upsert({
      where: { id: "global_loading" },
      create: {
        id: "global_loading",
        theme,
        centerIcon,
        phrases,
        rotationInterval,
        minDuration,
        bgTypeLight,
        bgValueLight,
        bgCustomLight: bgCustomLight || null,
        bgTypeDark,
        bgValueDark,
        bgCustomDark: advancedConfig ? JSON.stringify(advancedConfig) : (bgCustomDark || null),
        faviconUrl: faviconUrl || "/favicon.ico",
      },
      update: {
        theme,
        centerIcon,
        phrases,
        rotationInterval,
        minDuration,
        bgTypeLight,
        bgValueLight,
        bgCustomLight: bgCustomLight || null,
        bgTypeDark,
        bgValueDark,
        bgCustomDark: advancedConfig ? JSON.stringify(advancedConfig) : (bgCustomDark || null),
        faviconUrl: faviconUrl || "/favicon.ico",
      },
    });

    // Se existir StoreSettings, atualiza também para sincronismo
    if (prisma.storeSettings) {
      try {
        await prisma.storeSettings.upsert({
          where: { id: "store_config" },
          create: {
            id: "store_config",
            faviconUrl: faviconUrl || "/favicon.ico",
          },
          update: {
            faviconUrl: faviconUrl || "/favicon.ico",
          },
        });
      } catch (errSync) {
        console.warn("Aviso ao sincronizar favicon com StoreSettings:", errSync);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Identidade visual atualizada com sucesso.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar identidade visual:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao atualizar configurações visuais." },
      { status: 500 }
    );
  }
}
