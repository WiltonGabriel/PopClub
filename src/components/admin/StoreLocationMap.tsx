"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { LocationPickerMapProps } from "@/components/logistics/LocationPickerMap";

const LocationPickerMap = dynamic(
  () => import("@/components/logistics/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        <span className="text-xs font-medium font-mono">Carregando mapa da sede e raio de atendimento...</span>
      </div>
    ),
  }
);

export interface StoreLocationMapProps extends LocationPickerMapProps {
  coverageRadiusKm?: number | null;
}

/**
 * Componente oficial de Mapa da Sede Física com renderização de raio de atendimento dinâmico (Leaflet)
 */
export default function StoreLocationMap(props: StoreLocationMapProps) {
  return (
    <LocationPickerMap
      showCoverageCircle={true}
      {...props}
    />
  );
}
