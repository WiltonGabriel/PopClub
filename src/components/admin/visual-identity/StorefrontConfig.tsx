"use client";
import React from "react";
import { LoadingSettingsData, AdvancedConfig } from "@/services/loadingSettingsService";

interface Props {
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  mode: "light" | "dark";
}

export function StorefrontConfig({ advancedConfig, setAdvancedConfig, mode }: Props) {
  const config = mode === "light" ? advancedConfig.storefront.light : advancedConfig.storefront.dark;

  const updateConfig = (key: keyof typeof config, value: any) => {
    setAdvancedConfig((prev) => ({
      ...prev,
      storefront: {
        ...prev.storefront,
        [mode]: {
          ...prev.storefront[mode],
          [key]: value
        }
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">Camada Principal (Base)</h4>

        <div>
          <label className="text-xs font-semibold text-foreground">Cor Sólida (Base)</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="color"
              value={config.baseColor}
              onChange={(e) => updateConfig('baseColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              value={config.baseColor}
              onChange={(e) => updateConfig('baseColor', e.target.value)}
              className="text-xs bg-input border border-border rounded px-3 py-2 w-28 text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">Camada de Textura (Overlay)</h4>
        <div className="grid grid-cols-2 gap-3">
          {["none", "dots", "noise", "grid", "organic"].map((tex) => (
            <label key={tex} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${config.texture === tex ? "bg-primary/10 border-primary" : "border-border hover:bg-background"}`}>
              <input
                type="radio"
                name="texture"
                value={tex}
                checked={config.texture === tex}
                onChange={() => updateConfig('texture', tex)}
                className="hidden"
              />
              <span className="text-xs font-semibold text-foreground capitalize">{tex === "none" ? "Nenhuma" : tex}</span>
            </label>
          ))}
        </div>

        {config.texture !== "none" && (
          <div>
            <label className="text-xs font-semibold text-foreground flex justify-between">
              <span>Opacidade da Textura</span>
              <span>{Math.round(config.textureOpacity * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.01"
              value={config.textureOpacity}
              onChange={(e) => updateConfig('textureOpacity', parseFloat(e.target.value))}
              className="w-full mt-2 accent-primary"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-foreground">Cabeçalho & Rodapé</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground">Cor do Cabeçalho</label>
            <input
              type="color"
              value={config.headerBg}
              onChange={(e) => updateConfig('headerBg', e.target.value)}
              className="w-full h-10 mt-1 rounded cursor-pointer border-0 p-0"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Cor do Rodapé</label>
            <input
              type="color"
              value={config.footerBg}
              onChange={(e) => updateConfig('footerBg', e.target.value)}
              className="w-full h-10 mt-1 rounded cursor-pointer border-0 p-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
