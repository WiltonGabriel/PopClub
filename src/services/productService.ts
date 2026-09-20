import { CardBadge } from "./badgeService";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id?: string;
  category?: string;
  imageUrl: string;
  stock?: number | null;
  isAvailable?: boolean;
  cardBadgeId?: string | null;
  cardBadge?: CardBadge | null;
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

    return rawList.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      category_id: item.categoryId,
      category: item.category,
      imageUrl: item.imageUrl || "",
      stock: item.stock !== undefined ? item.stock : null,
      isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
      cardBadgeId: item.cardBadgeId || null,
      cardBadge: item.cardBadge || null,
    }));
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
        categoryId: product.category_id,
        category: product.category,
        imageUrl: finalImageUrl,
        stock: product.stock,
        isAvailable: product.isAvailable,
        cardBadgeId: product.cardBadgeId || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao cadastrar produto.");

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
      cardBadgeId: data.cardBadgeId,
      cardBadge: data.cardBadge,
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
        categoryId: updates.category_id,
        category: updates.category,
        imageUrl: finalImageUrl,
        stock: updates.stock,
        isAvailable: updates.isAvailable,
        cardBadgeId: updates.cardBadgeId,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar produto.");

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
      cardBadgeId: data.cardBadgeId,
      cardBadge: data.cardBadge,
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
