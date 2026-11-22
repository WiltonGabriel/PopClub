import { prisma } from "@/lib/prisma";
import { ProductDependencyDomainService } from "@/domain/services/ProductDependencyDomainService";
import { AdminAuditActor, recordAdminAudit } from "@/services/auditLogService";

export interface ProductDeletionImpacts {
  pausedCombos: Array<{ id: string; name: string; remainingItemsCount: number }>;
  deactivatedPromotions: Array<{ id: string; title: string }>;
  updatedCoupons: Array<{ id: string; code: string; deactivated: boolean }>;
  unlinkedAddonGroupsCount: number;
}

export type DeleteProductResult =
  | { status: "not_found" }
  | {
      status: "deleted";
      softDeleted: boolean;
      linkedOrdersCount: number;
      impacts: ProductDeletionImpacts;
      message: string;
    };

function buildDeletionMessage(softDeleted: boolean, impacts: ProductDeletionImpacts): string {
  const details: string[] = [];
  if (impacts.pausedCombos.length > 0) {
    details.push(`${impacts.pausedCombos.length} combo(s) pausado(s)`);
  }
  if (impacts.deactivatedPromotions.length > 0) {
    details.push(`${impacts.deactivatedPromotions.length} promoção(ões) encerrada(s)`);
  }
  if (impacts.updatedCoupons.length > 0) {
    const deactivatedCoupons = impacts.updatedCoupons.filter((c) => c.deactivated).length;
    details.push(
      deactivatedCoupons > 0
        ? `${impacts.updatedCoupons.length} cupom(ns) atualizado(s) (${deactivatedCoupons} desativado(s))`
        : `${impacts.updatedCoupons.length} cupom(ns) atualizado(s)`
    );
  }

  const baseMsg = softDeleted
    ? "Produto removido do cardápio e do painel. Os registros em pedidos antigos foram preservados no histórico."
    : "Produto excluído com sucesso.";

  return details.length > 0 ? `${baseMsg} Dependências atualizadas: ${details.join(", ")}.` : baseMsg;
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyDependencyCascadeInTx(tx: any, productId: string): Promise<ProductDeletionImpacts> {
  const parentComboLinks =
    typeof tx.comboItem?.findMany === "function"
      ? await tx.comboItem.findMany({
          where: {
            productId,
            combo: { deletedAt: null },
          },
          include: {
            combo: {
              select: {
                id: true,
                name: true,
                isAvailable: true,
                _count: { select: { comboItems: true } },
              },
            },
          },
        })
      : [];

  const comboCounts = new Map<
    string,
    { id: string; name: string; wasAvailable: boolean; remainingItemsCount: number }
  >();
  for (const link of parentComboLinks) {
    if (!link?.combo) continue;
    const prev = comboCounts.get(link.combo.id);
    if (prev) {
      prev.remainingItemsCount = Math.max(0, prev.remainingItemsCount - 1);
    } else {
      comboCounts.set(link.combo.id, {
        id: link.combo.id,
        name: link.combo.name,
        wasAvailable: Boolean(link.combo.isAvailable),
        remainingItemsCount: Math.max(0, (link.combo._count?.comboItems ?? 1) - 1),
      });
    }
  }

  const pausedCombos: ProductDeletionImpacts["pausedCombos"] = [];
  const comboIdsToPause = Array.from(comboCounts.values())
    .filter((c) => c.wasAvailable)
    .map((c) => c.id);

  if (comboIdsToPause.length > 0 && typeof tx.product?.updateMany === "function") {
    await tx.product.updateMany({
      where: { id: { in: comboIdsToPause } },
      data: { isAvailable: false },
    });
  }
  for (const c of comboCounts.values()) {
    if (c.wasAvailable) {
      pausedCombos.push({
        id: c.id,
        name: c.name,
        remainingItemsCount: c.remainingItemsCount,
      });
    }
  }

  const activePromotions =
    typeof tx.promotion?.findMany === "function"
      ? await tx.promotion.findMany({
          where: { productId, isActive: true },
          select: { id: true, title: true },
        })
      : [];

  const deactivatedPromotions: ProductDeletionImpacts["deactivatedPromotions"] =
    activePromotions.map((p: { id: string; title: string }) => ({
      id: p.id,
      title: p.title,
    }));

  const affectedCoupons =
    typeof tx.coupon?.findMany === "function"
      ? await tx.coupon.findMany({
          where: { productIds: { has: productId } },
          select: { id: true, code: true, productIds: true },
        })
      : [];

  const updatedCoupons: ProductDeletionImpacts["updatedCoupons"] = [];
  for (const coupon of affectedCoupons) {
    const removal = ProductDependencyDomainService.evaluateCouponProductRemoval(
      coupon.productIds || [],
      productId
    );
    if (!removal.changed) continue;
    if (typeof tx.coupon?.update === "function") {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: {
          productIds: removal.nextProductIds,
          ...(removal.shouldDeactivate ? { isActive: false } : {}),
        },
      });
    }
    updatedCoupons.push({
      id: coupon.id,
      code: coupon.code,
      deactivated: removal.shouldDeactivate,
    });
  }

  const unlinkedGroupsResult =
    typeof tx.productAddonGroup?.deleteMany === "function"
      ? await tx.productAddonGroup.deleteMany({
          where: { productId },
        })
      : { count: 0 };

  if (typeof tx.comboItem?.deleteMany === "function") {
    await tx.comboItem.deleteMany({
      where: {
        OR: [{ comboId: productId }, { productId }],
      },
    });
  }

  return {
    pausedCombos,
    deactivatedPromotions,
    updatedCoupons,
    unlinkedAddonGroupsCount: Number(unlinkedGroupsResult?.count || 0),
  };
}

async function softDeleteProductInTransaction(
  productId: string
): Promise<ProductDeletionImpacts> {
  return prisma.$transaction(async (tx) => {
    const impacts = await applyDependencyCascadeInTx(tx, productId);

    await tx.promotion.updateMany({
      where: { productId },
      data: { isActive: false },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        isAvailable: false,
        isHighlight: false,
        categoryId: null,
        cardBadgeId: null,
      },
    });

    return impacts;
  });
}

async function hardDeleteProductInTransaction(
  productId: string
): Promise<ProductDeletionImpacts> {
  return prisma.$transaction(async (tx) => {
    const impacts = await applyDependencyCascadeInTx(tx, productId);
    await tx.product.delete({ where: { id: productId } });
    return impacts;
  });
}

/**
 * Exclui o produto fisicamente quando não possui histórico em `order_items`,
 * ou aplica soft-delete transacional quando já houve pedidos vinculados,
 * reconciliando combos pais, promoções, cupons e vínculos de complementos.
 */
export async function deleteOrSoftDeleteProduct(
  productId: string,
  actor?: AdminAuditActor | null
): Promise<DeleteProductResult> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, deletedAt: true },
  });

  if (!existing || existing.deletedAt) {
    return { status: "not_found" };
  }

  const linkedOrdersCount = await prisma.orderItem.count({
    where: { productId },
  });

  if (linkedOrdersCount > 0) {
    const impacts = await softDeleteProductInTransaction(productId);
    const message = buildDeletionMessage(true, impacts);
    if (actor) {
      await recordAdminAudit({
        actor,
        action: "SOFT_DELETE_PRODUCT",
        resourceType: "product",
        resourceId: productId,
        summary: `Arquivou produto "${existing.name || productId}" preservando ${linkedOrdersCount} pedido(s) no histórico.`,
        metadata: {
          softDeleted: true,
          linkedOrdersCount,
          pausedCombosCount: impacts.pausedCombos.length,
          deactivatedPromotionsCount: impacts.deactivatedPromotions.length,
          updatedCouponsCount: impacts.updatedCoupons.length,
        },
      });
    }
    return {
      status: "deleted",
      softDeleted: true,
      linkedOrdersCount,
      impacts,
      message,
    };
  }

  try {
    const impacts = await hardDeleteProductInTransaction(productId);
    const message = buildDeletionMessage(false, impacts);
    if (actor) {
      await recordAdminAudit({
        actor,
        action: "DELETE_PRODUCT",
        resourceType: "product",
        resourceId: productId,
        summary: `Excluiu produto "${existing.name || productId}" e reconciliou dependências do catálogo.`,
        metadata: {
          softDeleted: false,
          linkedOrdersCount: 0,
          pausedCombosCount: impacts.pausedCombos.length,
          deactivatedPromotionsCount: impacts.deactivatedPromotions.length,
          updatedCouponsCount: impacts.updatedCoupons.length,
        },
      });
    }
    return {
      status: "deleted",
      softDeleted: false,
      linkedOrdersCount: 0,
      impacts,
      message,
    };
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error);
    if (code === "P2025") {
      return { status: "not_found" };
    }
    if (code === "P2003") {
      const impacts = await softDeleteProductInTransaction(productId);
      const message = buildDeletionMessage(true, impacts);
      if (actor) {
        await recordAdminAudit({
          actor,
          action: "SOFT_DELETE_PRODUCT",
          resourceType: "product",
          resourceId: productId,
          summary: `Arquivou produto "${existing.name || productId}" via fallback referencial (P2003).`,
          metadata: {
            softDeleted: true,
            pausedCombosCount: impacts.pausedCombos.length,
            deactivatedPromotionsCount: impacts.deactivatedPromotions.length,
            updatedCouponsCount: impacts.updatedCoupons.length,
          },
        });
      }
      return {
        status: "deleted",
        softDeleted: true,
        linkedOrdersCount: 1,
        impacts,
        message,
      };
    }
    throw error;
  }
}
