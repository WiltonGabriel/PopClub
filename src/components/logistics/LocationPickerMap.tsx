"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Crosshair,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Navigation,
} from "lucide-react";

export interface ReverseGeocodeResult {
  road?: string;
  neighborhood?: string;
  city?: string;
  postcode?: string;
  displayName?: string;
  latitude: number;
  longitude: number;
}

export interface LocationPickerMapProps {
  initialCoords: { lat: number; lng: number };
  onLocationSelect?: (
    coords: { lat: number; lng: number },
    addressDetails?: ReverseGeocodeResult
  ) => void;
  interactive?: boolean;
  height?: string;
  zoom?: number;
  pinEmoji?: string;
  pinLabel?: string;
  autoReverseGeocode?: boolean;
  className?: string;
}

// Subcomponente para capturar cliques no mapa e reposicionar o alfinete
function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Subcomponente para sincronizar o centro do mapa quando as coordenadas mudam externamente
function MapCenterController({
  coords,
  zoom,
}: {
  coords: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
      map.flyTo([coords.lat, coords.lng], zoom, { animate: true, duration: 1 });
    }
  }, [map, coords.lat, coords.lng, zoom]);
  return null;
}

export default function LocationPickerMap({
  initialCoords,
  onLocationSelect,
  interactive = true,
  height = "250px",
  zoom = 16,
  pinEmoji = "📍",
  pinLabel = "Ponto de Entrega",
  autoReverseGeocode = true,
  className = "",
}: LocationPickerMapProps) {
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(
    initialCoords
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lastResolvedAddress, setLastResolvedAddress] = useState<string | null>(
    null
  );
  const markerRef = useRef<L.Marker | null>(null);

  // Sincroniza se a prop inicial mudar significativamente (ex: usuário digitou novo CEP ou GPS concluiu)
  useEffect(() => {
    if (
      initialCoords &&
      !isNaN(initialCoords.lat) &&
      !isNaN(initialCoords.lng) &&
      (Math.abs(initialCoords.lat - currentCoords.lat) > 0.0001 ||
        Math.abs(initialCoords.lng - currentCoords.lng) > 0.0001)
    ) {
      setCurrentCoords(initialCoords);
    }
  }, [initialCoords.lat, initialCoords.lng]);

  // Função de geocodificação reversa
  const fetchAddressForCoords = useCallback(
    async (lat: number, lng: number) => {
      if (!autoReverseGeocode) {
        onLocationSelect?.({ lat, lng });
        return;
      }

      setIsGeocoding(true);
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
        if (!res.ok) throw new Error("Falha na consulta do endereço reverso");
        const data: ReverseGeocodeResult = await res.json();

        const formatted =
          data.road && data.neighborhood
            ? `${data.road}, ${data.neighborhood}`
            : data.displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        setLastResolvedAddress(formatted);
        onLocationSelect?.({ lat, lng }, data);
      } catch (err) {
        console.warn("Aviso ao buscar geocodificação reversa:", err);
        setLastResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        onLocationSelect?.({ lat, lng });
      } finally {
        setIsGeocoding(false);
      }
    },
    [autoReverseGeocode, onLocationSelect]
  );

  // Manipulador quando o usuário arrasta o alfinete e solta
  const handleMarkerDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (marker) {
      const latlng = marker.getLatLng();
      const newCoords = { lat: latlng.lat, lng: latlng.lng };
      setCurrentCoords(newCoords);
      fetchAddressForCoords(newCoords.lat, newCoords.lng);
    }
  }, [fetchAddressForCoords]);

  // Manipulador quando o usuário clica em qualquer ponto do mapa
  const handleMapClick = useCallback(
    (latlng: L.LatLng) => {
      if (!interactive) return;
      const newCoords = { lat: latlng.lat, lng: latlng.lng };
      setCurrentCoords(newCoords);
      fetchAddressForCoords(newCoords.lat, newCoords.lng);
    },
    [interactive, fetchAddressForCoords]
  );

  // Ícone estilizado com alfinete premium pulsante e arrastável
  const pickerPinIcon = useMemo(() => {
    return L.divIcon({
      className: "custom-draggable-pin",
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 48px; height: 56px; cursor: grab; transform: translate3d(0, 0, 0);">
          <!-- Pulso de radar para destacar a precisão -->
          <div style="position: absolute; bottom: 8px; width: 34px; height: 34px; border-radius: 9999px; background: rgba(147, 6, 207, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <!-- Cabeça do Marcador -->
          <div style="position: relative; z-index: 2; width: 40px; height: 40px; border-radius: 9999px 9999px 9999px 4px; transform: rotate(-45deg); background: linear-gradient(135deg, #9306CF, #B5007F); border: 2.5px solid #ffffff; box-shadow: 0 8px 20px rgba(147, 6, 207, 0.55); display: flex; align-items: center; justify-content: center;">
            <div style="transform: rotate(45deg); font-size: 19px; line-height: 1;">
              ${pinEmoji}
            </div>
          </div>

          <!-- Sombra e ponta de precisão -->
          <div style="position: absolute; bottom: 2px; width: 10px; height: 4px; background: rgba(0, 0, 0, 0.35); border-radius: 9999px; filter: blur(1px);"></div>
        </div>
      `,
      iconSize: [48, 56],
      iconAnchor: [24, 52],
      popupAnchor: [0, -50],
    });
  }, [pinEmoji]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-border/80 shadow-inner bg-muted/40 transition-all ${className}`}
      style={{ height }}
    >
      {/* Container do Leaflet */}
      <MapContainer
        center={[currentCoords.lat, currentCoords.lng]}
        zoom={zoom}
        scrollWheelZoom={false} // Evita travar a rolagem da página/modal no mousewheel
        touchZoom={true}
        dragging={interactive}
        style={{ width: "100%", height: "100%", zIndex: 10 }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapCenterController coords={currentCoords} zoom={zoom} />
        {interactive && <MapClickHandler onMapClick={handleMapClick} />}

        <Marker
          position={[currentCoords.lat, currentCoords.lng]}
          draggable={interactive}
          icon={pickerPinIcon}
          ref={markerRef}
          eventHandlers={{
            dragend: handleMarkerDragEnd,
          }}
        />
      </MapContainer>

      {/* Overlay Superior Direito: Badge com instruções de toque/arraste (libera 100% dos controles de zoom no topo esquerdo) */}
      {interactive && (
        <div className="absolute top-3 right-3 z-[1000] pointer-events-none flex flex-col items-end gap-1.5 max-w-[calc(100%-60px)]">
          <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-md shadow-md border border-border/60 text-xs font-semibold text-foreground">
            <span className="w-2 h-2 rounded-full bg-[#9306CF] animate-pulse shrink-0" />
            <span className="hidden sm:inline">Toque ou arraste o alfinete até o local exato</span>
            <span className="sm:hidden truncate">Arraste até o local exato</span>
          </div>

          {isGeocoding && (
            <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9306CF] text-white shadow-md text-xs font-bold animate-in fade-in">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>Ajustando...</span>
            </div>
          )}
        </div>
      )}

      {/* Overlay Inferior: Coordenadas e feedback de endereço atual */}
      <div className="absolute bottom-2 left-2 right-2 z-20 pointer-events-none flex items-center justify-between gap-2">
        <div className="pointer-events-auto max-w-[80%] bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-border/60 shadow-md text-[11px] truncate flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#9306CF] shrink-0" />
          <span className="truncate font-medium text-foreground">
            {lastResolvedAddress ||
              `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`}
          </span>
        </div>

        {/* Botão para recentralizar o alfinete no mapa */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCurrentCoords({ ...currentCoords });
          }}
          className="pointer-events-auto w-8 h-8 rounded-xl bg-white dark:bg-[#190B1A] hover:bg-muted border border-border/60 shadow-md text-foreground flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Centralizar no Alfinete"
          aria-label="Centralizar no Alfinete"
        >
          <Crosshair className="w-4 h-4 text-[#9306CF]" />
        </button>
      </div>
    </div>
  );
}
