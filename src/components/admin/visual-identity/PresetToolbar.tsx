"use client";

import React, { useState } from "react";
import { Save, Download, Edit2, Check, Bookmark, CheckCircle2 } from "lucide-react";
import { AdvancedConfig, PresetSlotConfig } from "@/services/loadingSettingsService";

interface PresetToolbarProps {
  advancedConfig: AdvancedConfig;
  onLoadPreset: (presetConfig: PresetSlotConfig | null) => void;
  onSavePreset: (index: number, name: string) => void;
  onRenameSlot: (index: number, name: string) => void;
}

export function PresetToolbar({
  advancedConfig,
  onLoadPreset,
  onSavePreset,
  onRenameSlot,
}: PresetToolbarProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const presets = advancedConfig.presets || [
    { name: "Slot 1 (Padrão)", config: null },
    { name: "Slot 2 (Verão)", config: null },
    { name: "Slot 3 (Promo)", config: null },
    { name: "Slot 4 (Noturno)", config: null },
  ];

  // Garante exatamente 4 slots
  while (presets.length < 4) {
    presets.push({ name: `Slot ${presets.length + 1}`, config: null });
  }

  const startEdit = (idx: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(idx);
    setEditingName(name);
  };

  const handleSaveName = (idx: number, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    const finalName = editingName.trim() || `Slot ${idx + 1}`;
    onRenameSlot(idx, finalName);
    setEditingIndex(null);
  };

  return (
    <div id="preset-slots-toolbar" className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Bookmark className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-foreground">
            Slots de Temas Salvos (Memória Rápida 1 a 4)
          </h3>
          <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Pacote Completo
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Guarde combinações prontas para campanhas (ex: Verão, Carnaval, Black Friday) e teste no preview sem afetar a loja ativa.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {presets.slice(0, 4).map((preset, idx) => {
          const isFilled = Boolean(preset.config);
          const savedPrimary =
            preset.config?.advancedConfig?.storefront?.light?.primary ||
            preset.config?.advancedConfig?.storefront?.light?.baseColor;

          return (
            <div
              key={idx}
              className={`flex flex-col justify-between p-3 rounded-xl border transition-all ${
                isFilled
                  ? "bg-background border-border hover:border-primary/50 shadow-2xs"
                  : "bg-muted/20 border-dashed border-border/80"
              }`}
            >
              {/* Header do Slot */}
              <div className="flex items-center justify-between gap-1 mb-2">
                {editingIndex === idx ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full text-xs bg-input border border-border rounded-lg px-2 py-1 text-foreground font-bold focus:ring-1 focus:ring-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") handleSaveName(idx, e);
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => handleSaveName(idx, e)}
                      className="p-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 cursor-pointer"
                      title="Confirmar Nome"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isFilled && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: savedPrimary || "hsl(var(--primary))" }}
                          title="Cor Primária salva"
                        />
                      )}
                      <span
                        className="text-xs font-bold text-foreground truncate"
                        title={preset.name}
                      >
                        {preset.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => startEdit(idx, preset.name, e)}
                      className="text-muted-foreground hover:text-primary p-1 rounded-md transition-colors cursor-pointer"
                      title="Renomear Slot"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Status do Slot */}
              <div className="text-[10px] text-muted-foreground mb-3 flex items-center justify-between">
                <span>
                  {isFilled ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Pacote Gravado
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 italic">Vazio</span>
                  )}
                </span>
                <span className="font-mono text-[9px] uppercase font-bold text-muted-foreground/60">
                  SLOT 0{idx + 1}
                </span>
              </div>

              {/* Ações: Carregar no Preview & Salvar no Slot */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => onLoadPreset(preset.config)}
                  disabled={!isFilled}
                  className="flex-1 text-[11px] font-bold py-1.5 px-2 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80 flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Carregar tema completo no Preview (sem alterar banco)"
                >
                  <Download className="w-3 h-3" />
                  Carregar
                </button>
                <button
                  type="button"
                  onClick={() => onSavePreset(idx, preset.name)}
                  className="flex-1 text-[11px] font-bold py-1.5 px-2 rounded-xl border border-primary text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Salvar tema completo atual neste Slot"
                >
                  <Save className="w-3 h-3" />
                  Salvar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
