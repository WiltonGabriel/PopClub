import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Prisma, DiscountType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const user = await getAuthUser(request);
    const canManagePromos = hasPermission(user, "promotions_manage");

    // Se não tiver permissão e não pediu all explicitamente, filtra apenas as ativas e não vencidas
    const whereClause: Prisma.PromotionWhereInput = all && canManagePromos ? {} : { 
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    const promotions = await prisma.promotion.findMany({
      where: whereClause,
      include: {
        product: true
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = promotions.map((p) => {
      let finalPrice = p.product ? Number(p.product.price) : 0;
      const originalTotal = finalPrice;
      if (p.discountType === "percentage") {
        const pct = Number(p.discountValue);
        finalPrice = originalTotal * (1 - pct / 100);
      } else {
        const fixed = Number(p.discountValue);
        finalPrice = Math.max(0, fixed < originalTotal ? fixed : originalTotal - fixed);
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
        startsAt: p.startsAt ? p.startsAt.toISOString() : null,
        expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
        showDuration: p.showDuration,
        durationDisplay: p.durationDisplay,
        createdAt: p.createdAt.toISOString(),
        originalTotal: Number(originalTotal.toFixed(2)),
        finalPrice: Number(finalPrice.toFixed(2)),
        autoBanner: p.autoBanner,
        showScarcity: p.showScarcity,
        scarcityUnits: p.scarcityUnits,
        scarcityType: p.scarcityType || "strategic",
        scarcityInitial: p.scarcityInitial,
        scarcitySold: p.scarcitySold ?? 0,
        showProgressBar: p.showProgressBar ?? false,
        urgencyType: p.urgencyType || "date",
        sessionMinutes: p.sessionMinutes,
        productId: p.productId,
        product: p.product ? {
          id: p.product.id,
          name: p.product.name,
          description: p.product.description || "",
          price: Number(p.product.price),
          imageUrl: p.product.imageUrl || "",
        } : undefined,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Erro ao buscar promoções:", error);
    return NextResponse.json({ error: "Erro ao buscar promoções." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "promotions_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar promoções necessária." }, { status: 403 });
    }

    let body: Record<string, unknown>;
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
      startsAt,
      expiresAt,
      showDuration,
      durationDisplay,
      productId,
      autoBanner,
      showScarcity,
      scarcityUnits,
      scarcityType,
      scarcityInitial,
      scarcitySold,
      showProgressBar,
      urgencyType,
      sessionMinutes,
    } = body || {};

    if (!title || !badge) {
      return NextResponse.json({ error: "Título e Badge são obrigatórios." }, { status: 400 });
    }

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "O produto alvo da promoção é obrigatório." }, { status: 400 });
    }

    const promo = await prisma.promotion.create({
      data: {
        title: String(title),
        badge: String(badge),
        description: description ? String(description) : null,
        bannerImageUrl: bannerImageUrl ? String(bannerImageUrl) : null,
        gradientStart: String(gradientStart || "hsl(var(--primary))"),
        gradientEnd: String(gradientEnd || "#881BAA"),
        discountType: (discountType as DiscountType) || "percentage",
        discountValue: Number(discountValue || 0),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        startsAt: startsAt ? new Date(String(startsAt)) : new Date(),
        expiresAt: expiresAt ? new Date(String(expiresAt)) : null,
        showDuration: Boolean(showDuration),
        durationDisplay: Array.isArray(durationDisplay) ? durationDisplay.map(String) : [],
        productId: String(productId),
        autoBanner: Boolean(autoBanner),
        showScarcity: Boolean(showScarcity),
        scarcityUnits: scarcityUnits !== undefined && scarcityUnits !== null && scarcityUnits !== "" ? Number(scarcityUnits) : null,
        scarcityType: String(scarcityType || "strategic"),
        scarcityInitial: scarcityInitial !== undefined && scarcityInitial !== null && scarcityInitial !== "" ? Number(scarcityInitial) : (scarcityUnits ? Number(scarcityUnits) : null),
        scarcitySold: Number(scarcitySold || 0),
        showProgressBar: Boolean(showProgressBar),
        urgencyType: String(urgencyType || "date"),
        sessionMinutes: sessionMinutes !== undefined && sessionMinutes !== null && sessionMinutes !== "" ? Number(sessionMinutes) : null,
      },
      include: {
        product: true
      },
    });

    return NextResponse.json(promo);
  } catch (error: unknown) {
    console.error("Erro ao criar promoção:", error);
    return NextResponse.json({ error: "Erro ao cadastrar promoção." }, { status: 500 });
  }
}
