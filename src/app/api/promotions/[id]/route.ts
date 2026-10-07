import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Prisma, DiscountType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const promo = await prisma.promotion.findUnique({
      where: { id },
      include: {
        product: true
      },
    });

    if (!promo) {
      return NextResponse.json({ error: "Promoção não encontrada." }, { status: 404 });
    }

    let finalPrice = promo.product ? Number(promo.product.price) : 0;
    const originalTotal = finalPrice;
    if (promo.discountType === "percentage") {
      const pct = Number(promo.discountValue);
      finalPrice = originalTotal * (1 - pct / 100);
    } else {
      const fixed = Number(promo.discountValue);
      finalPrice = Math.max(0, fixed < originalTotal ? fixed : originalTotal - fixed);
    }

    const discountAmount = Math.max(0, originalTotal - finalPrice);

    return NextResponse.json({
      id: promo.id,
      title: promo.title,
      badge: promo.badge,
      description: promo.description || "",
      bannerImageUrl: promo.bannerImageUrl || "",
      gradientStart: promo.gradientStart,
      gradientEnd: promo.gradientEnd,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      isActive: promo.isActive,
      originalTotal: Number(originalTotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
      startsAt: promo.startsAt ? promo.startsAt.toISOString() : null,
      expiresAt: promo.expiresAt ? promo.expiresAt.toISOString() : null,
      showDuration: promo.showDuration,
      durationDisplay: promo.durationDisplay,
      autoBanner: promo.autoBanner,
      showScarcity: promo.showScarcity,
      scarcityUnits: promo.scarcityUnits,
      scarcityType: promo.scarcityType || "strategic",
      scarcityInitial: promo.scarcityInitial,
      scarcitySold: promo.scarcitySold ?? 0,
      showProgressBar: promo.showProgressBar ?? false,
      urgencyType: promo.urgencyType || "date",
      sessionMinutes: promo.sessionMinutes,
      productId: promo.productId,
      product: promo.product ? {
        id: promo.product.id,
        name: promo.product.name,
        description: promo.product.description || "",
        price: Number(promo.product.price),
        imageUrl: promo.product.imageUrl || "",
      } : undefined,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar promoção:", error);
    return NextResponse.json({ error: "Erro ao carregar dados da promoção." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "promotions_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar promoções necessária." }, { status: 403 });
    }

    const { id } = await params;
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

    const dataToUpdate: Prisma.PromotionUncheckedUpdateInput = {};
    if (title !== undefined) dataToUpdate.title = String(title);
    if (badge !== undefined) dataToUpdate.badge = String(badge);
    if (description !== undefined) dataToUpdate.description = description ? String(description) : null;
    if (bannerImageUrl !== undefined) dataToUpdate.bannerImageUrl = bannerImageUrl ? String(bannerImageUrl) : null;
    if (gradientStart !== undefined) dataToUpdate.gradientStart = String(gradientStart);
    if (gradientEnd !== undefined) dataToUpdate.gradientEnd = String(gradientEnd);
    if (discountType !== undefined) dataToUpdate.discountType = String(discountType) as DiscountType;
    if (discountValue !== undefined) dataToUpdate.discountValue = Number(discountValue);
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (startsAt !== undefined) dataToUpdate.startsAt = startsAt ? new Date(String(startsAt)) : new Date();
    if (expiresAt !== undefined) dataToUpdate.expiresAt = expiresAt ? new Date(String(expiresAt)) : null;
    if (showDuration !== undefined) dataToUpdate.showDuration = Boolean(showDuration);
    if (durationDisplay !== undefined) dataToUpdate.durationDisplay = Array.isArray(durationDisplay) ? durationDisplay.map(String) : [];
    if (productId !== undefined && productId) dataToUpdate.productId = String(productId);
    if (autoBanner !== undefined) dataToUpdate.autoBanner = Boolean(autoBanner);
    if (showScarcity !== undefined) dataToUpdate.showScarcity = Boolean(showScarcity);
    if (scarcityUnits !== undefined) dataToUpdate.scarcityUnits = scarcityUnits !== null && scarcityUnits !== "" ? Number(scarcityUnits) : null;
    if (scarcityType !== undefined) dataToUpdate.scarcityType = String(scarcityType);
    if (scarcityInitial !== undefined) dataToUpdate.scarcityInitial = scarcityInitial !== null && scarcityInitial !== "" ? Number(scarcityInitial) : null;
    if (scarcitySold !== undefined) dataToUpdate.scarcitySold = Number(scarcitySold || 0);
    if (showProgressBar !== undefined) dataToUpdate.showProgressBar = Boolean(showProgressBar);
    if (urgencyType !== undefined) dataToUpdate.urgencyType = String(urgencyType);
    if (sessionMinutes !== undefined) dataToUpdate.sessionMinutes = sessionMinutes !== null && sessionMinutes !== "" ? Number(sessionMinutes) : null;

    const updated = await prisma.promotion.update({
      where: { id },
      data: dataToUpdate,
      include: {
        product: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Erro ao atualizar promoção:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Promoção não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar promoção." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "promotions_manage")) {
      return NextResponse.json({ error: "Acesso negado. Permissão para gerenciar promoções necessária." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.promotion.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Promoção excluída com sucesso." });
  } catch (error: unknown) {
    console.error("Erro ao excluir promoção:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Promoção não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir promoção." }, { status: 500 });
  }
}
