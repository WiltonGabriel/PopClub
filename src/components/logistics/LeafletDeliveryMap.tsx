"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bike, Home, Store, Clock, Navigation2, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";

interface LatLng {
  lat: number;
  lng: number;
}

interface LeafletDeliveryMapProps {
  origin: LatLng;
  destination: LatLng;
  courier?: LatLng | null;
  isGpsActive?: boolean;
  clientAddress?: string;
  clientName?: string;
  orderId?: string;
}

function MapController({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
      });
    }
  }, [map, bounds]);
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
}: LeafletDeliveryMapProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; durationMin: string } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

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
  }, [origin, destination, courier]);

  // Ícones customizados do Leaflet estilizados com a identidade Pop Shake
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

  const courierIcon = useMemo(() => {
    return L.divIcon({
      className: "custom-courier-pin",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 52px; height: 52px;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(245, 158, 11, 0.45); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 42px; height: 42px; border-radius: 9999px; background: linear-gradient(135deg, #F59E0B, #D97706); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.7); border: 3px solid #ffffff; font-size: 21px; cursor: pointer;">
            🛵
          </div>
          <div style="position: absolute; bottom: -8px; background: #190B1A; color: #FDE68A; font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 9999px; border: 1.5px solid #F59E0B; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
            Ao Vivo
          </div>
        </div>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -26],
    });
  }, []);

  // Busca traçado de rota gratuito (OSRM)
  useEffect(() => {
    let isMounted = true;
    async function fetchRoute() {
      setLoadingRoute(true);
      try {
        // Se o entregador estiver transmitindo GPS, a rota liga o entregador ao destino
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
            setRouteInfo({
              distanceKm: data.distanceKm || "Calculando...",
              durationMin: data.durationMin || "Calculando...",
            });
          }
        }
      } catch (err) {
        console.warn("Falha ao buscar traçado da rota:", err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    }

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [origin.lat, origin.lng, destination.lat, destination.lng, courier?.lat, courier?.lng]);

  const centerLat = (origin.lat + destination.lat) / 2;
  const centerLng = (origin.lng + destination.lng) / 2;

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden shadow-2xl border border-[#512B54]/20 bg-muted/40">
      {/* Painel Flutuante de Status e Rastreamento */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-96 z-[1000] pointer-events-auto">
        <div className="bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-xl border border-gray-200/80 dark:border-[#512B54]/60 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-heading font-black text-xs uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#9306CF] to-[#940068]">
                {isGpsActive ? "Rastreamento GPS Ativo" : "Pedido a Caminho"}
              </span>
            </div>
            {orderId && (
              <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                #{orderId.substring(0, 6)}
              </span>
            )}
          </div>

          <p className="text-xs text-foreground/90 font-medium leading-relaxed">
            {isGpsActive
              ? "Nosso entregador está a caminho com sua entrega! A posição no mapa é atualizada ao vivo via satélite."
              : "Pedido a caminho! Nosso entregador está se deslocando até o seu endereço com todo o cuidado."}
          </p>

          {/* Dados de Distância e Tempo */}
          {routeInfo && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-[#512B54]/30 text-xs">
              <div className="bg-purple-50/80 dark:bg-[#230E26]/60 p-2.5 rounded-xl flex items-center gap-2">
                <Navigation2 className="w-4 h-4 text-[#9306CF] shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-mono">Distância</span>
                  <strong className="font-bold text-foreground">{routeInfo.distanceKm}</strong>
                </div>
              </div>
              <div className="bg-pink-50/80 dark:bg-[#230E26]/60 p-2.5 rounded-xl flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#940068] shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-mono">Tempo Est.</span>
                  <strong className="font-bold text-foreground">{routeInfo.durationMin}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{clientAddress}</span>
          </div>
        </div>
      </div>

      {/* Mapa Leaflet com OpenStreetMap 100% Gratuito */}
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", minHeight: "420px" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController bounds={bounds} />

        {/* Marcador da Loja Pop Shake */}
        <Marker position={[origin.lat, origin.lng]} icon={storeIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <strong className="font-heading text-sm text-[#9306CF] block">🍧 Pop Shake Sorveteria</strong>
              <span>Ponto de partida do seu pedido</span>
            </div>
          </Popup>
        </Marker>

        {/* Marcador da Casa / Destino */}
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <strong className="font-heading text-sm text-emerald-600 block">🏠 Endereço de Entrega</strong>
              <span>{clientName}</span>
              <p className="text-muted-foreground mt-1 text-[11px]">{clientAddress}</p>
            </div>
          </Popup>
        </Marker>

        {/* Marcador do Entregador (quando transmitindo GPS ao vivo) */}
        {courier && (
          <Marker position={[courier.lat, courier.lng]} icon={courierIcon}>
            <Popup>
              <div className="text-xs p-1 font-sans">
                <strong className="font-heading text-sm text-amber-600 block">🛵 Entregador Pop Shake</strong>
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
