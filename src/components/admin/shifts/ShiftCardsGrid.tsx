"use client";

import React from "react";
import { Check, Clock, Layers, RefreshCw } from "lucide-react";
import type { ShiftRecord } from "@/services/shiftService";
import { formatShiftBRL, formatShiftDuration } from "./shiftFormatters";

interface ShiftCardsGridProps {
  shifts: ShiftRecord[];
  selectedShiftId: string | null;
  onSelectShift: (shift: ShiftRecord) => void;
  loading: boolean;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
}

export function ShiftCardsGrid({
  shifts,
  selectedShiftId,
  onSelectShift,
  loading,
  title = `Expedientes Registrados (${shifts.length})`,
  subtitle = "Selecione um turno para inspecionar os detalhes",
  headerRight,
  footer,
}: ShiftCardsGridProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" /> {title}
          </h2>
          {subtitle && <span className="text-[11px] text-gray-400">{subtitle}</span>}
        </div>
        {headerRight}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-500 bg-white dark:bg-[#230E26] rounded-2xl border border-gray-200 dark:border-border/40">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
          <span>Carregando expedientes da loja...</span>
        </div>
      ) : shifts.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500 bg-white dark:bg-[#230E26] rounded-2xl border border-dashed border-gray-200 dark:border-border/40">
          <p className="font-heading font-bold text-sm text-foreground mb-1">Nenhum turno registrado nesta página</p>
          <p>Inicie a esteira na Central de Pedidos para abrir o primeiro turno.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {shifts.map((shift) => {
              const isSelected = selectedShiftId === shift.id;
              const openedDate = new Date(shift.openedAt);
              const closedDate = shift.closedAt ? new Date(shift.closedAt) : null;
              const durationStr = formatShiftDuration(shift.openedAt, shift.closedAt);

              return (
                <div
                  key={shift.id}
                  onClick={() => onSelectShift(shift)}
                  className={`cursor-pointer rounded-2xl p-4 transition-all border text-left relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? "bg-primary/5 dark:bg-primary/10 border-primary ring-2 ring-primary/40 shadow-md"
                      : "bg-white dark:bg-[#230E26] border-gray-200 dark:border-border/40 hover:border-primary/40 hover:shadow-xs"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {shift.code}
                      </span>
                      {shift.isOpen ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Em Aberto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          Fechado
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-gray-600 dark:text-gray-300 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>
                          Início: {openedDate.toLocaleDateString("pt-BR")} às{" "}
                          {openedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {closedDate ? (
                        <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-[11px]">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>
                            Fim: {closedDate.toLocaleDateString("pt-BR")} às{" "}
                            {closedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ) : (
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          Expediente em andamento
                        </div>
                      )}
                      <div className="text-[11px] text-gray-400">
                        Duração: <strong className="text-foreground">{durationStr}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-border/30 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {shift.completedOrders} concluídos
                    </span>
                    <span className="font-heading font-extrabold text-sm text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatShiftBRL(shift.totalRevenue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {footer}
        </>
      )}
    </section>
  );
}
