import { prisma } from "@/lib/prisma";
import { ProductDependencyDomainService } from "@/domain/services/ProductDependencyDomainService";
import { AdminAuditActor, recordAdminAudit } from "@/services/auditLogService";

export interface ProductDependencyImpact {
  product: {
    id: string;
    name: string;
    price: number;
    isCombo: boolean;
    isAvailable: boolean;
    stock: number | null;
  };
  parentCombos: Array<{
    id: string;
    name: string;
    price: number;
    isAvailable: boolean;
    itemsCount: number;
    quantityInCombo: number;
  }>;
  promotions: Array<{
    id: string;
    title: string;
    discountType: string;
    discountValue: number;
    isActive: boolean;
    expiresAt: string | null;
  }>;
  coupons: Array<{
    id: string;
    code: string;
    isActive: boolean;
    productCount: number;
    willDeactivateIfRemoved: boolean;
  }>;
  addonGroups: Array<{
    id: string;
    name: string;
    itemsCount: number;
  }>;
  activeOrdersCount: number;
  historicalOrdersCount: number;
  totalOrdersCount: number;
  willSoftDelete: boolean;
}

export interface ProductSnapshotForImpact {
  id: string;
  name: string;
  price: number | { toNumber?: () => number } | unknown;
  isCombo?: boolean;
  isAvailable?: boolean;
  stock?: number | null;
}

export interface ReconcileProductEditResult {
  warnings: string[];
  pausedPromotions: Array<{ id: string; title: string }>;
  affectedCombos: Array<{ id: string; name: string }>;
  affectedPromotions: Array<{ id: string; title: string }>;
}

/**
 * Mapeia todas as dependências e impactos potenciais antes de editar ou excluir um produto/combo.
 */
export async function getProductDependencyImpact(
  productId: string
): Promise<ProductDependencyImpact | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      price: true,
      isCombo: true,
      isAvailable: true,
      stock: true,
      deletedAt: true,
    },
  });

  if (!product || product.deletedAt) {
    return null;
  }

  const [
    parentComboLinks,
    promotions,
    coupons,
    addonGroupLinks,
    activeOrdersCount,
    historicalOrdersCount,
  ] = await Promise.all([
    prisma.comboItem.findMany({
      where: {
        productId,
        combo: { deletedAt: null },
      },
      include: {
        combo: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            _count: { select: { comboItems: true } },
          },
        },
      },
    }),
    prisma.promotion.findMany({
      where: { productId },
      select: {
        id: true,
        title: true,
        discountType: true,
        discountValue: true,
        isActive: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.findMany({
      where: { productIds: { has: productId } },
      select: {
        id: true,
        code: true,
        isActive: true,
        productIds: true,
      },
    }),
    prisma.productAddonGroup.findMany({
      where: { productId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            _count: { select: { items: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.orderItem.count({
      where: {
        productId,
        order: {
          status: { in: ["pending", "accepted", "preparing", "ready", "delivering"] },
        },
      },
    }),
    prisma.orderItem.count({
      where: {
        productId,
        order: {
          status: { in: ["completed", "cancelled"] },
        },
      },
    }),
  ]);

  const combosById = new Map<
    string,
    {
      id: string;
      name: string;
      price: number;
      isAvailable: boolean;
      itemsCount: number;
      quantityInCombo: number;
    }
  >();

  for (const link of parentComboLinks) {
    if (!link.combo) continue;
    const existing = combosById.get(link.combo.id);
    if (existing) {
      existing.quantityInCombo += Math.max(1, link.quantity || 1);
    } else {
      combosById.set(link.combo.id, {
        id: link.combo.id,
        name: link.combo.name,
        price: Number(link.combo.price),
        isAvailable: Boolean(link.combo.isAvailable),
        itemsCount: link.combo._count?.comboItems ?? 1,
        quantityInCombo: Math.max(1, link.quantity || 1),
      });
    }
  }

  const totalOrdersCount = activeOrdersCount + historicalOrdersCount;

  return {
    product: {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      isCombo: Boolean(product.isCombo),
      isAvailable: Boolean(product.isAvailable),
      stock: product.stock ?? null,
    },
    parentCombos: Array.from(combosById.values()),
    promotions: promotions.map((pr) => ({
      id: pr.id,
      title: pr.title,
      discountType: pr.discountType,
      discountValue: Number(pr.discountValue),
      isActive: Boolean(pr.isActive),
      expiresAt: pr.expiresAt ? pr.expiresAt.toISOString() : null,
    })),
    coupons: coupons.map((c) => {
      const removal = ProductDependencyDomainService.evaluateCouponProductRemoval(
        c.productIds || [],
        productId
      );
      return {
        id: c.id,
        code: c.code,
        isActive: Boolean(c.isActive),
        productCount: (c.productIds || []).length,
        willDeactivateIfRemoved: removal.shouldDeactivate,
      };
    }),
    addonGroups: addonGroupLinks
      .filter((l) => Boolean(l.group))
      .map((l) => ({
        id: l.group.id,
        name: l.group.name,
        itemsCount: l.group._count?.items ?? 0,
      })),
    activeOrdersCount,
    historicalOrdersCount,
    totalOrdersCount,
    willSoftDelete: totalOrdersCount > 0,
  };
}

/**
 * Reconcilia automaticamente dependências após edição de preço, disponibilidade ou estoque:
 * - Pausa promoções com preço fixo que ficaram >= ao novo preço base
 * - Alerta quando combos ficam com soma dos itens <= preço do combo
 * - Informa quais combos/promoções foram protegidos na vitrine ao pausar ou zerar estoque
 */
export async function reconcileProductEditImpacts(params: {
  productId: string;
  previousProduct: ProductSnapshotForImpact;
  updatedProduct: ProductSnapshotForImpact;
  actor?: AdminAuditActor | null;
}): Promise<ReconcileProductEditResult> {
  const { productId, previousProduct, updatedProduct, actor } = params;
  const warnings: string[] = [];
  const pausedPromotions: Array<{ id: string; title: string }> = [];
  const affectedCombos: Array<{ id: string; name: string }> = [];
  const affectedPromotions: Array<{ id: string; title: string }> = [];

  const oldPrice = Number(previousProduct.price || 0);
  const newPrice = Number(updatedProduct.price || 0);
  const priceChanged = Math.abs(newPrice - oldPrice) > 0.001;

  if (priceChanged && !updatedProduct.isCombo) {
    const [activePromos, parentComboLinks] = await Promise.all([
      prisma.promotion.findMany({
        where: { productId, isActive: true },
        select: {
          id: true,
          title: true,
          discountType: true,
          discountValue: true,
          isActive: true,
        },
      }),
      prisma.comboItem.findMany({
        where: {
          productId,
          combo: { deletedAt: null },
        },
        include: {
          combo: {
            include: {
              comboItems: {
                include: {
                  product: {
                    select: { id: true, price: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const uniqueCombos = new Map<string, (typeof parentComboLinks)[number]["combo"]>();
    for (const link of parentComboLinks) {
      if (link.combo && !uniqueCombos.has(link.combo.id)) {
        uniqueCombos.set(link.combo.id, link.combo);
      }
    }

    const priceImpact = ProductDependencyDomainService.evaluatePriceEditImpacts({
      productName: updatedProduct.name,
      oldPrice,
      newPrice,
      activePromotions: activePromos.map((pr) => ({
        id: pr.id,
        title: pr.title,
        discountType: pr.discountType,
        discountValue: Number(pr.discountValue),
        isActive: Boolean(pr.isActive),
      })),
      parentCombos: Array.from(uniqueCombos.values()).map((combo) => ({
        id: combo.id,
        name: combo.name,
        price: Number(combo.price),
        isAvailable: Boolean(combo.isAvailable),
        deletedAt: combo.deletedAt,
        targetProductId: productId,
        items: (combo.comboItems || []).map((ci) => ({
          productId: ci.productId,
          quantity: ci.quantity,
          unitPrice: Number(ci.product?.price ?? 0),
        })),
      })),
    });

    warnings.push(...priceImpact.warnings);

    if (priceImpact.invalidatedFixedPromotions.length > 0) {
      const promoIdsToPause = priceImpact.invalidatedFixedPromotions.map((p) => p.id);
      await prisma.promotion.updateMany({
        where: { id: { in: promoIdsToPause } },
        data: { isActive: false },
      });

      for (const p of priceImpact.invalidatedFixedPromotions) {
        pausedPromotions.push({ id: p.id, title: p.title });
      }

      if (actor) {
        await recordAdminAudit({
          actor,
          action: "AUTO_PAUSE_INVALIDATED_PROMOTIONS",
          resourceType: "product",
          resourceId: productId,
          summary: `Pausou ${pausedPromotions.length} promoção(ões) de "${updatedProduct.name}" após ajuste de preço para R$ ${newPrice.toFixed(2)}.`,
          diffKeys: ["price", "promotions"],
          metadata: {
            oldPrice,
            newPrice,
            pausedPromotions: pausedPromotions.map((p) => p.id),
          },
        });
      }
    }
  }

  const wasAvailable =
    previousProduct.isAvailable !== false &&
    !(typeof previousProduct.stock === "number" && previousProduct.stock <= 0);
  const isNowUnavailable =
    updatedProduct.isAvailable === false ||
    (typeof updatedProduct.stock === "number" && updatedProduct.stock <= 0);

  if (wasAvailable && isNowUnavailable) {
    const [activeComboLinks, activePromos] = await Promise.all([
      prisma.comboItem.findMany({
        where: {
          productId,
          combo: { deletedAt: null, isAvailable: true },
        },
        include: {
          combo: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.promotion.findMany({
        where: { productId, isActive: true },
        select: { id: true, title: true },
      }),
    ]);

    const seenComboIds = new Set<string>();
    for (const link of activeComboLinks) {
      if (link.combo && !seenComboIds.has(link.combo.id)) {
        seenComboIds.add(link.combo.id);
        affectedCombos.push({ id: link.combo.id, name: link.combo.name });
      }
    }

    for (const promo of activePromos) {
      if (pausedPromotions.some((paused) => paused.id === promo.id)) continue;
      affectedPromotions.push({ id: promo.id, title: promo.title });
    }

    if (affectedCombos.length > 0) {
      warnings.push(
        `Os combo(s) ${affectedCombos.map((c) => `"${c.name}"`).join(", ")} foram protegidos na vitrine como esgotados enquanto "${updatedProduct.name}" estiver indisponível.`
      );
    }

    if (affectedPromotions.length > 0) {
      warnings.push(
        `A(s) promoção(ões) ${affectedPromotions.map((p) => `"${p.title}"`).join(", ")} foram ocultadas da vitrine até que "${updatedProduct.name}" volte a ficar disponível.`
      );
    }
  }

  return {
    warnings,
    pausedPromotions,
    affectedCombos,
    affectedPromotions,
  };
}
