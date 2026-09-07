import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "ID do produto inválido"),
      quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
      promotionId: z.string().optional().nullable(),
    })
  ).min(1, "O carrinho deve ter pelo menos 1 item"),

  deliveryAddress: z.object({
    street: z.string().min(2, "Logradouro/Rua é obrigatório"),
    number: z.string().min(1, "Número é obrigatório"),
    neighborhood: z.string().min(2, "Bairro é obrigatório"),
    city: z.string().default("Local"),
    complement: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
  }),

  paymentMethod: z.object({
    type: z.enum(["dinheiro", "cartao_maquininha", "pix_entrega"]),
    changeFor: z.number().positive().optional().nullable(),
  }),

  couponCode: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = checkoutSchema.safeParse(json);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { items, deliveryAddress, paymentMethod, couponCode } = parsed.data;

    // Obtém usuário autenticado se houver
    const authUser = await getAuthUser(request);

    // 1. Validação e Recálculo Seguro de Itens diretamente do PostgreSQL
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Busca promoções vinculadas caso algum item venha de promoção
    const promoIds = items
      .map((i) => i.promotionId)
      .filter((id): id is string => Boolean(id));

    const dbPromotions = promoIds.length > 0
      ? await prisma.promotion.findMany({
          where: { id: { in: promoIds }, isActive: true },
          include: { items: true },
        })
      : [];

    const promotionsMap = new Map(dbPromotions.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    let promoDiscountTotal = 0;

    const validatedOrderItems: {
      productId: string;
      quantity: number;
      priceAtTime: number;
      promotionId: string | null;
    }[] = [];

    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Produto não encontrado no cardápio: ${item.productId}` },
          { status: 400 }
        );
      }

      const originalPrice = Number(product.price);
      let unitPrice = originalPrice;

      if (item.promotionId) {
        const promo = promotionsMap.get(item.promotionId);
        // Verifica se a promoção existe, está ativa e contém este produto
        const isInPromo = promo?.items.some((pi) => pi.productId === item.productId);
        if (promo && isInPromo) {
          if (promo.discountType === "percentage") {
            const pct = Number(promo.discountValue);
            unitPrice = Number((originalPrice * (1 - pct / 100)).toFixed(2));
          } else {
            // Em desconto fixo por combo, distribui proporcionalmente ou desconta por item
            const fixed = Number(promo.discountValue);
            unitPrice = Math.max(0, Number((originalPrice - fixed / promo.items.length).toFixed(2)));
          }
          promoDiscountTotal += (originalPrice - unitPrice) * item.quantity;
        }
      }

      calculatedSubtotal += originalPrice * item.quantity;

      validatedOrderItems.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtTime: unitPrice,
        promotionId: item.promotionId || null,
      });
    }

    // 2. Validação e Recálculo de Cupom no PostgreSQL
    let couponDiscount = 0;
    let validCouponId: string | null = null;
    let validCouponCode: string | null = null;

    if (couponCode) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode },
      });

      if (coupon && coupon.isActive) {
        const isNotExpired = !coupon.expiresAt || new Date() <= new Date(coupon.expiresAt);
        const hasUsesLeft = !coupon.maxUses || coupon.uses < coupon.maxUses;
        const meetsMin = calculatedSubtotal >= Number(coupon.minOrderValue);

        if (isNotExpired && hasUsesLeft && meetsMin) {
          validCouponId = coupon.id;
          validCouponCode = coupon.code;
          const val = Number(coupon.discountValue);
          if (coupon.discountType === "percentage") {
            couponDiscount = Number(((calculatedSubtotal * val) / 100).toFixed(2));
          } else {
            couponDiscount = Math.min(val, calculatedSubtotal);
          }
        }
      }
    }

    const totalDiscount = Number((promoDiscountTotal + couponDiscount).toFixed(2));
    const finalTotal = Math.max(0, Number((calculatedSubtotal - totalDiscount).toFixed(2)));

    // 3. Persistência Transacional no PostgreSQL
    const order = await prisma.$transaction(async (tx) => {
      // Criação do pedido
      const newOrder = await tx.order.create({
        data: {
          userId: authUser?.id || null,
          status: "pending",
          subtotal: calculatedSubtotal,
          discountAmount: totalDiscount,
          totalAmount: finalTotal,
          couponId: validCouponId,
          couponCode: validCouponCode,
          paymentMethodType: paymentMethod.type,
          paymentChangeFor: paymentMethod.changeFor || null,
          deliveryStreet: deliveryAddress.street,
          deliveryNumber: deliveryAddress.number,
          deliveryNeighborhood: deliveryAddress.neighborhood,
          deliveryCity: deliveryAddress.city || "Local",
          deliveryComplement: deliveryAddress.complement || null,
          deliveryReference: deliveryAddress.reference || null,
          deliveryZip: deliveryAddress.zip || null,
          deliveryLatitude: deliveryAddress.latitude || null,
          deliveryLongitude: deliveryAddress.longitude || null,
          items: {
            create: validatedOrderItems.map((oi) => ({
              productId: oi.productId,
              quantity: oi.quantity,
              priceAtTime: oi.priceAtTime,
              promotionId: oi.promotionId,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Se utilizou cupom, incrementa o contador de usos
      if (validCouponId) {
        await tx.coupon.update({
          where: { id: validCouponId },
          data: { uses: { increment: 1 } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar o pedido." },
      { status: 500 }
    );
  }
}
