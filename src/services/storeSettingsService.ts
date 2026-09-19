export interface StoreSettings {
  id: string;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  whatsappNumber?: string | null;
  whatsappMessage?: string | null;
  isOpen: boolean;
  currentShiftId?: string | null;
  estimatedDeliveryTime: string;
  estimatedTimePresets?: string[];
  rejectionReasonPresets?: string[];
  storeLatitude?: number | null;
  storeLongitude?: number | null;
  storeAddress?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  updatedAt?: string;
}

export const storeSettingsService = {
  async getSettings(): Promise<StoreSettings> {
    try {
      const res = await fetch("/api/settings", {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        throw new Error("Falha ao carregar configurações da loja");
      }
      return await res.json();
    } catch (err) {
      console.error("Erro ao buscar storeSettings:", err);
      // Retorna fallback seguro se a rede falhar
      return {
        id: "store_config",
        deliveryFee: 5.0,
        freeDeliveryThreshold: 60.0,
        whatsappNumber: "5565999999999",
        whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.",
        isOpen: true,
        currentShiftId: null,
        estimatedDeliveryTime: "30-50 min",
        estimatedTimePresets: ["20-30 min", "35-50 min", "50-70 min"],
        rejectionReasonPresets: [
          "Ingrediente/item do cardápio indisponível no momento",
          "Endereço fora da área de entrega atendida",
          "Pico de demanda: cozinha sobrecarregada temporariamente",
          "Estabelecimento em processo de fechamento de turno",
        ],
        storeLatitude: -15.6536,
        storeLongitude: -56.1322,
        storeAddress: "Várzea Grande, MT",
      };
    }
  },

  async updateSettings(data: {
    deliveryFee?: number;
    freeDeliveryThreshold?: number | null;
    whatsappNumber?: string | null;
    whatsappMessage?: string | null;
    isOpen?: boolean;
    currentShiftId?: string | null;
    estimatedDeliveryTime?: string;
    estimatedTimePresets?: string[];
    rejectionReasonPresets?: string[];
    storeLatitude?: number | null;
    storeLongitude?: number | null;
    storeAddress?: string | null;
    openedAt?: string | null;
    closedAt?: string | null;
  }): Promise<StoreSettings> {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || "Erro ao salvar configurações da loja.");
    }
    return body.settings;
  },
};
