import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDistanceKm } from "@/lib/geo";
import { deliveryCalculateLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = deliveryCalculateLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas consultas de cálculo de frete. Por favor, aguarde.");
    }

    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, subtotal, isPickup, address } = body;

    // Busca configurações ativas da loja
    let storeSettings = null;
    try {
      storeSettings = await prisma.storeSettings.findUnique({
        where: { id: "store_config" },
      });
    } catch (err) {
      console.warn("Aviso ao buscar storeSettings no cálculo de frete:", err);
    }

    const storeLat = storeSettings?.storeLatitude ?? -15.6536;
    const storeLng = storeSettings?.storeLongitude ?? -56.1322;
    const maxRadius = storeSettings?.maxDeliveryRadiusKm ?? 12;
    const defaultFee = storeSettings ? Number(storeSettings.deliveryFee) : 5.0;
    const threshold =
      storeSettings?.freeDeliveryThreshold !== null && storeSettings?.freeDeliveryThreshold !== undefined
        ? Number(storeSettings.freeDeliveryThreshold)
        : 60.0;

    const numSubtotal = typeof subtotal === "number" && !isNaN(subtotal) ? subtotal : 0;

    // Se for Retirada no Balcão: Isenção total e raio aprovado
    if (isPickup) {
      return NextResponse.json({
        isDeliverable: true,
        distanceKm: 0,
        maxRadiusKm: maxRadius,
        deliveryFee: 0,
        isFreeDelivery: true,
        freeDeliveryThreshold: threshold,
        amountToFreeShipping: 0,
        isPickup: true,
        storeCoordinates: {
          latitude: storeLat,
          longitude: storeLng,
        },
      });
    }

    let customerLat = typeof latitude === "number" && !isNaN(latitude) ? latitude : null;
    let customerLng = typeof longitude === "number" && !isNaN(longitude) ? longitude : null;

    // Se não tiver coordenadas, tenta resolver via busca de endereço caso informado
    if ((customerLat === null || customerLng === null) && typeof address === "string" && address.trim().length >= 3) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address.trim()
        )}&limit=1&countrycodes=br`;
        const geoRes = await fetch(nominatimUrl, {
          headers: {
            "User-Agent": "PopClub-Delivery/1.0",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
          signal: AbortSignal.timeout(4000),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0 && geoData[0].lat && geoData[0].lon) {
            customerLat = parseFloat(geoData[0].lat);
            customerLng = parseFloat(geoData[0].lon);
          }
        }
      } catch (err) {
        console.warn("Falha no geocoding auxiliar para cálculo de frete:", err);
      }
    }

    if (customerLat === null || customerLng === null) {
      return NextResponse.json(
        {
          error: "Coordenadas de entrega ou endereço válido não informados.",
          isDeliverable: true, // Não bloqueia prematuramente se ainda não houver coordenadas
          distanceKm: 0,
          maxRadiusKm: maxRadius,
          deliveryFee: defaultFee,
          isFreeDelivery: threshold !== null && numSubtotal >= threshold,
          freeDeliveryThreshold: threshold,
          amountToFreeShipping: threshold !== null ? Math.max(0, threshold - numSubtotal) : 0,
          storeCoordinates: {
            latitude: storeLat,
            longitude: storeLng,
          },
        },
        { status: 200 }
      );
    }

    // Cálculo da distância geodésica em linha reta (Haversine)
    const distanceKm = calculateDistanceKm(storeLat, storeLng, customerLat, customerLng);
    const isDeliverable = distanceKm <= maxRadius;

    // Regras de Cobrança
    let fee = defaultFee;
    let isFree = false;

    if (isDeliverable) {
      if (threshold !== null && numSubtotal >= threshold) {
        isFree = true;
        fee = 0;
      } else if (defaultFee === 0) {
        isFree = true;
        fee = 0;
      }
    }

    const amountToFree =
      threshold !== null && !isFree ? Math.max(0, Number((threshold - numSubtotal).toFixed(2))) : 0;

    return NextResponse.json({
      isDeliverable,
      distanceKm: Number(distanceKm.toFixed(2)),
      maxRadiusKm: maxRadius,
      deliveryFee: isDeliverable ? fee : defaultFee,
      isFreeDelivery: isFree,
      freeDeliveryThreshold: threshold,
      amountToFreeShipping: amountToFree,
      storeCoordinates: {
        latitude: storeLat,
        longitude: storeLng,
      },
      customerCoordinates: {
        latitude: customerLat,
        longitude: customerLng,
      },
      reason: isDeliverable
        ? undefined
        : `Identificamos que seu endereço fica a ${distanceKm.toFixed(1)} km da nossa sede, e nosso raio máximo atual é de ${maxRadius} km.`,
    });
  } catch (error: any) {
    console.error("Erro ao calcular frete por raio geográfico:", error);
    return NextResponse.json(
      { error: "Erro interno ao calcular frete.", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon") || searchParams.get("lng");
  const subtotal = searchParams.get("subtotal");
  const isPickup = searchParams.get("isPickup") === "true";
  const address = searchParams.get("address");

  const fakeReq = new NextRequest(request.url, {
    method: "POST",
    body: JSON.stringify({
      latitude: lat ? parseFloat(lat) : undefined,
      longitude: lon ? parseFloat(lon) : undefined,
      subtotal: subtotal ? parseFloat(subtotal) : undefined,
      isPickup,
      address,
    }),
  });

  return POST(fakeReq);
}
