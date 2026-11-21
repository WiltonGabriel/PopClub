"use client";

import React from "react";

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

export interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

export interface AnalyticsTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

export function AnalyticsTooltip({ active, payload, label }: AnalyticsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white/95 dark:bg-background/95 border border-gray-200 dark:border-border/70 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans space-y-1">
      {label && (
        <p className="font-bold text-foreground border-b border-gray-100 dark:border-border/40 pb-1">
          {label}
        </p>
      )}
      {payload.map((entry, index) => {
        const entryName = String(entry.name || "");
        const lower = entryName.toLowerCase();
        const rawVal = Number(entry.value);
        let formattedValue = String(entry.value ?? "");

        if (
          lower.includes("faturamento") ||
          lower.includes("receita") ||
          lower.includes("ticket") ||
          lower.includes("r$")
        ) {
          formattedValue = formatCurrencyBRL(Number.isFinite(rawVal) ? rawVal : 0);
        } else if (
          lower.includes("pedidos") ||
          lower.includes("qtd") ||
          lower.includes("entregas")
        ) {
          formattedValue = `${entry.value} un.`;
        } else if (lower.includes("min")) {
          formattedValue = `${entry.value} min`;
        }

        return (
          <p
            key={`tooltip-item-${index}`}
            className="flex items-center justify-between gap-3"
            style={{ color: entry.color }}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || "currentColor" }}
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">{entryName}:</span>
            </span>
            <span className="font-bold font-mono">{formattedValue}</span>
          </p>
        );
      })}
    </div>
  );
}
