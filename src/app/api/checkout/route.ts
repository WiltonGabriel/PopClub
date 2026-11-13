import { NextResponse } from "next/server";

import { prisma, DBAddonItem, DBCoupon } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import { getAuthUser, signToken, setSessionCookies } from "@/lib/auth";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";
import { cookies } from "next/headers";
import { z } from "zod";
import { handleApiError } from "@/lib/apiResponse";
import { checkoutLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { sanitizeText } from "@/lib/sanitize";
import { sanitizeAndNormalizePhone } from "@/lib/validations/auth";
import crypto from "crypto";
import { calculateAccountAgeMonths } from "@/services/loyaltyBadgeService";
import { resolveCouponLoyaltyContext } from "@/services/couponLoyaltyService";

import { calculateDistanceKm } from "@/lib/geo";
import { calculateProductPrice } from "@/lib/pricing";
import { DEFAULT_STORE_SCHEDULE, BusinessHourDay } from "@/lib/storeSchedule";
import {
  StoreScheduleDomainService,
  CouponDomainService,
  StockDomainService,
  AddonDomainService,
} from "@/domain/services";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";
import {
  ResourceNotFoundException,
  InvalidCouponException,
} from "@/domain/errors";

const checkoutSchema = z.object({
  deliveryType: z.enum(["delivery", "retirada"]).optional().default("delivery"),
  orderType: z.enum(["delivery", "retirada"]).optional(),
  isPickup: z.boolean().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, "ID do produto inválido"),
      quantity: z.number().int().positive("A quantidade deve ser maior que zero"),
      promotionId: z.string().optional().nullable(),
      notes: z.string().trim().max(300, "Observação muito longa (máximo 300 caracteres)").optional().nullable(),
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
  idempotencyKey: z.string().trim().max(255).optional().nullable(),
});

export async function POST(request: Request) {
  let receivedIdempotencyKey: string | null = null;
  let targetUserId: string | null = null;
  let calculatedFinalTotal: number | null = null;
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = checkoutLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Já estamos processando um pedido seu. Aguarde alguns instantes antes de enviar novamente."
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

    const headerKey = request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key");
    receivedIdempotencyKey = (parsed.data.idempotencyKey || headerKey || "").trim() || null;
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

    // 0. Validação de Loja Aberta (Turno Operacional e Horários Cuiabá)
    let storeSettings = null;
    try {
      storeSettings = await prisma.storeSettings.findUnique({
        where: { id: "store_config" },
      });
    } catch (err) {
      console.warn("Aviso ao buscar storeSettings no checkout:", err);
    }

    const operationalStatus = StoreScheduleDomainService.assertCanAcceptOrders(
      (storeSettings?.businessHours as unknown as BusinessHourDay[]) || DEFAULT_STORE_SCHEDULE,
      storeSettings ? Boolean(storeSettings.isOpen) : true
    );

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
    targetUserId = null;
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
        // Blindagem Anti-Account Takeover:
        // Contas cadastradas com senha ou equipe exigem login formal para gerar novos pedidos
        if (existingUser.role !== Role.CLIENT || existingUser.passwordHash || existingUser.isRegistered) {
          return NextResponse.json(
            {
              error: "Este WhatsApp pertence a um cliente cadastrado no sistema. Por favor, faça login com sua senha para prosseguir com o pedido.",
              code: "REGISTERED_USER_LOGIN_REQUIRED",
              requiresLogin: true,
            },
            { status: 403 }
          );
        }

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
        try {
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
        } catch (createErr: any) {
          if (createErr?.code === "P2002") {
            const raceUser = await prisma.user.findFirst({
              where: { phone: cleanPhone },
            });
            if (raceUser) {
              targetUserId = raceUser.id;
              targetIsRegistered = Boolean(raceUser.isRegistered);
              targetUserPhone = raceUser.phone;
              existingUser = raceUser;
            } else {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        }
      }

      sessionTokenToSet = signToken({
        userId: existingUser.id,
        phone: existingUser.phone,
        name: existingUser.fullName,
        role: existingUser.role,
        isRegistered: targetIsRegistered,
        tokenVersion: existingUser.tokenVersion ?? 1,
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
        addonGroups: {
          select: { groupId: true },
        },
        comboItems: {
          include: {
            product: {
              include: {
                addonGroups: {
                  select: { groupId: true },
                },
              },
            },
          },
        },
      },
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validação estrita de existência, disponibilidade e estoque dos produtos via StockDomainService
    for (const [prodId, totalQty] of productQtyMap.entries()) {
      const product = productsMap.get(prodId);
      if (!product) {
        throw new ResourceNotFoundException("Produto", prodId, `Produto não encontrado no cardápio: ${prodId}`);
      }
      StockDomainService.verifyProductStock(
        {
          id: product.id,
          name: product.name,
          isAvailable: product.isAvailable,
          manageStock: product.stock !== null,
          stockQuantity: product.stock,
          isCombo: product.isCombo,
        },
        totalQty
      );
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
    let nonComboSubtotal = 0;
    let promoDiscountTotal = 0;
    let hasCombosInCart = false;

    const validatedOrderItems: {
      productId: string;
      quantity: number;
      priceAtTime: number;
      promotionId: string | null;
      notes: string | null;
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
        
        // Separa itens virtuais (ex: talheres ou complementos de combo virtuais) de adicionais de tabela
        const realAddons = item.selectedAddons.filter((addon) => {
          if (addon.id.startsWith("combo-") || addon.id.startsWith("cutlery")) {
            const rawPrice = Number(addon.price) || 0;
            const virtualPrice = Math.max(0, isNaN(rawPrice) ? 0 : rawPrice);
            const virtualQty = Math.max(1, Math.min(20, addon.quantity || 1));
            addonsTotalPerUnit += virtualPrice * virtualQty;
            finalSelectedAddons!.push({
              id: addon.id,
              name: addon.name || "Item Virtual",
              groupName: addon.groupName || (addon.id.startsWith("cutlery") ? "Utensílios" : "Combo"),
              price: virtualPrice,
              quantity: virtualQty,
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

        // Agrupamento por unidade (no combo) + grupo para aplicar cotas gratuitas sem mistura indevida entre copos/marmitas
        type AddonBucketEntry = {
          dbAddon: (typeof dbAddons)[0];
          quantity: number;
          originalName?: string | null;
          originalGroupName?: string | null;
        };
        const selectionsByBucket = new Map<
          string,
          { unitTitle: string | null; groupId: string; entries: AddonBucketEntry[] }
        >();

        for (const addon of realAddons) {
          const dbAddon = dbAddonsMap.get(addon.id)!;
          const { unitTitle } = product.isCombo
            ? AddonOrganizationService.extractUnitAndGroup(addon.groupName)
            : { unitTitle: null };
          const bucketKey = `${unitTitle || "__shared__"}::${dbAddon.groupId}`;
          const existingBucket = selectionsByBucket.get(bucketKey) || {
            unitTitle,
            groupId: dbAddon.groupId,
            entries: [],
          };
          existingBucket.entries.push({
            dbAddon,
            quantity: addon.quantity || 1,
            originalName: addon.name,
            originalGroupName: addon.groupName,
          });
          selectionsByBucket.set(bucketKey, existingBucket);
        }

        const totalComboUnits =
          product.isCombo && product.comboItems && product.comboItems.length > 0
            ? product.comboItems.reduce((acc, ci) => acc + (ci.quantity || 1), 0)
            : 1;

        for (const [, bucket] of selectionsByBucket.entries()) {
          const group = bucket.entries[0]?.dbAddon.group;
          if (!group) continue;

          // Calcula o multiplicador exato do balde:
          // - Com prefixo de unidade ("Copo #1 • ..."), vale 1 cota daquela unidade.
          // - Grupos compartilhados de talheres/descartáveis ou vinculados ao combo pai valem 1.
          // - Payloads legados sem prefixo de unidade contam quantos itens do combo possuem aquele grupo.
          let bucketMultiplier = 1;
          if (product.isCombo && !bucket.unitTitle) {
            const isParentGroup = Boolean(
              (product as any).addonGroups?.some((pag: any) => pag.groupId === group.id)
            );
            if (!isParentGroup && !AddonOrganizationService.isCutleryGroupName(group.name)) {
              const matchingUnitsCount = (product.comboItems || []).reduce((acc: number, ci: any) => {
                const childHasGroup = ci.product?.addonGroups?.some((pag: any) => pag.groupId === group.id);
                return acc + (childHasGroup ? (ci.quantity || 1) : 0);
              }, 0);
              bucketMultiplier = matchingUnitsCount > 0 ? matchingUnitsCount : totalComboUnits;
            }
          }

          const validation = AddonDomainService.validateGroupSelections({
            group,
            dbItems: dbAddonsMap as any,
            selections: bucket.entries.map((s) => ({
              id: s.dbAddon.id,
              name: s.originalName || s.dbAddon.name,
              groupName: s.originalGroupName || group.name,
              price: Number(s.dbAddon.price),
              quantity: s.quantity,
            })),
            comboMultiplier: bucketMultiplier,
          });

          addonsTotalPerUnit += validation.addonsSubtotal;
          finalSelectedAddons.push(...validation.processedAddons);
        }

        if (finalSelectedAddons && finalSelectedAddons.length > 0) {
          finalSelectedAddons = AddonOrganizationService.organizeOrderAddons(finalSelectedAddons).flatSorted;
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
          StockDomainService.verifyPromotionBatch(
            {
              id: promo.id,
              title: promo.title,
              isActive: promo.isActive,
              scarcityUnits: promo.scarcityUnits,
              scarcityType: promo.scarcityType,
              productId: promo.productId,
            },
            item.quantity
          );

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
      const itemSubtotal = (baseOriginalPrice + addonsTotalPerUnit) * item.quantity;
      calculatedSubtotal += itemSubtotal;
      if (!product.isCombo) {
        nonComboSubtotal += itemSubtotal;
      }

      validatedOrderItems.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtTime: unitPrice,
        promotionId: item.promotionId || null,
        notes: item.notes && item.notes.trim() ? sanitizeText(item.notes.trim()) : null,
        selectedAddons: finalSelectedAddons && finalSelectedAddons.length > 0 ? finalSelectedAddons : null,
      });
    }

    // 2. Validação e Recálculo Seguro de Cupom Promocional
    let couponDiscount = 0;
    let validCouponId: string | null = null;
    let validCouponCode: string | null = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon: DBCoupon | null = await prisma.coupon.findUnique({
        where: { code: cleanCode },
      });

      // Identificação de fidelidade e histórico de pedidos para elegibilidade
      let userMonths = 0;
      let completedOrdersCount = 0;
      let requiredBadgeName = "VIP";
      let requiredBadgeLevel: number | undefined;
      let userBadgeLevel: number | undefined;
      let userBadgeId: string | undefined;

      if (targetUserId) {
        const [dbUser, ordersCount] = await Promise.all([
          prisma.user.findUnique({
            where: { id: targetUserId },
            select: { createdAt: true, isRegistered: true },
          }),
          prisma.order.count({
            where: { userId: targetUserId, status: "completed" },
          }),
        ]);

        if (dbUser?.createdAt) {
          userMonths = calculateAccountAgeMonths(dbUser.createdAt);
        }
        completedOrdersCount = ordersCount;
      }

      if (coupon?.minLoyaltyLevel || coupon?.loyaltyBadgeId) {
        const loyaltyCtx = await resolveCouponLoyaltyContext(coupon, {
          userMonths,
          completedOrdersCount,
        });
        requiredBadgeName = loyaltyCtx.requiredBadgeName;
        requiredBadgeLevel = loyaltyCtx.requiredBadgeLevel;
        userBadgeLevel = loyaltyCtx.userBadge.level;
        userBadgeId = loyaltyCtx.userBadge.id;
      }

      // Identificação de uso prévio baseada apenas no usuário resolvido via sessão ou acesso rápido validado
      let hasPriorUsage = false;
      if (coupon?.oncePerUser) {
        const conditions: Prisma.OrderWhereInput[] = [];
        if (targetUserId) {
          conditions.push({ userId: targetUserId });
        }
        if (targetUserPhone) {
          conditions.push({ user: { phone: targetUserPhone } });
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
            hasPriorUsage = true;
          }
        }
      }

      const cartProductIds = items.map((it) => it.productId);

      CouponDomainService.validateEligibility({
        coupon,
        subtotal: calculatedSubtotal,
        isRegisteredUser: targetIsRegistered,
        userMonths,
        completedOrdersCount,
        userBadgeLevel,
        userBadgeId,
        requiredBadgeName,
        requiredBadgeLevel,
        hasPriorUsage,
        cartProductIds,
      });

      validCouponId = coupon!.id;
      validCouponCode = coupon!.code;
      couponDiscount = CouponDomainService.calculateDiscount(coupon!, calculatedSubtotal, {
        eligibleSubtotal: hasCombosInCart && nonComboSubtotal > 0 ? nonComboSubtotal : calculatedSubtotal,
      });
    }

    // Validação de Raio Geográfico (Haversine) para pedidos de Entrega
    if (!isPickup) {
      const hasCoordinates =
        typeof deliveryAddress.latitude === "number" &&
        typeof deliveryAddress.longitude === "number" &&
        !isNaN(deliveryAddress.latitude) &&
        !isNaN(deliveryAddress.longitude);

      if (!hasCoordinates) {
        return NextResponse.json(
          {
            error: "Coordenadas geográficas (latitude e longitude) são obrigatórias para pedidos com entrega em domicílio.",
            code: "COORDINATES_REQUIRED",
          },
          { status: 400 }
        );
      }

      const storeLat = storeSettings?.storeLatitude ?? -15.6536;
      const storeLng = storeSettings?.storeLongitude ?? -56.1322;
      const maxRadius = storeSettings?.maxDeliveryRadiusKm ?? 12;

      const distanceKm = calculateDistanceKm(
        storeLat,
        storeLng,
        deliveryAddress.latitude!,
        deliveryAddress.longitude!
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
    calculatedFinalTotal = finalTotal;

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

    // 2.3. Fast-Path de Idempotência: se a chave já existe, valida o payload e retorna o pedido existente
    if (receivedIdempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey: receivedIdempotencyKey },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true, phone: true, email: true } },
        },
      });

      if (existingOrder) {
        // Validação estrita de compatibilidade de payload
        const isOwnerMatch = existingOrder.userId === targetUserId;
        const isAmountMatch = Math.abs(Number(existingOrder.totalAmount) - finalTotal) <= 0.05;

        if (!isOwnerMatch || !isAmountMatch) {
          return NextResponse.json(
            {
              error: "Chave de idempotência já utilizada com dados de pedido divergentes.",
              code: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            idempotent: true,
            order: {
              id: existingOrder.id,
              trackingToken: existingOrder.trackingToken,
              tracking_token: existingOrder.trackingToken,
              trackingUrl: `/entrega/${existingOrder.trackingToken}`,
              status: existingOrder.status,
              subtotal: Number(existingOrder.subtotal),
              discountAmount: Number(existingOrder.discountAmount),
              deliveryFee: Number(existingOrder.deliveryFee),
              totalAmount: Number(existingOrder.totalAmount),
              createdAt: existingOrder.createdAt.toISOString(),
            },
          },
          { status: 200 }
        );
      }
    }

    // 3. Persistência Transacional do Pedido
    const trackingToken = crypto.randomUUID().replace(/-/g, "");

    const order = await prisma.$transaction(async (tx) => {
      // Criação do pedido vinculado atomicamente ao usuário e ao turno
      const newOrder = await tx.order.create({
        data: {
          user: { connect: { id: targetUserId! } },
          shiftId: targetShiftId,
          trackingToken: trackingToken,
          idempotencyKey: receivedIdempotencyKey,
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
              notes: oi.notes || null,
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

      // Baixa atômica de lotes promocionais de escassez real
      for (const item of items) {
        if (item.promotionId) {
          const promo = promotionsMap.get(item.promotionId);
          const isRealBatch =
            promo &&
            (promo.scarcityType === "real" ||
              promo.scarcityType === "real_batch" ||
              (promo.scarcityUnits !== null && promo.scarcityUnits !== undefined && promo.scarcityType !== "strategic"));

          if (promo && isRealBatch && promo.scarcityUnits !== null && promo.scarcityUnits !== undefined) {
            const affectedPromo = await tx.$executeRaw`
              UPDATE promotions
              SET scarcity_sold = scarcity_sold + ${item.quantity},
                  scarcity_units = scarcity_units - ${item.quantity}
              WHERE id = ${promo.id} AND scarcity_units >= ${item.quantity}
            `;
            if (affectedPromo === 0) {
              throw new Error(`LOTE_PROMOCIONAL_ESGOTADO:${promo.title}`);
            }
          }
        }
      }

      // Se utilizou cupom, incrementa atomicamente conferindo o teto máximo (max_uses)
      if (validCouponId) {
        const affectedCouponRows = await tx.$executeRaw`
          UPDATE coupons
          SET uses = uses + 1
          WHERE id = ${validCouponId} AND (max_uses IS NULL OR uses < max_uses)
        `;
        if (affectedCouponRows === 0) {
          throw new InvalidCouponException(
            validCouponCode || "CUPOM",
            "Limite de utilizações deste cupom atingido simultaneamente.",
            { code: "COUPON_MAX_USES_REACHED" }
          );
        }

        // Se o cupom for de uso único por cliente (oncePerUser), registra na tabela coupon_redemptions
        // A constraint única composta (coupon_id, user_id) impede corrida de forma absoluta
        const dbCoupon = await tx.coupon.findUnique({
          where: { id: validCouponId },
          select: { oncePerUser: true },
        });
        if (dbCoupon?.oncePerUser) {
          try {
            await tx.couponRedemption.create({
              data: {
                couponId: validCouponId,
                userId: targetUserId!,
                orderId: newOrder.id,
              },
            });
          } catch (redemptionErr: any) {
            if (redemptionErr?.code === "P2002") {
              throw new InvalidCouponException(
                validCouponCode || "CUPOM",
                "Você já utilizou este cupom de uso único anteriormente.",
                { code: "COUPON_ALREADY_USED_BY_USER" }
              );
            }
            throw redemptionErr;
          }
        }
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

    serverOrderEventManager.emit({
      type: "order_created",
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      order: {
        id: order.id,
        trackingToken: order.trackingToken,
        status: order.status,
        totalAmount: Number(order.totalAmount),
      },
      timestamp: Date.now(),
    });

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
  } catch (error: any) {
    // Idempotência: se bateu na constraint única de idempotencyKey, retorna o pedido original
    if (error?.code === "P2002" && receivedIdempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey: receivedIdempotencyKey },
        include: {
          items: { include: { product: true } },
          user: { select: { fullName: true, phone: true, email: true } },
        },
      });
      if (existingOrder) {
        if (targetUserId && existingOrder.userId !== targetUserId) {
          return NextResponse.json(
            {
              error: "Chave de idempotência já utilizada com dados de pedido divergentes.",
              code: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
            },
            { status: 409 }
          );
        }
        if (calculatedFinalTotal !== null && Math.abs(Number(existingOrder.totalAmount) - calculatedFinalTotal) > 0.05) {
          return NextResponse.json(
            {
              error: "Chave de idempotência já utilizada com dados de pedido divergentes.",
              code: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            success: true,
            idempotent: true,
            order: {
              id: existingOrder.id,
              trackingToken: existingOrder.trackingToken,
              tracking_token: existingOrder.trackingToken,
              trackingUrl: `/entrega/${existingOrder.trackingToken}`,
              status: existingOrder.status,
              subtotal: Number(existingOrder.subtotal),
              discountAmount: Number(existingOrder.discountAmount),
              deliveryFee: Number(existingOrder.deliveryFee),
              totalAmount: Number(existingOrder.totalAmount),
              createdAt: existingOrder.createdAt.toISOString(),
            },
          },
          { status: 200 }
        );
      }
    }

    if (error instanceof Error && error.message.startsWith("LOTE_PROMOCIONAL_ESGOTADO:")) {
      const promoTitle = error.message.replace("LOTE_PROMOCIONAL_ESGOTADO:", "");
      return NextResponse.json(
        {
          error: `O lote promocional para "${promoTitle}" esgotou no momento. Por favor, revise sua sacola.`,
          code: "BATCH_DEPLETED",
        },
        { status: 400 }
      );
    }

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
