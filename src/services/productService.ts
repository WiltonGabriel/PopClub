import { CardBadge } from "./badgeService";
import { AddonGroup } from "./addonService";

export interface ProductPromotion {
  id: string;
  title: string;
  badge: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  promotionalPrice?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isPromoActive?: boolean;
  servesText?: string | null;
  isHighlight?: boolean;
  category_id?: string;
  categoryId?: string;
  category?: string;
  imageUrl: string;
  stock?: number | null;
  isAvailable?: boolean;
  cardBadgeId?: string | null;
  cardBadge?: CardBadge | null;
  isCombo?: boolean;
  comboItems?: {
    id?: string;
    productId: string;
    quantity: number;
    product?: Product;
  }[];
  addonGroupIds?: string[];
  addonGroups?: AddonGroup[];
  promotions?: ProductPromotion[];
}

export const productService = {
  /**
   * Envia uma imagem para a rota de upload local (/api/upload)
   * e retorna a URL pública local relativa (/uploads/...)
   */
  async uploadImage(file: File, type: "product" | "banner" = "product"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro no upload da imagem.");
    }

    return data.url;
  },

  async getProducts(): Promise<Product[]> {
    const res = await fetch("/api/products", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar produtos.");
    }
    const data = await res.json();
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return rawList.map((item: Record<string, unknown>) => ({
      id: String(item.id),
      name: String(item.name || ""),
      description: String(item.description || ""),
      price: Number(item.price),
      originalPrice: item.originalPrice !== undefined && item.originalPrice !== null ? Number(item.originalPrice) : null,
      promotionalPrice: item.promotionalPrice !== undefined && item.promotionalPrice !== null ? Number(item.promotionalPrice) : null,
      startsAt: item.startsAt ? String(item.startsAt) : null,
      endsAt: item.endsAt ? String(item.endsAt) : null,
      isPromoActive: item.isPromoActive !== undefined ? Boolean(item.isPromoActive) : true,
      servesText: item.servesText ? String(item.servesText) : null,
      isHighlight: Boolean(item.isHighlight),
      category_id: (item.categoryId as string) || (item.category_id as string),
      categoryId: (item.categoryId as string) || (item.category_id as string),
      category: item.category as string,
      imageUrl: String(item.imageUrl || ""),
      stock: item.stock !== undefined ? (item.stock as number | null) : null,
      isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
      cardBadgeId: (item.cardBadgeId as string | null) || null,
      cardBadge: (item.cardBadge as Product["cardBadge"]) || null,
      isCombo: Boolean(item.isCombo),
      comboItems: (item.comboItems as Product["comboItems"]) || [],
      addonGroupIds: (item.addonGroupIds as string[]) || [],
      addonGroups: (item.addonGroups as Product["addonGroups"]) || [],
      promotions: (item.promotions as Product["promotions"]) || [],
    }));
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar detalhes do produto.");
    }
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      price: Number(data.price),
      originalPrice: data.originalPrice !== undefined && data.originalPrice !== null ? Number(data.originalPrice) : null,
      promotionalPrice: data.promotionalPrice !== undefined && data.promotionalPrice !== null ? Number(data.promotionalPrice) : null,
      startsAt: data.startsAt ? String(data.startsAt) : null,
      endsAt: data.endsAt ? String(data.endsAt) : null,
      isPromoActive: data.isPromoActive !== undefined ? Boolean(data.isPromoActive) : true,
      servesText: data.servesText || null,
      isHighlight: Boolean(data.isHighlight),
      category_id: data.categoryId,
      category: data.category,
      imageUrl: data.imageUrl || "",
      stock: data.stock !== undefined ? data.stock : null,
      isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
      cardBadgeId: data.cardBadgeId || null,
      cardBadge: data.cardBadge || null,
      isCombo: data.isCombo || false,
      comboItems: data.comboItems || [],
      addonGroupIds: data.addonGroupIds || [],
      addonGroups: data.addonGroups || [],
      promotions: data.promotions || [],
    };
  },

  async createProduct(product: Omit<Product, "id">, imageFile?: File): Promise<Product> {
    let finalImageUrl = product.imageUrl;

    if (imageFile) {
      finalImageUrl = await this.uploadImage(imageFile);
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        promotionalPrice: product.promotionalPrice,
        startsAt: product.startsAt,
        endsAt: product.endsAt,
        isPromoActive: product.isPromoActive,
        servesText: product.servesText,
        isHighlight: product.isHighlight,
        categoryId: product.category_id,
        category: product.category,
        imageUrl: finalImageUrl,
        stock: product.stock,
        isAvailable: product.isAvailable,
        cardBadgeId: product.cardBadgeId || null,
        isCombo: product.isCombo || false,
        comboItems: product.comboItems || [],
        addonGroupIds: product.addonGroupIds || [],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao cadastrar produto.");

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
      promotionalPrice: data.promotionalPrice ? Number(data.promotionalPrice) : null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isPromoActive: data.isPromoActive,
      servesText: data.servesText,
      isHighlight: data.isHighlight,
      category_id: data.categoryId,
      category: data.category,
      imageUrl: data.imageUrl,
      stock: data.stock,
      isAvailable: data.isAvailable,
      cardBadgeId: data.cardBadgeId,
      cardBadge: data.cardBadge,
      isCombo: data.isCombo,
      comboItems: data.comboItems || [],
      addonGroupIds: data.addonGroupIds || [],
      addonGroups: data.addonGroups || [],
    };
  },

  async updateProduct(id: string, updates: Partial<Omit<Product, "id">>, imageFile?: File): Promise<Product> {
    let finalImageUrl = updates.imageUrl;

    if (imageFile) {
      finalImageUrl = await this.uploadImage(imageFile);
    }

    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        originalPrice: updates.originalPrice,
        promotionalPrice: updates.promotionalPrice,
        startsAt: updates.startsAt,
        endsAt: updates.endsAt,
        isPromoActive: updates.isPromoActive,
        servesText: updates.servesText,
        isHighlight: updates.isHighlight,
        categoryId: updates.category_id,
        category: updates.category,
        imageUrl: finalImageUrl,
        stock: updates.stock,
        isAvailable: updates.isAvailable,
        cardBadgeId: updates.cardBadgeId,
        isCombo: updates.isCombo,
        comboItems: updates.comboItems,
        addonGroupIds: updates.addonGroupIds,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar produto.");

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
      promotionalPrice: data.promotionalPrice ? Number(data.promotionalPrice) : null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isPromoActive: data.isPromoActive,
      servesText: data.servesText,
      isHighlight: data.isHighlight,
      category_id: data.categoryId,
      category: data.category,
      imageUrl: data.imageUrl,
      stock: data.stock,
      isAvailable: data.isAvailable,
      cardBadgeId: data.cardBadgeId,
      cardBadge: data.cardBadge,
      isCombo: data.isCombo,
      comboItems: data.comboItems || [],
      addonGroupIds: data.addonGroupIds || [],
      addonGroups: data.addonGroups || [],
    };
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao deletar produto.");
    }
  },

  async updateProductStock(
    id: string,
    updates: { stock?: number | null; isAvailable?: boolean }
  ): Promise<Product> {
    const res = await fetch(`/api/products/${id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar estoque do produto.");

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      category_id: data.categoryId,
      category: data.category,
      imageUrl: data.imageUrl,
      stock: data.stock,
      isAvailable: data.isAvailable,
    };
  },
};
