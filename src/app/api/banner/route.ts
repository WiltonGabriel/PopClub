import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const DEFAULT_BANNER = {
  id: "home_highlight",
  icon: "🥣",
  title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
  subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha.",
  badge: "Refrescância Artesanal",
};

export async function GET() {
  try {
    if (!prisma.highlightBanner) {
      return NextResponse.json(DEFAULT_BANNER);
    }

    const banner = await prisma.highlightBanner.findUnique({
      where: { id: "home_highlight" },
    });

    if (!banner) {
      return NextResponse.json(DEFAULT_BANNER);
    }

    return NextResponse.json({
      id: banner.id,
      icon: banner.icon || DEFAULT_BANNER.icon,
      title: banner.title || DEFAULT_BANNER.title,
      subtitle: banner.subtitle || DEFAULT_BANNER.subtitle,
      badge: banner.badge || DEFAULT_BANNER.badge,
    });
  } catch (error) {
    console.error("Erro ao buscar banner de destaque:", error);
    // Em caso de erro no banco, retorna os padrões de fallback
    return NextResponse.json(DEFAULT_BANNER);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem editar o banner." },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const { icon, title, subtitle, badge } = body || {};

    const banner = await prisma.highlightBanner.upsert({
      where: { id: "home_highlight" },
      update: {
        icon: (icon && typeof icon === "string" ? icon.trim() : "") || DEFAULT_BANNER.icon,
        title: (title && typeof title === "string" ? title.trim() : "") || DEFAULT_BANNER.title,
        subtitle: (subtitle && typeof subtitle === "string" ? subtitle.trim() : "") || DEFAULT_BANNER.subtitle,
        badge: (badge && typeof badge === "string" ? badge.trim() : "") || DEFAULT_BANNER.badge,
      },
      create: {
        id: "home_highlight",
        icon: (icon && typeof icon === "string" ? icon.trim() : "") || DEFAULT_BANNER.icon,
        title: (title && typeof title === "string" ? title.trim() : "") || DEFAULT_BANNER.title,
        subtitle: (subtitle && typeof subtitle === "string" ? subtitle.trim() : "") || DEFAULT_BANNER.subtitle,
        badge: (badge && typeof badge === "string" ? badge.trim() : "") || DEFAULT_BANNER.badge,
      },
    });

    return NextResponse.json({
      id: banner.id,
      icon: banner.icon,
      title: banner.title,
      subtitle: banner.subtitle,
      badge: banner.badge,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar banner de destaque:", error);
    return NextResponse.json(
      { error: "Erro ao salvar alterações do banner." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
