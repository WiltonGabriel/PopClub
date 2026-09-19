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
} from "lucide-react";
import { Order } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeSettingsService } from "@/services/storeSettingsService";
import { printThermalReceipt } from "@/lib/thermalPrinter";

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
    }
  }, [open, presets, storeDefaultTime]);

  if (!open || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";
  const isPickup =
    !order.delivery_address?.street ||
    order.delivery_address?.street.toLowerCase().includes("retirada");
  const totalItemsCount = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;

  const handleSelectPreset = (preset: string) => {
    setSelectedTime(preset);
    setCustomTime("");
  };

  const handleCustomChange = (val: string) => {
    setCustomTime(val);
    if (val.trim()) {
      setSelectedTime(`${val.trim()} min`);
    } else if (presets.length > 0) {
      setSelectedTime(presets[0]);
    }
  };

  // Salvar novo preset
  const handleAddPreset = async () => {
    if (!newPresetValue.trim()) return;
    const formatted = newPresetValue.trim().endsWith("min")
      ? newPresetValue.trim()
      : `${newPresetValue.trim()} min`;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E0921] border border-gray-200 dark:border-[#512B54]/60 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#512B54]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-[#4C264F] dark:text-[#F9F5F9]">
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
        <div className="bg-gray-50 dark:bg-[#250F29] p-3.5 rounded-2xl border border-gray-100 dark:border-[#512B54]/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#4C264F] dark:text-[#F9F5F9]">
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
              <Clock className="w-3.5 h-3.5 text-[#9306CF]" />
              <span>Tempo Estimado de Entrega</span>
            </label>
            <button
              type="button"
              onClick={() => setIsManagingPresets(!isManagingPresets)}
              className="text-[11px] font-bold text-[#9306CF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>{isManagingPresets ? "Fechar Gestão" : "Gerenciar Tempos"}</span>
            </button>
          </div>

          {/* Gestão rápida de presets inline */}
          {isManagingPresets && (
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-[#4C264F] dark:text-[#C7A9C9] block">
                Personalizar Botões Rápidos de Tempo:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#1A0B1C] text-xs font-semibold rounded-lg border border-purple-200 dark:border-purple-800/40 text-[#4C264F] dark:text-white"
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

              <div className="flex gap-2 pt-1">
                <Input
                  type="text"
                  placeholder="Ex: 40-60 min ou 45 min"
                  value={newPresetValue}
                  onChange={(e) => setNewPresetValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPreset();
                    }
                  }}
                  className="h-8 text-xs bg-white dark:bg-[#1A0B1C]"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddPreset}
                  disabled={isSavingPresets || !newPresetValue.trim()}
                  className="h-8 text-xs bg-[#9306CF] hover:bg-[#881BAA] text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {/* ⚡ Botão em Destaque: Padrão da Loja */}
          {storeDefaultTime && (
            <button
              type="button"
              onClick={() => handleSelectPreset(storeDefaultTime)}
              className={`w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between border cursor-pointer ${
                selectedTime === storeDefaultTime && !customTime
                  ? "bg-gradient-to-r from-[#9306CF] to-[#940068] text-white border-transparent shadow-md shadow-[#9306CF]/25 scale-[1.01]"
                  : "bg-purple-50/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800/50 hover:border-[#9306CF]/60"
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
                    : "bg-[#9306CF]/15 text-[#9306CF] dark:text-[#C7A9C9]"
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
                          ? "bg-[#9306CF] text-white border-[#9306CF] shadow-sm shadow-[#9306CF]/30 scale-[1.02]"
                          : "bg-gray-50 dark:bg-[#250F29] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50"
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
                placeholder="Ex: 45 min ou 60"
                value={customTime}
                onChange={(e) => handleCustomChange(e.target.value)}
                className="h-9 text-xs rounded-xl pr-12 bg-gray-50 dark:bg-[#250F29] border-gray-200 dark:border-[#512B54]/40"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-mono pointer-events-none">
                min
              </span>
            </div>
          </div>
        </div>

        {/* Checkbox de Impressão Automática de Comprovante */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoPrint}
            onChange={(e) => handleToggleAutoPrint(e.target.checked)}
            className="w-4 h-4 rounded text-[#9306CF] focus:ring-[#9306CF] border-gray-300 cursor-pointer"
          />
          <div className="flex items-center gap-2 text-xs font-bold text-[#4C264F] dark:text-[#F9F5F9]">
            <Printer className="w-3.5 h-3.5 text-[#9306CF]" />
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
            className="flex-1 rounded-xl h-11 text-xs font-bold uppercase tracking-wider border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
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
