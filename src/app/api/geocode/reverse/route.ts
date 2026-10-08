import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "Latitude e Longitude são obrigatórios." },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Coordenadas geográficas inválidas." },
        { status: 400 }
      );
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "PopClub-Açai-Delivery/1.0 (contato@popclub.com)",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Serviço de localização externa temporariamente indisponível." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const address = data.address || {};

    // Extração inteligente de logradouro, bairro, cidade, uf e cep
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
    const houseNumber = address.house_number || "";

    const cityState = city && state ? `${city} - ${state}` : city || state || "Local";

    return NextResponse.json({
      success: true,
      road,
      neighborhood,
      city: cityState,
      postcode,
      houseNumber,
      displayName: data.display_name || "",
      latitude,
      longitude,
    });
  } catch (error: any) {
    console.error("Erro na geocodificação reversa:", error);
    return NextResponse.json(
      { error: "Erro ao consultar serviço de localização." },
      { status: 500 }
    );
  }
}
