"use client";

import React, { useState } from "react";
import {
  Zap,
  Clock,
  Plus,
  Minus,
  Pause,
  Play,
  Layers,
  CalendarPlus,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import { Product, productService } from "../../services/productService";
import { useToast } from "../ui/ToastNotification";

interface CombosBatchMonitorProps {
  combos: Product[];
  onRefresh: () => void;
}

export function CombosBatchMonitor({
  combos,
  onRefresh,
}: CombosBatchMonitorProps) {
  const { showToast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeCombos = combos.filter((c) => c.isAvailable !== false);

  // Ajuste rápido de unidades restantes no combo
  const handleQuickUnitChange = async (combo: Product, delta: number) => {
    setUpdatingId(combo.id);
    const currentUnits = combo.scarcityUnits ?? (combo.stock ?? 5);
    const nextUnits = Math.max(0, currentUnits + delta);

    try {
      await productService.updateProduct(combo.id, {
        scarcityUnits: nextUnits,
        stock: nextUnits,
        showScarcity: true,
      });
      showToast({
        title: "Lote do Combo Atualizado",
        message: `Lote de "${combo.name}" ajustado para ${nextUnits} unidades.`,
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

  // Pausar ou Ativar combo inline
  const handleToggleAvailable = async (combo: Product) => {
    setUpdatingId(combo.id);
    const nextAvailable = combo.isAvailable === false ? true : false;

    try {
      await productService.updateProduct(combo.id, {
        isAvailable: nextAvailable,
      });
      showToast({
        title: nextAvailable ? "Combo Ativado" : "Combo Pausado",
        message: nextAvailable
          ? `O combo "${combo.name}" voltou para a vitrine.`
          : `O combo "${combo.name}" foi temporariamente pausado.`,
        type: nextAvailable ? "success" : "warning",
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

  // Prorrogação rápida (+24h ou +3d)
  const handleQuickExtend = async (combo: Product, daysToAdd: number) => {
    setUpdatingId(combo.id);
    const baseDate = combo.expiresAt ? new Date(combo.expiresAt) : new Date();
    const effectiveBase = baseDate.getTime() > Date.now() ? baseDate : new Date();
    const newExpiresAt = new Date(effectiveBase.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    try {
      await productService.updateProduct(combo.id, {
        expiresAt: newExpiresAt.toISOString(),
        showDuration: true,
        isAvailable: true,
      });
      showToast({
        title: "Vigência do Combo Prorrogada!",
        message: `Oferta estendida até ${newExpiresAt.toLocaleDateString("pt-BR")} às ${newExpiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
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

  const getExpiresRemainingText = (expiresAtStr?: string | null) => {
    if (!expiresAtStr) return "Sem data limite (Oferta Contínua)";
    const exp = new Date(expiresAtStr);
    const diffMs = exp.getTime() - Date.now();
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
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                Monitoramento de Lotes & Vigência de Combos
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                {activeCombos.length} Ativos
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Controle o volume de kits promocionais liberados, monitore a vigência temporal e ajuste unidades com facilidade.
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

      {/* Grid de Combos com Lotes */}
      {combos.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 dark:text-gray-500 text-xs space-y-1">
          <UtensilsCrossed className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Nenhum combo cadastrado.</p>
          <p>Crie kits promocionais para acompanhar e gerenciar seus lotes de venda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {combos.map((combo) => {
            const isStrategic = combo.scarcityType !== "real";
            const initial = combo.scarcityInitial || (combo.scarcityUnits ? combo.scarcityUnits + (combo.scarcitySold || 0) : 10);
            const remaining = combo.scarcityUnits ?? combo.stock ?? 5;
            const sold = combo.scarcitySold || 0;
            const progress = initial > 0 ? Math.min(100, Math.round(((initial - remaining) / initial) * 100)) : 0;
            const isUpdating = updatingId === combo.id;
            const isAvailable = combo.isAvailable !== false;
            const isExpired = combo.expiresAt && new Date(combo.expiresAt).getTime() < Date.now();

            return (
              <div
                key={combo.id}
                className={`rounded-2xl border p-4.5 transition-all shadow-xs flex flex-col justify-between gap-4 ${
                  isAvailable && !isExpired
                    ? "bg-white dark:bg-[#200B22] border-gray-200 dark:border-[#512B54]/40"
                    : "bg-gray-50/80 dark:bg-zinc-900/40 border-gray-200/60 dark:border-zinc-800/60 opacity-85"
                }`}
              >
                {/* Linha Superior: Nome & Badges */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                          {combo.cardBadge?.text || "COMBO"}
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
                        {!isAvailable && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                            Pausado
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Expirado
                          </span>
                        )}
                      </div>

                      <h4 className="font-heading font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 mt-1 truncate">
                        {combo.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {combo.comboItems?.length || 0} itens agrupados
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        R$ {Number(combo.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  {/* Monitor de Unidades & Barra de Progresso */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-yellow-500" />
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
                        {getExpiresRemainingText(combo.expiresAt)}
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
                      onClick={() => handleQuickUnitChange(combo, -1)}
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
                      onClick={() => handleQuickUnitChange(combo, +1)}
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
                      onClick={() => handleQuickExtend(combo, 1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-amber-700 dark:text-yellow-300 text-xs font-bold transition-colors cursor-pointer"
                      title="Prorrogar combo por mais 24 horas"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>+24h</span>
                    </button>

                    {/* Prorrogação Rápida (+3d) */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleQuickExtend(combo, 3)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-amber-700 dark:text-yellow-300 text-xs font-bold transition-colors cursor-pointer"
                      title="Prorrogar combo por mais 3 dias"
                    >
                      <span>+3d</span>
                    </button>

                    {/* Pausar / Retomar Combo */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleAvailable(combo)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        isAvailable
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                      title={isAvailable ? "Pausar combo na vitrine" : "Reativar combo na vitrine"}
                    >
                      {isAvailable ? (
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
