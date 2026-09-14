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
}

export const badgeService = {
  async getBadges(): Promise<CardBadge[]> {
    const res = await fetch("/api/badges", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao listar selos.");
    }
    return await res.json();
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
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Erro ao criar selo.");
    return resData;
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
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Erro ao atualizar selo.");
    return resData;
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
