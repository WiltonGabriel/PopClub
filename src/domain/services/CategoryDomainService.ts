export const CATEGORY_MIN_PRODUCTS_LIMIT = 1;
export const CATEGORY_MAX_PRODUCTS_LIMIT = 20;
export const CATEGORY_DEFAULT_PRODUCTS_LIMIT = 20;
export const STOREFRONT_CATEGORY_PREVIEW_LIMIT = 7;

export type MaxProductsParseResult =
  | { valid: true; value: number }
  | { valid: false; error: string };

export interface StorefrontCategoryDisplayResult<T> {
  totalItems: number;
  visibleItems: T[];
  hiddenItems: T[];
  hasMore: boolean;
}

/**
 * Serviço de domínio puro para regras de capacidade de categorias
 * e fatiamento da vitrine (prévia vs. exibição completa).
 */
export class CategoryDomainService {
  /**
   * Valida e normaliza o limite máximo de produtos por categoria (1..20).
   */
  public static parseAndValidateMaxProducts(value: unknown): MaxProductsParseResult {
    if (value === undefined || value === null || value === "") {
      return { valid: true, value: CATEGORY_DEFAULT_PRODUCTS_LIMIT };
    }

    const parsed = Number(value);
    if (
      !Number.isFinite(parsed) ||
      !Number.isInteger(parsed) ||
      parsed < CATEGORY_MIN_PRODUCTS_LIMIT ||
      parsed > CATEGORY_MAX_PRODUCTS_LIMIT
    ) {
      return {
        valid: false,
        error: `O limite de produtos da categoria deve ser um número inteiro entre ${CATEGORY_MIN_PRODUCTS_LIMIT} e ${CATEGORY_MAX_PRODUCTS_LIMIT}.`,
      };
    }

    return { valid: true, value: parsed };
  }

  /**
   * Verifica se uma categoria manual ainda possui capacidade para vincular mais um produto.
   */
  public static canAssignProductToCategory(params: {
    currentActiveCount: number;
    maxProducts: number;
    isSameCategory?: boolean;
  }): boolean {
    if (params.isSameCategory) {
      return true;
    }

    const safeCap = Math.min(
      CATEGORY_MAX_PRODUCTS_LIMIT,
      Math.max(CATEGORY_MIN_PRODUCTS_LIMIT, Math.trunc(params.maxProducts || CATEGORY_DEFAULT_PRODUCTS_LIMIT))
    );
    return params.currentActiveCount < safeCap;
  }

  /**
   * Resolve quais produtos ficam visíveis e quais ficam ocultos para o card visual "Ver mais".
   * Para categorias dinâmicas, aplica também o teto configurado na categoria sem exibi-lo ao cliente.
   */
  public static resolveStorefrontCategoryDisplay<T>(params: {
    items: T[];
    maxProducts?: number | null;
    isDynamic?: boolean;
    isPreview: boolean;
    previewLimit?: number;
  }): StorefrontCategoryDisplayResult<T> {
    const { items, maxProducts, isDynamic, isPreview } = params;
    const effectivePreviewLimit =
      typeof params.previewLimit === "number" && params.previewLimit > 0
        ? Math.trunc(params.previewLimit)
        : STOREFRONT_CATEGORY_PREVIEW_LIMIT;

    let cappedItems = items;
    if (isDynamic) {
      const parsedLimit =
        typeof maxProducts === "number" && Number.isFinite(maxProducts)
          ? Math.trunc(maxProducts)
          : CATEGORY_DEFAULT_PRODUCTS_LIMIT;
      const effectiveCap = Math.min(
        CATEGORY_MAX_PRODUCTS_LIMIT,
        Math.max(CATEGORY_MIN_PRODUCTS_LIMIT, parsedLimit)
      );
      cappedItems = items.slice(0, effectiveCap);
    }

    if (!isPreview || cappedItems.length <= effectivePreviewLimit) {
      return {
        totalItems: cappedItems.length,
        visibleItems: cappedItems,
        hiddenItems: [],
        hasMore: false,
      };
    }

    return {
      totalItems: cappedItems.length,
      visibleItems: cappedItems.slice(0, effectivePreviewLimit),
      hiddenItems: cappedItems.slice(effectivePreviewLimit),
      hasMore: true,
    };
  }
}
