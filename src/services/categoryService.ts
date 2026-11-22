export interface Category {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  order?: number;
  order_index?: number;
  isActive?: boolean;
  maxProducts?: number;
  isDynamic?: boolean;
  dynamicType?: string | null; // 'HIGHLIGHTS' | 'ACTIVE_PROMOTIONS' | 'COMBOS' | 'SHAREABLE' | 'TIME_BASED'
  timeStart?: string | null;   // "14:00"
  timeEnd?: string | null;     // "18:00"
  _count?: {
    products: number;
  };
  productCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const categoryService = {
  async getCategories(includeInactive: boolean = false): Promise<Category[]> {
    const url = includeInactive ? "/api/categories?includeInactive=true" : "/api/categories";
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao listar categorias.");
    }
    const data = await res.json();
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.categories)
      ? data.categories
      : Array.isArray(data?.data)
      ? data.data
      : [];

    return list.map((cat: Category) => ({
      ...cat,
      order: cat.order ?? cat.order_index ?? 0,
      maxProducts: cat.maxProducts ?? 20,
      productCount: cat._count?.products ?? cat.productCount ?? 0,
    }));
  },

  async createCategory(
    nameOrData: string | Partial<Category>,
    order: number = 0,
    isDynamic: boolean = false,
    dynamicType?: string | null,
    isActive: boolean = true,
    imageUrl?: string | null,
    description?: string | null,
    timeStart?: string | null,
    timeEnd?: string | null
  ): Promise<Category> {
    const payload =
      typeof nameOrData === "object"
        ? nameOrData
        : {
            name: nameOrData,
            order,
            order_index: order,
            isDynamic,
            dynamicType: dynamicType || null,
            isActive,
            imageUrl: imageUrl || null,
            description: description || null,
            timeStart: timeStart || null,
            timeEnd: timeEnd || null,
          };

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao criar categoria.");
    const result = data?.data || data;
    return {
      ...result,
      order: result.order ?? result.order_index ?? 0,
      maxProducts: result.maxProducts ?? 20,
      productCount: result._count?.products ?? result.productCount ?? 0,
    };
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar categoria.");
    const result = data?.data || data;
    return {
      ...result,
      order: result.order ?? result.order_index ?? 0,
      maxProducts: result.maxProducts ?? 20,
      productCount: result._count?.products ?? result.productCount ?? 0,
    };
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao excluir categoria.");
    }
  },

  async reorderCategories(items: { id: string; order: number }[]): Promise<Category[]> {
    const res = await fetch("/api/categories/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao reordenar categorias.");
    const list = Array.isArray(data?.categories)
      ? data.categories
      : Array.isArray(data)
      ? data
      : [];
    return list.map((cat: Category) => ({
      ...cat,
      order: cat.order ?? cat.order_index ?? 0,
      maxProducts: cat.maxProducts ?? 20,
      productCount: cat._count?.products ?? cat.productCount ?? 0,
    }));
  },

  async toggleCategoryStatus(id: string): Promise<Category> {
    const res = await fetch(`/api/categories/${id}/toggle-status`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao alternar status da categoria.");
    const result = data?.data || data;
    return {
      ...result,
      order: result.order ?? result.order_index ?? 0,
      maxProducts: result.maxProducts ?? 20,
      productCount: result._count?.products ?? result.productCount ?? 0,
    };
  },
};
