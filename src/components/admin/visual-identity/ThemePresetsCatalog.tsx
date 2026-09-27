"use client";

import React, { useState } from "react";
import {
  Layers,
  Sliders,
  CheckCircle2,
  Wand2,
  Palette,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  HARMONIZED_PRESETS,
  HarmonizedThemePreset,
  ThemeCategory,
} from "./themePresets";
import { LoadingSettingsData, AdvancedConfig } from "@/services/loadingSettingsService";

interface Props {
  settings?: LoadingSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<LoadingSettingsData>>;
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  previewMode: "light" | "dark";
}

export function ThemePresetsCatalog({
  settings: _settings,
  setSettings,
  advancedConfig,
  setAdvancedConfig,
  previewMode,
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<"all" | ThemeCategory>("all");

  const currentThemeId = advancedConfig.themeId || "acai_traditional";
  const isCustomMode = currentThemeId === "custom" || advancedConfig.isCoupled === false;

  const handleSelectPreset = (preset: HarmonizedThemePreset) => {
    // Sincroniza Vitrine + Splash Screen simultaneamente
    const isDark = previewMode === "dark";

    const updatedStorefront = {
      light: { ...preset.storefront.light },
      dark: { ...preset.storefront.dark },
    };

    const updatedSplashScreen = {
      enabled: preset.splashScreen.enabled,
      backgroundType: preset.splashScreen.backgroundType,
      backgroundValue: isDark
        ? preset.splashScreen.backgroundValueDark
        : preset.splashScreen.backgroundValueLight,
      progressBarColor: isDark
        ? preset.splashScreen.progressBarColorDark
        : preset.splashScreen.progressBarColorLight,
      dynamicStyle: preset.splashScreen.dynamicStyle,
    };

    setAdvancedConfig((prev) => ({
      ...prev,
      themeId: preset.id,
      themeType: preset.category,
      isCoupled: true,
      storefront: updatedStorefront,
      splashScreen: updatedSplashScreen,
    }));

    setSettings((prev) => ({
      ...prev,
      theme: preset.splashScreen.theme,
      centerIcon: preset.splashScreen.centerIcon,
      phrases: [...preset.splashScreen.phrases],
      rotationInterval: preset.splashScreen.rotationInterval,
      minDuration: preset.splashScreen.minDuration,
      bgTypeLight: preset.splashScreen.backgroundType,
      bgValueLight: preset.splashScreen.backgroundValueLight,
      bgCustomLight: preset.storefront.light.baseColor,
      bgTypeDark: preset.splashScreen.backgroundType,
      bgValueDark: preset.splashScreen.backgroundValueDark,
      bgCustomDark: preset.storefront.dark.baseColor,
    }));
  };

  const handleSelectCustomMode = () => {
    setAdvancedConfig((prev) => ({
      ...prev,
      themeId: "custom",
      themeType: "custom",
      isCoupled: false,
    }));
  };

  const categories: Array<{ id: "all" | ThemeCategory; label: string; icon: LucideIcon }> = [
    { id: "all", label: "Todos os Temas", icon: Layers },
    { id: "solid", label: "Cor Sólida & Minimalista", icon: Palette },
    { id: "gradient", label: "Gradientes", icon: Waves },
    { id: "dynamic", label: "Dinâmicos (Canvas)", icon: Zap },
    { id: "custom", label: "Personalizado", icon: Sliders },
  ];

  const filteredPresets =
    selectedFilter === "all"
      ? HARMONIZED_PRESETS
      : HARMONIZED_PRESETS.filter((p) => p.category === selectedFilter);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header com badge de Sincronia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Wand2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-heading font-black text-foreground">
              Catálogo de Temas Harmonizados
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Vitrine + Splash Sincronizados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Escolha um tema pronto para sincronizar automaticamente a vitrine, botões e tela de abertura com harmonia visual impecável.
          </p>
        </div>

        {/* Status atual do sincronismo */}
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs">
          <span className="text-muted-foreground font-medium">Modo Atual:</span>
          {isCustomMode ? (
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" /> Personalizado (Desacoplado)
            </span>
          ) : (
            <span className="font-bold text-primary flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sincronizado:{" "}
              {HARMONIZED_PRESETS.find((p) => p.id === currentThemeId)?.name || "Personalizado"}
            </span>
          )}
        </div>
      </div>

      {/* Filtros em Abas */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedFilter(cat.id)}
              className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid de Cards de Temas */}
      {selectedFilter !== "custom" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((preset) => {
            const isSelected = currentThemeId === preset.id && !isCustomMode;
            const isDark = previewMode === "dark";
            const previewBg = isDark ? preset.previewBgDark : preset.previewBgLight;
            const primaryColor = isDark ? preset.primaryDark : preset.primaryLight;
            const headerBg = isDark
              ? preset.storefront.dark.headerBg
              : preset.storefront.light.headerBg;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                    : "border-border bg-background hover:border-primary/40 hover:shadow-md"
                }`}
              >
                {/* Visual Swatch Preview Card (Mock da Vitrine + Splash) */}
                <div
                  className="w-full h-28 rounded-xl overflow-hidden border border-border/60 relative flex flex-col justify-between p-2.5 transition-transform duration-300 group-hover:scale-[1.01]"
                  style={{ background: previewBg }}
                >
                  {/* Mini Header */}
                  <div
                    className="w-full h-6 rounded-lg backdrop-blur-md px-2 flex items-center justify-between shadow-xs border border-white/10"
                    style={{ backgroundColor: `${headerBg}CC` }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                      <div className="w-10 h-1.5 rounded-full bg-white/30" />
                    </div>
                    <div
                      className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] shadow-xs text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      ★
                    </div>
                  </div>

                  {/* Centro: Ícone Splash Animado + Barra */}
                  <div className="flex flex-col items-center justify-center my-auto">
                    <span className="text-2xl filter drop-shadow group-hover:scale-110 transition-transform">
                      {preset.icon}
                    </span>
                    <div className="w-20 h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full animate-pulse"
                        style={{
                          width: "70%",
                          backgroundColor: primaryColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Mini Rodapé */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-white backdrop-blur-xs">
                      {preset.badge}
                    </span>
                    <span className="text-[9px] text-white/80 font-mono font-bold">
                      {preset.categoryLabel.split(" ")[0]}
                    </span>
                  </div>
                </div>

                {/* Conteúdo Informativo */}
                <div className="pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-black text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {preset.name}
                    </h3>
                    {isSelected && (
                      <span className="text-primary flex items-center gap-1 text-[11px] font-black uppercase">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" /> Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-primary/80 mt-0.5">
                    {preset.subtitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                {/* Footer do Card com tags técnicas */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                    />
                    Primária
                  </span>
                  <span>•</span>
                  <span>Splash {preset.splashScreen.theme.replace("_", " ")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* D. Modo Personalizado (Custom / Desacoplado) */}
      {(selectedFilter === "all" || selectedFilter === "custom") && (
        <div
          onClick={handleSelectCustomMode}
          className={`rounded-2xl border p-5 cursor-pointer transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4 ${
            isCustomMode
              ? "border-amber-500/60 bg-amber-500/5 ring-2 ring-amber-500/30"
              : "border-dashed border-border hover:border-amber-500/40 bg-muted/20"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base text-foreground">
                  Modo Personalizado (Desacoplado)
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Livre Criação
                </span>
                {isCustomMode && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Desvincula as camadas da Vitrine e da Splash Screen. Permite definir manualmente cores de fundo,
                gradientes, padrões e barra de progresso de forma totalmente independente nos painéis abaixo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectCustomMode();
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 transition-colors cursor-pointer ${
              isCustomMode
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {isCustomMode ? "Modo Ativo" : "Ativar Modo Desacoplado"}
          </button>
        </div>
      )}
    </div>
  );
}
