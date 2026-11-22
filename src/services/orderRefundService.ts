import type { Prisma } from "@prisma/client";

export interface RefundableComboChild {
  productId: string;
  quantity: number;
  product?: { stock: number | null } | null;
}

export interface RefundableOrderItem {
  productId: string;
  quantity: number;
  promotionId?: string | null;
  product?: {
    stock: number | null;
    isCombo?: boolean;
    comboItems?: RefundableComboChild[] | null;
  } | null;
}

export interface RefundableOrderContext {
  id: string;
  userId?: string | null;
  couponId?: string | null;
  items?: RefundableOrderItem[] | null;
}

/**
 * Restaura estoque físico (de produtos diretos e filhos de combos),
 * cotas promocionais de escassez e usos/redenções de cupom
 * dentro de uma transação Prisma aberta ao cancelar um pedido.
 */
export async function restoreOrderInventoryAndCoupons(
  tx: Prisma.TransactionClient,
  order: RefundableOrderContext
): Promise<void> {
  const finiteStockRestoreMap = new Map<string, number>();

  for (const it of order.items || []) {
    if (it.product && it.product.stock !== null) {
      finiteStockRestoreMap.set(
        it.productId,
        (finiteStockRestoreMap.get(it.productId) || 0) + it.quantity
      );
    }

    if (it.product?.isCombo && Array.isArray(it.product.comboItems)) {
      for (const ci of it.product.comboItems) {
        if (ci.product && ci.product.stock !== null) {
          const childQty = Math.max(1, ci.quantity || 1) * it.quantity;
          finiteStockRestoreMap.set(
            ci.productId,
            (finiteStockRestoreMap.get(ci.productId) || 0) + childQty
          );
        }
      }
    }

    if (it.promotionId) {
      await tx.$executeRaw`
        UPDATE promotions
        SET scarcity_sold = GREATEST(0, scarcity_sold - ${it.quantity}),
            scarcity_units = scarcity_units + ${it.quantity}
        WHERE id = ${it.promotionId} AND scarcity_units IS NOT NULL
      `;
    }
  }

  for (const [productId, qtyToRestore] of finiteStockRestoreMap.entries()) {
    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: qtyToRestore } },
    });
  }

  if (order.couponId) {
    await tx.coupon.updateMany({
      where: { id: order.couponId, uses: { gt: 0 } },
      data: { uses: { decrement: 1 } },
    });

    await tx.couponRedemption.deleteMany({
      where: {
        couponId: order.couponId,
        OR: [
          { orderId: order.id },
          ...(order.userId ? [{ userId: order.userId }] : []),
        ],
      },
    });
  }
}
