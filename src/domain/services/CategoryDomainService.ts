import { PromotionDomainService } from "./PromotionDomainService";

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

export interface DynamicCategoryRuleCandidate {
  id: string;
  name: string;
  isActive?: boolean | null;
  isDynamic?: boolean | null;
  dynamicType?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  maxProducts?: number | null;
}

export interface DynamicProductPromotionCandidate {
  id?: string;
  discountType?: string;
  discountValue?: number | string | null;
  isActive?: boolean | null;
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
  scarcityType?: string | null;
  scarcityUnits?: number | null;
}

export interface DynamicProductRuleCandidate {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
  servesText?: string | null;
  isHighlight?: boolean | null;
  isCombo?: boolean | null;
  isAvailable?: boolean | null;
  stock?: number | null;
  categoryId?: string | null;
  category_id?: string | null;
  category?: string | null;
  categoryIsActive?: boolean | null;
  comboItems?: unknown[] | null;
  promotion?: DynamicProductPromotionCandidate | null;
  promotions?: DynamicProductPromotionCandidate[] | null;
  originalPrice?: number | string | null;
  promotionalPrice?: number | string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  isPromoActive?: boolean | null;
}

const SHAREABLE_SINGLE_PERSON_REGEX = /\b(?:serve\s+)?1\s*pessoa\b/i;
const SHAREABLE_RANGE_FROM_ONE_REGEX = /\b1\s*(?:a|at[ée]|-)\s*[2-9]\b/i;
const SHAREABLE_SERVES_REGEX =
  /(?:\b(?:[2-9]|[1-9]\d+)\s*(?:pessoas?|adultos?)|\b(?:1\s*(?:a|at[ée]|-)\s*[2-9]|dois|duas|tr[êe]s|quatro|cinco|seis|fam[ií]lia|compartilhar|casal|galera)\b)/i;
const SHAREABLE_TEXT_REGEX =
  /\b(?:dupla|trio|casal|fam[ií]lia|compartilhar|barca|roleta|balde|1\s*litro|2\s*litros)\b/i;

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

  /**
   * Verifica se uma categoria por janela de horário (TIME_BASED) está ativa no instante informado.
   * Suporta janelas dentro do mesmo dia (ex.: 14:00-18:00) e que viram a meia-noite (ex.: 22:00-02:00).
   */
  public static isTimeWindowActive(
    cat: Pick<DynamicCategoryRuleCandidate, "isDynamic" | "dynamicType" | "timeStart" | "timeEnd">,
    now: Date = new Date()
  ): boolean {
    if (!cat.isDynamic || cat.dynamicType !== "TIME_BASED" || !cat.timeStart || !cat.timeEnd) {
      return true;
    }

    const startParts = cat.timeStart.split(":").map(Number);
    const endParts = cat.timeEnd.split(":").map(Number);
    if (
      startParts.length < 2 ||
      endParts.length < 2 ||
      Number.isNaN(startParts[0]) ||
      Number.isNaN(startParts[1]) ||
      Number.isNaN(endParts[0]) ||
      Number.isNaN(endParts[1])
    ) {
      return true;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  /**
   * Determina se o produto é compartilhável (2+ pessoas) sem falso positivo em volumes como 250ml/500ml.
   */
  public static isProductShareable(
    product: Pick<DynamicProductRuleCandidate, "servesText" | "name" | "description">
  ): boolean {
    const serves = (product.servesText || "").trim();
    if (serves) {
      if (SHAREABLE_SERVES_REGEX.test(serves)) {
        return true;
      }
      if (SHAREABLE_SINGLE_PERSON_REGEX.test(serves) && !SHAREABLE_RANGE_FROM_ONE_REGEX.test(serves)) {
        return false;
      }
    }

    const combinedText = `${product.name || ""} ${product.description || ""}`;
    return SHAREABLE_TEXT_REGEX.test(combinedText);
  }

  /**
   * Verifica se o produto possui uma promoção pública vigente (não expirada, não agendada e com lote disponível).
   */
  public static hasPublicActivePromotion(
    product: Pick<
      DynamicProductRuleCandidate,
      | "price"
      | "isAvailable"
      | "stock"
      | "promotion"
      | "promotions"
      | "promotionalPrice"
      | "startsAt"
      | "endsAt"
      | "isPromoActive"
    >,
    now: Date = new Date()
  ): boolean {
    const basePrice = Number(product.price || 0);
    const candidates: DynamicProductPromotionCandidate[] = [];
    if (Array.isArray(product.promotions)) {
      candidates.push(...product.promotions);
    }
    if (product.promotion) {
      candidates.push(product.promotion);
    }

    const productVisibilityInput = {
      isAvailable: product.isAvailable ?? true,
      stock: product.stock ?? null,
    };

    for (const promo of candidates) {
      const visible = PromotionDomainService.isPromotionPubliclyVisible(
        {
          isActive: promo.isActive !== false,
          startsAt: promo.startsAt ?? null,
          expiresAt: promo.expiresAt ?? null,
          scarcityType: promo.scarcityType ?? null,
          scarcityUnits: promo.scarcityUnits ?? null,
          product: productVisibilityInput,
        },
        now
      );
      if (!visible) continue;

      if (basePrice <= 0) return true;

      const pricing = PromotionDomainService.calculatePromotionPricing(
        basePrice,
        promo.discountType || "percentage",
        Number(promo.discountValue || 0)
      );
      if (pricing.isPromotional) {
        return true;
      }
    }

    // Fallback legado caso produto possua promotionalPrice direto
    const legacyPromo =
      product.promotionalPrice !== null && product.promotionalPrice !== undefined
        ? Number(product.promotionalPrice)
        : null;
    if (legacyPromo !== null && !Number.isNaN(legacyPromo) && product.isPromoActive !== false && basePrice > 0) {
      const start = product.startsAt ? new Date(product.startsAt) : null;
      const end = product.endsAt ? new Date(product.endsAt) : null;
      const afterStart = !start || now >= start;
      const beforeEnd = !end || now <= end;
      if (afterStart && beforeEnd && legacyPromo < basePrice) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve os produtos exibidos em uma categoria manual ou em qualquer uma das 5 regras dinâmicas.
   */
  public static filterProductsForCategory<T extends DynamicProductRuleCandidate>(
    cat: Pick<DynamicCategoryRuleCandidate, "id" | "name" | "isDynamic" | "dynamicType">,
    productsList: T[],
    now: Date = new Date()
  ): T[] {
    const matchesDirectCategory = (p: T) =>
      p.category_id === cat.id ||
      p.categoryId === cat.id ||
      p.category === cat.name;

    if (!cat.isDynamic) {
      return productsList.filter(matchesDirectCategory);
    }

    const activeCatProds = productsList.filter((p) => p.categoryIsActive !== false);

    switch (cat.dynamicType) {
      case "HIGHLIGHTS":
        return activeCatProds.filter(
          (p) =>
            matchesDirectCategory(p) ||
            Boolean(p.isHighlight) ||
            this.hasPublicActivePromotion(p, now)
        );

      case "ACTIVE_PROMOTIONS":
        return activeCatProds.filter((p) => this.hasPublicActivePromotion(p, now));

      case "COMBOS":
        return activeCatProds.filter(
          (p) => Boolean(p.isCombo) || (Array.isArray(p.comboItems) && p.comboItems.length > 0)
        );

      case "SHAREABLE":
        return activeCatProds.filter((p) => this.isProductShareable(p));

      case "TIME_BASED":
        return productsList.filter(matchesDirectCategory);

      default:
        return activeCatProds.filter(
          (p) => matchesDirectCategory(p) || Boolean(p.isHighlight)
        );
    }
  }

  /**
   * Resolve a categoria inicial do modal de criação/edição de produto:
   * 1) Modo edição preserva a categoria vinculada (por ID ou nome case-insensitive);
   * 2) Modo criação usa a categoria contextual pré-selecionada se for manual ou TIME_BASED;
   * 3) Caso contrário, seleciona a primeira categoria manual disponível.
   */
  public static resolveInitialProductCategoryId(params: {
    categories: Array<Pick<DynamicCategoryRuleCandidate, "id" | "name" | "isDynamic" | "dynamicType">>;
    existingCategoryId?: string | null;
    existingCategoryName?: string | null;
    preferredCategoryId?: string | null;
  }): string {
    const { categories, existingCategoryId, existingCategoryName, preferredCategoryId } = params;
    const normalizedExistingName = existingCategoryName?.trim().toLowerCase() || "";

    if (existingCategoryId || normalizedExistingName) {
      const found = categories.find(
        (c) =>
          (existingCategoryId && c.id === existingCategoryId) ||
          (normalizedExistingName &&
            (c.name.trim().toLowerCase() === normalizedExistingName || c.id === existingCategoryName))
      );
      return found?.id || existingCategoryId || "";
    }

    if (preferredCategoryId) {
      const preferred = categories.find((c) => c.id === preferredCategoryId);
      if (preferred && (!preferred.isDynamic || preferred.dynamicType === "TIME_BASED")) {
        return preferred.id;
      }
    }

    const firstManual = categories.find((c) => !c.isDynamic);
    return firstManual?.id || categories[0]?.id || "";
  }
}
