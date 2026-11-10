import type { Prisma } from "@prisma/client";

export interface RefundableOrderItem {
  productId: string;
  quantity: number;
  promotionId?: string | null;
  product?: { stock: number | null } | null;
}

export interface RefundableOrderContext {
  id: string;
  userId?: string | null;
  couponId?: string | null;
  items?: RefundableOrderItem[] | null;
}

/**
 * Restaura estoque físico, cotas promocionais de escassez e usos/redenções de cupom
 * dentro de uma transação Prisma aberta ao cancelar um pedido.
 */
export async function restoreOrderInventoryAndCoupons(
  tx: Prisma.TransactionClient,
  order: RefundableOrderContext
): Promise<void> {
  for (const it of order.items || []) {
    if (it.product && it.product.stock !== null) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      });
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
