"use client";
import React, { useState } from "react";
import { Save, Download, Edit2, Check } from "lucide-react";
import { AdvancedConfig } from "@/services/loadingSettingsService";

interface PresetToolbarProps {
  advancedConfig: AdvancedConfig;
  onLoadPreset: (presetConfig: any) => void;
  onSavePreset: (index: number, name: string) => void;
}

export function PresetToolbar({ advancedConfig, onLoadPreset, onSavePreset }: PresetToolbarProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const presets = advancedConfig.presets || [
    { name: "Slot 1", config: null },
    { name: "Slot 2", config: null },
    { name: "Slot 3", config: null },
    { name: "Slot 4", config: null },
  ];

  // Ensure we have exactly 4 slots
  while (presets.length < 4) {
    presets.push({ name: `Slot \${presets.length + 1}`, config: null });
  }

  const startEdit = (idx: number, name: string) => {
    setEditingIndex(idx);
    setEditingName(name);
  };

  const handleSaveName = (idx: number) => {
    onSavePreset(idx, editingName);
    setEditingIndex(null);
  };

  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Save className="w-4 h-4 text-primary" />
        Slots de Identidade (Presets)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {presets.slice(0, 4).map((preset, idx) => (
          <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
            {editingIndex === idx ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full text-xs bg-input border border-border rounded px-2 py-1 text-foreground"
                  autoFocus
                />
                <button onClick={() => handleSaveName(idx)} className="p-1 text-green-600 bg-green-50 rounded hover:bg-green-100">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate" title={preset.name}>
                  {preset.name}
                </span>
                <button onClick={() => startEdit(idx, preset.name)} className="text-muted-foreground hover:text-primary p-1">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onLoadPreset(preset.config)}
                disabled={!preset.config}
                className="flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md bg-secondary text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/80 flex items-center justify-center gap-1 transition-colors"
                title="Carregar para edição (Preview)"
              >
                <Download className="w-3 h-3" />
                Carregar
              </button>
              <button
                onClick={() => onSavePreset(idx, preset.name)}
                className="flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center gap-1 transition-colors"
                title="Salvar alterações atuais neste Slot"
              >
                <Save className="w-3 h-3" />
                Salvar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
