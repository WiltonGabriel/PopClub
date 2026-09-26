"use client";
import React from "react";
import { LoadingSettingsData, AdvancedConfig } from "@/services/loadingSettingsService";
import { Plus, Trash2, Clock, Palette } from "lucide-react";

const ICON_PRESETS = ["🥣", "🍧", "🍦", "🥤", "🍓", "✨", "🍨", "🥞", "🍒", "🍫"];

interface Props {
  settings: LoadingSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<LoadingSettingsData>>;
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  mode: "light" | "dark";
}

export function SplashScreenConfig({ settings, setSettings, advancedConfig, setAdvancedConfig, mode }: Props) {
  const handleAddPhrase = () => {
    setSettings((prev) => ({
      ...prev,
      phrases: [...prev.phrases, "Nova mensagem de carregamento..."]
    }));
  };

  const handleUpdatePhrase = (index: number, value: string) => {
    setSettings((prev) => {
      const newPhrases = [...prev.phrases];
      newPhrases[index] = value;
      return { ...prev, phrases: newPhrases };
    });
  };

  const handleRemovePhrase = (index: number) => {
    setSettings((prev) => {
      const newPhrases = prev.phrases.filter((_, i) => i !== index);
      return { ...prev, phrases: newPhrases };
    });
  };

  const toggleSplashScreen = () => {
    setAdvancedConfig((prev) => ({
      ...prev,
      splashScreen: {
        ...prev.splashScreen,
        enabled: !prev.splashScreen?.enabled
      }
    }));
  };

  const isEnabled = advancedConfig.splashScreen?.enabled !== false;

  return (
    <div className="space-y-8">

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
        <div>
          <h4 className="text-sm font-bold text-foreground">Status da Tela de Carregamento</h4>
          <p className="text-xs text-muted-foreground mt-1">Ative ou desative o splash screen animado ao abrir o site.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isEnabled}
            onChange={toggleSplashScreen}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {isEnabled && (
        <>
          {/* Estilo Geral */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground">Tema Visual</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "liquid_cream", label: "Creme Líquido" },
                { id: "playful_bounce", label: "Divertido" },
                { id: "minimal_pulse", label: "Pulso Minimalista" }
              ].map((t) => (
                <label
                  key={t.id}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    settings.theme === t.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="splashTheme"
                    value={t.id}
                    className="hidden"
                    checked={settings.theme === t.id}
                    onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
                  />
                  <span className="text-xs font-bold text-foreground text-center">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Icon and Progress bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground">Ícone Central</h4>
              <div className="flex flex-wrap gap-2">
                {ICON_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSettings({ ...settings, centerIcon: icon })}
                    className={`w-10 h-10 rounded-xl text-xl transition-all ${
                      settings.centerIcon === icon
                        ? "bg-primary text-primary-foreground shadow-md scale-110"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-foreground">Cor da Barra de Progresso</h4>
              <input
                type="color"
                value={advancedConfig.splashScreen?.progressBarColor || "#9306CF"}
                onChange={(e) => setAdvancedConfig(prev => ({
                  ...prev,
                  splashScreen: { ...prev.splashScreen, progressBarColor: e.target.value }
                }))}
                className="w-full h-10 rounded cursor-pointer border-0 p-0"
              />
            </div>
          </div>

          {/* Frases Rotativas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Frases de Carregamento</h4>
              <button
                onClick={handleAddPhrase}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {settings.phrases.map((phrase, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => handleUpdatePhrase(idx, e.target.value)}
                    className="flex-1 h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => handleRemovePhrase(idx)}
                    disabled={settings.phrases.length <= 1}
                    className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Tempo por Frase (ms)
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                value={settings.rotationInterval}
                onChange={(e) => setSettings({ ...settings, rotationInterval: Number(e.target.value) })}
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Duração Mínima (ms)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.minDuration}
                onChange={(e) => setSettings({ ...settings, minDuration: Number(e.target.value) })}
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
