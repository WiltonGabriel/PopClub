import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const user = await getAuthUser(request);
    const isAdmin = user?.role === "admin";

    // Se não for admin e não pediu all explicitamente, filtra apenas as ativas
    const whereClause = all && isAdmin ? {} : { isActive: true };

    const promotions = await prisma.promotion.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = promotions.map((p) => {
      // Calcula o preço original total dos produtos do combo
      const originalTotal = p.items.reduce((sum, item) => {
        return sum + Number(item.product.price) * item.quantity;
      }, 0);

      // Calcula o preço final com desconto da promoção
      let finalPrice = originalTotal;
      if (p.discountType === "percentage") {
        const pct = Number(p.discountValue);
        finalPrice = originalTotal * (1 - pct / 100);
      } else {
        const fixed = Number(p.discountValue);
        finalPrice = Math.max(0, originalTotal - fixed);
      }

      return {
        id: p.id,
        title: p.title,
        badge: p.badge,
        description: p.description || "",
        bannerImageUrl: p.bannerImageUrl || "",
        gradientStart: p.gradientStart,
        gradientEnd: p.gradientEnd,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        originalTotal: Number(originalTotal.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
        items: p.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          quantity: it.quantity,
          product: {
            id: it.product.id,
            name: it.product.name,
            description: it.product.description || "",
            price: Number(it.product.price),
            imageUrl: it.product.imageUrl || "",
          },
        })),
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Erro ao buscar promoções:", error);
    return NextResponse.json({ error: "Erro ao buscar promoções." }, { status: 500 });
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

    const {
      title,
      badge,
      description,
      bannerImageUrl,
      gradientStart,
      gradientEnd,
      discountType,
      discountValue,
      isActive,
      items, // array of { productId: string, quantity?: number }
    } = body || {};

    if (!title || !badge) {
      return NextResponse.json({ error: "Título e Badge são obrigatórios." }, { status: 400 });
    }

    const promo = await prisma.promotion.create({
      data: {
        title,
        badge,
        description: description || null,
        bannerImageUrl: bannerImageUrl || null,
        gradientStart: gradientStart || "#9306CF",
        gradientEnd: gradientEnd || "#881BAA",
        discountType: discountType || "percentage",
        discountValue: Number(discountValue || 0),
        isActive: isActive !== undefined ? isActive : true,
        items: {
          create: (items || []).map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity || 1,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return NextResponse.json(promo);
  } catch (error: any) {
    console.error("Erro ao criar promoção:", error);
    return NextResponse.json({ error: "Erro ao cadastrar promoção." }, { status: 500 });
  }
}
