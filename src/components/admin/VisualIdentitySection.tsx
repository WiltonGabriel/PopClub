"use client";

import { useEffect, useState } from "react";
import {
  loadingSettingsService,
  LoadingSettingsData,
  AdvancedConfig
} from "@/services/loadingSettingsService";
import { useToast } from "@/components/ui/ToastNotification";
import { PresetToolbar, StorefrontConfig, SplashScreenConfig, LivePreview } from "./visual-identity";

const DEFAULT_ADVANCED: AdvancedConfig = {
  storefront: {
    light: { baseColor: "#FBF8FD", gradient: "", texture: "none", textureOpacity: 0.1, headerBg: "#FFFFFF", footerBg: "#FBF8FD" },
    dark: { baseColor: "#190B1A", gradient: "", texture: "none", textureOpacity: 0.1, headerBg: "#120713", footerBg: "#190B1A" }
  },
  splashScreen: { enabled: true, backgroundType: "gradient", backgroundValue: "preset_cream", progressBarColor: "#9306CF" },
  presets: []
};

export function VisualIdentitySection() {
  const [settings, setSettings] = useState<LoadingSettingsData>(loadingSettingsService.getCachedLoadingSettings());
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
        setAdvancedConfig(remote.advancedConfig);
      } else {
        setAdvancedConfig(DEFAULT_ADVANCED);
      }
    });
  }, []);

  const handleSaveToSlot = (idx: number, name: string) => {
    setAdvancedConfig((prev) => {
      const presets = [...(prev.presets || [])];
      while (presets.length < 4) presets.push({ name: `Slot \${presets.length + 1}`, config: null });

      const { presets: _omit, ...restConfig } = prev;
      presets[idx] = { name, config: { settings, advancedConfig: restConfig } };
      return { ...prev, presets };
    });
    // Optimistic toast
    toast.showToast(`Identidade salva no \${name} com sucesso.`, "success");

    // Automatically save to API (silently) so preset doesn't get lost on refresh
    saveToApi(true);
  };

  const handleLoadSlot = (config: any) => {
    if (!config) return;
    if (config.settings) setSettings(config.settings);
    if (config.advancedConfig) setAdvancedConfig(config.advancedConfig);
    toast.showToast("Preset carregado para edição. Não esqueça de publicar se desejar ativar.", "success");
  };

  const handleDiscard = () => {
    setSettings(loadingSettingsService.getCachedLoadingSettings());
    const cached = loadingSettingsService.getCachedLoadingSettings();
    setAdvancedConfig(cached.advancedConfig || DEFAULT_ADVANCED);
    toast.showToast("Alterações descartadas.", "info");
  };

  const requestSave = () => {
    setShowConfirm(true);
    setConfirmText("");
  };

  const saveToApi = async (silent = false) => {
    try {
      if (!silent) setIsSaving(true);
      await loadingSettingsService.updateLoadingSettings({
        ...settings,
        advancedConfig
      });
      if (!silent) {
        toast.showToast("Identidade visual publicada com sucesso!", "success");
        setShowConfirm(false);
      }
    } catch (err: any) {
      toast.showToast(err.message || "Erro ao salvar identidade.", "error");
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">

      {/* 1. Dedicated Preset Bar */}
      <PresetToolbar
        advancedConfig={advancedConfig}
        onLoadPreset={handleLoadSlot}
        onSavePreset={handleSaveToSlot}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Controls */}
        <div className="lg:col-span-7 space-y-8">

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-heading font-black text-foreground mb-6">Vitrine & Componentes</h2>
            <StorefrontConfig
              advancedConfig={advancedConfig}
              setAdvancedConfig={setAdvancedConfig}
              mode={mode}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <SplashScreenConfig
              settings={settings}
              setSettings={setSettings}
              advancedConfig={advancedConfig}
              setAdvancedConfig={setAdvancedConfig}
              mode={mode}
            />
          </div>

        </div>

        {/* Right Side: Live Preview Inspector */}
        <div className="lg:col-span-5 h-[600px] lg:h-auto lg:sticky lg:top-6">
          <LivePreview
            settings={settings}
            advancedConfig={advancedConfig}
            previewMode={mode}
            setPreviewMode={setMode}
            onDiscard={handleDiscard}
          />
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 flex justify-end">
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center px-4">
          <div className="text-sm font-semibold text-muted-foreground">
            Atenção: Ao salvar, as alterações serão aplicadas instantaneamente para todos os usuários.
          </div>
          <button
            onClick={requestSave}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-bold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Salvar Identidade Visual
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border animate-in zoom-in-95">
            <h3 className="text-xl font-black font-heading text-destructive mb-2">Atenção! Publicação em Produção</h3>
            <p className="text-sm text-foreground/80 mb-6">
              Você está prestes a alterar a aparência do site para <strong>todos os clientes ao vivo</strong>.
              Verifique a legibilidade (contraste de texto e botões) antes de publicar.
            </p>

            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl mb-6">
              <label className="block text-sm font-bold text-destructive mb-2">
                Digite "Sim" para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Sim"
                className="w-full h-11 bg-background border border-border rounded-lg px-3 font-bold text-foreground focus:ring-2 focus:ring-destructive/50"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-foreground bg-secondary hover:bg-secondary/80 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={() => saveToApi()}
                disabled={confirmText.trim().toLowerCase() !== "sim" || isSaving}
                className="px-5 py-2.5 rounded-xl font-bold text-primary-foreground bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                {isSaving ? "Publicando..." : "Confirmar e Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
