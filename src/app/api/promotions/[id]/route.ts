import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const promo = await prisma.promotion.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!promo) {
      return NextResponse.json({ error: "Promoção não encontrada." }, { status: 404 });
    }

    const originalTotal = promo.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    let finalPrice = originalTotal;
    if (promo.discountType === "percentage") {
      const pct = Number(promo.discountValue);
      finalPrice = originalTotal * (1 - pct / 100);
    } else {
      const fixed = Number(promo.discountValue);
      finalPrice = Math.max(0, originalTotal - fixed);
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
      items: promo.items.map((it) => ({
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
    });
  } catch (error: any) {
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
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
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
      items,
    } = body || {};

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (badge !== undefined) dataToUpdate.badge = badge;
    if (description !== undefined) dataToUpdate.description = description;
    if (bannerImageUrl !== undefined) dataToUpdate.bannerImageUrl = bannerImageUrl;
    if (gradientStart !== undefined) dataToUpdate.gradientStart = gradientStart;
    if (gradientEnd !== undefined) dataToUpdate.gradientEnd = gradientEnd;
    if (discountType !== undefined) dataToUpdate.discountType = discountType;
    if (discountValue !== undefined) dataToUpdate.discountValue = Number(discountValue);
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    const updated = await prisma.$transaction(async (tx) => {
      if (items && Array.isArray(items)) {
        await tx.promotionItem.deleteMany({ where: { promotionId: id } });
        if (items.length > 0) {
          await tx.promotionItem.createMany({
            data: items.map((it: any) => ({
              promotionId: id,
              productId: it.productId,
              quantity: it.quantity || 1,
            })),
          });
        }
      }

      return await tx.promotion.update({
        where: { id },
        data: dataToUpdate,
        include: {
          items: {
            include: { product: true },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar promoção:", error);
    if (error.code === "P2025") {
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
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.promotion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar promoção:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Promoção não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir promoção." }, { status: 500 });
  }
}
