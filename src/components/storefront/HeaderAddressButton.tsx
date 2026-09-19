"use client";

import React from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useAddress } from "@/contexts/AddressContext";

interface HeaderAddressButtonProps {
  className?: string;
  spanClassName?: string;
}

export function HeaderAddressButton({ className = "", spanClassName = "" }: HeaderAddressButtonProps) {
  const { headerAddressLabel, fullAddressText, openAddressModal } = useAddress();

  return (
    <button
      type="button"
      onClick={openAddressModal}
      title={fullAddressText}
      aria-label={`Endereço de entrega: ${headerAddressLabel}. Clique para alterar.`}
      className={`group flex items-center gap-1.5 text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9] hover:text-[#9306CF] dark:hover:text-white transition-all border border-border/50 hover:border-[#9306CF]/50 bg-white/70 dark:bg-[#230E26]/70 hover:bg-muted/80 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shrink-0 shadow-xs cursor-pointer active:scale-95 ${className}`}
    >
      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0 group-hover:scale-110 transition-transform" />
      <span className={`font-medium truncate text-left ${spanClassName || "max-w-[110px] xs:max-w-[150px] sm:max-w-[180px] md:max-w-[240px]"}`}>
        {headerAddressLabel}
      </span>
      <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground group-hover:text-[#9306CF] shrink-0 transition-colors" />
    </button>
  );
}
