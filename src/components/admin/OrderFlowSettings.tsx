"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeSettingsService } from "@/services/storeSettingsService";

export function OrderFlowSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [timePresets, setTimePresets] = useState<string[]>([
    "20-30 min",
    "35-50 min",
    "50-70 min",
  ]);
  const [rejectionPresets, setRejectionPresets] = useState<string[]>([
    "Ingrediente/item do cardápio indisponível no momento",
    "Endereço fora da área de entrega atendida",
    "Pico de demanda: cozinha sobrecarregada temporariamente",
    "Estabelecimento em processo de fechamento de turno",
  ]);

  const [newTimeInput, setNewTimeInput] = useState("");
  const [newReasonInput, setNewReasonInput] = useState("");

  const [autoPrintReceipt, setAutoPrintReceipt] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("popshake_auto_print_receipt") ??
        localStorage.getItem("autoPrintReceiptOnAccept");
      return saved === "true";
    }
    return false;
  });

  const handleToggleAutoPrintReceipt = (checked: boolean) => {
    setAutoPrintReceipt(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("popshake_auto_print_receipt", String(checked));
      localStorage.setItem("autoPrintReceiptOnAccept", String(checked));
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await storeSettingsService.getSettings();
        if (settings.estimatedTimePresets && settings.estimatedTimePresets.length > 0) {
          setTimePresets(settings.estimatedTimePresets);
        }
        if (settings.rejectionReasonPresets && settings.rejectionReasonPresets.length > 0) {
          setRejectionPresets(settings.rejectionReasonPresets);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de esteira:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleAddTimePreset = () => {
    if (!newTimeInput.trim()) return;
    const formatted = newTimeInput.trim().endsWith("min")
      ? newTimeInput.trim()
      : `${newTimeInput.trim()} min`;

    if (!timePresets.includes(formatted)) {
      setTimePresets([...timePresets, formatted]);
    }
    setNewTimeInput("");
  };

  const handleRemoveTimePreset = (index: number) => {
    if (timePresets.length <= 1) return;
    setTimePresets(timePresets.filter((_, i) => i !== index));
  };

  const handleAddReasonPreset = () => {
    const val = newReasonInput.trim();
    if (!val) return;
    if (!rejectionPresets.includes(val)) {
      setRejectionPresets([...rejectionPresets, val]);
    }
    setNewReasonInput("");
  };

  const handleRemoveReasonPreset = (index: number) => {
    if (rejectionPresets.length <= 1) return;
    setRejectionPresets(rejectionPresets.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await storeSettingsService.updateSettings({
        estimatedTimePresets: timePresets,
        rejectionReasonPresets: rejectionPresets,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar presets:", err);
      alert("Não foi possível salvar as configurações de presets.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-primary" />
        <span>Carregando configurações de triagem...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-background border border-gray-200 dark:border-border/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-100 dark:border-border/30">
        <div>
          <h2 className="font-heading font-black text-xl text-foreground dark:text-foreground">
            Atendimento & Esteira de Pedidos
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure os presets rápidos utilizados pela equipe durante o aceite e recusa de pedidos
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading font-bold text-xs uppercase tracking-wider px-5 h-11 flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Salvo com Sucesso!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bloco 1: Presets de Tempo de Entrega */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/5 dark:bg-primary/95/60 text-primary dark:text-muted-foreground flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground dark:text-foreground">
                Botões de Tempo Estimado
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Opções rápidas sugeridas ao aceitar um pedido
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {timePresets.map((preset, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-[#250F29] border border-gray-200 dark:border-border/40 rounded-xl text-xs font-mono font-bold text-foreground dark:text-foreground"
              >
                <span>{preset}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTimePreset(idx)}
                  disabled={timePresets.length <= 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 cursor-pointer ml-1"
                  title="Remover preset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              type="text"
              placeholder="Ex: 15-25 min ou 40 min"
              value={newTimeInput}
              onChange={(e) => setNewTimeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTimePreset();
                }
              }}
              className="text-xs rounded-xl bg-gray-50 dark:bg-[#250F29] border-gray-200 dark:border-border/40 h-10"
            />
            <Button
              type="button"
              onClick={handleAddTimePreset}
              disabled={!newTimeInput.trim()}
              className="h-10 px-4 rounded-xl text-xs font-bold bg-primary hover:bg-[#881BAA] text-white shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Bloco 2: Presets de Motivo de Recusa */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground dark:text-foreground">
                Motivos Frequentes de Recusa
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Respostas padrão exibidas ao recusar um pedido
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {rejectionPresets.map((reason, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 dark:bg-[#250F29] border border-gray-200 dark:border-border/40 rounded-xl text-xs text-gray-700 dark:text-gray-300"
              >
                <span className="truncate">{reason}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReasonPreset(idx)}
                  disabled={rejectionPresets.length <= 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 cursor-pointer shrink-0 ml-2"
                  title="Remover motivo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              type="text"
              placeholder="Ex: Fora do horário de entrega..."
              value={newReasonInput}
              onChange={(e) => setNewReasonInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddReasonPreset();
                }
              }}
              className="text-xs rounded-xl bg-gray-50 dark:bg-[#250F29] border-gray-200 dark:border-border/40 h-10"
            />
            <Button
              type="button"
              onClick={handleAddReasonPreset}
              disabled={!newReasonInput.trim()}
              className="h-10 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Bloco 3: Automação de Impressão de Comprovante */}
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/5 dark:bg-primary/95/60 text-primary dark:text-muted-foreground flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground dark:text-foreground">
                Automação de Impressão de Comprovante
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Configure a impressão de comprovantes para 80mm e 58mm
              </p>
            </div>
          </div>

          <label className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-[#250F29] border border-gray-200 dark:border-border/40 rounded-2xl cursor-pointer select-none">
            <div className="space-y-0.5 pr-3">
              <span className="text-xs font-bold text-foreground dark:text-foreground block">
                Imprimir comprovante automaticamente ao aceitar
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                Ao confirmar o aceite do pedido na triagem, abre imediatamente o diálogo de impressão
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoPrintReceipt}
              onChange={(e) => handleToggleAutoPrintReceipt(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
