"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";

import {
  LatLng,
  DeliveryMetrics,
  calculateHaversineDistanceKm,
  calculateBearing,
} from "@/lib/geo";

export type { LatLng, DeliveryMetrics };
export { calculateHaversineDistanceKm, calculateBearing };

interface LeafletDeliveryMapProps {
  origin: LatLng;
  destination: LatLng;
  courier?: LatLng | null;
  isGpsActive?: boolean;
  clientAddress?: string;
  clientName?: string;
  orderId?: string;
  onMetricsUpdate?: (metrics: DeliveryMetrics) => void;
  className?: string;
}

function MapController({
  bounds,
  isMobile,
}: {
  bounds: L.LatLngBoundsExpression;
  isMobile: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, {
        paddingTopLeft: isMobile ? [75, 25] : [70, 70],
        paddingBottomRight: isMobile ? [25, 260] : [70, 70],
        maxZoom: 16,
        animate: true,
      });
    }
  }, [map, bounds, isMobile]);
  return null;
}

export default function LeafletDeliveryMap({
  origin,
  destination,
  courier,
  isGpsActive = false,
  clientAddress = "Endereço de Entrega",
  clientName = "Cliente",
  orderId,
  onMetricsUpdate,
  className = "",
}: LeafletDeliveryMapProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [prevCourier, setPrevCourier] = useState<LatLng | null>(null);
  const [courierHeading, setCourierHeading] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se a tela é mobile para ajustar o padding da visualização do mapa
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calcula bounds para enquadrar perfeitamente origem, destino e entregador
  const bounds = useMemo<L.LatLngBoundsExpression>(() => {
    const points: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];
    if (courier) {
      points.push([courier.lat, courier.lng]);
    }
    return points;
  }, [origin.lat, origin.lng, destination.lat, destination.lng, courier?.lat, courier?.lng]);

  // Atualiza ângulo/direção da moto quando o entregador se desloca
  useEffect(() => {
    if (courier) {
      if (prevCourier) {
        const delta = calculateHaversineDistanceKm(
          prevCourier.lat,
          prevCourier.lng,
          courier.lat,
          courier.lng
        );
        // Se deslocou mais de 2 metros, recalcula o ângulo da rotação
        if (delta > 0.002) {
          const bearing = calculateBearing(
            prevCourier.lat,
            prevCourier.lng,
            courier.lat,
            courier.lng
          );
          setCourierHeading(bearing);
        }
      }
      setPrevCourier(courier);
    }
  }, [courier?.lat, courier?.lng]);

  // Busca traçado da rota via OSRM e calcula distância e ETA dinâmicos
  useEffect(() => {
    let isMounted = true;
    async function fetchRoute() {
      try {
        const routeOrigin = courier || origin;
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: routeOrigin,
            destination,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.coordinates && data.coordinates.length > 0) {
            setRouteCoordinates(data.coordinates);
          }
        }
      } catch (err) {
        console.warn("Aviso: Falha ao buscar traçado da rota OSRM:", err);
      }
    }

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [origin.lat, origin.lng, destination.lat, destination.lng, courier?.lat, courier?.lng]);

  // Recalcula métricas dinâmicas em tempo real (distância, ETA e alerta de chegada)
  useEffect(() => {
    const activeOrigin = courier || origin;
    const distanceKm = calculateHaversineDistanceKm(
      activeOrigin.lat,
      activeOrigin.lng,
      destination.lat,
      destination.lng
    );

    // Velocidade média urbana em trânsito de motocicleta (~26 km/h) + 2 min margem de parada
    const etaMinutes = Math.max(1, Math.round((distanceKm / 26) * 60 + 2));
    const isArriving = distanceKm <= 0.3; // Menos de 300 metros

    const formattedDistance =
      distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1).replace(".", ",")} km`;

    const formattedEta = isArriving ? "Chegando!" : `${etaMinutes} min`;

    onMetricsUpdate?.({
      distanceKm,
      formattedDistance,
      etaMinutes,
      formattedEta,
      isArriving,
    });
  }, [courier?.lat, courier?.lng, origin.lat, origin.lng, destination.lat, destination.lng, onMetricsUpdate]);

  // Ícone estilizado da Loja física
  const storeIcon = useMemo(() => {
    return L.divIcon({
      className: "custom-store-pin",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(147, 6, 207, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 38px; height: 38px; border-radius: 9999px; background: linear-gradient(135deg, #9306CF, #940068); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 6px 18px rgba(147, 6, 207, 0.55); border: 2.5px solid #ffffff; font-size: 19px; cursor: pointer;">
            🍧
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }, []);

  // Ícone estilizado do Destino (Residência do cliente)
  const destinationIcon = useMemo(() => {
    return L.divIcon({
      className: "custom-destination-pin",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(16, 185, 129, 0.3); animation: pulse 2s infinite;"></div>
          <div style="position: relative; width: 38px; height: 38px; border-radius: 9999px; background: linear-gradient(135deg, #059669, #10B981); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 6px 18px rgba(16, 185, 129, 0.55); border: 2.5px solid #ffffff; font-size: 19px; cursor: pointer;">
            🏠
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }, []);

  // Ícone estilizado do Entregador com rotação de ângulo suave
  const courierIcon = useMemo(() => {
    return L.divIcon({
      className: "custom-courier-pin",
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 56px; height: 56px; transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);">
          <!-- Pulso de radar do GPS -->
          <div style="position: absolute; inset: 2px; border-radius: 9999px; background: rgba(245, 158, 11, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <!-- Círculo da Moto com Rotação de Direção -->
          <div style="position: relative; width: 44px; height: 44px; border-radius: 9999px; background: linear-gradient(135deg, #F59E0B, #D97706); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 24px rgba(245, 158, 11, 0.7); border: 3px solid #ffffff; font-size: 22px; cursor: pointer; transform: rotate(${courierHeading}deg); transition: transform 0.5s ease-out;">
            🛵
          </div>

          <!-- Badge flutuante 'AO VIVO' -->
          <div style="position: absolute; bottom: -6px; background: #190B1A; color: #FDE68A; font-size: 9px; font-weight: 900; padding: 1.5px 7px; border-radius: 9999px; border: 1.5px solid #F59E0B; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.45);">
            Ao Vivo
          </div>
        </div>
      `,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
      popupAnchor: [0, -28],
    });
  }, [courierHeading]);

  const centerLat = (origin.lat + destination.lat) / 2;
  const centerLng = (origin.lng + destination.lng) / 2;

  return (
    <div className={`relative w-full h-full bg-muted/40 overflow-hidden ${className}`}>
      {/* Mapa Leaflet Full Viewport */}
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController bounds={bounds} isMobile={isMobile} />

        {/* Marcador da Loja */}
        <Marker position={[origin.lat, origin.lng]} icon={storeIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <strong className="font-heading text-sm text-[#9306CF] block">
                🍧 Pop Shake Sorveteria
              </strong>
              <span>Ponto de partida do seu pedido</span>
            </div>
          </Popup>
        </Marker>

        {/* Marcador da Residência */}
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <strong className="font-heading text-sm text-emerald-600 block">
                🏠 Endereço de Entrega
              </strong>
              <span>{clientName}</span>
              <p className="text-muted-foreground mt-1 text-[11px]">{clientAddress}</p>
            </div>
          </Popup>
        </Marker>

        {/* Marcador do Entregador com GPS ao Vivo */}
        {courier && (
          <Marker position={[courier.lat, courier.lng]} icon={courierIcon}>
            <Popup>
              <div className="text-xs p-1 font-sans">
                <strong className="font-heading text-sm text-amber-600 block">
                  🛵 Entregador Pop Shake
                </strong>
                <span>Deslocando-se até você em tempo real</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Traçado da Rota */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: "#9306CF",
              weight: 5,
              opacity: 0.85,
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
