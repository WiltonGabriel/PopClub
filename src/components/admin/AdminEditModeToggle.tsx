"use client";

import React from "react";
import { useEditMode } from "../../contexts/EditModeContext";
import { Pencil, Eye } from "lucide-react";

export function AdminEditModeToggle() {
  const { isEditMode, isDesktop, canUseEditMode, toggleEditMode } = useEditMode();

  if (!isDesktop || !canUseEditMode) {
    return null;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEditMode}
      onClick={toggleEditMode}
      title={
        isEditMode
          ? "Modo Edição Ativado — Clique para alternar para visualização de cliente"
          : "Modo Visualização Ativado — Clique para habilitar botões de edição"
      }
      aria-label="Alternar Modo de Edição"
      className="hidden md:flex items-center gap-1.5 xl:gap-2 border border-primary/20/70 dark:border-border/50 bg-white/70 dark:bg-[#230E26]/70 hover:bg-muted/90 rounded-full p-1 xl:pl-3 xl:pr-2 xl:py-1.5 transition-all shrink-0 shadow-xs cursor-pointer group"
    >
      {/* Rótulo com texto e indicador — Visível apenas em telas amplas (xl+) para prevenir colisões em monitores verticais */}
      <span className="hidden xl:flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider select-none text-foreground dark:text-foreground">
        {isEditMode ? (
          <>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Edição</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
            <span>Cliente</span>
          </>
        )}
      </span>

      {/* Toggle switch visual */}
      <div
        className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out p-0.5 flex items-center relative ${
          isEditMode ? "bg-primary" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center ${
            isEditMode ? "translate-x-4" : "translate-x-0"
          }`}
        >
          {isEditMode ? (
            <Pencil className="w-2.5 h-2.5 text-primary" />
          ) : (
            <Eye className="w-2.5 h-2.5 text-gray-500" />
          )}
        </div>
      </div>
    </button>
  );
}
