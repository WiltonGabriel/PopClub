"use client";

import React from "react";
import { useEditMode } from "../../contexts/EditModeContext";
import { Pencil, Eye } from "lucide-react";

export function AdminEditModeToggle() {
  const { isEditMode, toggleEditMode } = useEditMode();

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
      className="flex items-center gap-2 border border-purple-200/70 dark:border-[#512B54]/50 bg-white/70 dark:bg-[#230E26]/70 hover:bg-muted/90 rounded-full pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 py-1 sm:py-1.5 transition-all shrink-0 shadow-xs cursor-pointer group"
    >
      {/* Rótulo com texto e indicador */}
      <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 select-none text-[#4C264F] dark:text-[#F9F5F9]">
        {isEditMode ? (
          <>
            <span className="w-2 h-2 rounded-full bg-[#9306CF] animate-pulse" />
            <span className="hidden sm:inline">Modo Edição</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
            <span className="hidden sm:inline">Visualizar</span>
          </>
        )}
      </span>

      {/* Toggle switch visual */}
      <div
        className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out p-0.5 flex items-center relative ${
          isEditMode ? "bg-[#9306CF]" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center ${
            isEditMode ? "translate-x-4" : "translate-x-0"
          }`}
        >
          {isEditMode ? (
            <Pencil className="w-2.5 h-2.5 text-[#9306CF]" />
          ) : (
            <Eye className="w-2.5 h-2.5 text-gray-500" />
          )}
        </div>
      </div>
    </button>
  );
}
