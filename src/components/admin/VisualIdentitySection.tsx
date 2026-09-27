"use client";

import React, { useEffect, useState } from "react";
import {
  loadingSettingsService,
  LoadingSettingsData,
  AdvancedConfig,
  PresetSlotConfig,
} from "@/services/loadingSettingsService";
import { useToast } from "@/components/ui/ToastNotification";
import {
  ThemePresetsCatalog,
  PresetToolbar,
  StorefrontConfig,
  SplashScreenConfig,
  LivePreview,
  HARMONIZED_PRESETS,
} from "./visual-identity";
import {
  ShieldAlert,
  Sparkles,
  X,
  Palette,
  Smartphone,
  ArrowRight,
} from "lucide-react";

const DEFAULT_ADVANCED: AdvancedConfig = {
  themeId: "acai_traditional",
  themeType: "solid",
  isCoupled: true,
  storefront: {
    light: {
      baseColor: "#FDFBF7",
      gradient: "",
      texture: "none",
      textureOpacity: 0.1,
      headerBg: "#FFFFFF",
      footerBg: "#FDFBF7",
      primary: "#4A0E4E",
    },
    dark: {
      baseColor: "#1A091D",
      gradient: "",
      texture: "none",
      textureOpacity: 0.1,
      headerBg: "#120514",
      footerBg: "#1A091D",
      primary: "#E899FF",
    },
  },
  splashScreen: {
    enabled: true,
    backgroundType: "solid",
    backgroundValue: "#FDFBF7",
    progressBarColor: "#4A0E4E",
    dynamicStyle: undefined,
  },
  presets: [
    { name: "Slot 1 (Padrão)", config: null },
    { name: "Slot 2 (Verão)", config: null },
    { name: "Slot 3 (Promo)", config: null },
    { name: "Slot 4 (Noturno)", config: null },
  ],
};

export function VisualIdentitySection() {
  const [settings, setSettings] = useState<LoadingSettingsData>(
    loadingSettingsService.getCachedLoadingSettings()
  );
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>(DEFAULT_ADVANCED);
  const [mode, setMode] = useState<"light" | "dark">("light");

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const toast = useToast();

  useEffect(() => {
    loadingSettingsService.getLoadingSettings().then((remote) => {
      setSettings(remote);
      if (remote.advancedConfig && Object.keys(remote.advancedConfig).length > 0) {
        setAdvancedConfig({
          ...DEFAULT_ADVANCED,
          ...remote.advancedConfig,
          storefront: {
            light: {
              ...DEFAULT_ADVANCED.storefront.light,
              ...(remote.advancedConfig.storefront?.light || {}),
            },
            dark: {
              ...DEFAULT_ADVANCED.storefront.dark,
              ...(remote.advancedConfig.storefront?.dark || {}),
            },
          },
          splashScreen: {
            ...DEFAULT_ADVANCED.splashScreen,
            ...(remote.advancedConfig.splashScreen || {}),
          },
          presets:
            Array.isArray(remote.advancedConfig.presets) && remote.advancedConfig.presets.length > 0
              ? remote.advancedConfig.presets
              : DEFAULT_ADVANCED.presets,
        });
      } else {
        setAdvancedConfig(DEFAULT_ADVANCED);
      }
    });
  }, []);

  const handleSaveToSlot = (idx: number, name: string) => {
    const updatedPresets = [...(advancedConfig.presets || DEFAULT_ADVANCED.presets)];
    while (updatedPresets.length < 4) {
      updatedPresets.push({ name: `Slot ${updatedPresets.length + 1}`, config: null });
    }

    const { presets: _omit, ...restConfig } = advancedConfig;
    updatedPresets[idx] = {
      name,
      config: {
        settings: { ...settings },
        advancedConfig: { ...restConfig },
        savedAt: new Date().toISOString(),
      },
    };

    const nextAdvanced = { ...advancedConfig, presets: updatedPresets };
    setAdvancedConfig(nextAdvanced);

    toast.showToast({
      title: "Tema Salvo no Slot",
      message: `Configuração completa gravada no ${name}.`,
      type: "success",
    });

    // Persiste no backend de forma silenciosa para o slot não se perder ao recarregar a página
    saveToApi(true, nextAdvanced);
  };

  const handleLoadSlot = (config: PresetSlotConfig | null) => {
    if (!config) return;
    if (config.settings) setSettings((prev) => ({ ...prev, ...config.settings }));
    if (config.advancedConfig) {
      setAdvancedConfig((prev) => ({
        ...prev,
        ...config.advancedConfig,
        presets: prev.presets, // preserva a lista de slots
      }));
    }
    toast.showToast({
      title: "Preset Carregado no Preview",
      message: "Configuração aplicada para teste no celular. Clique em Publicar para aplicar na loja ao vivo.",
      type: "info",
    });
  };

  const handleDiscard = () => {
    const cached = loadingSettingsService.getCachedLoadingSettings();
    setSettings(cached);
    setAdvancedConfig(cached.advancedConfig || DEFAULT_ADVANCED);
    toast.showToast({
      title: "Alterações Descartadas",
      message: "Valores restaurados para o estado ativo no servidor.",
      type: "info",
    });
  };

  const requestSave = () => {
    setShowConfirm(true);
    setConfirmText("");
  };

  const saveToApi = async (silent = false, customAdvanced?: AdvancedConfig) => {
    const targetAdvanced = customAdvanced || advancedConfig;
    try {
      if (!silent) setIsSaving(true);
      await loadingSettingsService.updateLoadingSettings({
        ...settings,
        advancedConfig: targetAdvanced,
      });

      if (!silent) {
        toast.showToast({
          title: "Publicado com Sucesso!",
          message: "A nova identidade visual e tela de splash foram aplicadas para todos os clientes.",
          type: "success",
        });
        setShowConfirm(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar identidade visual na loja.";
      toast.showToast({
        title: "Erro ao Publicar",
        message,
        type: "error",
      });
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  const isSimConfirmed = confirmText.trim().toLowerCase() === "sim";

  // Identificação do tema para o resumo no modal
  const activePreset = HARMONIZED_PRESETS.find((p) => p.id === advancedConfig.themeId);
  const themeCategoryLabel =
    advancedConfig.themeType === "custom" || advancedConfig.isCoupled === false
      ? "Personalizado (Desacoplado)"
      : activePreset
      ? `${activePreset.name} (${activePreset.categoryLabel})`
      : "Personalizado";

  const currentModeConfig =
    mode === "light"
      ? advancedConfig.storefront?.light
      : advancedConfig.storefront?.dark;

  const currentPrimary =
    currentModeConfig?.primary || (mode === "dark" ? "#FFFFFF" : "#4A0E4E");

  const handleManualChange = () => {
    setAdvancedConfig((prev) => {
      if (prev.themeId === "custom" && prev.isCoupled === false) return prev;
      return {
        ...prev,
        themeId: "custom",
        isCoupled: false,
      };
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-28">
      {/* 1. Catálogo de Temas Prontos Harmonizados (Destaque no Topo) */}
      <ThemePresetsCatalog
        settings={settings}
        setSettings={setSettings}
        advancedConfig={advancedConfig}
        setAdvancedConfig={setAdvancedConfig}
        previewMode={mode}
        onScrollToSlots={() => {
          const el = document.getElementById("preset-slots-toolbar");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }}
      />

      {/* 2. Barra de Slots de Memória Rápida (1 a 4) */}
      <PresetToolbar
        advancedConfig={advancedConfig}
        onLoadPreset={handleLoadSlot}
        onSavePreset={handleSaveToSlot}
      />

      {/* 3. Layout Principal: Controles à Esquerda & Live Preview à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Customizador de Vitrine e Splash Screen */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card Vitrine */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Palette className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-heading font-black text-foreground">
                  Vitrine & Componentes
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Visualização:{" "}
                <strong className="text-foreground">
                  {mode === "light" ? "Modo Claro" : "Modo Escuro"}
                </strong>
              </span>
            </div>

            <StorefrontConfig
              advancedConfig={advancedConfig}
              setAdvancedConfig={setAdvancedConfig}
              mode={mode}
              onManualChange={handleManualChange}
            />
          </div>

          {/* Card Splash Screen */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Smartphone className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-heading font-black text-foreground">
                  Tela de Carregamento (Splash Screen)
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Ícone Ativo: <strong className="text-foreground text-sm">{settings.centerIcon || "🥣"}</strong>
              </span>
            </div>

            <SplashScreenConfig
              settings={settings}
              setSettings={setSettings}
              advancedConfig={advancedConfig}
              setAdvancedConfig={setAdvancedConfig}
              mode={mode}
              onManualChange={handleManualChange}
            />
          </div>
        </div>

        {/* Coluna Direita: Live Preview Sincronizado do Celular */}
        <div className="lg:col-span-5 h-[620px] lg:h-auto lg:sticky lg:top-6">
          <LivePreview
            settings={settings}
            advancedConfig={advancedConfig}
            previewMode={mode}
            setPreviewMode={setMode}
            onDiscard={handleDiscard}
          />
        </div>
      </div>

      {/* 4. Barra Fixa Inferior de Publicação */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 px-4">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-muted-foreground text-center sm:text-left">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              Tema em edição: <strong className="text-foreground">{themeCategoryLabel}</strong>.
              As alterações no preview não alteram o site até você clicar em Publicar.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDiscard}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition-all cursor-pointer"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={requestSave}
              className="w-1/2 sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Publicar Alterações na Loja
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal Crítico de Confirmação com Trava de Digitação ("Sim") */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border animate-in zoom-in-95 space-y-5">
            {/* Header do Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-heading text-destructive leading-tight">
                    Atenção! Publicação em Produção
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Esta ação atualizará o visual ao vivo para todos os clientes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo Técnico das Alterações (Modo, Paleta, Fundo, Splash Screen) */}
            <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border font-bold">
                <span className="text-muted-foreground">Tema & Modo:</span>
                <span className="text-primary font-black">
                  {themeCategoryLabel} • {mode === "light" ? "Modo Claro" : "Modo Escuro"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-foreground/80">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Cor Base & Fundo:</span>
                  <span className="font-mono font-bold flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: currentModeConfig?.baseColor || "#FDFBF7" }}
                    />
                    {currentModeConfig?.gradient
                      ? "Gradiente Personalizado"
                      : advancedConfig.themeType === "dynamic"
                      ? "Dinâmico (Canvas)"
                      : currentModeConfig?.baseColor || "#FDFBF7"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">Cor Primária (Marca):</span>
                  <span className="font-mono font-bold flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: currentPrimary }}
                    />
                    {currentPrimary}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">Cabeçalho & Rodapé:</span>
                  <span className="font-mono text-[11px] font-semibold flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full border border-black/10"
                        style={{ backgroundColor: currentModeConfig?.headerBg || (mode === "dark" ? "#181818" : "#FFFFFF") }}
                      />
                      Top
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full border border-black/10"
                        style={{ backgroundColor: currentModeConfig?.footerBg || (mode === "dark" ? "#121212" : "#FDFBF7") }}
                      />
                      Base
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">Splash Screen:</span>
                  <span className="font-bold flex items-center gap-1 mt-0.5">
                    <span>{settings.centerIcon || "🥣"}</span>
                    <span>{settings.theme || "liquid_cream"}</span>
                    <span className="text-muted-foreground font-normal">({settings.phrases?.length || 0} frases)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Trava de Segurança Obrigatória ("Sim") */}
            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold text-destructive leading-snug">
                Esta alteração entrará em vigor imediatamente para todos os clientes ativos na loja. Para confirmar a publicação, digite <span className="underline font-black">Sim</span> abaixo:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite Sim"
                className="w-full h-11 bg-background border border-destructive/30 rounded-xl px-3 font-bold text-sm text-foreground focus:ring-2 focus:ring-destructive/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isSimConfirmed && !isSaving) {
                    saveToApi();
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                O botão de publicação permanecerá desabilitado até você digitar <strong>Sim</strong> (sem aspas).
              </p>
            </div>

            {/* Ações do Modal */}
            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-foreground bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => saveToApi()}
                disabled={!isSimConfirmed || isSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-primary-foreground bg-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20"
              >
                {isSaving ? "Publicando..." : "Confirmar e Publicar na Loja"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
