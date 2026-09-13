import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ valid: false, message: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { code, subtotal } = body || {};

    if (!code) {
      return NextResponse.json({ valid: false, message: "Código do cupom é obrigatório." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ valid: false, message: "Cupom inválido ou expirado." }, { status: 404 });
    }

    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return NextResponse.json({ valid: false, message: "Este cupom já expirou." }, { status: 400 });
    }

    if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: "Limite de utilizações deste cupom atingido." }, { status: 400 });
    }

    const numSubtotal = Number(subtotal || 0);
    const minVal = Number(coupon.minOrderValue);
    if (numSubtotal < minVal) {
      return NextResponse.json({
        valid: false,
        message: `Este cupom exige pedido mínimo de R$ ${minVal.toFixed(2).replace(".", ",")}.`,
      }, { status: 400 });
    }

    // Validação de Escopo de Produtos Específicos
    const cartProductIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
    if (coupon.productIds && coupon.productIds.length > 0) {
      if (cartProductIds.length > 0) {
        const hasMatchingProduct = cartProductIds.some((pId: string) => coupon.productIds.includes(pId));
        if (!hasMatchingProduct) {
          return NextResponse.json({
            valid: false,
            message: "Este cupom é exclusivo para produtos específicos que não estão no seu carrinho.",
          }, { status: 400 });
        }
      }
    }

    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);
    if (coupon.discountType === "percentage") {
      discountAmount = (numSubtotal * discountVal) / 100;
    } else {
      discountAmount = Math.min(discountVal, numSubtotal);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: discountVal,
        discountAmount: Number(discountAmount.toFixed(2)),
        productIds: coupon.productIds || [],
      },
    });
  } catch (error: any) {
    console.error("Erro na validação do cupom:", error);
    return NextResponse.json({ valid: false, message: "Erro ao validar cupom." }, { status: 500 });
  }
}
