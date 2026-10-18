"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Power,
  Play,
  Clock,
  Bell,
  Loader2,
} from "lucide-react";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastNotification";
import { playKitchenBellSound } from "@/lib/sound";

interface StoreStatusTopWidgetProps {
  onStatusChange?: () => void;
  className?: string;
}

export function StoreStatusTopWidget({ onStatusChange, className = "" }: StoreStatusTopWidgetProps) {
  const {
    status,
    isWithinSchedule,
    isConveyorOpen,
    openingTime,
    closingTime,
    toggleConveyor,
    loading,
  } = useStoreStatus(15000);

  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [openingAlertDismissed, setOpeningAlertDismissed] = useState(false);
  const soundPlayedRef = useRef(false);

  // Monitora momento exato de abertura ou fechamento
  useEffect(() => {
    if (isWithinSchedule && !isConveyorOpen) {
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        try {
          playKitchenBellSound();
        } catch {}
      }
    } else {
      soundPlayedRef.current = false;
      setOpeningAlertDismissed(false);
    }
  }, [isWithinSchedule, isConveyorOpen]);

  const handleToggle = async (target?: boolean) => {
    setActionLoading(true);
    try {
      const nextState = await toggleConveyor(target);
      showToast({
        type: nextState ? "success" : "info",
        title: nextState ? "Esteira Aberta" : "Esteira Pausada",
        message: nextState
          ? "A esteira está recebendo pedidos e a vitrine foi liberada!"
          : "A esteira foi pausada. Clientes verão aviso de cozinha em preparo.",
      });
      if (onStatusChange) onStatusChange();
    } catch {
      showToast({
        type: "error",
        title: "Erro de Operação",
        message: "Não foi possível alternar o status da esteira.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Alerta Visual Fixo de Horário de Abertura Chegou */}
      {isWithinSchedule && !isConveyorOpen && !openingAlertDismissed && (
        <div
          data-testid="admin-opening-alert"
          className="bg-amber-500/15 border-2 border-amber-500/40 dark:bg-amber-950/40 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-heading font-black text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                🔔 Chegou o horário de funcionamento ({openingTime})!
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                A esteira de pedidos está aguardando abertura para liberar a vitrine aos clientes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              type="button"
              onClick={() => handleToggle(true)}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-xs uppercase tracking-wider h-9 px-4 rounded-xl shadow-md cursor-pointer"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current mr-1.5" />
              )}
              Abrir Esteira Agora
            </Button>
            <button
              type="button"
              onClick={() => setOpeningAlertDismissed(true)}
              className="text-xs text-amber-800/70 dark:text-amber-400/70 hover:underline px-2 py-1 cursor-pointer"
            >
              Dispensar
            </button>
          </div>
        </div>
      )}

      {/* Widget Principal de Status e Switch da Esteira */}
      <div
        data-testid="admin-store-status-widget"
        className="bg-card/90 dark:bg-[#1C2030] border border-border/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        {/* Status da Loja */}
        <div className="flex items-center gap-3 flex-wrap">
          {status === "OPERATIONAL_READY" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                🟢 Loja Aberta (Recebendo Pedidos)
              </span>
            </div>
          )}

          {status === "CONVEYOR_PAUSED" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                🟡 Preparando Cozinha (Aguardando Esteira)
              </span>
            </div>
          )}

          {status === "STORE_CLOSED" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                🔴 Loja Fechada
              </span>
            </div>
          )}

          {/* Horário Programado do Dia */}
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Hoje: <strong>{openingTime}</strong> às <strong>{closingTime}</strong> (MT)</span>
          </div>
        </div>

        {/* Interruptor Geral da Esteira (Switch de 1 clique) */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Interruptor da Esteira
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              {isConveyorOpen ? "Esteira ativa para o público" : "Esteira pausada na cozinha"}
            </p>
          </div>

          <Button
            type="button"
            data-testid="toggle-conveyor-button"
            onClick={() => handleToggle()}
            disabled={actionLoading}
            variant={isConveyorOpen ? "destructive" : "default"}
            className={`h-10 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
              isConveyorOpen
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isConveyorOpen ? (
              <>
                <Power className="w-4 h-4" />
                <span>Pausar Esteira</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Ligar Esteira</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
