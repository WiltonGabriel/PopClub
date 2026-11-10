"use client";

import React, { useState, useEffect } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useAddress } from "@/contexts/AddressContext";

interface HeaderAddressButtonProps {
  className?: string;
  spanClassName?: string;
  isMobile?: boolean;
}

const formatAddress = (addr: string) => {
  if (!addr) return "Adicionar endereço";
  return addr.length > 28 ? `${addr.slice(0, 28)}...` : addr;
};

export function HeaderAddressButton({ 
  className = "", 
  spanClassName = "",
  isMobile = false 
}: HeaderAddressButtonProps) {
  const { activeAddress, headerAddressLabel, fullAddressText, openAddressModal } = useAddress();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extrai o endereço real selecionado pelo cliente (ex: "Rua Augusto Mário, 08" ou "Av. Couto Magalhães")
  let rawAddressText = "";
  if (activeAddress?.street?.trim()) {
    rawAddressText = activeAddress.street.trim();
    if (activeAddress.number?.trim()) {
      rawAddressText += `, ${activeAddress.number.trim()}`;
    }
  } else if (headerAddressLabel && headerAddressLabel !== "Adicionar endereço") {
    rawAddressText = headerAddressLabel;
  } else if (activeAddress?.label?.trim()) {
    rawAddressText = activeAddress.label.trim();
  }

  const displayText = mounted
    ? isMobile
      ? formatAddress(rawAddressText)
      : headerAddressLabel
    : isMobile
    ? "Adicionar endereço"
    : "Adicionar endereço";

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={openAddressModal}
        title={fullAddressText}
        aria-label={`Endereço de entrega: ${displayText}. Clique para alterar.`}
        className={`group flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground dark:text-foreground hover:text-primary dark:hover:text-white transition-all border border-border/50 hover:border-primary/50 bg-white/80 dark:bg-[#230E26]/80 hover:bg-muted/90 rounded-full min-h-[38px] sm:min-h-[40px] px-3.5 py-2 w-auto min-w-[150px] max-w-[200px] shrink min-w-0 shadow-xs cursor-pointer active:scale-95 ${className}`}
      >
        <MapPin className="w-4 h-4 text-primary dark:text-muted-foreground shrink-0 group-hover:scale-110 transition-transform" />
        <span className={`font-semibold truncate text-center text-xs leading-tight ${spanClassName || "max-w-[140px]"}`}>
          {displayText}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAddressModal}
      title={fullAddressText}
      aria-label={`Endereço de entrega: ${displayText}. Clique para alterar.`}
      className={`group flex items-center gap-1.5 text-xs sm:text-sm text-foreground dark:text-foreground hover:text-primary dark:hover:text-white transition-all border border-border/50 hover:border-primary/50 bg-white/70 dark:bg-[#230E26]/70 hover:bg-muted/80 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shrink-0 shadow-xs cursor-pointer active:scale-95 ${className}`}
    >
      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary dark:text-muted-foreground shrink-0 group-hover:scale-110 transition-transform" />
      <span className={`font-medium truncate text-left ${spanClassName || "max-w-[110px] xs:max-w-[150px] sm:max-w-[180px] md:max-w-[140px] lg:max-w-[180px] xl:max-w-[240px]"}`}>
        {displayText}
      </span>
      <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
    </button>
  );
}
