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
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastNotification";
import { playKitchenBellSound } from "@/lib/sound";

interface StoreStatusTopWidgetProps {
  onStatusChange?: () => void;
  activeOrdersCount?: number;
  refreshTrigger?: number;
  className?: string;
}

export interface ConveyorConfirmContent {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "danger" | "success";
}

/**
 * Gera os textos contextuais do diálogo de confirmação ao pausar ou ligar a esteira operacional.
 */
export function getConveyorConfirmContent(
  targetOpen: boolean,
  activeOrdersCount = 0
): ConveyorConfirmContent {
  if (!targetOpen) {
    const activeWarning =
      activeOrdersCount > 0
        ? ` Atenção: há ${activeOrdersCount} pedido(s) em andamento na cozinha — eles continuam ativos para conclusão.`
        : "";

    return {
      title: "Pausar a esteira operacional?",
      description:
        "Ao pausar a esteira, a vitrine passará a informar que a cozinha está pausada e novos pedidos ficarão bloqueados até você ligá-la novamente." +
        activeWarning,
      confirmLabel: "Sim, Pausar Esteira",
      variant: "danger",
    };
  }

  return {
    title: "Colocar a esteira para rodar?",
    description:
      "Ao ligar a esteira, a loja ficará imediatamente aberta na vitrine pública e pronta para receber novos pedidos dos clientes.",
    confirmLabel: "Sim, Ligar Esteira",
    variant: "success",
  };
}

export function StoreStatusTopWidget({
  onStatusChange,
  activeOrdersCount = 0,
  refreshTrigger,
  className = "",
}: StoreStatusTopWidgetProps) {
  const {
    status,
    isWithinSchedule,
    isConveyorOpen,
    openingTime,
    closingTime,
    refresh,
    toggleConveyor,
  } = useStoreStatus(15000);
  const { isAdmin, canAccess } = useAuth();
  const canManageConveyor =
    isAdmin || canAccess("ORDERS_KANBAN") || canAccess("settings_manage");

  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingTargetOpen, setPendingTargetOpen] = useState<boolean | null>(null);
  const [openingAlertDismissed, setOpeningAlertDismissed] = useState(false);
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

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

  const handleRequestToggle = (targetOpen: boolean) => {
    if (!canManageConveyor || actionLoading) return;
    setPendingTargetOpen(targetOpen);
  };

  const handleConfirmToggle = async () => {
    if (pendingTargetOpen === null) return;
    const requestedState = pendingTargetOpen;
    setActionLoading(true);
    try {
      const nextState = await toggleConveyor(requestedState);
      setPendingTargetOpen(null);
      showToast({
        type: nextState ? "success" : "info",
        title: nextState ? "Esteira Aberta" : "Esteira Pausada",
        message: nextState
          ? "A esteira está recebendo pedidos e a vitrine foi liberada!"
          : "A esteira foi pausada. Clientes verão aviso de cozinha em preparo.",
      });
      if (onStatusChange) onStatusChange();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível alternar o status da esteira.";
      showToast({
        type: "error",
        title: "Erro de Operação",
        message: errorMsg,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmContent =
    pendingTargetOpen !== null
      ? getConveyorConfirmContent(pendingTargetOpen, activeOrdersCount)
      : null;

  return (
    <div className={`space-y-3 w-full min-w-0 ${className}`}>
      {/* Alerta Visual Fixo de Horário de Abertura Chegou */}
      {canManageConveyor && isWithinSchedule && !isConveyorOpen && !openingAlertDismissed && (
        <div
          data-testid="admin-opening-alert"
          className="bg-amber-500/15 border-2 border-amber-500/40 dark:bg-amber-950/40 dark:border-amber-700/50 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 min-w-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <h4 className="font-heading font-black text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5 flex-wrap">
                🔔 Chegou o horário de funcionamento ({openingTime})!
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                A esteira de pedidos está aguardando abertura para liberar a vitrine aos clientes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0 flex-wrap">
            <Button
              type="button"
              data-testid="opening-alert-open-conveyor-button"
              onClick={() => handleRequestToggle(true)}
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
        className="bg-card/90 dark:bg-[#1C2030] border border-border/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0"
      >
        {/* Status da Loja */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
          {status === "OPERATIONAL_READY" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                🟢 Loja Aberta (Recebendo Pedidos)
              </span>
            </div>
          )}

          {status === "CONVEYOR_PAUSED" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                🟡 Preparando Cozinha (Aguardando Esteira)
              </span>
            </div>
          )}

          {status === "STORE_CLOSED" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide">
                🔴 Loja Fechada
              </span>
            </div>
          )}

          {/* Horário Programado do Dia */}
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Hoje: <strong>{openingTime}</strong> às <strong>{closingTime}</strong> (MT)</span>
          </div>
        </div>

        {/* Interruptor Geral da Esteira (com confirmação obrigatória) */}
        {canManageConveyor && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
            <div className="text-left sm:text-right hidden sm:block">
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
              onClick={() => handleRequestToggle(!isConveyorOpen)}
              disabled={actionLoading}
              variant={isConveyorOpen ? "destructive" : "default"}
              className={`h-10 px-4 w-full sm:w-auto rounded-xl font-heading font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
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
        )}
      </div>

      {confirmContent && (
        <ConfirmDialog
          open={pendingTargetOpen !== null}
          onOpenChange={(open) => {
            if (!open && !actionLoading) {
              setPendingTargetOpen(null);
            }
          }}
          title={confirmContent.title}
          description={confirmContent.description}
          confirmLabel={confirmContent.confirmLabel}
          cancelLabel="Cancelar"
          variant={confirmContent.variant}
          loading={actionLoading}
          onConfirm={handleConfirmToggle}
        />
      )}
    </div>
  );
}
