import { prisma } from "@/lib/prisma";

export type DeleteProductResult =
  | { status: "not_found" }
  | {
      status: "deleted";
      softDeleted: boolean;
      linkedOrdersCount: number;
      message: string;
    };

const SOFT_DELETE_SUCCESS_MESSAGE =
  "Produto removido do cardápio e do painel. Os registros em pedidos antigos foram preservados no histórico.";

async function softDeleteProductInTransaction(productId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.promotion.updateMany({
      where: { productId },
      data: { isActive: false },
    });
    await tx.productAddonGroup.deleteMany({
      where: { productId },
    });
    await tx.comboItem.deleteMany({
      where: {
        OR: [{ comboId: productId }, { productId }],
      },
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
  });
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

/**
 * Exclui o produto fisicamente quando não possui histórico em `order_items`,
 * ou aplica soft-delete transacional quando já houve pedidos vinculados,
 * removendo-o do cardápio e preservando o histórico financeiro/dos pedidos.
 */
export async function deleteOrSoftDeleteProduct(
  productId: string
): Promise<DeleteProductResult> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, deletedAt: true },
  });

  if (!existing || existing.deletedAt) {
    return { status: "not_found" };
  }

  const linkedOrdersCount = await prisma.orderItem.count({
    where: { productId },
  });

  if (linkedOrdersCount > 0) {
    await softDeleteProductInTransaction(productId);
    return {
      status: "deleted",
      softDeleted: true,
      linkedOrdersCount,
      message: SOFT_DELETE_SUCCESS_MESSAGE,
    };
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
    return {
      status: "deleted",
      softDeleted: false,
      linkedOrdersCount: 0,
      message: "Produto excluído com sucesso.",
    };
  } catch (error: unknown) {
    const code = getPrismaErrorCode(error);
    if (code === "P2025") {
      return { status: "not_found" };
    }
    if (code === "P2003") {
      await softDeleteProductInTransaction(productId);
      return {
        status: "deleted",
        softDeleted: true,
        linkedOrdersCount: 1,
        message: SOFT_DELETE_SUCCESS_MESSAGE,
      };
    }
    throw error;
  }
}
