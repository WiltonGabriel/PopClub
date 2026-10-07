"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  Clock,
  Plus,
  Minus,
  Pause,
  Play,
  CalendarPlus,
  Layers,
  Tag,
  RefreshCw,
} from "lucide-react";
import { Promotion, promotionService } from "../../services/promotionService";
import { useToast } from "../ui/ToastNotification";

interface PromotionsBatchMonitorProps {
  promotions: Promotion[];
  onRefresh: () => void;
}

export function PromotionsBatchMonitor({
  promotions,
  onRefresh,
}: PromotionsBatchMonitorProps) {
  const { showToast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  useEffect(() => {
    setCurrentTimestamp(Date.now());
    const interval = setInterval(() => setCurrentTimestamp(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const activePromos = promotions.filter((p) => p.isActive);

  // Ajuste rápido de unidades restantes
  const handleQuickUnitChange = async (promo: Promotion, delta: number) => {
    setUpdatingId(promo.id);
    const currentUnits = promo.scarcityUnits ?? 5;
    const nextUnits = Math.max(0, currentUnits + delta);

    try {
      await promotionService.updatePromotion(promo.id, {
        scarcityUnits: nextUnits,
        showScarcity: true,
      });
      showToast({
        title: "Lote Atualizado",
        message: `Lote de "${promo.title}" ajustado para ${nextUnits} unidades.`,
        type: "success",
      });
      onRefresh();
    } catch (err) {
      showToast({
        title: "Erro ao atualizar lote",
        message: err instanceof Error ? err.message : "Falha na requisição.",
        type: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Prorrogação rápida (+24h ou +3 dias)
  const handleQuickExtend = async (promo: Promotion, daysToAdd: number) => {
    setUpdatingId(promo.id);
    const baseDate = promo.expiresAt ? new Date(promo.expiresAt) : new Date();
    // Se a data já venceu, soma a partir de agora
    const effectiveBase = baseDate.getTime() > Date.now() ? baseDate : new Date();
    const newExpiresAt = new Date(effectiveBase.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    try {
      await promotionService.updatePromotion(promo.id, {
        expiresAt: newExpiresAt.toISOString(),
        isActive: true,
      });
      showToast({
        title: "Oferta Prorrogada!",
        message: `Vigência estendida até ${newExpiresAt.toLocaleDateString("pt-BR")} às ${newExpiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
        type: "success",
      });
      onRefresh();
    } catch (err) {
      showToast({
        title: "Erro ao prorrogar",
        message: err instanceof Error ? err.message : "Falha na requisição.",
        type: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Pausar ou Ativar oferta inline
  const handleToggleActive = async (promo: Promotion) => {
    setUpdatingId(promo.id);
    const nextActive = !promo.isActive;

    try {
      await promotionService.updatePromotion(promo.id, {
        isActive: nextActive,
      });
      showToast({
        title: nextActive ? "Promoção Ativada" : "Promoção Pausada",
        message: nextActive
          ? `A oferta "${promo.title}" voltou para a vitrine.`
          : `A oferta "${promo.title}" foi temporariamente pausada.`,
        type: nextActive ? "success" : "warning",
      });
      onRefresh();
    } catch (err) {
      showToast({
        title: "Erro ao alterar status",
        message: err instanceof Error ? err.message : "Falha na requisição.",
        type: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Formatação do prazo restante
  const getExpiresRemainingText = (expiresAtStr?: string | null) => {
    if (!expiresAtStr) return "Sem data limite (Contínua)";
    if (!currentTimestamp) return "Calculando...";
    const exp = new Date(expiresAtStr);
    const diffMs = exp.getTime() - currentTimestamp;
    if (diffMs <= 0) return "Vencida";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) return `${days}d ${remHours}h restantes`;
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m restantes`;
  };

  return (
    <div className="bg-white dark:bg-[#1E0B22] border border-gray-200 dark:border-[#512B54]/40 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
      {/* Cabeçalho do Monitoramento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#512B54]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                Monitoramento de Lotes & Vigência
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {activePromos.length} Ativas
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Controle o ritmo de unidades promocionais, ajuste lotes em tempo real e prorrogue ou pause campanhas com 1 clique.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Grid de Promoções com Lotes */}
      {promotions.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 dark:text-gray-500 text-xs space-y-1">
          <Tag className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Nenhuma promoção encontrada.</p>
          <p>Crie uma promoção para monitorar e controlar lotes dedicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {promotions.map((promo) => {
            const isStrategic = promo.scarcityType !== "real";
            const initial = promo.scarcityInitial || (promo.scarcityUnits ? promo.scarcityUnits + (promo.scarcitySold || 0) : 10);
            const remaining = promo.scarcityUnits ?? Math.max(0, initial - (promo.scarcitySold || 0));
            const sold = promo.scarcitySold || 0;
            const progress = initial > 0 ? Math.min(100, Math.round(((initial - remaining) / initial) * 100)) : 0;
            const isUpdating = updatingId === promo.id;
            const isExpired = Boolean(promo.expiresAt && currentTimestamp && new Date(promo.expiresAt).getTime() < currentTimestamp);

            return (
              <div
                key={promo.id}
                className={`rounded-2xl border p-4.5 transition-all shadow-xs flex flex-col justify-between gap-4 ${
                  promo.isActive && !isExpired
                    ? "bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40"
                    : "bg-gray-50/80 dark:bg-zinc-900/40 border-gray-200/60 dark:border-zinc-800/60 opacity-85"
                }`}
              >
                {/* Linha Superior: Info do Produto & Modo */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary dark:text-violet-300 border border-primary/20">
                          {promo.badge || "PROMO"}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            isStrategic
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {isStrategic ? "Lote Estratégico" : "Lote Real"}
                        </span>
                        {!promo.isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                            Pausada
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Expirada
                          </span>
                        )}
                      </div>

                      <h4 className="font-heading font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                        {promo.title}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        Alvo: <strong>{promo.product?.name || "Produto associado"}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {promo.discountType === "percentage"
                          ? `${promo.discountValue}% OFF`
                          : `R$ ${Number(promo.discountValue).toFixed(2)} OFF`}
                      </span>
                    </div>
                  </div>

                  {/* Monitor de Unidades & Barra de Progresso */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Restantes: <strong className="text-zinc-900 dark:text-white font-mono text-sm">{remaining} un</strong></span>
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                        {sold} vendidas de {initial} inicial
                      </span>
                    </div>

                    {/* Barra de Progresso Visual */}
                    <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          remaining <= 2
                            ? "bg-rose-500"
                            : remaining <= 5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.max(5, 100 - progress)}%` }}
                      />
                    </div>

                    {/* Vigência */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-white/5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>Vigência:</span>
                      </span>
                      <span className={`font-medium ${isExpired ? "text-rose-500 font-bold" : ""}`}>
                        {getExpiresRemainingText(promo.expiresAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha Inferior: Ações Rápidas Inline */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  {/* Ajuste Rápido de Lote (+ / -) */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Lote:</span>
                    <button
                      type="button"
                      disabled={isUpdating || remaining <= 0}
                      onClick={() => handleQuickUnitChange(promo, -1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-xs disabled:opacity-40 cursor-pointer transition-colors"
                      title="Diminuir 1 unidade do lote"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs font-bold px-1.5 text-zinc-900 dark:text-white">
                      {remaining}
                    </span>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleQuickUnitChange(promo, +1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-xs disabled:opacity-40 cursor-pointer transition-colors"
                      title="Aumentar 1 unidade do lote"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Prorrogar e Pausar/Ativar */}
                  <div className="flex items-center gap-1.5">
                    {/* Prorrogação Rápida (+24h) */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleQuickExtend(promo, 1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-violet-300 text-xs font-bold transition-colors cursor-pointer"
                      title="Prorrogar oferta por mais 24 horas"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>+24h</span>
                    </button>

                    {/* Prorrogação Rápida (+3d) */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleQuickExtend(promo, 3)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-violet-300 text-xs font-bold transition-colors cursor-pointer"
                      title="Prorrogar oferta por mais 3 dias"
                    >
                      <span>+3d</span>
                    </button>

                    {/* Pausar / Retomar Oferta */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleActive(promo)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        promo.isActive
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                      title={promo.isActive ? "Pausar promoção na vitrine" : "Reativar promoção na vitrine"}
                    >
                      {promo.isActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
