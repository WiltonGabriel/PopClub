"use client";

import React from "react";
import { Clock, ChefHat, Sparkles } from "lucide-react";
import { StoreStatusCode } from "@/lib/storeSchedule";

interface StoreStatusBannerProps {
  status: StoreStatusCode;
  openingTime: string;
  closingTime: string;
}

/**
 * Tag discreta para exibir no topo da vitrine quando a loja está aberta
 */
export function StoreStatusBadge({
  status,
  closingTime,
}: {
  status: StoreStatusCode;
  closingTime: string;
}) {
  if (status !== "OPERATIONAL_READY") return null;

  return (
    <div
      data-testid="store-open-tag"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shadow-xs select-none"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>Aberto hoje até as {closingTime}</span>
    </div>
  );
}

/**
 * Banner informativo superior (não bloqueante) para a vitrine
 */
export function StoreStatusBanner({
  status,
  openingTime,
  closingTime,
}: StoreStatusBannerProps) {
  // Cenário C: Loja Aberta (nenhum banner de bloqueio ou aviso ostensivo)
  if (status === "OPERATIONAL_READY") {
    return null;
  }

  // Cenário A: Fora do Horário de Atendimento (Loja Fechada)
  if (status === "STORE_CLOSED") {
    return (
      <div
        data-testid="store-closed-banner"
        className="w-full bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-500/5 border-b border-red-200/80 dark:border-red-900/40 px-4 py-3 sm:py-3.5 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h4 className="font-heading font-black text-xs sm:text-sm text-red-900 dark:text-red-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>Estamos Fechados no Momento</span>
            </h4>
            <p className="text-xs text-red-800/90 dark:text-red-300/80 mt-0.5 leading-snug">
              Hoje nosso horário de atendimento é das <strong>{openingTime}</strong> às{" "}
              <strong>{closingTime}</strong>. Você já pode ir escolhendo seus itens e montando sua sacola!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cenário B: Dentro do Horário, mas com a Esteira em Preparo
  if (status === "CONVEYOR_PAUSED") {
    return (
      <div
        data-testid="store-preparing-banner"
        className="w-full bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border-b border-amber-200/80 dark:border-amber-900/40 px-4 py-3 sm:py-3.5 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h4 className="font-heading font-black text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Finalizando os Preparativos da Cozinha</span>
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5 leading-snug">
              Nossa equipe está organizando a esteira para atender você. Nosso horário hoje é das{" "}
              <strong>{openingTime}</strong> às <strong>{closingTime}</strong>. Em instantes o recebimento de pedidos estará liberado!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
