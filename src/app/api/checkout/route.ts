import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import { handleApiError } from "@/lib/apiResponse";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "ID do produto inválido"),
      quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
      promotionId: z.string().optional().nullable(),
    })
  ).min(1, "O carrinho deve ter pelo menos 1 item"),

  deliveryAddress: z.object({
    street: z.string().trim().min(1, "Logradouro/Rua é obrigatório"),
    number: z.string().trim().min(1, "Número é obrigatório"),
    neighborhood: z.string().trim().min(1, "Bairro é obrigatório"),
    city: z.string().trim().default("Local"),
    complement: z.string().trim().optional().nullable(),
    reference: z.string().trim().optional().nullable(),
    zip: z.string().trim().optional().nullable(),
    latitude: z.preprocess((val) => (val === "" || val === null || val === undefined ? null : Number(val)), z.number().nullable().optional()),
    longitude: z.preprocess((val) => (val === "" || val === null || val === undefined ? null : Number(val)), z.number().nullable().optional()),
  }),

  paymentMethod: z.object({
    type: z.enum(["dinheiro", "cartao_maquininha", "pix_entrega"]),
    changeFor: z.number().positive().optional().nullable(),
  }),

  couponCode: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    let json: any;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const parsed = checkoutSchema.safeParse(json);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { items, deliveryAddress, paymentMethod, couponCode } = parsed.data;

    // 0. Validação de Loja Aberta (Turno Operacional)
    let storeSettings = null;
    try {
      storeSettings = await prisma.storeSettings.findUnique({
        where: { id: "store_config" },
      });
    } catch (err) {
      console.warn("Aviso ao buscar storeSettings no checkout:", err);
    }

    if (storeSettings && storeSettings.isOpen === false) {
      return NextResponse.json(
        {
          error: "A loja está fechada no momento e não está aceitando novos pedidos. Nosso atendimento abrirá em breve!",
          code: "STORE_CLOSED",
        },
        { status: 403 }
      );
    }

    // Obtém usuário autenticado obrigatoriamente (compras anônimas 100% bloqueadas)
    const authUser = await getAuthUser(request);
    if (!authUser?.id) {
      return NextResponse.json(
        {
          error: "Identificação obrigatória. Utilize o Acesso Rápido ou entre na sua conta para finalizar o pedido.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // 1. Validação e Recálculo Seguro de Itens no Cardápio
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
          include: { product: true },
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
        const isInPromo = promo?.productId === item.productId;
        if (promo && isInPromo) {
          if (promo.discountType === "percentage") {
            const pct = Number(promo.discountValue);
            unitPrice = Number((originalPrice * (1 - pct / 100)).toFixed(2));
          } else {
            // Em desconto fixo por produto
            const fixed = Number(promo.discountValue);
            unitPrice = Math.max(0, Number((originalPrice - fixed).toFixed(2)));
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

    // 2. Validação e Recálculo Seguro de Cupom Promocional
    let couponDiscount = 0;
    let validCouponId: string | null = null;
    let validCouponCode: string | null = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      if (!authUser.isRegistered) {
        return NextResponse.json(
          {
            error: "🏷️ Cupom indisponível: Descontos e cupons são exclusivos para clientes com cadastro completo. Complete seu cadastro para aplicar este cupom.",
            code: "COUPON_REQUIRES_REGISTRATION",
          },
          { status: 403 }
        );
      }

      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode },
      });

      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ error: "Cupom de desconto inválido ou inativo." }, { status: 400 });
      }

      if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
        return NextResponse.json({ error: "Este cupom de desconto já expirou." }, { status: 400 });
      }

      if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
        return NextResponse.json({ error: "O limite de utilizações deste cupom foi atingido." }, { status: 400 });
      }

      // Regra de Uso Único por Cliente
      if (coupon.oncePerUser) {
        const clientUserId = authUser?.id || (json as any)?.userId;
        const clientPhone = (json as any)?.customerPhone || (json as any)?.phone || authUser?.phone;

        const conditions: any[] = [];
        if (clientUserId) {
          conditions.push({ userId: clientUserId });
        }
        if (clientPhone) {
          conditions.push({ user: { phone: clientPhone } });
        }

        if (conditions.length > 0) {
          const previousOrder = await prisma.order.findFirst({
            where: {
              couponId: coupon.id,
              status: { not: "cancelled" },
              OR: conditions,
            },
          });

          if (previousOrder) {
            return NextResponse.json(
              { error: "Este cupom é de uso único por cliente e já foi utilizado anteriormente." },
              { status: 400 }
            );
          }
        }
      }

      const minVal = Number(coupon.minOrderValue);
      if (calculatedSubtotal < minVal) {
        return NextResponse.json({
          error: `Este cupom exige um pedido mínimo de R$ ${minVal.toFixed(2).replace(".", ",")}.`,
        }, { status: 400 });
      }

      // Validação de restrição de escopo de produtos do cupom
      if (coupon.productIds && coupon.productIds.length > 0) {
        const hasMatchingProduct = items.some((it) => coupon.productIds.includes(it.productId));
        if (!hasMatchingProduct) {
          return NextResponse.json({
            error: "Este cupom é exclusivo para produtos específicos que não estão no seu pedido.",
          }, { status: 400 });
        }
      }

      validCouponId = coupon.id;
      validCouponCode = coupon.code;
      const val = Number(coupon.discountValue);
      if (coupon.discountType === "percentage") {
        couponDiscount = Number(((calculatedSubtotal * val) / 100).toFixed(2));
      } else {
        couponDiscount = Math.min(val, calculatedSubtotal);
      }
    }

    // 2.1. Cálculo da Taxa de Entrega com Regra de Frete Grátis e Origem do Estabelecimento
    let calculatedDeliveryFee = 5.0;
    if (storeSettings) {
      const fee = Number(storeSettings.deliveryFee);
      const threshold =
        storeSettings.freeDeliveryThreshold !== null
          ? Number(storeSettings.freeDeliveryThreshold)
          : null;
      if (threshold !== null && calculatedSubtotal >= threshold) {
        calculatedDeliveryFee = 0;
      } else {
        calculatedDeliveryFee = fee;
      }
    }

    const totalDiscount = Number((promoDiscountTotal + couponDiscount).toFixed(2));
    const itemsTotalAfterDiscount = Math.max(0, Number((calculatedSubtotal - totalDiscount).toFixed(2)));
    const finalTotal = Number((itemsTotalAfterDiscount + calculatedDeliveryFee).toFixed(2));

    // 3. Persistência Transacional do Pedido
    const order = await prisma.$transaction(async (tx) => {
      // Criação do pedido
      const newOrder = await tx.order.create({
        data: {
          user: { connect: { id: authUser.id } },
          shiftId: storeSettings?.currentShiftId || null,
          isArchived: false,
          status: "pending",
          subtotal: calculatedSubtotal,
          discountAmount: totalDiscount,
          deliveryFee: calculatedDeliveryFee,
          totalAmount: finalTotal,
          coupon: validCouponId ? { connect: { id: validCouponId } } : undefined,
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
          originLatitude: storeSettings?.storeLatitude ?? -15.6536,
          originLongitude: storeSettings?.storeLongitude ?? -56.1322,
          originAddress: storeSettings?.storeAddress ?? "Várzea Grande, MT",
          branchId: storeSettings?.id ?? "store_config",
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
        deliveryFee: Number(order.deliveryFee),
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(
      error,
      "API:checkout:POST",
      "Não foi possível processar o pedido. Por favor, tente novamente."
    );
  }
}
