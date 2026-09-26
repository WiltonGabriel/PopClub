"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
  LoadingTheme,
  LoadingSettingsData,
  DEFAULT_LOADING_SETTINGS,
  loadingSettingsService,
  LOADING_UPDATED_EVENT,
} from "../../services/loadingSettingsService";

export interface PopShakeLoadingProps {
  fullScreen?: boolean;
  compact?: boolean;
  message?: string;
  subMessage?: string;
  // Overrides opcionais (ex: no preview interativo do painel administrativo)
  themeOverride?: LoadingTheme;
  centerIconOverride?: string;
  phrasesOverride?: string[];
  rotationIntervalOverride?: number;
  previewColorMode?: "light" | "dark";
  overrideSettings?: Partial<LoadingSettingsData>;
}

const STEPS = ["Conectando", "Sincronizando", "Finalizando"];

export function PopShakeLoading({
  fullScreen = false,
  compact = false,
  message,
  subMessage,
  themeOverride,
  centerIconOverride,
  phrasesOverride,
  rotationIntervalOverride,
  previewColorMode,
  overrideSettings,
}: PopShakeLoadingProps) {
  const [settings, setSettings] = useState<LoadingSettingsData>(() =>
    loadingSettingsService.getCachedLoadingSettings()
  );
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [activeStep, setActiveStep] = useState(0);

  const [mounted, setMounted] = useState(false);

  // Carrega configurações dinâmicas da API e escuta eventos de alteração em tempo real
  useEffect(() => {
    let active = true;
    setMounted(true);
    loadingSettingsService.getLoadingSettings().then((remote) => {
      if (active) setSettings(remote);
    });

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<LoadingSettingsData>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    return () => {
      active = false;
      window.removeEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  // Determina os valores efetivos (prioriza props de override caso fornecidos)
  const effectiveSettings = overrideSettings 
    ? { ...settings, ...overrideSettings } 
    : (mounted ? settings : DEFAULT_LOADING_SETTINGS);
    
  const activeTheme: LoadingTheme = themeOverride || effectiveSettings.theme || "liquid_cream";
  const activeIcon: string = centerIconOverride || effectiveSettings.centerIcon || "🥣";
  const activePhrases: string[] = useMemo(() => {
    if (phrasesOverride && phrasesOverride.length > 0) return phrasesOverride;
    if (effectiveSettings.phrases && effectiveSettings.phrases.length > 0) return effectiveSettings.phrases;
    return DEFAULT_LOADING_SETTINGS.phrases;
  }, [phrasesOverride, effectiveSettings.phrases]);
  const activeInterval: number =
    rotationIntervalOverride || effectiveSettings.rotationInterval || DEFAULT_LOADING_SETTINGS.rotationInterval;

  // Rotação suave de frases
  useEffect(() => {
    if (message) return;
    if (activePhrases.length <= 1) return;

    const interval = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % activePhrases.length);
        setActiveStep((prev) => (prev + 1) % STEPS.length);
        setFadeState("in");
      }, 250);
    }, activeInterval);

    return () => clearInterval(interval);
  }, [message, activePhrases, activeInterval]);

  const currentPhrase = message || activePhrases[phraseIndex] || activePhrases[0];

  // Renderizador do Ícone Central por Tema
  const renderThemeGraphic = () => {
    if (activeTheme === "liquid_cream") {
      return (
        <div className="relative mb-5 flex items-center justify-center">
          {/* Ondas concêntricas de luz líquida (Ripple) */}
          <div
            className={`absolute rounded-full bg-primary/20 dark:bg-primary/35 blur-xl animate-ripple pointer-events-none ${
              compact ? "w-20 h-20" : "w-32 h-32"
            }`}
            aria-hidden="true"
          />
          <div
            className={`absolute rounded-full bg-gradient-to-tr from-primary/30 via-[#FF007A]/20 to-accent/30 blur-2xl animate-pulse-glow pointer-events-none ${
              compact ? "w-28 h-28" : "w-40 h-40"
            }`}
            aria-hidden="true"
          />

          {/* Card central com reflexo cremoso e levitação suave */}
          <div
            className={`relative rounded-3xl bg-white/95 dark:bg-[#200A23]/95 backdrop-blur-xl border border-primary/20/80 dark:border-border/70 shadow-2xl shadow-primary/15 flex items-center justify-center animate-float-gentle transition-colors ${
              compact ? "w-16 h-16" : "w-24 h-24 sm:w-28 sm:h-28"
            }`}
          >
            <span
              className={`select-none filter drop-shadow-md animate-bounce-subtle ${
                compact ? "text-3xl" : "text-4xl sm:text-5xl"
              }`}
            >
              {activeIcon}
            </span>

            {/* Sparkle orbital animado */}
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-tr from-primary via-[#FF007A] to-accent text-white flex items-center justify-center shadow-lg shadow-primary/30 animate-spin-slow">
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            {/* Mini-badge decorativo */}
            <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-white dark:bg-card border border-primary/20 dark:border-primary/80/60 shadow-md flex items-center justify-center text-xs animate-pulse">
              ✨
            </div>
          </div>
        </div>
      );
    }

    if (activeTheme === "playful_bounce") {
      return (
        <div className="relative mb-5 flex items-center justify-center">
          {/* Halos de cor vibrantes rosa e âmbar */}
          <div
            className={`absolute rounded-full bg-pink-400/20 dark:bg-pink-500/25 blur-xl animate-pulse-glow pointer-events-none ${
              compact ? "w-24 h-24" : "w-36 h-36"
            }`}
            aria-hidden="true"
          />
          <div
            className={`absolute rounded-full bg-amber-400/20 dark:bg-amber-500/20 blur-2xl animate-bounce-subtle pointer-events-none ${
              compact ? "w-28 h-28" : "w-44 h-44"
            }`}
            aria-hidden="true"
          />

          {/* Círculo alegre com borda elástica saltitante */}
          <div
            className={`relative rounded-full bg-gradient-to-b from-white via-pink-50/60 to-amber-50/50 dark:from-[#2A0F2E] dark:to-[#19061C] border-2 border-pink-300/80 dark:border-pink-500/50 shadow-xl shadow-pink-500/20 flex items-center justify-center animate-bounce transition-all ${
              compact ? "w-16 h-16" : "w-24 h-24 sm:w-28 sm:h-28"
            }`}
          >
            <span
              className={`select-none filter drop-shadow-md ${
                compact ? "text-3xl" : "text-4xl sm:text-5xl"
              }`}
            >
              {activeIcon}
            </span>

            {/* Balões de alegria orbitando */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold flex items-center justify-center text-[10px] shadow-sm animate-spin-slow">
              ⭐
            </div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] shadow-sm animate-bounce-subtle">
              💖
            </div>
          </div>
        </div>
      );
    }

    // activeTheme === "minimal_pulse"
    return (
      <div className="relative mb-5 flex items-center justify-center">
        {/* Pulso calmo e elegante de fundo */}
        <div
          className={`absolute rounded-full bg-primary/15 dark:bg-primary/25 blur-2xl animate-pulse-glow pointer-events-none ${
            compact ? "w-20 h-20" : "w-32 h-32"
          }`}
          aria-hidden="true"
        />

        {/* Anel fino pontilhado giratório ao redor do ícone */}
        <div
          className={`relative rounded-full border-2 border-dashed border-primary/50 dark:border-muted-foreground/40 bg-white/90 dark:bg-background/90 backdrop-blur-md shadow-lg shadow-primary/5 flex items-center justify-center transition-all ${
            compact ? "w-16 h-16" : "w-24 h-24 sm:w-28 sm:h-28"
          }`}
        >
          {/* Anel giratório sutil */}
          <div className="absolute inset-0 rounded-full border border-primary/30/40 dark:border-primary/30 animate-spin-slow" />

          <span
            className={`select-none filter drop-shadow-xs animate-float-gentle ${
              compact ? "text-3xl" : "text-4xl sm:text-5xl"
            }`}
          >
            {activeIcon}
          </span>
        </div>
      </div>
    );
  };

  // Barra de Progresso customizada por Tema
  const renderProgressBar = () => {
    if (activeTheme === "liquid_cream") {
      return (
        <div
          className={`relative rounded-full bg-primary/10/80 dark:bg-background overflow-hidden border border-primary/20/60 dark:border-border/50 my-3 shadow-inner ${
            compact ? "w-36 h-1.5" : "w-48 sm:w-60 h-2"
          }`}
        >
          <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-primary via-[#FF007A] to-accent rounded-full animate-loading-bar shadow-xs shadow-primary/50" />
        </div>
      );
    }

    if (activeTheme === "playful_bounce") {
      return (
        <div
          className={`relative rounded-full bg-pink-100/70 dark:bg-[#200A23] overflow-hidden border border-pink-200/70 dark:border-pink-900/40 my-3 shadow-inner ${
            compact ? "w-36 h-2" : "w-48 sm:w-60 h-2.5"
          }`}
        >
          <div className="absolute inset-0 w-3/5 bg-gradient-to-r from-pink-500 via-amber-400 to-purple-600 rounded-full animate-loading-bar shadow-xs shadow-pink-500/40" />
        </div>
      );
    }

    // activeTheme === "minimal_pulse"
    return (
      <div
        className={`relative rounded-full bg-gray-100 dark:bg-background overflow-hidden my-3 ${
          compact ? "w-32 h-1" : "w-44 sm:w-52 h-1"
        }`}
      >
        <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-primary to-accent rounded-full animate-loading-bar" />
      </div>
    );
  };

  const mainContent = (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        compact ? "p-3" : "p-6 sm:p-8"
      }`}
    >
      {/* Ilustração e Animação Central */}
      {renderThemeGraphic()}

      {/* Nome da Marca com Efeito Shimmer */}
      <h3
        className={`font-heading font-black uppercase tracking-wider bg-gradient-to-r from-primary via-[#FF007A] to-primary bg-clip-text text-transparent animate-shimmer ${
          compact ? "text-xs sm:text-sm" : "text-base sm:text-lg mb-1"
        }`}
      >
        Pop Shake Sorveteria
      </h3>

      {/* Barra de Progresso Temática */}
      {renderProgressBar()}

      {/* Stepper de Fases (se não for compacto) */}
      {!compact && (
        <div className="flex items-center gap-1.5 my-1.5">
          {STEPS.map((step, idx) => {
            const isCurrent = activeStep === idx;
            const isDone = activeStep > idx;
            return (
              <span
                key={step}
                className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? activeTheme === "playful_bounce"
                      ? "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-300 dark:border-pink-800 scale-105"
                      : "bg-primary/15 text-primary dark:bg-primary/30 dark:text-[#E899FF] border border-primary/30 scale-105"
                    : isDone
                    ? "text-muted-foreground/60 line-through opacity-50"
                    : "text-muted-foreground/40"
                }`}
              >
                {step}
              </span>
            );
          })}
        </div>
      )}

      {/* Mensagem Rotativa com Transição Suave */}
      <p
        className={`text-xs sm:text-sm font-medium text-muted-foreground dark:text-muted-foreground max-w-xs transition-opacity duration-300 min-h-[36px] flex items-center justify-center leading-snug ${
          fadeState === "in" ? "opacity-100" : "opacity-0"
        }`}
      >
        {currentPhrase}
      </p>

      {subMessage && (
        <span className="text-[11px] text-muted-foreground/80 dark:text-[#A78BA9] mt-1">
          {subMessage}
        </span>
      )}
    </div>
  );

  // Se previewColorMode for especificado (ex: no preview do painel), envolve no container adequado
  const wrappedContent = previewColorMode ? (
    <div
      className={`${
        previewColorMode === "dark"
          ? "dark bg-background text-foreground"
          : "bg-white text-foreground"
      } rounded-2xl p-2 transition-colors duration-200`}
    >
      {mainContent}
    </div>
  ) : (
    mainContent
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-background/85 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative max-w-sm w-full mx-4 rounded-3xl bg-white/95 dark:bg-background/95 border border-primary/20/80 dark:border-border/60 shadow-2xl p-2 animate-in zoom-in-95 duration-200">
          {wrappedContent}
        </div>
      </div>
    );
  }

  return wrappedContent;
}
