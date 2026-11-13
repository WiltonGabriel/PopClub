"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Crosshair,
  Loader2,
  Check,
  X,
  Navigation,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReverseGeocodeResult } from "@/components/logistics/LocationPickerMap";

const LocationPickerMap = dynamic(
  () => import("@/components/logistics/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <span className="font-mono text-xs uppercase font-bold">
          Carregando mapa interativo...
        </span>
      </div>
    ),
  }
);

export interface GpsLocationConfirmedData {
  street: string;
  neighborhood: string;
  city: string;
  zip: string;
  number?: string;
  latitude: number;
  longitude: number;
}

interface GpsInteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLocation: (data: GpsLocationConfirmedData) => void;
  initialCoords?: { lat: number; lng: number } | null;
  defaultStoreCoords?: { lat: number; lng: number };
}

export function GpsInteractiveMapModal({
  isOpen,
  onClose,
  onConfirmLocation,
  initialCoords,
  defaultStoreCoords = { lat: -15.6536, lng: -56.1322 },
}: GpsInteractiveMapModalProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || defaultStoreCoords
  );
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationDetails, setLocationDetails] = useState<ReverseGeocodeResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const fetchReverseGeocode = useCallback(async (lat: number, lon: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Não foi possível obter endereço reverso.");
      const data: ReverseGeocodeResult = await res.json();
      setLocationDetails(data);
    } catch (err) {
      console.warn("Aviso ao buscar geocodificação reversa:", err);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Sincroniza coordenadas iniciais ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setGpsError(null);
      if (initialCoords && !isNaN(initialCoords.lat) && !isNaN(initialCoords.lng)) {
        setCoords(initialCoords);
        fetchReverseGeocode(initialCoords.lat, initialCoords.lng);
      }
    }
  }, [isOpen, initialCoords, fetchReverseGeocode]);

  // Botão "Centralizar na Minha Posição" (dispara GPS do navegador)
  const handleCenterOnUserGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Seu navegador não suporta geolocalização por GPS.");
      return;
    }

    setIsLocatingUser(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        fetchReverseGeocode(next.lat, next.lng);
      },
      (err) => {
        setIsLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Permissão de localização negada pelo navegador.");
        } else if (err.code === err.TIMEOUT) {
          setGpsError("Tempo esgotado ao buscar sinal do GPS.");
        } else {
          setGpsError("Não foi possível obter sua posição atual.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleLocationPicked = (
    newCoords: { lat: number; lng: number },
    details?: ReverseGeocodeResult
  ) => {
    setCoords(newCoords);
    if (details) {
      setLocationDetails(details);
    } else {
      fetchReverseGeocode(newCoords.lat, newCoords.lng);
    }
  };

  const handleConfirm = () => {
    onConfirmLocation({
      street: locationDetails?.road || "",
      neighborhood: locationDetails?.neighborhood || "",
      city: locationDetails?.city || "Local",
      zip: locationDetails?.postcode || "",
      number: locationDetails?.houseNumber || "",
      latitude: coords.lat,
      longitude: coords.lng,
    });
    onClose();
  };

  if (!isOpen) return null;

  const displayAddress = locationDetails
    ? [
        locationDetails.road,
        locationDetails.houseNumber,
        locationDetails.neighborhood ? `- ${locationDetails.neighborhood}` : null,
        locationDetails.city ? `, ${locationDetails.city}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-card border-2 border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base text-foreground leading-tight">
                Ajustar Localização de Entrega
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Arraste o alfinete 📍 até a sua porta ou portão para entrega precisa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar mapa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: Mapa Interativo */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {gpsError && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Wrapper com Mapa e Botão Flutuante de Centralização */}
          <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-md">
            <LocationPickerMap
              initialCoords={coords}
              height="300px"
              zoom={17}
              interactive={true}
              autoReverseGeocode={true}
              onLocationSelect={handleLocationPicked}
            />

            {/* Botão Flutuante Compacto: Centralizar na Minha Localização GPS */}
            <div className="absolute top-1/2 right-3 -translate-y-1/2 z-[1000] group/gps">
              <button
                type="button"
                onClick={handleCenterOnUserGps}
                disabled={isLocatingUser}
                aria-label="Minha localização"
                title="Minha localização"
                className="peer w-11 h-11 rounded-full flex items-center justify-center bg-white/95 dark:bg-[#190B1A]/95 text-foreground hover:text-primary border border-border/80 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isLocatingUser ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <Crosshair className="w-5 h-5 text-primary" aria-hidden="true" />
                )}
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none inline-flex items-center whitespace-nowrap absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#190B1A]/95 dark:bg-white/95 text-white dark:text-[#190B1A] text-[11px] font-bold shadow-md border border-border/40 opacity-0 scale-95 group-hover/gps:opacity-100 group-hover/gps:scale-100 peer-focus-visible:opacity-100 peer-focus-visible:scale-100 transition-all duration-150"
              >
                Minha localização
              </span>
            </div>
          </div>

          {/* Card de Pré-visualização do Endereço Detectado */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Navigation className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Endereço Detectado no Alfinete
                </span>
                {isGeocoding && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Buscando rua...
                  </span>
                )}
              </div>

              <p className="font-heading font-bold text-xs sm:text-sm text-foreground mt-0.5 break-words">
                {displayAddress || locationDetails?.displayName || (
                  <span className="text-muted-foreground font-normal">
                    {isGeocoding ? "Identificando logradouro..." : "Arraste o alfinete para identificar a rua"}
                  </span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] sm:text-[11px] font-mono text-muted-foreground">
                {locationDetails?.postcode && (
                  <span className="bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 font-bold text-foreground">
                    CEP: {locationDetails.postcode}
                  </span>
                )}
                <span>
                  Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 px-4 rounded-xl text-xs font-bold border-border cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isGeocoding}
            className="h-11 px-6 rounded-xl font-heading text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white shadow-md shadow-primary/25 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Este Local</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
