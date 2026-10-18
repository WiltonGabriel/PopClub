import { NextRequest, NextResponse } from "next/server";
import { geocodeLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = geocodeLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Muitas consultas de endereço em sequência. Aguarde alguns instantes para pesquisar novamente."
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "O termo de busca deve ter pelo menos 2 caracteres." },
        { status: 400 }
      );
    }

    const cleanQuery = query.trim();
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanQuery
    )}&addressdetails=1&limit=5&countrycodes=br`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "PopClub-Açai-Delivery/1.0 (contato@popclub.com)",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      next: { revalidate: 86400 }, // cache de 24 horas para buscas idênticas
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Serviço de busca geográfica externa temporariamente indisponível." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
      });
    }

    const results = data.map((item: any) => {
      const address = item.address || {};
      const road =
        address.road ||
        address.pedestrian ||
        address.street ||
        address.path ||
        address.footway ||
        address.residential ||
        "";

      const neighborhood =
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.quarter ||
        address.hamlet ||
        "";

      const city =
        address.city ||
        address.town ||
        address.municipality ||
        address.village ||
        "";

      const state = address.state || "";
      const postcode = address.postcode || "";

      return {
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        road,
        neighborhood,
        city: city && state ? `${city} - ${state}` : city || state || "",
        postcode,
      };
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Erro na busca de geocodificação direta:", error);
    return NextResponse.json(
      { error: "Erro ao consultar serviço de busca de localização." },
      { status: 500 }
    );
  }
}
