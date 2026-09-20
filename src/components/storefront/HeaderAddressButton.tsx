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
  return addr.length > 26 ? `${addr.slice(0, 26)}...` : addr;
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

  // Extrai o texto do último endereço selecionado (apelido ou nome da rua)
  const rawAddressText = activeAddress?.label?.trim() || activeAddress?.street?.trim() || (headerAddressLabel !== "Adicionar endereço" ? headerAddressLabel : "");

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
        className={`group flex items-center justify-center gap-1.5 text-xs text-[#4C264F] dark:text-[#F9F5F9] hover:text-[#9306CF] dark:hover:text-white transition-all border border-border/50 hover:border-[#9306CF]/50 bg-white/80 dark:bg-[#230E26]/80 hover:bg-muted/90 rounded-full px-2.5 xs:px-3 py-1.5 shrink min-w-0 shadow-xs cursor-pointer active:scale-95 ${className}`}
      >
        <MapPin className="w-3.5 h-3.5 text-[#9306CF] dark:text-[#C7A9C9] shrink-0 group-hover:scale-110 transition-transform" />
        <span className={`font-semibold truncate text-center text-xs leading-tight ${spanClassName || "max-w-[130px] xs:max-w-[180px] sm:max-w-[220px]"}`}>
          {displayText}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-[#9306CF] shrink-0 transition-colors" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAddressModal}
      title={fullAddressText}
      aria-label={`Endereço de entrega: ${displayText}. Clique para alterar.`}
      className={`group flex items-center gap-1.5 text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9] hover:text-[#9306CF] dark:hover:text-white transition-all border border-border/50 hover:border-[#9306CF]/50 bg-white/70 dark:bg-[#230E26]/70 hover:bg-muted/80 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shrink-0 shadow-xs cursor-pointer active:scale-95 ${className}`}
    >
      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0 group-hover:scale-110 transition-transform" />
      <span className={`font-medium truncate text-left ${spanClassName || "max-w-[110px] xs:max-w-[150px] sm:max-w-[180px] md:max-w-[240px]"}`}>
        {displayText}
      </span>
      <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground group-hover:text-[#9306CF] shrink-0 transition-colors" />
    </button>
  );
}
