import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateHaversineDistanceKm, calculateBearing } from "@/lib/geo";
import { shippingService } from "@/services/shippingService";

describe("Geolocalização e Frete (geo.ts)", () => {
  it("calcula a distância geodésica entre dois pontos com precisão Haversine", () => {
    // Coordenadas aproximadas: Pop Shake Sorveteria (Várzea Grande) e Praça Alencastro (Cuiabá)
    const vgLat = -15.6536;
    const vgLng = -56.1322;
    const cuiabaLat = -15.5961;
    const cuiabaLng = -56.0967;

    const distance = calculateHaversineDistanceKm(vgLat, vgLng, cuiabaLat, cuiabaLng);

    // Distância real em linha reta entre esses pontos é aproximadamente 7.4 km
    expect(distance).toBeGreaterThan(6.5);
    expect(distance).toBeLessThan(8.5);
  });

  it("retorna distância 0 para coordenadas idênticas", () => {
    expect(calculateHaversineDistanceKm(-15.6536, -56.1322, -15.6536, -56.1322)).toBe(0);
  });

  it("calcula o bearing (ângulo de deslocamento) entre dois pontos", () => {
    const bearing = calculateBearing(-15.6536, -56.1322, -15.5961, -56.0967);
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThanOrEqual(360);
  });
});

describe("shippingService (Cotação de Frete e Regras de Entrega)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retorna taxa zero e entrega viável para retirada na loja (isPickup)", async () => {
    const quote = await shippingService.getDeliveryQuote({
      isPickup: true,
      subtotal: 30,
    });

    expect(quote.isDeliverable).toBe(true);
    expect(quote.deliveryFee).toBe(0);
    expect(quote.isFreeDelivery).toBe(true);
    expect(quote.distanceKm).toBe(0);
    expect(quote.isPickup).toBe(true);
  });

  it("retorna dados da API quando /api/delivery/calculate responde com sucesso", async () => {
    const mockApiResponse = {
      isDeliverable: true,
      distanceKm: 4.5,
      maxRadiusKm: 12,
      deliveryFee: 5.0,
      isFreeDelivery: false,
      freeDeliveryThreshold: 60,
      amountToFreeShipping: 25,
      storeCoordinates: { latitude: -15.6536, longitude: -56.1322 },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const quote = await shippingService.getDeliveryQuote({
      latitude: -15.63,
      longitude: -56.11,
      subtotal: 35,
    });

    expect(quote.isDeliverable).toBe(true);
    expect(quote.distanceKm).toBe(4.5);
    expect(quote.deliveryFee).toBe(5.0);
  });

  it("aplica fallback geodésico local com frete grátis se subtotal atingir o piso de R$ 60", async () => {
    // Força falha na API para acionar o fallback
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const quote = await shippingService.getDeliveryQuote({
      latitude: -15.64,
      longitude: -56.12,
      subtotal: 70, // >= 60 -> frete grátis
    });

    expect(quote.isDeliverable).toBe(true);
    expect(quote.isFreeDelivery).toBe(true);
    expect(quote.deliveryFee).toBe(0);
    expect(quote.amountToFreeShipping).toBe(0);
  });

  it("aplica fallback geodésico local e rejeita entrega se ultrapassar o raio máximo de 12km", async () => {
    // Força falha na API
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    // Coordenada muito distante (> 50km da loja)
    const quote = await shippingService.getDeliveryQuote({
      latitude: -15.2,
      longitude: -55.5,
      subtotal: 50,
    });

    expect(quote.isDeliverable).toBe(false);
    expect(quote.reason).toContain("fora do raio de atendimento");
  });
});
