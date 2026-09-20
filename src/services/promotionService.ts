import { productService } from "./productService";

export interface PromotionItemProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface PromotionItem {
  id: string;
  productId: string;
  quantity: number;
  product: PromotionItemProduct;
}

export interface Promotion {
  id: string;
  title: string;
  badge: string;
  description: string;
  bannerImageUrl: string;
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
  finalPrice?: number;
  items?: PromotionItem[];
}

export const promotionService = {
  async getActivePromotions(): Promise<Promotion[]> {
    const res = await fetch("/api/promotions", {
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
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar todas as promoções.");
    }
    return await res.json();
  },

  async getPromotionById(id: string): Promise<Promotion> {
    const res = await fetch(`/api/promotions/${id}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao carregar detalhes da promoção.");
    }
    return await res.json();
  },

  async createPromotion(
    promo: Omit<Promotion, "id" | "items"> & { items?: { productId: string; quantity: number }[] },
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
    updates: Partial<Omit<Promotion, "items">> & { items?: { productId: string; quantity: number }[] },
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
