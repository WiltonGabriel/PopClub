import { NextResponse } from "next/server";

import { prisma, DBAddonItem, DBCoupon } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import { getAuthUser, signToken, setSessionCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { handleApiError } from "@/lib/apiResponse";
import { checkoutLimiter, getIpFromRequest } from "@/lib/rateLimit";
import { sanitizeText } from "@/lib/sanitize";
import { sanitizeAndNormalizePhone } from "@/lib/validations/auth";
import crypto from "crypto";
import {
  DEFAULT_LOYALTY_BADGES,
  LoyaltyBadgeConfig,
  calculateAccountAgeMonths,
} from "@/services/loyaltyBadgeService";

import { calculateDistanceKm } from "@/lib/geo";
import { calculateProductPrice } from "@/lib/pricing";

const checkoutSchema = z.object({
  deliveryType: z.enum(["delivery", "retirada"]).optional().default("delivery"),
  orderType: z.enum(["delivery", "retirada"]).optional(),
  isPickup: z.boolean().optional(),
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
    street: z.string().trim().max(100, "Rua/Logradouro muito longo (máximo 100 caracteres)").optional().default(""),
    number: z.string().trim().max(50, "Número muito longo (máximo 50 caracteres)").optional().default(""),
    neighborhood: z.string().trim().max(100, "Bairro muito longo (máximo 100 caracteres)").optional().default(""),
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
  customerName: z.string().trim().optional().nullable(),
  name: z.string().trim().optional().nullable(),
  fullName: z.string().trim().optional().nullable(),
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

    let json: unknown;
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

    const rawPhone = parsed.data.customerPhone || parsed.data.phone || null;
    const rawName = parsed.data.customerName || parsed.data.fullName || parsed.data.name || null;

    // Identificação de modalidade (Entrega em Domicílio vs Retirada no Balcão)
    const isPickup =
      parsed.data.deliveryType === "retirada" ||
      parsed.data.orderType === "retirada" ||
      parsed.data.isPickup === true ||
      Boolean(deliveryAddress.street && deliveryAddress.street.toLowerCase().includes("retirada"));

    // Se NÃO for retirada, valida obrigatoriedade de Rua, Número e Bairro
    if (!isPickup) {
      if (!deliveryAddress.street?.trim() || !deliveryAddress.number?.trim() || !deliveryAddress.neighborhood?.trim()) {
        return NextResponse.json(
          { error: "Preencha todos os campos obrigatórios de endereço (Rua, Número e Bairro)." },
          { status: 400 }
        );
      }
    }

    // Sanitização rigorosa de entradas de texto do endereço
    const cleanStreet = isPickup
      ? (deliveryAddress.street && deliveryAddress.street.toLowerCase().includes("retirada") ? sanitizeText(deliveryAddress.street) : "Retirada no Balcão")
      : sanitizeText(deliveryAddress.street);
    const cleanNumber = isPickup
      ? (deliveryAddress.number ? sanitizeText(deliveryAddress.number) : "S/N")
      : sanitizeText(deliveryAddress.number);
    const cleanNeighborhood = isPickup
      ? (deliveryAddress.neighborhood ? sanitizeText(deliveryAddress.neighborhood) : "Centro Sul")
      : sanitizeText(deliveryAddress.neighborhood);
    const cleanCity = sanitizeText(deliveryAddress.city || "Várzea Grande");
    const cleanComplement = deliveryAddress.complement ? sanitizeText(deliveryAddress.complement) : null;
    const cleanReference = deliveryAddress.reference ? sanitizeText(deliveryAddress.reference) : null;
    const cleanZip = deliveryAddress.zip ? sanitizeText(deliveryAddress.zip) : null;

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

    // Identificação de Turno Operacional Ativo
    let targetShiftId: string | null = storeSettings?.currentShiftId || null;
    if (!targetShiftId) {
      const activeShift = await prisma.shift.findFirst({
        where: { isOpen: true, closedAt: null },
        orderBy: { openedAt: "desc" },
        select: { id: true },
      });
      if (activeShift) {
        targetShiftId = activeShift.id;
      }
    }

    // Identificação e Autenticação (Cliente Logado ou Acesso Rápido)
    const authUser = await getAuthUser(request);
    let targetUserId: string;
    let targetIsRegistered = false;
    let targetUserPhone: string | null = null;
    let sessionTokenToSet: string | null = null;
    const GUEST_DEFAULT_AVATAR = "/avatars/avatar-guest-user.svg";

    if (authUser?.id) {
      targetUserId = authUser.id;
      targetIsRegistered = Boolean(authUser.isRegistered);
      targetUserPhone = authUser.phone || null;

      // Se for cliente de Acesso Rápido e forneceu nome atualizado, atualiza
      if (!authUser.isRegistered && rawName && rawName.trim().length >= 3 && rawName !== authUser.fullName) {
        try {
          await prisma.user.update({
            where: { id: authUser.id },
            data: { fullName: sanitizeText(rawName.trim()) },
          });
        } catch {}
      }
    } else {
      // Cliente visitante sem sessão prévia: exige dados mínimos de Acesso Rápido
      if (!rawPhone || typeof rawPhone !== "string" || rawPhone.replace(/\D/g, "").length < 10) {
        return NextResponse.json(
          {
            error: "Identificação obrigatória. Utilize o Acesso Rápido (Nome e WhatsApp) ou entre na sua conta para finalizar o pedido.",
            code: "AUTH_REQUIRED",
          },
          { status: 401 }
        );
      }

      const cleanPhone = sanitizeAndNormalizePhone(rawPhone);
      if (!cleanPhone || cleanPhone.length !== 11) {
        return NextResponse.json(
          {
            error: "Por favor, informe um WhatsApp válido com DDD (ex: 65999998888).",
            code: "INVALID_PHONE",
          },
          { status: 400 }
        );
      }

      const cleanName = rawName && rawName.trim().length >= 2
        ? sanitizeText(rawName.trim())
        : "Cliente Acesso Rápido";

      // Localiza usuário existente pelo telefone ou cria novo registro no banco
      let existingUser = await prisma.user.findFirst({
        where: { phone: cleanPhone },
      });

      if (existingUser) {
        targetUserId = existingUser.id;
        targetIsRegistered = Boolean(existingUser.isRegistered);
        targetUserPhone = existingUser.phone;

        if (!existingUser.isRegistered && cleanName !== "Cliente Acesso Rápido" && cleanName !== existingUser.fullName) {
          try {
            existingUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: { fullName: cleanName },
            });
          } catch {}
        }
      } else {
        const newUser = await prisma.user.create({
          data: {
            fullName: cleanName,
            phone: cleanPhone,
            isRegistered: false,
            role: Role.CLIENT,
            avatarUrl: GUEST_DEFAULT_AVATAR,
          },
        });
        targetUserId = newUser.id;
        targetIsRegistered = false;
        targetUserPhone = newUser.phone;
        existingUser = newUser;
      }

      sessionTokenToSet = signToken({
        userId: existingUser.id,
        phone: existingUser.phone,
        name: existingUser.fullName,
        role: existingUser.role,
        isRegistered: targetIsRegistered,
      });
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
      include: {
        promotions: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" as const },
        },
      },
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
      new Set(
        items
          .flatMap((i) => (i.selectedAddons || []).map((a) => a.id))
          .filter((id) => !id.startsWith("combo-") && !id.startsWith("cutlery"))
      )
    );
    const dbAddons: DBAddonItem[] = allSelectedAddonIds.length > 0
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
      selectedAddons: Array<{
        id: string;
        name: string;
        groupName: string;
        price: number;
        quantity: number;
      }> | null;
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
        
        // Separa itens virtuais (ex: talheres) de adicionais de tabela
        const realAddons = item.selectedAddons.filter((addon) => {
          if (addon.id.startsWith("combo-") || addon.id.startsWith("cutlery")) {
            finalSelectedAddons!.push({
              id: addon.id,
              name: addon.name || "Item Virtual",
              groupName: addon.groupName || "Utensílios",
              price: 0,
              quantity: addon.quantity || 1,
            });
            return false;
          }
          return true;
        });

        // Validação estrita: verifica se todos os addons reais existem e não estão pausados
        for (const addon of realAddons) {
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
        for (const addon of realAddons) {
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

      const pricing = calculateProductPrice(product);
      const baseOriginalPrice = pricing.originalPrice ?? Number(product.price);
      if (isNaN(baseOriginalPrice) || baseOriginalPrice <= 0) {
        return NextResponse.json(
          { error: `O produto "${product.name}" possui preço inválido no sistema.` },
          { status: 400 }
        );
      }

      let effectiveBasePrice = pricing.currentPrice;
      let promoDiscountOnProduct = 0;

      if (pricing.isPromotional) {
        promoDiscountOnProduct = Math.max(0, baseOriginalPrice - effectiveBasePrice);
      }

      // Promoções adicionais via promotionId aplicam desconto apenas se não tiver promoção temporal já aplicada
      if (item.promotionId && !product.isCombo && promoDiscountOnProduct === 0) {
        const promo = promotionsMap.get(item.promotionId);
        const isInPromo = promo?.productId === item.productId;
        if (promo && isInPromo) {
          let discountOnBase = 0;
          if (promo.discountType === "percentage") {
            const pct = Number(promo.discountValue);
            discountOnBase = Number((baseOriginalPrice * (pct / 100)).toFixed(2));
          } else {
            const fixed = Number(promo.discountValue);
            discountOnBase = Math.min(baseOriginalPrice, fixed);
          }
          effectiveBasePrice = Math.max(0, baseOriginalPrice - discountOnBase);
          promoDiscountOnProduct = discountOnBase;
        }
      }

      promoDiscountTotal += promoDiscountOnProduct * item.quantity;
      const unitPrice = effectiveBasePrice + addonsTotalPerUnit;
      calculatedSubtotal += (baseOriginalPrice + addonsTotalPerUnit) * item.quantity;

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
      if (!targetIsRegistered) {
        return NextResponse.json(
          {
            error: "🏷️ Cupom indisponível: Descontos e cupons são exclusivos para clientes com cadastro completo. Complete seu cadastro para aplicar este cupom.",
            code: "COUPON_REQUIRES_REGISTRATION",
          },
          { status: 403 }
        );
      }

      const cleanCode = couponCode.trim().toUpperCase();
      const coupon: DBCoupon | null = await prisma.coupon.findUnique({
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

      // Exigência de Nível Mínimo de Fidelidade
      if (coupon.minLoyaltyLevel || coupon.loyaltyBadgeId) {
        const record = await prisma.notificationTemplate.findFirst({
          where: { category: "loyalty_badges" },
          orderBy: { updatedAt: "desc" },
        });
        let badges: LoyaltyBadgeConfig[] = DEFAULT_LOYALTY_BADGES;
        if (record?.message) {
          try {
            const parsed = JSON.parse(record.message);
            if (Array.isArray(parsed) && parsed.length > 0) badges = parsed;
          } catch {}
        }

        const requiredBadge = badges.find(
          (b) =>
            (coupon.loyaltyBadgeId && b.id === coupon.loyaltyBadgeId) ||
            (coupon.minLoyaltyLevel && b.level === coupon.minLoyaltyLevel)
        );

        const requiredMonths = requiredBadge?.minMonths ?? 0;
        const requiredName = requiredBadge?.name || "VIP";

        const dbUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { createdAt: true, isRegistered: true },
        });

        if (!dbUser || !dbUser.isRegistered) {
          return NextResponse.json(
            {
              error: `Este cupom é exclusivo para clientes com selo ${requiredName} ou superior.`,
              code: "COUPON_REQUIRES_LOYALTY_BADGE",
            },
            { status: 400 }
          );
        }

        const userMonths = calculateAccountAgeMonths(dbUser.createdAt);
        if (userMonths < requiredMonths) {
          return NextResponse.json(
            {
              error: `Este cupom é exclusivo para clientes com selo ${requiredName} ou superior.`,
              code: "COUPON_REQUIRES_LOYALTY_BADGE",
            },
            { status: 400 }
          );
        }
      }

      // Regra de Uso Único por Cliente
      if (coupon.oncePerUser) {
        const rawBody = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
        const clientUserId = targetUserId || (typeof rawBody.userId === "string" ? rawBody.userId : undefined);
        const clientPhone =
          (typeof rawBody.customerPhone === "string" ? rawBody.customerPhone : undefined) ||
          (typeof rawBody.phone === "string" ? rawBody.phone : undefined) ||
          targetUserPhone;

        const conditions: Prisma.OrderWhereInput[] = [];
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

    // Validação de Raio Geográfico (Haversine) para pedidos de Entrega
    if (!isPickup && deliveryAddress.latitude && deliveryAddress.longitude) {
      const storeLat = storeSettings?.storeLatitude ?? -15.6536;
      const storeLng = storeSettings?.storeLongitude ?? -56.1322;
      const maxRadius = storeSettings?.maxDeliveryRadiusKm ?? 12;

      const distanceKm = calculateDistanceKm(
        storeLat,
        storeLng,
        deliveryAddress.latitude,
        deliveryAddress.longitude
      );

      if (distanceKm > maxRadius) {
        return NextResponse.json(
          {
            error: `Identificamos que seu endereço fica a ${distanceKm.toFixed(1)} km da nossa sede, e nosso raio máximo atual é de ${maxRadius} km. Infelizmente não conseguimos entregar aí no momento.`,
            code: "OUT_OF_DELIVERY_RADIUS",
            distanceKm: Number(distanceKm.toFixed(2)),
            maxRadiusKm: maxRadius,
            isDeliverable: false,
          },
          { status: 400 }
        );
      }
    }

    // 2.1. Cálculo da Taxa de Entrega com Regra de Frete Grátis e Origem do Estabelecimento
    let calculatedDeliveryFee = 5.0;
    if (isPickup) {
      calculatedDeliveryFee = 0;
    } else if (storeSettings) {
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
    const trackingToken = crypto.randomUUID().replace(/-/g, "");

    const order = await prisma.$transaction(async (tx) => {
      // Criação do pedido vinculado atomicamente ao usuário e ao turno
      const newOrder = await tx.order.create({
        data: {
          user: { connect: { id: targetUserId } },
          shiftId: targetShiftId,
          trackingToken: trackingToken,
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
          changeFor: paymentMethod.changeFor || null,
          changeToReturn: changeToReturn,
          deliveryStreet: cleanStreet,
          deliveryNumber: cleanNumber,
          deliveryNeighborhood: cleanNeighborhood,
          deliveryCity: cleanCity,
          deliveryComplement: cleanComplement,
          deliveryReference: cleanReference,
          deliveryZip: cleanZip,
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
          user: {
            select: {
              fullName: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      // Decremento estritamente atômico de estoque com verificação de corrida
      for (const [prodId, totalQty] of productQtyMap.entries()) {
        const prod = productsMap.get(prodId);
        if (prod && prod.stock !== null) {
          const updateResult = await tx.product.updateMany({
            where: { id: prodId, stock: { gte: totalQty } },
            data: { stock: { decrement: totalQty } },
          });
          if (updateResult.count === 0) {
            throw new Error(`ESTOQUE_ESGOTADO:${prod.name}`);
          }
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

    let isHttps = false;
    try {
      const proto = request.headers.get("x-forwarded-proto");
      isHttps = proto === "https" || (typeof request.url === "string" && request.url.startsWith("https://"));
    } catch {
      isHttps = false;
    }

    const response = NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          trackingToken: order.trackingToken,
          tracking_token: order.trackingToken,
          trackingUrl: `/entrega/${order.trackingToken}`,
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

    if (sessionTokenToSet) {
      setSessionCookies(response, sessionTokenToSet, isHttps);
      try {
        const cookieStore = await cookies();
        setSessionCookies({ cookies: cookieStore } as any, sessionTokenToSet, isHttps);
      } catch {}
    }

    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("ESTOQUE_ESGOTADO:")) {
      const prodName = error.message.replace("ESTOQUE_ESGOTADO:", "");
      return NextResponse.json(
        {
          error: `Estoque esgotado simultaneamente para "${prodName}". Por favor, revise os itens da sacola.`,
          code: "INSUFFICIENT_STOCK",
        },
        { status: 400 }
      );
    }
    return handleApiError(
      error,
      "API:checkout:POST",
      "Não foi possível processar o pedido. Por favor, tente novamente."
    );
  }
}
