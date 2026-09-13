export interface HighlightBannerData {
  id?: string;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
}

export const bannerService = {
  async getHighlightBanner(): Promise<HighlightBannerData> {
    const res = await fetch("/api/banner");
    if (!res.ok) {
      throw new Error("Erro ao buscar banner de destaque.");
    }
    return await res.json();
  },

  async updateHighlightBanner(data: Partial<HighlightBannerData>): Promise<HighlightBannerData> {
    const res = await fetch("/api/banner", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao atualizar o banner de destaque.");
    }

    return await res.json();
  },
};
