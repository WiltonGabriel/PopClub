import { NextResponse } from "next/server";

// Função utilitária para cálculo de distância em linha reta (Haversine) caso OSRM falhe
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const { origin, destination } = body || {};

    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return NextResponse.json(
        { error: "Origem e destino com coordenadas latitude/longitude são obrigatórios." },
        { status: 400 }
      );
    }

    const oLat = Number(origin.lat);
    const oLng = Number(origin.lng);
    const dLat = Number(destination.lat);
    const dLng = Number(destination.lng);

    // Chamada ao Open Source Routing Machine (OSRM) - 100% Gratuito sem dependência de API Key
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      const response = await fetch(osrmUrl, {
        headers: { "User-Agent": "PopShake-App/1.0" },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data = await response.json();
        const route = data.routes?.[0];

        if (route && route.geometry?.coordinates) {
          // Converte coordenadas GeoJSON [lng, lat] para formato Leaflet [lat, lng]
          const leafletCoordinates = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );

          const distanceMeters = Math.round(route.distance);
          const durationSeconds = Math.round(route.duration);
          const distanceKm = (distanceMeters / 1000).toFixed(1);
          const durationMin = Math.max(1, Math.round(durationSeconds / 60));

          return NextResponse.json({
            distanceMeters,
            durationSeconds,
            distanceKm: `${distanceKm} km`,
            durationMin: `${durationMin} min`,
            coordinates: leafletCoordinates,
            routes: [
              {
                distanceMeters: String(distanceMeters),
                duration: `${durationSeconds}s`,
                coordinates: leafletCoordinates,
              },
            ],
          });
        }
      }
    } catch (osrmErr) {
      console.warn("OSRM falhou ou demorou. Usando fallback de traçado direto:", osrmErr);
    }

    // Fallback instantâneo: cálculo Haversine e traçado direto
    const distanceMeters = Math.round(haversineDistanceMeters(oLat, oLng, dLat, dLng));
    // Estimativa urbana média (30 km/h = 8.33 m/s)
    const durationSeconds = Math.round(distanceMeters / 8.33);
    const distanceKm = (distanceMeters / 1000).toFixed(1);
    const durationMin = Math.max(1, Math.round(durationSeconds / 60));

    const directCoordinates = [
      [oLat, oLng],
      [dLat, dLng],
    ];

    return NextResponse.json({
      distanceMeters,
      durationSeconds,
      distanceKm: `${distanceKm} km`,
      durationMin: `${durationMin} min`,
      coordinates: directCoordinates,
      routes: [
        {
          distanceMeters: String(distanceMeters),
          duration: `${durationSeconds}s`,
          coordinates: directCoordinates,
        },
      ],
    });
  } catch (error) {
    console.error("Erro interno no cálculo de rota:", error);
    return NextResponse.json({ error: "Falha interna ao calcular rota." }, { status: 500 });
  }
}
