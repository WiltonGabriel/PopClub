"use client";

import React, { useState } from "react";
import {
  Layers,
  Wand2,
  Sun,
  Moon,
  CheckCircle2,
  Sliders,
  Bookmark,
  Zap,
  Eye,
} from "lucide-react";
import {
  HARMONIZED_PRESETS,
  HarmonizedThemePreset,
  getContrastTextColor,
} from "./themePresets";
import type { LoadingSettingsData, AdvancedConfig } from "@/services/loadingSettingsService";

interface Props {
  settings?: LoadingSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<LoadingSettingsData>>;
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  previewMode: "light" | "dark";
  onScrollToSlots?: () => void;
  onDirty?: () => void;
  savedThemeId?: string;
  isDirty?: boolean;
}

export function ThemePresetsCatalog({
  settings,
  setSettings,
  advancedConfig,
  setAdvancedConfig,
  previewMode,
  onScrollToSlots,
  onDirty,
  savedThemeId,
  isDirty,
}: Props) {
  // Apenas 2 abas principais: "classic" e "dynamic"
  const [activeTab, setActiveTab] = useState<"classic" | "dynamic">("classic");

  // Modo local de inspeção para cada card (Sol / Lua individual por card)
  const [cardModes, setCardModes] = useState<Record<string, "light" | "dark">>({});

  const currentThemeId = advancedConfig.themeId || "popclub_original";
  const isCustomMode = currentThemeId === "custom" || advancedConfig.isCoupled === false;

  const handleSelectPreset = (preset: HarmonizedThemePreset) => {
    onDirty?.();
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

    const nextAdvanced: AdvancedConfig = {
      ...advancedConfig,
      themeId: preset.id,
      themeType: preset.category === "dynamic" ? "dynamic" : "solid",
      isCoupled: true,
      storefront: updatedStorefront,
      splashScreen: updatedSplashScreen,
    };

    setAdvancedConfig(nextAdvanced);

    const nextSettings: LoadingSettingsData = {
      ...settings,
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
      advancedConfig: nextAdvanced,
    };

    setSettings(nextSettings);
    // Modo de pré-visualização estritamente local:
    // NÃO persiste no banco de dados, NÃO salva em localStorage e NÃO dispara eventos globais
    // até que o gestor clique em "Publicar Alterações na Loja" e confirme com a trava de segurança.
  };

  const toggleCardMode = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardModes((prev) => ({
      ...prev,
      [presetId]: (prev[presetId] || previewMode) === "light" ? "dark" : "light",
    }));
  };

  const filteredPresets = HARMONIZED_PRESETS.filter(
    (preset) => preset.category === activeTab
  );

  const activePreset = HARMONIZED_PRESETS.find(
    (p) => p.id === currentThemeId || (currentThemeId === "noctalia_mesh" && p.id === "aurora_mesh")
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      {/* ── 1. Top Header com status de Sincronia / Modo Personalizado ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Wand2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-heading font-black text-foreground">
              Catálogo de Temas Harmonizados
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Padrão Shopify / Linear
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Escolha um tema pronto para sincronizar a Vitrine e a Splash Screen simultaneamente.
          </p>
        </div>

        {/* Indicador de Estado Ativo */}
        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs shrink-0">
          <span className="text-muted-foreground font-medium">Estado:</span>
          {isDirty ? (
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Pré-visualização Local: {activePreset?.name || "Personalizado"} (Rascunho)
            </span>
          ) : isCustomMode ? (
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Modo Personalizado (Editado)
            </span>
          ) : (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sincronizado com a Loja:{" "}
              {activePreset?.name || "PopClub Original"}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Aviso Contextual se o operador editou manualmente (Modo Personalizado Automático) ── */}
      {isCustomMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                Você personalizou as configurações deste tema.
              </h4>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Deseja salvar esta combinação em um dos seus 4 Slots de Memória Rápida para reutilizar depois?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onScrollToSlots}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Salvar em um Slot
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset(HARMONIZED_PRESETS[0])}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-background/80 border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Restaurar Original
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Navegação por Abas Limpa (Apenas 2 Abas Principais) ── */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("classic")}
          className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "classic"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm font-bold scale-[1.01]"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-transparent"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Temas Clássicos (3)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dynamic")}
          className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "dynamic"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm font-bold scale-[1.01]"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-transparent"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Temas Dinâmicos (2)</span>
        </button>

        {isCustomMode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl ml-auto">
            <Sliders className="w-3.5 h-3.5" /> Modo Personalizado Ativo
          </span>
        )}
      </div>

      {/* ── 4. Grid de Cards de Temas Prontos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => {
          const isSelected = currentThemeId === preset.id && !isCustomMode;
          // Inspeciona no modo local do card ou no modo da tela
          const cardMode = cardModes[preset.id] || previewMode;
          const isDark = cardMode === "dark";

          const previewBg = isDark ? preset.previewBgDark : preset.previewBgLight;
          const primaryColor = isDark ? preset.primaryDark : preset.primaryLight;
          const headerBg = isDark
            ? preset.storefront.dark.headerBg
            : preset.storefront.light.headerBg;

          // Contraste inteligente do texto e logo dentro da miniatura
          const headerTextColor = getContrastTextColor(headerBg);

          return (
            <div
              key={preset.id}
              data-theme-id={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                  : "border-border bg-background hover:border-primary/40 hover:shadow-md"
              }`}
            >
              {/* Miniatura do Celular / Preview Swatch com Contraste Inteligente */}
              <div
                className="w-full h-32 rounded-xl overflow-hidden border border-border/80 relative flex flex-col justify-between p-2.5 transition-transform duration-300 group-hover:scale-[1.01]"
                style={{ background: previewBg }}
              >
                {/* Mini Topbar com Logo adaptativo de contraste */}
                <div
                  className="w-full h-6 rounded-lg backdrop-blur-md px-2 flex items-center justify-between shadow-xs border border-white/10"
                  style={{ backgroundColor: `${headerBg}E6` }}
                >
                  <div className="flex items-center gap-1 font-heading font-black text-[10px]">
                    <span style={{ color: headerTextColor }}>Pop</span>
                    <span style={{ color: primaryColor }}>Shake</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de Alternância Rápida Sol / Lua dentro do card */}
                    <button
                      type="button"
                      onClick={(e) => toggleCardMode(preset.id, e)}
                      className="p-1 rounded-md bg-black/10 dark:bg-white/10 hover:bg-black/20 text-current transition-transform active:scale-90"
                      title={isDark ? "Inspecionar Modo Claro" : "Inspecionar Modo Escuro"}
                      style={{ color: headerTextColor }}
                    >
                      {isDark ? (
                        <Sun className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Moon className="w-3 h-3" />
                      )}
                    </button>

                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      ★
                    </div>
                  </div>
                </div>

                {/* Centro: Ícone Splash Animado + Barra de Progresso Sincronizada */}
                <div className="flex flex-col items-center justify-center my-auto">
                  <span className="text-2xl filter drop-shadow group-hover:scale-110 transition-transform">
                    {preset.icon}
                  </span>
                  <div className="w-24 h-1.5 bg-black/10 dark:bg-white/15 rounded-full mt-2 overflow-hidden border border-white/10">
                    <div
                      className="h-full rounded-full animate-pulse"
                      style={{
                        width: "75%",
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 6px ${primaryColor}`,
                      }}
                    />
                  </div>
                </div>

                {/* Mini Rodapé da Miniatura */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-white backdrop-blur-xs">
                    {preset.badge}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-foreground/80 px-1 rounded bg-white/20 dark:bg-black/30 backdrop-blur-xs">
                    {isDark ? "🌙 Noturno" : "☀️ Claro"}
                  </span>
                </div>
              </div>

              {/* Informações Textuais do Tema */}
              <div className="pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-black text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {preset.name}
                  </h3>
                  {isSelected ? (
                    isDirty ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px] font-black uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo na Loja
                      </span>
                    )
                  ) : preset.id === savedThemeId ? (
                    <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-bold bg-muted/60 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativo no Banco
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] font-semibold text-primary/80 mt-0.5">
                  {preset.subtitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              {/* Footer do Card com Swatch de Cores */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-mono font-bold text-foreground">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10"
                      style={{ backgroundColor: primaryColor }}
                    />
                    {primaryColor}
                  </span>
                  <span>•</span>
                  <span>Splash {preset.splashScreen.theme.replace("_", " ")}</span>
                </div>

                <span
                  data-apply-theme={preset.id}
                  className={`font-bold transition-transform ${
                    isSelected
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary group-hover:translate-x-0.5"
                  }`}
                >
                  {isSelected ? "Em Preview ✓" : "Testar no Preview →"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
