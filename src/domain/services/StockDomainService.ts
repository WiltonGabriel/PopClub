import { OutOfStockException, BatchDepletedException } from "@/domain/errors";

export interface ProductStockInfo {
  id: string;
  name: string;
  isAvailable: boolean;
  manageStock?: boolean;
  stockQuantity?: number | null;
  isCombo?: boolean;
}

export interface PromotionBatchInfo {
  id: string;
  title: string;
  isActive: boolean;
  stockQuantity?: number | null;
  scarcityUnits?: number | null;
  scarcityType?: string | null;
  productId?: string;
}

export class StockDomainService {
  /**
   * Valida a disponibilidade e o saldo de estoque físico de um produto.
   * Lança OutOfStockException com status e metadados contextuais se insuficiente.
   */
  public static verifyProductStock(product: ProductStockInfo, requestedQuantity: number): void {
    if (!product.isAvailable) {
      throw new OutOfStockException(
        product.name,
        0,
        requestedQuantity,
        product.id
      );
    }

    if (product.manageStock && product.stockQuantity !== null && product.stockQuantity !== undefined) {
      if (product.stockQuantity < requestedQuantity) {
        throw new OutOfStockException(
          product.name,
          product.stockQuantity,
          requestedQuantity,
          product.id
        );
      }
    }
  }

  /**
   * Valida o lote de uma promoção ativa (Modo Lote Real).
   * Lança BatchDepletedException caso a cota do lote promocional tenha esgotado.
   */
  public static verifyPromotionBatch(promotion: PromotionBatchInfo, requestedQuantity: number): void {
    if (!promotion.isActive) {
      throw new BatchDepletedException(
        promotion.title,
        0,
        requestedQuantity,
        promotion.id
      );
    }

    const effectiveUnits =
      promotion.scarcityUnits !== undefined && promotion.scarcityUnits !== null
        ? promotion.scarcityUnits
        : promotion.stockQuantity;

    const isRealBatch =
      promotion.scarcityType === "real" ||
      promotion.scarcityType === "real_batch" ||
      (effectiveUnits !== null && effectiveUnits !== undefined && promotion.scarcityType !== "strategic");

    if (isRealBatch && effectiveUnits !== null && effectiveUnits !== undefined) {
      if (effectiveUnits < requestedQuantity) {
        throw new BatchDepletedException(
          promotion.title,
          effectiveUnits,
          requestedQuantity,
          promotion.id
        );
      }
    }
  }

  /**
   * Verifica se o produto pertence ao domínio de estoque operacional comum
   * (produtos comuns individuais, isolados de combos e lotes promocionais).
   */
  public static isStandardInventoryProduct(product: { isCombo?: boolean; hasActivePromotion?: boolean }): boolean {
    return !product.isCombo && !product.hasActivePromotion;
  }
}
