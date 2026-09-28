import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Converte os tipos decimais e datas para JSON amigável
    const formatted = coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderValue: Number(c.minOrderValue),
      maxUses: c.maxUses,
      uses: c.uses,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      isActive: c.isActive,
      oncePerUser: c.oncePerUser,
      productIds: c.productIds || [],
      minLoyaltyLevel: c.minLoyaltyLevel,
      loyaltyBadgeId: c.loyaltyBadgeId,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Erro ao listar cupons:", error);
    return NextResponse.json({ error: "Erro ao buscar cupons." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const countCoupons = await prisma.coupon.count({ where: { isActive: true } });
    if (countCoupons >= 100) {
      return NextResponse.json({ error: "Limite máximo de 100 cupons ativos atingido." }, { status: 400 });
    }

    interface CreateCouponBody {
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

    let body: CreateCouponBody = {};
    try {
      body = (await request.json()) as CreateCouponBody;
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const {
      code,
      discountType,
      discountValue,
      minOrderValue = 0,
      maxUses = null,
      expiresAt = null,
      isActive = true,
      oncePerUser = false,
      productIds = [],
      minLoyaltyLevel = null,
      loyaltyBadgeId = null,
    } = body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "O código do cupom é obrigatório." }, { status: 400 });
    }
    if (code.length > 100) {
      return NextResponse.json({ error: "O código do cupom não pode exceder 100 caracteres." }, { status: 400 });
    }

    if (discountType !== "percentage" && discountType !== "fixed") {
      return NextResponse.json({ error: "Tipo de desconto inválido (deve ser 'percentage' ou 'fixed')." }, { status: 400 });
    }

    const numDiscount = Number(discountValue);
    if (isNaN(numDiscount) || numDiscount <= 0) {
      return NextResponse.json({ error: "O valor do desconto deve ser maior que zero." }, { status: 400 });
    }

    if (discountType === "percentage" && numDiscount > 100) {
      return NextResponse.json({ error: "Desconto percentual não pode ultrapassar 100%." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Verifica se o código já existe
    const existing = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `O cupom com código '${cleanCode}' já existe.` }, { status: 400 });
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountType,
        discountValue: numDiscount,
        minOrderValue: Number(minOrderValue) || 0,
        maxUses: maxUses ? parseInt(String(maxUses), 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: Boolean(isActive),
        oncePerUser: Boolean(oncePerUser),
        productIds: Array.isArray(productIds) ? productIds : [],
        minLoyaltyLevel: minLoyaltyLevel ? parseInt(String(minLoyaltyLevel), 10) : null,
        loyaltyBadgeId: loyaltyBadgeId ? String(loyaltyBadgeId).trim() : null,
      },
    });

    return NextResponse.json({
      id: newCoupon.id,
      code: newCoupon.code,
      discountType: newCoupon.discountType,
      discountValue: Number(newCoupon.discountValue),
      minOrderValue: Number(newCoupon.minOrderValue),
      maxUses: newCoupon.maxUses,
      uses: newCoupon.uses,
      expiresAt: newCoupon.expiresAt ? newCoupon.expiresAt.toISOString() : null,
      isActive: newCoupon.isActive,
      oncePerUser: newCoupon.oncePerUser,
      productIds: newCoupon.productIds,
      minLoyaltyLevel: newCoupon.minLoyaltyLevel,
      loyaltyBadgeId: newCoupon.loyaltyBadgeId,
      createdAt: newCoupon.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar cupom:", error);
    return NextResponse.json({ error: "Erro ao cadastrar cupom." }, { status: 500 });
  }
}
