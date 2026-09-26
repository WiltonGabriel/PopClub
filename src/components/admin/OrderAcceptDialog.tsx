"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Printer,
  CheckCircle2,
  X,
  Settings,
  Plus,
  Trash2,
  Bike,
  Store,
  Loader2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Order } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeSettingsService } from "@/services/storeSettingsService";
import { printThermalReceipt } from "@/lib/thermalPrinter";

// ─── Limites rígidos anti-bloat ───────────────────────────────────────────────
const MAX_PRESETS = 4;
const MAX_PRESET_LEN = 15;
const MAX_CUSTOM_LEN = 15;
// ─────────────────────────────────────────────────────────────────────────────

interface OrderAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onConfirmAccept: (orderId: string, estimatedTime: string) => Promise<void>;
  initialPresets?: string[];
  onPresetsUpdated?: (presets: string[]) => void;
  storeDefaultTime?: string;
}

export function OrderAcceptDialog({
  open,
  onOpenChange,
  order,
  onConfirmAccept,
  initialPresets = ["20-30 min", "35-50 min", "50-70 min"],
  onPresetsUpdated,
  storeDefaultTime,
}: OrderAcceptDialogProps) {
  const [presets, setPresets] = useState<string[]>(initialPresets);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customTime, setCustomTime] = useState<string>("");
  const [autoPrint, setAutoPrint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modo de gestão rápida de presets
  const [isManagingPresets, setIsManagingPresets] = useState(false);
  const [newPresetValue, setNewPresetValue] = useState("");
  const [isSavingPresets, setIsSavingPresets] = useState(false);

  useEffect(() => {
    if (initialPresets && initialPresets.length > 0) {
      setPresets(initialPresets);
    }
  }, [initialPresets]);

  useEffect(() => {
    if (open) {
      // Carrega preferência de operador (padrão false para não disparar impressão involuntária)
      const savedPrint =
        localStorage.getItem("popshake_auto_print_receipt") ??
        localStorage.getItem("autoPrintReceiptOnAccept");
      if (savedPrint !== null) {
        setAutoPrint(savedPrint === "true");
      } else {
        setAutoPrint(false);
      }

      // Prioriza o tempo padrão global da esteira da loja
      const defaultTime = storeDefaultTime || (presets.length > 0 ? presets[0] : "30-50 min");
      setSelectedTime(defaultTime);
      setIsManagingPresets(false);
      setCustomTime("");
      setNewPresetValue("");
    }
  }, [open, presets, storeDefaultTime]);

  const handleSelectPreset = (preset: string) => {
    setSelectedTime(preset);
    setCustomTime("");
  };

  const handleCustomChange = (val: string) => {
    // Limita comprimento
    const truncated = val.slice(0, MAX_CUSTOM_LEN);
    setCustomTime(truncated);
    if (truncated.trim()) {
      setSelectedTime(`${truncated.trim()} min`);
    } else if (presets.length > 0) {
      setSelectedTime(presets[0]);
    }
  };

  // Salvar novo preset
  const handleAddPreset = async () => {
    const trimmed = newPresetValue.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    // Limite quantitativo
    if (presets.length >= MAX_PRESETS) return;

    // Limite de comprimento
    if (trimmed.length > MAX_PRESET_LEN) return;

    const formatted = trimmed.endsWith("min") ? trimmed : `${trimmed} min`;

    if (presets.includes(formatted)) {
      setNewPresetValue("");
      return;
    }

    const updated = [...presets, formatted];
    setPresets(updated);
    setNewPresetValue("");
    setIsSavingPresets(true);

    try {
      await storeSettingsService.updateSettings({ estimatedTimePresets: updated });
      if (onPresetsUpdated) onPresetsUpdated(updated);
    } catch (err) {
      console.error("Erro ao salvar presets de tempo:", err);
    } finally {
      setIsSavingPresets(false);
    }
  };

  // Remover preset
  const handleRemovePreset = async (presetToRemove: string) => {
    const updated = presets.filter((p) => p !== presetToRemove);
    setPresets(updated);
    if (selectedTime === presetToRemove) {
      setSelectedTime(updated[0] || "");
    }
    setIsSavingPresets(true);

    try {
      await storeSettingsService.updateSettings({ estimatedTimePresets: updated });
      if (onPresetsUpdated) onPresetsUpdated(updated);
    } catch (err) {
      console.error("Erro ao remover preset:", err);
    } finally {
      setIsSavingPresets(false);
    }
  };

  const handleToggleAutoPrint = (checked: boolean) => {
    setAutoPrint(checked);
    localStorage.setItem("popshake_auto_print_receipt", String(checked));
    localStorage.setItem("autoPrintReceiptOnAccept", String(checked));
  };

  const handleConfirm = useCallback(async () => {
    if (!order || isSubmitting) return;
    setIsSubmitting(true);
    const finalEstimatedTime = selectedTime || storeDefaultTime || "30-50 min";

    try {
      await onConfirmAccept(order.id, finalEstimatedTime);

      if (autoPrint) {
        try {
          printThermalReceipt(order);
        } catch (printErr) {
          console.error("Erro ao disparar impressão de comprovante:", printErr);
        }
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Falha ao aceitar pedido:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [order, isSubmitting, selectedTime, storeDefaultTime, onConfirmAccept, autoPrint, onOpenChange]);

  // Tecla Enter para aceite rápido e Escape para fechar
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "Enter" && !isManagingPresets) {
        const target = e.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isManagingPresets, handleConfirm, onOpenChange]);

  // Retorno antecipado APENAS após todos os Hooks terem sido invocados incondicionalmente
  if (!open || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";
  const isPickup =
    !order.delivery_address?.street ||
    order.delivery_address?.street.toLowerCase().includes("retirada");
  const totalItemsCount = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
  const presetsAtLimit = presets.length >= MAX_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-background border border-gray-200 dark:border-border/60 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-foreground dark:text-foreground">
                Aceitar Pedido #{order.id.substring(0, 6)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Confirme o tempo de preparo e envie para a cozinha
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Pedido */}
        <div className="bg-gray-50 dark:bg-[#250F29] p-3.5 rounded-2xl border border-gray-100 dark:border-border/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground dark:text-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <span>{clientName}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-normal">
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "itens"}
              </span>
            </div>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
              R$ {Number(order.total_amount).toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
            {isPickup ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 font-medium">
                <Store className="w-3 h-3" />
                Retirada no Balcão
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/40 font-medium truncate">
                <Bike className="w-3 h-3 shrink-0" />
                {order.delivery_address?.neighborhood || "Entrega em domicílio"}
              </span>
            )}
          </div>
        </div>

        {/* Seção de Tempo Estimado de Entrega */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Tempo Estimado de Entrega</span>
            </label>
            <button
              type="button"
              onClick={() => setIsManagingPresets(!isManagingPresets)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>{isManagingPresets ? "Fechar Gestão" : "Gerenciar Tempos"}</span>
            </button>
          </div>

          {/* Gestão rápida de presets inline */}
          {isManagingPresets && (
            <div className="p-3 bg-primary/5/70 dark:bg-primary/95/20 border border-primary/20 dark:border-primary/90/40 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-foreground dark:text-muted-foreground block">
                  Personalizar Botões Rápidos de Tempo:
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  presetsAtLimit
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-primary/10 text-primary dark:bg-primary/95/40 dark:text-primary/30"
                }`}>
                  {presets.length}/{MAX_PRESETS}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-background text-xs font-semibold rounded-lg border border-primary/20 dark:border-primary/80/40 text-foreground dark:text-white"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => handleRemovePreset(p)}
                      disabled={isSavingPresets || presets.length <= 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Aviso de limite atingido */}
              {presetsAtLimit ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                    Limite máximo de {MAX_PRESETS} botões atingido. Remova um para adicionar outro.
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="Ex: 40-60 min ou 45"
                      value={newPresetValue}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s+/g, " ");
                        setNewPresetValue(val.slice(0, MAX_PRESET_LEN));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPreset();
                        }
                      }}
                      maxLength={MAX_PRESET_LEN}
                      className="h-8 text-xs bg-white dark:bg-background pr-10"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 pointer-events-none font-mono">
                      {newPresetValue.length}/{MAX_PRESET_LEN}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddPreset}
                    disabled={isSavingPresets || !newPresetValue.trim() || presetsAtLimit}
                    className="h-8 text-xs bg-primary hover:bg-[#881BAA] text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ⚡ Botão em Destaque: Padrão da Loja */}
          {storeDefaultTime && (
            <button
              type="button"
              onClick={() => handleSelectPreset(storeDefaultTime)}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between border cursor-pointer ${
                selectedTime === storeDefaultTime && !customTime
                  ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-md shadow-primary/25 scale-[1.01]"
                  : "bg-primary/5/70 dark:bg-primary/95/30 text-primary/90 dark:text-purple-200 border-primary/20 dark:border-primary/80/50 hover:border-primary/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span>Usar Padrão da Loja ({storeDefaultTime})</span>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedTime === storeDefaultTime && !customTime
                    ? "bg-white/20 text-white"
                    : "bg-primary/15 text-primary dark:text-muted-foreground"
                }`}
              >
                Padrão
              </span>
            </button>
          )}

          {/* Outros Presets Rápidos */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Outros tempos rápidos:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {presets
                .filter((p) => p !== storeDefaultTime)
                .map((preset) => {
                  const isSelected = selectedTime === preset && !customTime;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold font-mono transition-all text-center border cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm shadow-primary/30 scale-[1.02]"
                          : "bg-gray-50 dark:bg-[#250F29] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-border/40 hover:border-primary/50"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Campo de tempo personalizado */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
              Ou digite:
            </span>
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Ex: 45 ou 60"
                value={customTime}
                onChange={(e) => handleCustomChange(e.target.value)}
                maxLength={MAX_CUSTOM_LEN}
                className="h-9 text-xs rounded-xl pr-12 bg-gray-50 dark:bg-[#250F29] border-gray-200 dark:border-border/40"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-mono pointer-events-none">
                min
              </span>
            </div>
          </div>
        </div>

        {/* Checkbox de Impressão Automática de Comprovante */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5/50 dark:bg-primary/95/20 border border-primary/10 dark:border-primary/90/30 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => handleToggleAutoPrint(e.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
          />
          <div className="flex items-center gap-2 text-xs font-bold text-foreground dark:text-foreground">
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Imprimir comprovante automaticamente ao aceitar</span>
          </div>
        </label>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-xl h-11 text-xs font-bold uppercase tracking-wider border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
          >
            Voltar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-2 rounded-xl h-11 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Iniciar Preparo</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
