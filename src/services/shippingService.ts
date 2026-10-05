import { calculateDistanceKm } from "@/lib/geo";

export { calculateDistanceKm };

export interface DeliveryQuoteParams {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  subtotal?: number;
  isPickup?: boolean;
}

export interface DeliveryQuoteResult {
  isDeliverable: boolean;
  distanceKm: number;
  maxRadiusKm: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold: number | null;
  amountToFreeShipping: number;
  isPickup?: boolean;
  storeCoordinates: {
    latitude: number;
    longitude: number;
  };
  customerCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  reason?: string;
}

export const shippingService = {
  /**
   * Cálculo matemático geodésico Haversine entre duas coordenadas (km)
   */
  calculateDistanceKm,

  /**
   * Consulta a cotação de frete e viabilidade geográfica junto à API de entrega
   */
  async getDeliveryQuote(params: DeliveryQuoteParams): Promise<DeliveryQuoteResult> {
    try {
      const res = await fetch("/api/delivery/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao calcular viabilidade de entrega.");
      }

      return await res.json();
    } catch (err: any) {
      console.warn("Aviso ao calcular frete via API, aplicando fallback local:", err);
      // Fallback seguro se a requisição falhar
      const storeLat = -15.6536;
      const storeLng = -56.1322;
      const maxRadius = 12;

      if (params.isPickup) {
        return {
          isDeliverable: true,
          distanceKm: 0,
          maxRadiusKm: maxRadius,
          deliveryFee: 0,
          isFreeDelivery: true,
          freeDeliveryThreshold: 60,
          amountToFreeShipping: 0,
          isPickup: true,
          storeCoordinates: { latitude: storeLat, longitude: storeLng },
        };
      }

      if (params.latitude && params.longitude) {
        const dist = calculateDistanceKm(storeLat, storeLng, params.latitude, params.longitude);
        const deliverable = dist <= maxRadius;
        const subtotal = params.subtotal || 0;
        const isFree = subtotal >= 60;
        return {
          isDeliverable: deliverable,
          distanceKm: Number(dist.toFixed(2)),
          maxRadiusKm: maxRadius,
          deliveryFee: deliverable ? (isFree ? 0 : 5) : 5,
          isFreeDelivery: isFree,
          freeDeliveryThreshold: 60,
          amountToFreeShipping: Math.max(0, 60 - subtotal),
          storeCoordinates: { latitude: storeLat, longitude: storeLng },
          customerCoordinates: { latitude: params.latitude, longitude: params.longitude },
          reason: deliverable ? undefined : "Endereço fora do raio de atendimento",
        };
      }

      return {
        isDeliverable: true,
        distanceKm: 0,
        maxRadiusKm: maxRadius,
        deliveryFee: 5,
        isFreeDelivery: false,
        freeDeliveryThreshold: 60,
        amountToFreeShipping: 60,
        storeCoordinates: { latitude: storeLat, longitude: storeLng },
      };
    }
  },
};
