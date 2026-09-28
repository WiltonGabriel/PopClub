import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    interface UpdateCouponBody {
      code?: string;
      discountType?: string;
      discountValue?: number | string;
      minOrderValue?: number | string;
      maxUses?: number | string | null;
      expiresAt?: string | null;
      isActive?: boolean;
      oncePerUser?: boolean;
      productIds?: string[];
      minLoyaltyLevel?: number | string | null;
      loyaltyBadgeId?: string | null;
    }

    const { id } = await params;
    let body: UpdateCouponBody | null = null;
    try {
      body = (await request.json()) as UpdateCouponBody;
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxUses,
      expiresAt,
      isActive,
      oncePerUser,
      productIds,
      minLoyaltyLevel,
      loyaltyBadgeId,
    } = body || {};

    const cleanCode = code ? code.trim().toUpperCase() : undefined;

    // Se mudou o código, verifica unicidade
    if (cleanCode) {
      const existing = await prisma.coupon.findFirst({
        where: {
          code: cleanCode,
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: `O cupom '${cleanCode}' já está cadastrado em outro registro.` }, { status: 400 });
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(cleanCode && { code: cleanCode }),
        ...(discountType === "percentage" || discountType === "fixed" ? { discountType } : {}),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(minOrderValue !== undefined && { minOrderValue: Number(minOrderValue) }),
        ...(maxUses !== undefined && { maxUses: maxUses ? parseInt(String(maxUses), 10) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(oncePerUser !== undefined && { oncePerUser: Boolean(oncePerUser) }),
        ...(productIds !== undefined && { productIds: Array.isArray(productIds) ? productIds : [] }),
        ...(minLoyaltyLevel !== undefined && { minLoyaltyLevel: minLoyaltyLevel ? parseInt(String(minLoyaltyLevel), 10) : null }),
        ...(loyaltyBadgeId !== undefined && { loyaltyBadgeId: loyaltyBadgeId ? String(loyaltyBadgeId).trim() : null }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      discountType: updated.discountType,
      discountValue: Number(updated.discountValue),
      minOrderValue: Number(updated.minOrderValue),
      maxUses: updated.maxUses,
      uses: updated.uses,
      expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
      isActive: updated.isActive,
      oncePerUser: updated.oncePerUser,
      productIds: updated.productIds,
      minLoyaltyLevel: updated.minLoyaltyLevel,
      loyaltyBadgeId: updated.loyaltyBadgeId,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar cupom:", error);
    return NextResponse.json({ error: "Erro ao atualizar cupom." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;
    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { isActive } = body || {};
    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Campo 'isActive' booleano é obrigatório." }, { status: 400 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      id: updated.id,
      code: updated.code,
      isActive: updated.isActive,
    });
  } catch (error: unknown) {
    console.error("Erro ao alternar status do cupom:", error);
    return NextResponse.json({ error: "Erro ao alternar status do cupom." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir cupom:", error);
    return NextResponse.json({ error: "Erro ao remover cupom." }, { status: 500 });
  }
}
