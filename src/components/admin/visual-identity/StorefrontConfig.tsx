"use client";

import React from "react";
import { AdvancedConfig } from "@/services/loadingSettingsService";
import { Palette, Layers, Sliders } from "lucide-react";

interface Props {
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  mode: "light" | "dark";
  onManualChange?: () => void;
}

export function StorefrontConfig({
  advancedConfig,
  setAdvancedConfig,
  mode,
  onManualChange,
}: Props) {
  const config =
    mode === "light"
      ? advancedConfig.storefront?.light || {
          baseColor: "#FDFBF7",
          gradient: "",
          texture: "none",
          textureOpacity: 0.1,
          headerBg: "#FFFFFF",
          footerBg: "#FDFBF7",
          primary: "#4A0E4E",
        }
      : advancedConfig.storefront?.dark || {
          baseColor: "#121212",
          gradient: "",
          texture: "none",
          textureOpacity: 0.1,
          headerBg: "#181818",
          footerBg: "#121212",
          primary: "#FFFFFF",
        };

  type StorefrontModeConfig = NonNullable<AdvancedConfig["storefront"]["light"]>;

  const updateConfig = <K extends keyof StorefrontModeConfig>(
    key: K,
    value: StorefrontModeConfig[K]
  ) => {
    setAdvancedConfig((prev) => ({
      ...prev,
      // Transição automática para Modo Personalizado (Editado)
      themeId: "custom",
      isCoupled: false,
      storefront: {
        ...prev.storefront,
        [mode]: {
          ...(prev.storefront ? prev.storefront[mode] : {}),
          [key]: value,
        },
      },
    }));
    onManualChange?.();
  };

  const primaryColor =
    config.primary || (mode === "dark" ? "#FFFFFF" : "#4A0E4E");

  return (
    <div className="space-y-6">
      {/* 1. Camada Base & Cor Primária */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-primary" /> Cores da Vitrine & Marca ({mode === "light" ? "Modo Claro" : "Modo Escuro"})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cor Sólida Base */}
          <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Cor de Fundo (Base)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.baseColor || (mode === "dark" ? "#121212" : "#FDFBF7")}
                onChange={(e) => updateConfig("baseColor", e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5 bg-background shrink-0"
              />
              <input
                type="text"
                value={config.baseColor || (mode === "dark" ? "#121212" : "#FDFBF7")}
                onChange={(e) => updateConfig("baseColor", e.target.value)}
                className="text-xs font-mono font-bold bg-background border border-border rounded-lg px-3 py-2 flex-1 text-foreground"
              />
            </div>
          </div>

          {/* Cor Primária da Marca */}
          <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground block flex items-center justify-between">
              <span>Cor Primária (Botões e Destaques)</span>
              <span
                className="w-3 h-3 rounded-full border border-black/10"
                style={{ backgroundColor: primaryColor }}
              />
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => updateConfig("primary", e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5 bg-background shrink-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => updateConfig("primary", e.target.value)}
                className="text-xs font-mono font-bold bg-background border border-border rounded-lg px-3 py-2 flex-1 text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Gradiente de Fundo Opcional */}
        <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
          <label className="text-xs font-bold text-foreground block">
            Gradiente Personalizado (CSS) — Deixe vazio para usar a cor sólida
          </label>
          <input
            type="text"
            placeholder="ex: linear-gradient(135deg, #3B0764 0%, #BE185D 100%)"
            value={config.gradient || ""}
            onChange={(e) => updateConfig("gradient", e.target.value)}
            className="w-full text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 text-foreground"
          />
        </div>
      </div>

      {/* 2. Texturas de Fundo */}
      <div className="space-y-4 pt-2 border-t border-border">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> Textura & Acabamento Overlay
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: "none", label: "Nenhuma" },
            { id: "dots", label: "Pontos" },
            { id: "grid", label: "Grade" },
            { id: "noise", label: "Ruído" },
            { id: "organic", label: "Orgânico" },
          ].map((tex) => (
            <label
              key={tex.id}
              className={`flex items-center justify-center p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                (config.texture || "none") === tex.id
                  ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                  : "border-border hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="storefrontTexture"
                value={tex.id}
                checked={(config.texture || "none") === tex.id}
                onChange={() => updateConfig("texture", tex.id)}
                className="hidden"
              />
              <span className="text-xs">{tex.label}</span>
            </label>
          ))}
        </div>

        {config.texture && config.texture !== "none" && (
          <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-foreground">
              <span>Intensidade da Textura</span>
              <span className="font-mono">{Math.round((config.textureOpacity || 0.1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.01"
              value={config.textureOpacity || 0.1}
              onChange={(e) => updateConfig("textureOpacity", parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 3. Cabeçalho & Rodapé */}
      <div className="space-y-4 pt-2 border-t border-border">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-primary" /> Cabeçalho & Rodapé da Vitrine
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground block">Cor do Cabeçalho</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.headerBg || (mode === "dark" ? "#181818" : "#FFFFFF")}
                onChange={(e) => updateConfig("headerBg", e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5 bg-background shrink-0"
              />
              <input
                type="text"
                value={config.headerBg || (mode === "dark" ? "#181818" : "#FFFFFF")}
                onChange={(e) => updateConfig("headerBg", e.target.value)}
                className="text-xs font-mono font-bold bg-background border border-border rounded-lg px-3 py-2 flex-1 text-foreground"
              />
            </div>
          </div>

          <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground block">Cor do Rodapé</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.footerBg || (mode === "dark" ? "#121212" : "#FDFBF7")}
                onChange={(e) => updateConfig("footerBg", e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5 bg-background shrink-0"
              />
              <input
                type="text"
                value={config.footerBg || (mode === "dark" ? "#121212" : "#FDFBF7")}
                onChange={(e) => updateConfig("footerBg", e.target.value)}
                className="text-xs font-mono font-bold bg-background border border-border rounded-lg px-3 py-2 flex-1 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
