import { productService } from "./productService";



export type PromotionVisibilityStatus =
  | "active"
  | "paused"
  | "scheduled"
  | "expired"
  | "sold_out"
  | "product_unavailable";

export interface Promotion {
  id: string;
  title: string;
  badge: string;
  description: string | null;
  bannerImageUrl: string | null;
  gradientStart: string;
  gradientEnd: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  isActive: boolean;
  expiresAt?: string | null;
  showDuration?: boolean;
  durationDisplay?: string[];
  createdAt?: string;
  originalTotal?: number;
  discountAmount?: number;
  discountPercent?: number;
  finalPrice?: number;
  productName?: string | null;
  productPrice?: number;
  productImage?: string | null;
  promoPrice?: number;
  visibilityStatus?: PromotionVisibilityStatus;
  isVisiblePublicly?: boolean;
  visibilityLabel?: string;
  visibilityReason?: string;

  // Vínculo e Urgência
  productId?: string | null;
  product?: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    imageUrl: string | null;
    isAvailable?: boolean;
    isCombo?: boolean;
    addonGroupIds?: string[];
  };
  autoBanner?: boolean;
  showScarcity?: boolean;
  scarcityUnits?: number | null;
  scarcityType?: "strategic" | "real" | string;
  scarcityInitial?: number | null;
  scarcitySold?: number;
  showProgressBar?: boolean;
  urgencyType?: "date" | "day" | "session" | string;
  sessionMinutes?: number | null;
  startsAt?: string | null;
}

export const promotionService = {
  async getActivePromotions(): Promise<Promotion[]> {
    const res = await fetch("/api/promotions", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar promoções.");
    }
    return await res.json();
  },

  async getAllPromotions(): Promise<Promotion[]> {
    const res = await fetch("/api/promotions?all=true", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar todas as promoções.");
    }
    return await res.json();
  },

  async getPromotionById(id: string): Promise<Promotion> {
    const res = await fetch(`/api/promotions/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar detalhes da promoção.");
    }
    return await res.json();
  },

  async createPromotion(
    promo: Omit<Promotion, "id" | "product">,
    imageFile?: File
  ): Promise<Promotion> {
    let finalImageUrl = promo.bannerImageUrl;

    if (imageFile) {
      finalImageUrl = await productService.uploadImage(imageFile, "banner");
    }

    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...promo,
        bannerImageUrl: finalImageUrl,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao cadastrar promoção.");
    return data;
  },

  async updatePromotion(
    id: string,
    updates: Partial<Omit<Promotion, "id" | "product">>,
    imageFile?: File
  ): Promise<Promotion> {
    let finalImageUrl = updates.bannerImageUrl;

    if (imageFile) {
      finalImageUrl = await productService.uploadImage(imageFile, "banner");
    }

    const res = await fetch(`/api/promotions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...updates,
        bannerImageUrl: finalImageUrl,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar promoção.");
    return data;
  },

  async deletePromotion(id: string): Promise<void> {
    const res = await fetch(`/api/promotions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao excluir promoção.");
    }
  },
};
