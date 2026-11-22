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
  showDuration?: boolean;
  durationDisplay?: string[];
  showScarcity?: boolean;
  scarcityUnits?: number | null;
  scarcityType?: "strategic" | "real" | string;
  scarcityInitial?: number | null;
  scarcitySold?: number;
  showProgressBar?: boolean;
  urgencyType?: "date" | "day" | "session" | string;
  sessionMinutes?: number | null;
}

export interface ComboComponentUnavailableItem {
  productId: string;
  name: string;
  quantity: number;
  reason: "deleted" | "paused" | "out_of_stock";
  availableStock: number | null;
}

export interface ProductDependencyImpact {
  product: {
    id: string;
    name: string;
    price: number;
    isCombo: boolean;
    isAvailable: boolean;
    stock: number | null;
  };
  parentCombos: Array<{
    id: string;
    name: string;
    price: number;
    isAvailable: boolean;
    itemsCount: number;
    quantityInCombo: number;
  }>;
  promotions: Array<{
    id: string;
    title: string;
    discountType: string;
    discountValue: number;
    isActive: boolean;
    expiresAt: string | null;
  }>;
  coupons: Array<{
    id: string;
    code: string;
    isActive: boolean;
    productCount: number;
    willDeactivateIfRemoved: boolean;
  }>;
  addonGroups: Array<{
    id: string;
    name: string;
    itemsCount: number;
  }>;
  activeOrdersCount: number;
  historicalOrdersCount: number;
  totalOrdersCount: number;
  willSoftDelete: boolean;
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
  categoryIsActive?: boolean;
  imageUrl: string;
  stock?: number | null;
  isAvailable?: boolean;
  effectiveIsAvailable?: boolean;
  unavailableComponents?: ComboComponentUnavailableItem[];
  comboStockLimit?: number | null;
  impactWarnings?: string[];
  cardBadgeId?: string | null;
  cardBadge?: CardBadge | null;
  isCombo?: boolean;
  showScarcity?: boolean;
  scarcityType?: "strategic" | "real" | string;
  scarcityUnits?: number | null;
  scarcityInitial?: number | null;
  scarcitySold?: number;
  showProgressBar?: boolean;
  showDuration?: boolean;
  urgencyType?: "date" | "day" | "session" | string;
  expiresAt?: string | null;
  sessionMinutes?: number | null;
  comboItems?: {
    id?: string;
    productId: string;
    quantity: number;
    product?: Product;
  }[];
  addonGroupIds?: string[];
  addonGroups?: AddonGroup[];
  promotions?: ProductPromotion[];
  promotion?: ProductPromotion | null;
}

function mapProductPayload(item: Record<string, unknown>): Product {
  return {
    id: String(item.id),
    name: String(item.name || ""),
    description: String(item.description || ""),
    price: Number(item.price),
    originalPrice:
      item.originalPrice !== undefined && item.originalPrice !== null
        ? Number(item.originalPrice)
        : null,
    promotionalPrice:
      item.promotionalPrice !== undefined && item.promotionalPrice !== null
        ? Number(item.promotionalPrice)
        : null,
    startsAt: item.startsAt ? String(item.startsAt) : null,
    endsAt: item.endsAt ? String(item.endsAt) : null,
    isPromoActive: item.isPromoActive !== undefined ? Boolean(item.isPromoActive) : true,
    servesText: item.servesText ? String(item.servesText) : null,
    isHighlight: Boolean(item.isHighlight),
    category_id: (item.categoryId as string | undefined) || (item.category_id as string | undefined),
    categoryId: (item.categoryId as string | undefined) || (item.category_id as string | undefined),
    category: item.category as string | undefined,
    categoryIsActive: item.categoryIsActive !== undefined ? Boolean(item.categoryIsActive) : true,
    imageUrl: String(item.imageUrl || ""),
    stock: item.stock !== undefined ? (item.stock as number | null) : null,
    isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
    effectiveIsAvailable:
      item.effectiveIsAvailable !== undefined ? Boolean(item.effectiveIsAvailable) : undefined,
    unavailableComponents: Array.isArray(item.unavailableComponents)
      ? (item.unavailableComponents as ComboComponentUnavailableItem[])
      : [],
    comboStockLimit:
      item.comboStockLimit !== undefined && item.comboStockLimit !== null
        ? Number(item.comboStockLimit)
        : null,
    impactWarnings: Array.isArray(item.impactWarnings) ? (item.impactWarnings as string[]) : [],
    cardBadgeId: (item.cardBadgeId as string | null) || null,
    cardBadge: (item.cardBadge as Product["cardBadge"]) || null,
    isCombo: Boolean(item.isCombo),
    showScarcity: Boolean(item.showScarcity),
    scarcityType: (item.scarcityType as string) || "strategic",
    scarcityUnits:
      item.scarcityUnits !== undefined && item.scarcityUnits !== null
        ? Number(item.scarcityUnits)
        : null,
    scarcityInitial:
      item.scarcityInitial !== undefined && item.scarcityInitial !== null
        ? Number(item.scarcityInitial)
        : null,
    scarcitySold: Number(item.scarcitySold || 0),
    showProgressBar: Boolean(item.showProgressBar),
    showDuration: Boolean(item.showDuration),
    urgencyType: (item.urgencyType as string) || "date",
    expiresAt: item.expiresAt ? String(item.expiresAt) : null,
    sessionMinutes:
      item.sessionMinutes !== undefined && item.sessionMinutes !== null
        ? Number(item.sessionMinutes)
        : null,
    comboItems: (item.comboItems as Product["comboItems"]) || [],
    addonGroupIds: (item.addonGroupIds as string[]) || [],
    addonGroups: (item.addonGroups as Product["addonGroups"]) || [],
    promotions: (item.promotions as Product["promotions"]) || [],
    promotion: (item.promotion as ProductPromotion | null | undefined) ?? null,
  };
}

export const productService = {
  /**
   * Envia uma imagem para a rota de upload local (/api/upload)
   * e retorna a URL pública local relativa (/uploads/...)
   */
  async uploadImage(file: File, type: "product" | "banner" | "category" = "product"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erro no upload da imagem.");
    }

    return data.url;
  },

  async getProducts(): Promise<Product[]> {
    const res = await fetch("/api/products", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao carregar produtos.");
    }
    const data = await res.json().catch(() => []);
    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return rawList.map((item: Record<string, unknown>) => mapProductPayload(item));
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erro ao carregar detalhes do produto.");
    }
    return mapProductPayload(data as Record<string, unknown>);
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
        categoryId: product.category_id ?? product.categoryId,
        category: product.category,
        imageUrl: finalImageUrl,
        stock: product.stock,
        isAvailable: product.isAvailable,
        cardBadgeId: product.cardBadgeId || null,
        isCombo: product.isCombo || false,
        showScarcity: product.showScarcity || false,
        scarcityType: product.scarcityType || "strategic",
        scarcityUnits: product.scarcityUnits ?? null,
        scarcityInitial: product.scarcityInitial ?? null,
        scarcitySold: product.scarcitySold || 0,
        showProgressBar: product.showProgressBar || false,
        showDuration: product.showDuration || false,
        urgencyType: product.urgencyType || "date",
        expiresAt: product.expiresAt || null,
        sessionMinutes: product.sessionMinutes ?? null,
        comboItems: product.comboItems || [],
        addonGroupIds: product.addonGroupIds || [],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao cadastrar produto.");

    return mapProductPayload(data as Record<string, unknown>);
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
        categoryId: updates.category_id ?? updates.categoryId,
        category: updates.category,
        imageUrl: finalImageUrl,
        stock: updates.stock,
        isAvailable: updates.isAvailable,
        cardBadgeId: updates.cardBadgeId,
        isCombo: updates.isCombo,
        showScarcity: updates.showScarcity,
        scarcityType: updates.scarcityType,
        scarcityUnits: updates.scarcityUnits,
        scarcityInitial: updates.scarcityInitial,
        scarcitySold: updates.scarcitySold,
        showProgressBar: updates.showProgressBar,
        showDuration: updates.showDuration,
        urgencyType: updates.urgencyType,
        expiresAt: updates.expiresAt,
        sessionMinutes: updates.sessionMinutes,
        comboItems: updates.comboItems,
        addonGroupIds: updates.addonGroupIds,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar produto.");

    return mapProductPayload(data as Record<string, unknown>);
  },

  async getProductImpact(id: string): Promise<ProductDependencyImpact> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}/impact`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erro ao consultar dependências do produto.");
    }
    return data as ProductDependencyImpact;
  },

  async deleteProduct(id: string): Promise<{ message?: string; softDeleted?: boolean; impacts?: unknown }> {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erro ao deletar produto.");
    }
    return data;
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar estoque do produto.");

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      category_id: data.categoryId,
      categoryId: data.categoryId,
      category: data.category,
      imageUrl: data.imageUrl,
      stock: data.stock,
      isAvailable: data.isAvailable,
      impactWarnings: Array.isArray(data.impactWarnings) ? data.impactWarnings : [],
    };
  },
};
