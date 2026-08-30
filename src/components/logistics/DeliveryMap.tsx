"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import AddressSearch from "./AddressSearch";
import RoutePolyline from "./RoutePolyline";
import styles from "./DeliveryMap.module.css";

const POPCLUB_HUB = { lat: -23.55052, lng: -46.633308 }; // Central hub for origin

export default function DeliveryMap({ apiKey }: { apiKey: string }) {
  const [destination, setDestination] = useState<google.maps.LatLngLiteral | null>(null);
  const [encodedPolyline, setEncodedPolyline] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceSelected = async (location: google.maps.LatLngLiteral, address: string) => {
    setDestination(location);
    setError(null);
    setEncodedPolyline(null);
    setRouteInfo(null);

    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: POPCLUB_HUB,
          destination: location,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao calcular a rota");
      }

      const route = data.routes?.[0];
      if (route) {
        setEncodedPolyline(route.polyline.encodedPolyline);
        // Format meters to km
        const distanceKm = (parseInt(route.distanceMeters) / 1000).toFixed(1);
        // Format seconds to minutes
        const durationMin = Math.round(parseInt(route.duration.replace("s", "")) / 60);
        
        setRouteInfo({
          distance: `${distanceKm} km`,
          duration: `${durationMin} min`,
        });
      } else {
        setError("Nenhuma rota encontrada.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Falha ao calcular rota.");
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <APIProvider apiKey={apiKey}>
        <div className={styles.floatingPanel}>
          <h2 className={styles.panelTitle}>Rastreamento Logístico</h2>
          <AddressSearch
            placeholder="Digite o endereço de entrega..."
            onPlaceSelected={handlePlaceSelected}
          />
          {error && <div className={styles.errorText}>{error}</div>}
          
          {routeInfo && (
            <div className={styles.routeInfo}>
              <div className={styles.infoBlock}>
                <span>Distância</span>
                <strong>{routeInfo.distance}</strong>
              </div>
              <div className={styles.infoBlock}>
                <span>Tempo Est.</span>
                <strong>{routeInfo.duration}</strong>
              </div>
            </div>
          )}
        </div>

        <Map
          mapId="DEMO_MAP_ID"
          defaultZoom={13}
          defaultCenter={POPCLUB_HUB}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
          internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
        >
          {/* Origin Marker */}
          <AdvancedMarker position={POPCLUB_HUB} title="PopClub Hub" />
          
          {/* Destination Marker */}
          {destination && <AdvancedMarker position={destination} title="Destino" />}
          
          {/* Route Line */}
          {encodedPolyline && <RoutePolyline encodedPath={encodedPolyline} />}
        </Map>
      </APIProvider>
    </div>
  );
}
