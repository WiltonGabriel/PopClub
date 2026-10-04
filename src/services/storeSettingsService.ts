export interface BusinessHourDay {
  day: string;
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface OrderNotificationTemplates {
  pending?: string;
  preparing?: string;
  ready?: string;
  delivering?: string;
  completed?: string;
  support?: string;
}

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
  maxDeliveryRadiusKm?: number | null;
  businessHours?: BusinessHourDay[];
  openingHoursText?: string | null;
  orderNotificationTemplates?: OrderNotificationTemplates | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  supportPhone?: string | null;
  postSaleMessage?: string | null;
  supportMessage?: string | null;
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
        maxDeliveryRadiusKm: 10,
        businessHours: [
          { day: "monday", label: "Segunda-feira", isOpen: true, openTime: "13:00", closeTime: "22:00" },
          { day: "tuesday", label: "Terça-feira", isOpen: true, openTime: "13:00", closeTime: "22:00" },
          { day: "wednesday", label: "Quarta-feira", isOpen: true, openTime: "13:00", closeTime: "22:00" },
          { day: "thursday", label: "Quinta-feira", isOpen: true, openTime: "13:00", closeTime: "22:00" },
          { day: "friday", label: "Sexta-feira", isOpen: true, openTime: "13:00", closeTime: "23:00" },
          { day: "saturday", label: "Sábado", isOpen: true, openTime: "13:00", closeTime: "23:30" },
          { day: "sunday", label: "Domingo", isOpen: true, openTime: "13:00", closeTime: "23:00" },
        ],
        openingHoursText: "Terça a Domingo das 14h às 22h",
        orderNotificationTemplates: {
          pending: "Olá, {cliente}! Recebemos seu pedido #{codigo_pedido} no Pop Shake. Estamos preparando tudo com muito carinho! Total: {total} ({forma_pagamento}).",
          preparing: "Seu pedido #{codigo_pedido} já está na cozinha sendo preparado! Tempo estimado: {tempo_estimado}.",
          ready: "Oba, {cliente}! Seu pedido #{codigo_pedido} está prontinho na bancada aguardando saída.",
          delivering: "Seu pedido #{codigo_pedido} saiu para entrega! Acompanhe o motoboy em tempo real: {link_rastreamento}",
          completed: "Pedido #{codigo_pedido} entregue com sucesso! Obrigado pela preferência, {cliente}! 🍧 Avalie nosso atendimento e ganhe mimos!",
          support: "Olá, {cliente}! Precisa de ajuda com o pedido #{codigo_pedido}? Estamos à disposição pelo WhatsApp ou telefone da loja.",
        },
        instagramUrl: "https://instagram.com/popshake",
        facebookUrl: "",
        supportPhone: "5565999999999",
        postSaleMessage: "Obrigado pelo seu pedido no Pop Shake! Como foi sua experiência hoje? Avalie nosso atendimento e ganhe um cupom de desconto para o próximo pedido! 🍧",
        supportMessage: "Olá! Preciso de ajuda com meu pedido no Pop Shake.",
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
    maxDeliveryRadiusKm?: number | null;
    businessHours?: BusinessHourDay[];
    openingHoursText?: string | null;
    orderNotificationTemplates?: OrderNotificationTemplates | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    supportPhone?: string | null;
    postSaleMessage?: string | null;
    supportMessage?: string | null;
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
