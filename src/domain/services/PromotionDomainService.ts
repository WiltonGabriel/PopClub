/**
 * Serviço de Domínio para regras puras de Promoções e Banners da Vitrine.
 * Centraliza cálculo de preços promocionais, elegibilidade pública,
 * status de visibilidade para o admin e normalização de vigência temporal.
 */

export type PromotionDiscountType = "percentage" | "fixed" | string;

export type PromotionVisibilityStatus =
  | "active"
  | "paused"
  | "scheduled"
  | "expired"
  | "sold_out"
  | "product_unavailable";

export interface PromotionPricingResult {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  isPromotional: boolean;
}

export interface PromotionVisibilityCandidate {
  isActive: boolean;
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
  scarcityType?: string | null;
  scarcityUnits?: number | null;
  product?: {
    isAvailable?: boolean | null;
  } | null;
}

export interface PromotionVisibilityInfo {
  status: PromotionVisibilityStatus;
  isVisiblePublicly: boolean;
  label: string;
  reason: string;
}

export interface PromotionExpirationInput {
  showDuration: boolean;
  urgencyType?: string | null;
  expiresAt?: string | Date | null;
  sessionMinutes?: number | null;
}

const DEFAULT_SESSION_MINUTES = 60;

function roundCurrency(value: number): number {
  return Number(Math.max(0, value).toFixed(2));
}

export class PromotionDomainService {
  /**
   * Calcula o preço final e a economia de uma promoção sobre o preço base do produto.
   *
   * Regra canônica do catálogo Pop Shake:
   * - `percentage`: aplica desconto percentual (0 a 100%).
   * - `fixed`: quando `discountValue > 0 && discountValue < basePrice`, representa o
   *   **preço promocional fixo** (ex.: produto de R$ 50,00 por R$ 35,50).
   */
  public static calculatePromotionPricing(
    basePrice: number,
    discountType: PromotionDiscountType,
    discountValue: number
  ): PromotionPricingResult {
    const safeOriginal = Number.isFinite(basePrice) ? Math.max(0, basePrice) : 0;
    const rawValue = Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0;

    if (safeOriginal <= 0 || rawValue <= 0) {
      return {
        originalPrice: roundCurrency(safeOriginal),
        finalPrice: roundCurrency(safeOriginal),
        discountAmount: 0,
        discountPercent: 0,
        isPromotional: false,
      };
    }

    let finalPrice = safeOriginal;
    let discountPercent = 0;

    if (discountType === "percentage") {
      const pct = Math.min(100, Math.max(0, rawValue));
      finalPrice = roundCurrency(safeOriginal * (1 - pct / 100));
      discountPercent = Math.round(pct);
    } else if (rawValue < safeOriginal) {
      finalPrice = roundCurrency(rawValue);
      discountPercent = Math.round(((safeOriginal - finalPrice) / safeOriginal) * 100);
    }

    const discountAmount = roundCurrency(Math.max(0, safeOriginal - finalPrice));

    return {
      originalPrice: roundCurrency(safeOriginal),
      finalPrice,
      discountAmount,
      discountPercent,
      isPromotional: finalPrice < safeOriginal,
    };
  }

  /**
   * Determina o status detalhado de visibilidade pública de uma promoção/banner.
   */
  public static getPromotionVisibilityStatus(
    promo: PromotionVisibilityCandidate,
    now: Date = new Date()
  ): PromotionVisibilityInfo {
    if (!promo.isActive) {
      return {
        status: "paused",
        isVisiblePublicly: false,
        label: "Pausada",
        reason: "Promoção desativada manualmente (isActive = false).",
      };
    }

    if (promo.product && promo.product.isAvailable === false) {
      return {
        status: "product_unavailable",
        isVisiblePublicly: false,
        label: "Produto Pausado",
        reason: "O produto vinculado está indisponível no cardápio.",
      };
    }

    if (promo.startsAt) {
      const startDate = new Date(promo.startsAt);
      if (!Number.isNaN(startDate.getTime()) && startDate.getTime() > now.getTime()) {
        return {
          status: "scheduled",
          isVisiblePublicly: false,
          label: "Agendada",
          reason: `Inicia em ${startDate.toLocaleDateString("pt-BR")}.`,
        };
      }
    }

    if (promo.expiresAt) {
      const expiryDate = new Date(promo.expiresAt);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() <= now.getTime()) {
        return {
          status: "expired",
          isVisiblePublicly: false,
          label: "Expirada",
          reason: `Vencida em ${expiryDate.toLocaleDateString("pt-BR")}.`,
        };
      }
    }

    if (
      promo.scarcityType === "real" &&
      promo.scarcityUnits !== null &&
      promo.scarcityUnits !== undefined &&
      promo.scarcityUnits <= 0
    ) {
      return {
        status: "sold_out",
        isVisiblePublicly: false,
        label: "Lote Esgotado",
        reason: "Todas as unidades do lote promocional real foram vendidas.",
      };
    }

    return {
      status: "active",
      isVisiblePublicly: true,
      label: "Ativa na Loja",
      reason: "Visível para todos os clientes na vitrine.",
    };
  }

  /**
   * Verifica de forma booleana se a promoção pode ser exibida para clientes públicos.
   */
  public static isPromotionPubliclyVisible(
    promo: PromotionVisibilityCandidate,
    now: Date = new Date()
  ): boolean {
    return this.getPromotionVisibilityStatus(promo, now).isVisiblePublicly;
  }

  /**
   * Normaliza a data de expiração conforme o modo de duração escolhido.
   * Quando `showDuration` está desativado, sempre retorna `null` (oferta contínua).
   */
  public static normalizePromotionExpiration(
    input: PromotionExpirationInput,
    now: Date = new Date()
  ): Date | null {
    if (!input.showDuration) {
      return null;
    }

    const type = input.urgencyType || "date";

    if (type === "day") {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    }

    if (type === "session") {
      const parsedMins = Number(input.sessionMinutes);
      const safeMins =
        Number.isFinite(parsedMins) && parsedMins > 0
          ? Math.min(24 * 60, Math.round(parsedMins))
          : DEFAULT_SESSION_MINUTES;
      return new Date(now.getTime() + safeMins * 60 * 1000);
    }

    if (!input.expiresAt) {
      return null;
    }

    const parsedDate = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  /**
   * Constrói os selos de exibição temporal/escassez usados pelos cards do carrossel.
   */
  public static buildDurationDisplay(params: {
    showDuration: boolean;
    showScarcity: boolean;
    urgencyType?: string | null;
  }): string[] {
    const tags: string[] = [];
    if (params.showDuration) {
      tags.push(
        params.urgencyType === "date"
          ? "Data e Hora Limite Claras"
          : "Cronômetro Regressivo"
      );
    }
    if (params.showScarcity) {
      tags.push("Contador de Estoque Limitado");
    }
    return tags;
  }
}
