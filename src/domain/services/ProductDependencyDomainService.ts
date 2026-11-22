export type ComboComponentUnavailableReason = "deleted" | "paused" | "out_of_stock";

export interface ComboComponentStatus {
  productId: string;
  name: string;
  quantity: number;
  reason: ComboComponentUnavailableReason;
  availableStock: number | null;
}

export interface ComboAvailabilityInput {
  isCombo?: boolean;
  isAvailable?: boolean;
  stock?: number | null;
  comboItems?: Array<{
    productId: string;
    quantity: number;
    product?: {
      id?: string;
      name: string;
      isAvailable?: boolean | null;
      stock?: number | null;
      deletedAt?: Date | string | null;
    } | null;
  }>;
}

export interface ComboAvailabilityResult {
  effectiveIsAvailable: boolean;
  hasMissingItems: boolean;
  unavailableComponents: ComboComponentStatus[];
  maxBuildableUnits: number | null;
}

export interface PriceEditPromotionCandidate {
  id: string;
  title: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
}

export interface PriceEditParentComboCandidate {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  deletedAt?: Date | string | null;
  targetProductId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface PriceEditImpactsResult {
  invalidatedFixedPromotions: Array<{
    id: string;
    title: string;
    discountValue: number;
  }>;
  invertedPriceCombos: Array<{
    id: string;
    name: string;
    comboPrice: number;
    newOriginalTotal: number;
  }>;
  warnings: string[];
}

export interface CouponProductRemovalResult {
  changed: boolean;
  nextProductIds: string[];
  shouldDeactivate: boolean;
}

export class ProductDependencyDomainService {
  /**
   * Avalia a disponibilidade efetiva e capacidade máxima de montagem de um produto/combo,
   * considerando disponibilidade manual, estoque próprio, itens vazios e componentes filhos.
   */
  public static evaluateComboAvailability(combo: ComboAvailabilityInput): ComboAvailabilityResult {
    const ownStockFinite =
      typeof combo.stock === "number" && Number.isFinite(combo.stock) ? Math.max(0, combo.stock) : null;
    const ownAvailable = combo.isAvailable !== false && (ownStockFinite === null || ownStockFinite > 0);

    if (!combo.isCombo) {
      return {
        effectiveIsAvailable: ownAvailable,
        hasMissingItems: false,
        unavailableComponents: [],
        maxBuildableUnits: ownStockFinite,
      };
    }

    const items = combo.comboItems || [];
    const hasMissingItems = items.length === 0;
    const unavailableComponents: ComboComponentStatus[] = [];
    let minChildBuildable: number | null = null;

    for (const ci of items) {
      const reqQty = Math.max(1, Math.trunc(Number(ci.quantity) || 1));

      if (ci.product === null || Boolean(ci.product?.deletedAt)) {
        unavailableComponents.push({
          productId: ci.productId,
          name: ci.product?.name || "Produto removido",
          quantity: reqQty,
          reason: "deleted",
          availableStock: 0,
        });
        minChildBuildable = 0;
        continue;
      }

      if (!ci.product) {
        continue;
      }

      if (ci.product.isAvailable === false) {
        unavailableComponents.push({
          productId: ci.productId,
          name: ci.product.name,
          quantity: reqQty,
          reason: "paused",
          availableStock:
            typeof ci.product.stock === "number" && Number.isFinite(ci.product.stock)
              ? Math.max(0, ci.product.stock)
              : null,
        });
        continue;
      }

      if (typeof ci.product.stock === "number" && Number.isFinite(ci.product.stock)) {
        const safeStock = Math.max(0, ci.product.stock);
        const buildable = Math.floor(safeStock / reqQty);
        minChildBuildable =
          minChildBuildable === null ? buildable : Math.min(minChildBuildable, buildable);

        if (safeStock < reqQty) {
          unavailableComponents.push({
            productId: ci.productId,
            name: ci.product.name,
            quantity: reqQty,
            reason: "out_of_stock",
            availableStock: safeStock,
          });
        }
      }
    }

    let maxBuildableUnits: number | null = minChildBuildable;
    if (ownStockFinite !== null) {
      maxBuildableUnits =
        maxBuildableUnits === null ? ownStockFinite : Math.min(maxBuildableUnits, ownStockFinite);
    }

    const effectiveIsAvailable =
      ownAvailable && !hasMissingItems && unavailableComponents.length === 0;

    return {
      effectiveIsAvailable,
      hasMissingItems,
      unavailableComponents,
      maxBuildableUnits,
    };
  }

  /**
   * Detecta promoções com preço fixo que ficaram iguais ou maiores ao novo preço base
   * e combos cuja soma dos itens ficou menor ou igual ao preço do combo após alteração de preço.
   */
  public static evaluatePriceEditImpacts(params: {
    productName: string;
    oldPrice: number;
    newPrice: number;
    activePromotions: PriceEditPromotionCandidate[];
    parentCombos: PriceEditParentComboCandidate[];
  }): PriceEditImpactsResult {
    const { productName, newPrice, activePromotions, parentCombos } = params;
    const safeNewPrice = Number.isFinite(newPrice) ? Math.max(0, newPrice) : 0;

    const invalidatedFixedPromotions: PriceEditImpactsResult["invalidatedFixedPromotions"] = [];
    const invertedPriceCombos: PriceEditImpactsResult["invertedPriceCombos"] = [];
    const warnings: string[] = [];

    for (const promo of activePromotions) {
      if (!promo.isActive || promo.discountType !== "fixed") continue;
      const fixedPromoPrice = Number(promo.discountValue || 0);
      if (fixedPromoPrice >= safeNewPrice) {
        invalidatedFixedPromotions.push({
          id: promo.id,
          title: promo.title,
          discountValue: fixedPromoPrice,
        });
        warnings.push(
          `Promoção "${promo.title}" foi pausada automaticamente porque seu preço fixo (R$ ${fixedPromoPrice
            .toFixed(2)
            .replace(".", ",")}) deixou de ser menor que o novo preço de "${productName}" (R$ ${safeNewPrice
            .toFixed(2)
            .replace(".", ",")}).`
        );
      }
    }

    for (const combo of parentCombos) {
      if (combo.deletedAt || combo.isAvailable === false) continue;
      const newOriginalTotal = Number(
        combo.items
          .reduce((sum, item) => {
            const unitPrice =
              item.productId === combo.targetProductId ? safeNewPrice : Number(item.unitPrice || 0);
            return sum + Math.max(0, unitPrice) * Math.max(1, item.quantity || 1);
          }, 0)
          .toFixed(2)
      );

      const comboPrice = Number(combo.price || 0);
      if (newOriginalTotal > 0 && newOriginalTotal <= comboPrice) {
        invertedPriceCombos.push({
          id: combo.id,
          name: combo.name,
          comboPrice,
          newOriginalTotal,
        });
        warnings.push(
          `Atenção ao Combo "${combo.name}": a soma avulsa dos itens (R$ ${newOriginalTotal
            .toFixed(2)
            .replace(".", ",")}) ficou igual ou menor que o preço do combo (R$ ${comboPrice
            .toFixed(2)
            .replace(".", ",")}). Revise o preço do combo.`
        );
      }
    }

    return {
      invalidatedFixedPromotions,
      invertedPriceCombos,
      warnings,
    };
  }

  /**
   * Ao remover um produto de um cupom restrito a produtos específicos,
   * desativa o cupom caso ele ficasse com lista vazia (evita virar cupom global indevidamente).
   */
  public static evaluateCouponProductRemoval(
    couponProductIds: string[],
    removedProductId: string
  ): CouponProductRemovalResult {
    const normalized = Array.isArray(couponProductIds) ? couponProductIds : [];
    if (!normalized.includes(removedProductId)) {
      return {
        changed: false,
        nextProductIds: normalized,
        shouldDeactivate: false,
      };
    }

    const nextProductIds = normalized.filter((id) => id !== removedProductId);
    const shouldDeactivate = normalized.length > 0 && nextProductIds.length === 0;

    return {
      changed: true,
      nextProductIds,
      shouldDeactivate,
    };
  }
}
