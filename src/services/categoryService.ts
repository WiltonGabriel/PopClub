export interface Category {
  id: string;
  name: string;
  slug?: string | null;
  order_index?: number;
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
    return await res.json();
  },

  async createCategory(name: string, orderIndex: number = 0): Promise<Category> {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, order_index: orderIndex }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao criar categoria.");
    return data;
  },

  async updateCategory(id: string, updates: Partial<Omit<Category, "id">>): Promise<Category> {
    // Caso de edição futura
    return { id, name: updates.name || "", ...updates };
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
