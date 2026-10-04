"use client";

import React, { useEffect, useState } from "react";
import {
  loadingSettingsService,
  LoadingSettingsData,
  AdvancedConfig,
  PresetSlotConfig,
  LOADING_UPDATED_EVENT,
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
  const initialCached = loadingSettingsService.getCachedLoadingSettings();
  const [settings, setSettings] = useState<LoadingSettingsData>(initialCached);
  const [savedSettings, setSavedSettings] = useState<LoadingSettingsData>(initialCached);
  const savedSettingsRef = React.useRef<LoadingSettingsData>(initialCached);
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>(DEFAULT_ADVANCED);
  const [mode, setMode] = useState<"light" | "dark">("light");

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const toast = useToast();

  useEffect(() => {
    loadingSettingsService.getLoadingSettings().then((remote) => {
      savedSettingsRef.current = remote;
      setSavedSettings(remote);
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

  // Salva o tema ATUAL em um slot de memória rápida
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

  // Renomeia o slot de memória rápida de forma isolada (NÃO carrega no preview, NÃO altera isDirty)
  const handleRenameSlot = (idx: number, name: string) => {
    const updatedPresets = [...(advancedConfig.presets || DEFAULT_ADVANCED.presets)];
    while (updatedPresets.length < 4) {
      updatedPresets.push({ name: `Slot ${updatedPresets.length + 1}`, config: null });
    }

    updatedPresets[idx] = {
      ...updatedPresets[idx],
      name,
    };

    const nextAdvanced = { ...advancedConfig, presets: updatedPresets };
    setAdvancedConfig(nextAdvanced);

    toast.showToast({
      title: "Slot Renomeado",
      message: `Nome atualizado para "${name}".`,
      type: "info",
    });

    // Persiste no backend de forma silenciosa sem alterar o rascunho ativo
    saveToApi(true, nextAdvanced);
  };

  // Carrega o tema do slot no preview do celular (marca isDirty)
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
    setIsDirty(true);
    toast.showToast({
      title: "Preset Carregado no Preview",
      message: "Configuração aplicada para teste no celular. Clique em Publicar para aplicar na loja ao vivo.",
      type: "info",
    });
  };

  const handleDiscard = () => {
    const target = savedSettingsRef.current || loadingSettingsService.getCachedLoadingSettings();
    setSettings(target);
    setAdvancedConfig(target.advancedConfig || DEFAULT_ADVANCED);
    setIsDirty(false);
    toast.showToast({
      title: "Alterações Descartadas",
      message: "Pré-visualização restaurada para o tema ativo salvo no banco de dados.",
      type: "info",
    });
  };

  const requestSave = () => {
    setShowConfirm(true);
    setConfirmText("");
  };

  const saveToApi = async (silent = false, customAdvanced?: AdvancedConfig) => {
    const targetAdvanced = customAdvanced || advancedConfig;
    const payload: LoadingSettingsData = {
      ...settings,
      advancedConfig: targetAdvanced,
    };
    try {
      if (!silent) setIsSaving(true);
      await loadingSettingsService.updateLoadingSettings(payload);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("popshake_loading_settings", JSON.stringify(payload));
          window.dispatchEvent(new CustomEvent(LOADING_UPDATED_EVENT, { detail: payload }));
        } catch {}
      }

      setSavedSettings(payload);
      savedSettingsRef.current = payload;

      if (!silent) {
        toast.showToast({
          title: "Identidade Visual Publicada com Sucesso!",
          message: "A nova identidade visual foi gravada no banco e aplicada em toda a loja.",
          type: "success",
        });
        setShowConfirm(false);
        setIsDirty(false);
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

  const normalizedConfirm = confirmText.trim().toUpperCase();
  const isSecurityConfirmed = normalizedConfirm === "CONFIRMO" || normalizedConfirm === "SIM";

  // Identificação do tema para o comparativo e resumo no modal
  const savedThemeId = savedSettings.advancedConfig?.themeId || "acai_traditional";
  const savedPreset =
    HARMONIZED_PRESETS.find(
      (p) => p.id === savedThemeId || (savedThemeId === "noctalia_mesh" && p.id === "aurora_mesh")
    ) || HARMONIZED_PRESETS[0];

  const activePreset =
    HARMONIZED_PRESETS.find(
      (p) => p.id === advancedConfig.themeId || (advancedConfig.themeId === "noctalia_mesh" && p.id === "aurora_mesh")
    ) || HARMONIZED_PRESETS[0];

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
    setIsDirty(true);
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
        savedThemeId={savedThemeId}
        isDirty={isDirty}
        onDirty={() => setIsDirty(true)}
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
        onRenameSlot={handleRenameSlot}
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

      {/* 4. Barra Fixa Inferior de Publicação (Apenas quando modificado) */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.12)] z-40 animate-in slide-in-from-bottom duration-200">
          <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 px-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-muted-foreground text-center sm:text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                Pré-visualização ativa: <strong className="text-foreground">{activePreset.name}</strong>.
                As alterações no preview não afetam a loja até você publicar.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-discard-theme-changes"
                type="button"
                onClick={handleDiscard}
                className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              >
                Descartar Alterações
              </button>
              <button
                id="btn-open-publish-modal"
                type="button"
                onClick={requestSave}
                className="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide shadow-md px-6 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white" />
                Publicar Alterações na Loja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Crítico de Confirmação com Trava de Segurança Obrigatória */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border animate-in zoom-in-95 space-y-5">
            {/* Header do Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-heading text-foreground leading-tight">
                    Confirmar Publicação de Identidade Visual
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Esta ação alterará imediatamente a identidade visual e o tema para todos os clientes acessando o PopClub.
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

            {/* Comparativo Visual Obrigatório: Tema Atual ➔ Novo Tema Selecionado */}
            <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-muted-foreground block uppercase tracking-wider">
                Comparativo de Publicação:
              </span>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border/80 gap-3">
                {/* Tema Atual Salvo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    <span>Tema Atual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">{savedPreset.icon}</span>
                    <div className="min-w-0">
                      <p className="font-heading font-black text-xs sm:text-sm text-foreground truncate">
                        {savedPreset.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {savedPreset.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seta Indicativa */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Novo Tema Selecionado */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    <span>Novo Tema</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <div className="min-w-0">
                      <p className="font-heading font-black text-xs sm:text-sm text-primary truncate">
                        {activePreset.name}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
                        {activePreset.categoryLabel}
                      </span>
                    </div>
                    <span className="text-xl shrink-0">{activePreset.icon}</span>
                  </div>
                </div>
              </div>

              {/* Detalhes de Modo e Paleta do Novo Tema */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Visualização Ativa:</span>
                  <span className="font-bold text-foreground mt-0.5 block">
                    {mode === "light" ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
                  </span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Cor Primária de Destaque:</span>
                  <span className="font-mono font-bold flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: currentPrimary }}
                    />
                    {currentPrimary}
                  </span>
                </div>
              </div>
            </div>

            {/* Trava de Segurança Obrigatória ("CONFIRMO" ou "SIM") */}
            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-2xl space-y-2.5">
              <label className="block text-xs font-bold text-destructive leading-snug">
                Para liberar a publicação para todos os clientes, digite manualmente a palavra <span className="underline font-black">CONFIRMO</span> ou <span className="underline font-black">SIM</span> abaixo:
              </label>
              <input
                id="theme-publish-confirm-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Digite "CONFIRMO" ou "SIM"'
                className="w-full h-11 bg-background border border-destructive/30 rounded-xl px-3 font-bold text-sm text-foreground focus:ring-2 focus:ring-destructive/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isSecurityConfirmed && !isSaving) {
                    saveToApi();
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                O botão de publicação permanecerá <strong>estritamente desabilitado</strong> até que a palavra seja digitada corretamente.
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
                id="theme-publish-confirm-btn"
                type="button"
                onClick={() => saveToApi()}
                disabled={!isSecurityConfirmed || isSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {isSaving ? "Publicando..." : "Publicar Agora"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
