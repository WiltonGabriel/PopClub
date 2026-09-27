"use client";

import React from "react";
import { LoadingSettingsData, AdvancedConfig, LoadingTheme } from "@/services/loadingSettingsService";
import { Plus, Trash2, Clock, Sparkles, Smartphone } from "lucide-react";

const ICON_PRESETS = ["🥣", "🍧", "🍦", "🍓", "✨", "🍨", "🥞", "🍒", "🍫", "🥤", "🥑", "🌱"];

const BAR_COLOR_PRESETS = [
  { label: "Roxo Açaí", color: "#4A0E4E" },
  { label: "Dourado Sunset", color: "#FBBF24" },
  { label: "Turquesa Fresh", color: "#34D399" },
  { label: "Branco Puro", color: "#FFFFFF" },
  { label: "Neon Ciano", color: "#00F0FF" },
  { label: "Magenta Pop", color: "#9306CF" },
];

interface Props {
  settings: LoadingSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<LoadingSettingsData>>;
  advancedConfig: AdvancedConfig;
  setAdvancedConfig: React.Dispatch<React.SetStateAction<AdvancedConfig>>;
  mode: "light" | "dark";
  onManualChange?: () => void;
}

export function SplashScreenConfig({
  settings,
  setSettings,
  advancedConfig,
  setAdvancedConfig,
  mode,
  onManualChange,
}: Props) {
  const notifyManualChange = () => {
    setAdvancedConfig((prev) => ({
      ...prev,
      themeId: "custom",
      isCoupled: false,
    }));
    onManualChange?.();
  };

  const handleAddPhrase = () => {
    setSettings((prev) => ({
      ...prev,
      phrases: [...prev.phrases, "Nova mensagem de carregamento..."],
    }));
    notifyManualChange();
  };

  const handleUpdatePhrase = (index: number, value: string) => {
    setSettings((prev) => {
      const newPhrases = [...prev.phrases];
      newPhrases[index] = value;
      return { ...prev, phrases: newPhrases };
    });
    notifyManualChange();
  };

  const handleRemovePhrase = (index: number) => {
    setSettings((prev) => {
      const newPhrases = prev.phrases.filter((_, i) => i !== index);
      return { ...prev, phrases: newPhrases };
    });
    notifyManualChange();
  };

  const toggleSplashScreen = () => {
    setAdvancedConfig((prev) => ({
      ...prev,
      themeId: "custom",
      isCoupled: false,
      splashScreen: {
        ...prev.splashScreen,
        enabled: prev.splashScreen ? !prev.splashScreen.enabled : true,
      },
    }));
    onManualChange?.();
  };

  const isEnabled = advancedConfig.splashScreen?.enabled !== false;
  const currentBarColor =
    advancedConfig.splashScreen?.progressBarColor ||
    (mode === "dark" ? "#E899FF" : "#4A0E4E");

  const updateProgressBarColor = (color: string) => {
    setAdvancedConfig((prev) => ({
      ...prev,
      themeId: "custom",
      isCoupled: false,
      splashScreen: {
        ...(prev.splashScreen || {
          enabled: true,
          backgroundType: "solid",
          backgroundValue: "#FDFBF7",
        }),
        progressBarColor: color,
      },
    }));
    onManualChange?.();
  };

  return (
    <div className="space-y-6">
      {/* 1. Status Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-primary" /> Tela de Carregamento (Splash Screen)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Exibe uma tela animada enquanto o cardápio e os dados da loja são carregados.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isEnabled}
            onChange={toggleSplashScreen}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
        </label>
      </div>

      {isEnabled && (
        <>
          {/* 2. Tema da Animação */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Estilo de Animação Central
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "liquid_cream",
                  label: "Creme Líquido",
                  desc: "Ripple concêntrico, levitação suave e reflexos cremosos",
                },
                {
                  id: "playful_bounce",
                  label: "Divertido & Saltitante",
                  desc: "Saltos elásticos, balões orbitais e energia vibrante",
                },
                {
                  id: "minimal_pulse",
                  label: "Pulso Minimalista",
                  desc: "Anel pontilhado giratório sutil e iluminação calmas",
                },
              ].map((t) => (
                <label
                  key={t.id}
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    settings.theme === t.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary/50 shadow-2xs"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="splashTheme"
                    value={t.id}
                    className="hidden"
                    checked={settings.theme === t.id}
                    onChange={(e) => {
                      setSettings({ ...settings, theme: e.target.value as LoadingTheme });
                      notifyManualChange();
                    }}
                  />
                  <span className="text-xs font-bold text-foreground">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Ícone Central & Barra de Progresso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
            {/* Ícone Central */}
            <div className="bg-muted/20 border border-border p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">Ícone Central do Splash</h4>
                <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-lg">
                  {settings.centerIcon || "🥣"}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ICON_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setSettings({ ...settings, centerIcon: icon });
                      notifyManualChange();
                    }}
                    className={`w-9 h-9 rounded-xl text-lg transition-all cursor-pointer ${
                      settings.centerIcon === icon
                        ? "bg-primary text-primary-foreground shadow-sm scale-110"
                        : "bg-background border border-border/80 text-foreground hover:bg-muted"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Ou digite um emoji / caractere personalizado:
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={settings.centerIcon || ""}
                  onChange={(e) => {
                    setSettings({ ...settings, centerIcon: e.target.value || "🥣" });
                    notifyManualChange();
                  }}
                  className="w-24 text-center font-bold text-base h-9 bg-background border border-border rounded-lg"
                />
              </div>
            </div>

            {/* Cor da Barra de Progresso */}
            <div className="bg-muted/20 border border-border p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Cor da Barra de Progresso</span>
                <span
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: currentBarColor }}
                />
              </h4>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={currentBarColor}
                  onChange={(e) => updateProgressBarColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5 bg-background shrink-0"
                />
                <input
                  type="text"
                  value={currentBarColor}
                  onChange={(e) => updateProgressBarColor(e.target.value)}
                  className="text-xs font-mono font-bold bg-background border border-border rounded-lg px-3 py-2 flex-1 text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground block mb-1.5">
                  Paletas Prontas Harmonizadas:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BAR_COLOR_PRESETS.map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => updateProgressBarColor(p.color)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentBarColor.toLowerCase() === p.color.toLowerCase()
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Frases Rotativas */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Frases de Carregamento (Exibição Rotativa)
              </h4>
              <button
                type="button"
                onClick={handleAddPhrase}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Frase
              </button>
            </div>

            <div className="space-y-2">
              {settings.phrases.map((phrase, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => handleUpdatePhrase(idx, e.target.value)}
                    className="flex-1 h-9 bg-background border border-border rounded-xl px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhrase(idx)}
                    disabled={settings.phrases.length <= 1}
                    className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Remover frase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Intervalo por Frase (ms)
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                value={settings.rotationInterval}
                onChange={(e) => {
                  setSettings({ ...settings, rotationInterval: Number(e.target.value) });
                  notifyManualChange();
                }}
                className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground font-mono"
              />
              <span className="text-[10px] text-muted-foreground">Recomendado: 2000 a 2500ms</span>
            </div>

            <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Duração Mínima do Splash (ms)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.minDuration}
                onChange={(e) => {
                  setSettings({ ...settings, minDuration: Number(e.target.value) });
                  notifyManualChange();
                }}
                className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground font-mono"
              />
              <span className="text-[10px] text-muted-foreground">Tempo mínimo na tela antes do fade-in</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
