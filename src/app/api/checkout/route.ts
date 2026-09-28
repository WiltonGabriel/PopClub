import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import { handleApiError } from "@/lib/apiResponse";
import { checkoutLimiter, getIpFromRequest } from "@/lib/rateLimit";

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "ID do produto inválido"),
      quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
      promotionId: z.string().optional().nullable(),
      selectedAddons: z.array(
        z.object({
          id: z.string(),
          name: z.string().optional().nullable(),
          groupName: z.string().optional().nullable(),
          price: z.number().min(0).optional().nullable(),
          quantity: z.number().int().positive().optional().nullable().default(1)
        })
      ).optional().nullable(),
    })
  ).min(1, "O carrinho deve ter pelo menos 1 item"),

  deliveryAddress: z.object({
    street: z.string().trim().min(1, "Logradouro/Rua é obrigatório").max(100, "Rua/Logradouro muito longo (máximo 100 caracteres)"),
    number: z.string().trim().min(1, "Número é obrigatório").max(50, "Número muito longo (máximo 50 caracteres)"),
    neighborhood: z.string().trim().min(1, "Bairro é obrigatório").max(100, "Bairro muito longo (máximo 100 caracteres)"),
    city: z.string().trim().max(100, "Cidade muito longa (máximo 100 caracteres)").default("Local"),
    complement: z.string().trim().max(300, "Complemento muito longo (máximo 300 caracteres)").optional().nullable(),
    reference: z.string().trim().max(300, "Referência muito longa (máximo 300 caracteres)").optional().nullable(),
    zip: z.string().trim().max(50, "CEP muito longo (máximo 50 caracteres)").optional().nullable(),
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
    const ip = getIpFromRequest(request);
    const limitCheck = checkoutLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: "Você está criando pedidos rápido demais. Aguarde um minuto." },
        { status: 429 }
      );
    }

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
    const productQtyMap = new Map<string, number>();
    for (const item of items) {
      productQtyMap.set(
        item.productId,
        (productQtyMap.get(item.productId) || 0) + item.quantity
      );
    }

    const productIds = Array.from(productQtyMap.keys());
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validação estrita de existência, disponibilidade e estoque dos produtos
    for (const [prodId, totalQty] of productQtyMap.entries()) {
      const product = productsMap.get(prodId);
      if (!product) {
        return NextResponse.json(
          { error: `Produto não encontrado no cardápio: ${prodId}` },
          { status: 400 }
        );
      }
      if (!product.isAvailable) {
        return NextResponse.json(
          { error: `O produto "${product.name}" está temporariamente indisponível ou esgotado.` },
          { status: 400 }
        );
      }
      if (product.stock !== null && product.stock < totalQty) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para "${product.name}". Quantidade disponível: ${product.stock}, solicitada: ${totalQty}.`,
            code: "INSUFFICIENT_STOCK",
          },
          { status: 400 }
        );
      }
    }

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

    // Busca e validação segura de complementos (AddonItem) cadastrados no banco
    const allSelectedAddonIds = Array.from(
      new Set(items.flatMap((i) => (i.selectedAddons || []).map((a) => a.id)))
    );
    const dbAddons = allSelectedAddonIds.length > 0
      ? await prisma.addonItem.findMany({
          where: { id: { in: allSelectedAddonIds } },
          include: { group: true },
        })
      : [];
    const dbAddonsMap = new Map(dbAddons.map((a) => [a.id, a]));

    let calculatedSubtotal = 0;
    let promoDiscountTotal = 0;
    let hasCombosInCart = false;

    const validatedOrderItems: {
      productId: string;
      quantity: number;
      priceAtTime: number;
      promotionId: string | null;
      selectedAddons: any;
    }[] = [];

    for (const item of items) {
      const product = productsMap.get(item.productId)!;

      if (product.isCombo) {
        hasCombosInCart = true;
      }

      let addonsTotalPerUnit = 0;
      let finalSelectedAddons: Array<{
        id: string;
        name: string;
        groupName: string;
        price: number;
        quantity: number;
      }> | null = null;

      if (item.selectedAddons && item.selectedAddons.length > 0) {
        finalSelectedAddons = [];
        // Validação estrita: verifica se todos os addons existem e não estão pausados
        for (const addon of item.selectedAddons) {
          const dbAddon = dbAddonsMap.get(addon.id);
          if (!dbAddon) {
            return NextResponse.json(
              { error: `Complemento selecionado não encontrado ou indisponível.` },
              { status: 400 }
            );
          }
          if (!dbAddon.isAvailable || (dbAddon.group && !dbAddon.group.isActive)) {
            return NextResponse.json(
              { error: `O complemento "${dbAddon.name}" está pausado na cozinha ou esgotado no momento.` },
              { status: 400 }
            );
          }
        }

        // Agrupamento por grupo para aplicar a cota de itens grátis (freeQuantity)
        const selectionsByGroup = new Map<string, Array<{ dbAddon: typeof dbAddons[0]; quantity: number }>>();
        for (const addon of item.selectedAddons) {
          const dbAddon = dbAddonsMap.get(addon.id)!;
          const list = selectionsByGroup.get(dbAddon.groupId) || [];
          list.push({ dbAddon, quantity: addon.quantity || 1 });
          selectionsByGroup.set(dbAddon.groupId, list);
        }

        for (const [, groupSelections] of selectionsByGroup.entries()) {
          const group = groupSelections[0]?.dbAddon.group;
          let freeSlotsLeft = group?.freeQuantity ?? 0;

          for (const sel of groupSelections) {
            const rawPrice = Number(sel.dbAddon.price);
            for (let q = 0; q < sel.quantity; q++) {
              let chargedPrice = rawPrice;
              if (freeSlotsLeft > 0) {
                chargedPrice = 0;
                freeSlotsLeft--;
              } else if (rawPrice === 0) {
                chargedPrice = 0;
              }

              addonsTotalPerUnit += chargedPrice;

              const existingSnap = finalSelectedAddons.find(
                (s) => s.id === sel.dbAddon.id && s.price === chargedPrice
              );
              if (existingSnap) {
                existingSnap.quantity += 1;
              } else {
                finalSelectedAddons.push({
                  id: sel.dbAddon.id,
                  name: sel.dbAddon.name,
                  groupName: group?.name || "Complementos",
                  price: chargedPrice,
                  quantity: 1,
                });
              }
            }
          }
        }
      }

      const originalPrice = Number(product.price);
      let unitPrice = originalPrice + addonsTotalPerUnit;

      // Promoções aplicam desconto apenas sobre o produto original, não sobre os adicionais (regra comum)
      // Combos NÃO devem aceitar promoções "De/Por" individuais, pois já são agrupamentos fechados.
      if (item.promotionId && !product.isCombo) {
        const promo = promotionsMap.get(item.promotionId);
        const isInPromo = promo?.productId === item.productId;
        if (promo && isInPromo) {
          let discountOnBase = 0;
          if (promo.discountType === "percentage") {
            const pct = Number(promo.discountValue);
            discountOnBase = Number((originalPrice * (pct / 100)).toFixed(2));
          } else {
            const fixed = Number(promo.discountValue);
            discountOnBase = Math.min(originalPrice, fixed);
          }
          unitPrice = (originalPrice - discountOnBase) + addonsTotalPerUnit;
          promoDiscountTotal += discountOnBase * item.quantity;
        }
      }

      calculatedSubtotal += (originalPrice + addonsTotalPerUnit) * item.quantity;

      validatedOrderItems.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtTime: unitPrice,
        promotionId: item.promotionId || null,
        selectedAddons: finalSelectedAddons && finalSelectedAddons.length > 0 ? finalSelectedAddons : null,
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

      // Regra de Double-Dipping: Proibir cupons globais em carrinhos que já contenham Combos Promocionais
      // Exceção: Cupons de valor fixo direcionados a produtos específicos que não são combos (tratado adiante)
      if (hasCombosInCart && coupon.discountType === "percentage" && (!coupon.productIds || coupon.productIds.length === 0)) {
        return NextResponse.json({
          error: "Este cupom não pode ser acumulado com pedidos que contenham Combos Promocionais."
        }, { status: 400 });
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

    // 2.2. Validação estrita de troco para pagamento em dinheiro
    let changeToReturn: number | null = null;
    if (paymentMethod.type === "dinheiro" && paymentMethod.changeFor !== null && paymentMethod.changeFor !== undefined) {
      if (paymentMethod.changeFor < finalTotal) {
        return NextResponse.json(
          {
            error: "O valor para troco deve ser maior que o total do pedido.",
            code: "INVALID_CHANGE_AMOUNT",
          },
          { status: 400 }
        );
      }
      changeToReturn = Number((paymentMethod.changeFor - finalTotal).toFixed(2));
    }

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
          ...({ changeFor: paymentMethod.changeFor || null } as any),
          changeToReturn: changeToReturn,
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
              selectedAddons: oi.selectedAddons ? oi.selectedAddons : undefined,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Decremento atômico de estoque para produtos com controle de estoque finito
      for (const [prodId, totalQty] of productQtyMap.entries()) {
        const prod = productsMap.get(prodId);
        if (prod && prod.stock !== null) {
          await tx.product.update({
            where: { id: prodId },
            data: { stock: { decrement: totalQty } },
          });
        }
      }

      // Se utilizou cupom, incrementa o contador de usos
      if (validCouponId) {
        await tx.coupon.update({
          where: { id: validCouponId },
          data: { uses: { increment: 1 } },
        });
      }

      return newOrder;
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return handleApiError(
      error,
      "API:checkout:POST",
      "Não foi possível processar o pedido. Por favor, tente novamente."
    );
  }
}
