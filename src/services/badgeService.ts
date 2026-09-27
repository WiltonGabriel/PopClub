export interface BadgeProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
}

export interface CardBadge {
  id: string;
  text: string;
  icon?: string | null;
  bgColor: string;
  textColor: string;
  createdAt?: string;
  _count?: {
    products: number;
  };
  products?: BadgeProduct[];
}

export const badgeService = {
  async getBadges(): Promise<CardBadge[]> {
    try {
      const res = await fetch("/api/badges", {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return [];
      }
      return await res.json().catch(() => []);
    } catch {
      return [];
    }
  },

  async createBadge(data: {
    text: string;
    icon?: string;
    bgColor: string;
    textColor: string;
  }): Promise<CardBadge> {
    const res = await fetch("/api/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      throw new Error(resData.error || "Erro ao criar selo.");
    }
    return await res.json().catch(() => ({}));
  },

  async updateBadge(
    id: string,
    data: {
      text?: string;
      icon?: string;
      bgColor?: string;
      textColor?: string;
    }
  ): Promise<CardBadge> {
    const res = await fetch(`/api/badges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      throw new Error(resData.error || "Erro ao atualizar selo.");
    }
    return await res.json().catch(() => ({}));
  },

  async addProduct(badgeId: string, productId: string): Promise<CardBadge> {
    const res = await fetch(`/api/badges/${badgeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addProductId: productId }),
    });
    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      throw new Error(resData.error || "Erro ao vincular produto ao selo.");
    }
    return await res.json().catch(() => ({}));
  },

  async removeProduct(badgeId: string, productId: string): Promise<CardBadge> {
    const res = await fetch(`/api/badges/${badgeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeProductId: productId }),
    });
    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      throw new Error(resData.error || "Erro ao desvincular produto do selo.");
    }
    return await res.json().catch(() => ({}));
  },

  async deleteBadge(id: string): Promise<void> {
    const res = await fetch(`/api/badges/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const resData = await res.json().catch(() => ({}));
      throw new Error(resData.error || "Erro ao excluir selo.");
    }
  },
};
