export interface Category {
  id: string;
  name: string;
  slug?: string | null;
  order?: number;
  order_index?: number;
  isDynamic?: boolean;
  dynamicType?: string | null;
  isActive?: boolean;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const res = await fetch("/api/categories", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao listar categorias.");
    }
    const data = await res.json();
    return Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : Array.isArray(data?.data) ? data.data : [];
  },

  async createCategory(
    name: string,
    order: number = 0,
    isDynamic: boolean = false,
    dynamicType?: string | null,
    isActive: boolean = true
  ): Promise<Category> {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        order,
        order_index: order,
        isDynamic,
        dynamicType: dynamicType || null,
        isActive,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao criar categoria.");
    return data;
  },

  async updateCategory(id: string, updates: Partial<Omit<Category, "id">>): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar categoria.");
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao excluir categoria.");
    }
  },
};
