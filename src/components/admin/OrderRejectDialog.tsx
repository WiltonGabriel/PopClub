"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  XCircle,
  X,
  Settings,
  Plus,
  Trash2,
  Store,
  Bike,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Order } from "@/services/orderService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeSettingsService } from "@/services/storeSettingsService";

// ─── Limites rígidos anti-bloat ──────────────────────────────────────────────────────────────────
const MAX_PRESETS = 6;
const MAX_PRESET_LEN = 60;
const MAX_REASON_LEN = 120;
// ─────────────────────────────────────────────────────────────────────────────

interface OrderRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onConfirmReject: (orderId: string, reason: string) => Promise<void>;
  initialPresets?: string[];
  onPresetsUpdated?: (presets: string[]) => void;
}

export function OrderRejectDialog({
  open,
  onOpenChange,
  order,
  onConfirmReject,
  initialPresets = [
    "Ingrediente/item do cardápio indisponível no momento",
    "Endereço fora da área de entrega atendida",
    "Pico de demanda: cozinha sobrecarregada temporariamente",
    "Estabelecimento em processo de fechamento de turno",
  ],
  onPresetsUpdated,
}: OrderRejectDialogProps) {
  const [presets, setPresets] = useState<string[]>(initialPresets);
  const [reason, setReason] = useState<string>("");
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
      setReason("");
      setIsManagingPresets(false);
      setNewPresetValue("");
    }
  }, [open]);

  if (!open || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";
  const isPickup =
    !order.delivery_address?.street ||
    order.delivery_address?.street.toLowerCase().includes("retirada");
  const totalItemsCount = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
  const presetsAtLimit = presets.length >= MAX_PRESETS;
  const reasonRemaining = MAX_REASON_LEN - reason.length;

  const handleSelectPreset = (presetText: string) => {
    setReason(presetText);
  };

  const handleAddPreset = async () => {
    const trimmed = newPresetValue.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    // Limite quantitativo
    if (presets.length >= MAX_PRESETS) return;

    // Limite de comprimento
    if (trimmed.length > MAX_PRESET_LEN) return;

    if (presets.includes(trimmed)) {
      setNewPresetValue("");
      return;
    }

    const updated = [...presets, trimmed];
    setPresets(updated);
    setNewPresetValue("");
    setIsSavingPresets(true);

    try {
      await storeSettingsService.updateSettings({ rejectionReasonPresets: updated });
      if (onPresetsUpdated) onPresetsUpdated(updated);
    } catch (err) {
      console.error("Erro ao salvar presets de motivo de recusa:", err);
    } finally {
      setIsSavingPresets(false);
    }
  };

  const handleRemovePreset = async (presetToRemove: string) => {
    const updated = presets.filter((p) => p !== presetToRemove);
    setPresets(updated);
    setIsSavingPresets(true);

    try {
      await storeSettingsService.updateSettings({ rejectionReasonPresets: updated });
      if (onPresetsUpdated) onPresetsUpdated(updated);
    } catch (err) {
      console.error("Erro ao remover preset:", err);
    } finally {
      setIsSavingPresets(false);
    }
  };

  const handleConfirm = async () => {
    if (!order || !reason.trim()) return;
    setIsSubmitting(true);

    try {
      await onConfirmReject(order.id, reason.trim());
      onOpenChange(false);
    } catch (err) {
      console.error("Falha ao recusar pedido:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E0911] border border-gray-200 dark:border-red-900/50 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-red-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-foreground dark:text-foreground">
                Recusar Pedido #{order.id.substring(0, 6)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                O cliente será notificado imediatamente com a justificativa
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Pedido */}
        <div className="bg-gray-50 dark:bg-[#2A0E18] p-3.5 rounded-2xl border border-gray-100 dark:border-red-900/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground dark:text-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <span>{clientName}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 font-normal">
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "itens"}
              </span>
            </div>
            <span className="font-mono text-red-600 dark:text-red-400 font-black">
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

        {/* Presets Rápidos de Motivo */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <span>Motivos Frequentes de Recusa</span>
            </label>
            <button
              type="button"
              onClick={() => setIsManagingPresets(!isManagingPresets)}
              className="text-[11px] font-bold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>{isManagingPresets ? "Fechar Gestão" : "Gerenciar Motivos"}</span>
            </button>
          </div>

          {/* Gestão rápida de presets inline */}
          {isManagingPresets && (
            <div className="p-3 bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-900 dark:text-red-200 block">
                  Personalizar Motivos de Recusa:
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  presetsAtLimit
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                }`}>
                  {presets.length}/{MAX_PRESETS}
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {presets.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between gap-2 p-1.5 px-2 bg-white dark:bg-[#1A0B12] rounded-lg border border-red-100 dark:border-red-900/30 text-xs"
                  >
                    <span className="text-gray-700 dark:text-gray-300 truncate">{p}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreset(p)}
                      disabled={isSavingPresets || presets.length <= 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {presetsAtLimit ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                    Limite máximo de {MAX_PRESETS} motivos atingido. Remova um para adicionar outro.
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="Novo motivo de cancelamento..."
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
                      className="h-8 text-xs bg-white dark:bg-[#1A0B12] pr-12"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-gray-400 pointer-events-none font-mono">
                      {newPresetValue.length}/{MAX_PRESET_LEN}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddPreset}
                    disabled={isSavingPresets || !newPresetValue.trim() || presetsAtLimit}
                    className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Chips dos presets de motivo */}
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const isSelected = reason === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : "bg-gray-50 dark:bg-[#2A0E18] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-red-900/40 hover:border-red-400"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea com Justificativa Obrigatória */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground dark:text-foreground flex items-center justify-between">
            <span>Justificativa Obrigatória:</span>
            <span className={`text-[10px] font-mono font-bold ${
              reasonRemaining <= 20
                ? "text-red-500 dark:text-red-400"
                : reasonRemaining <= 50
                ? "text-amber-500 dark:text-amber-400"
                : "text-gray-400"
            }`}>
              {reasonRemaining}/{MAX_REASON_LEN}
            </span>
          </label>
          <textarea
            rows={3}
            placeholder="Selecione um motivo acima ou descreva detalhadamente a justificativa para o cliente..."
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setReason(e.target.value.slice(0, MAX_REASON_LEN))
            }
            maxLength={MAX_REASON_LEN}
            className="w-full p-3 text-xs rounded-xl bg-gray-50 dark:bg-[#2A0E18] border border-gray-200 dark:border-red-900/40 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 rounded-xl h-11 text-xs font-bold uppercase tracking-wider border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            Voltar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
            className="flex-2 rounded-xl h-11 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelando...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Confirmar Cancelamento</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
