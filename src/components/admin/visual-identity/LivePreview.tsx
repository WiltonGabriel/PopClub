"use client";

import React, { useState, useRef } from "react";
import {
  Sun,
  Moon,
  RotateCcw,
  Play,
  ShoppingBag,
  Heart,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { LoadingSettingsData, AdvancedConfig } from "@/services/loadingSettingsService";
import { DynamicCanvasBackground } from "@/components/ui/DynamicCanvasBackground";

interface Props {
  settings: LoadingSettingsData;
  advancedConfig: AdvancedConfig;
  previewMode: "light" | "dark";
  setPreviewMode: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  onDiscard: () => void;
}

export function LivePreview({
  settings,
  advancedConfig,
  previewMode,
  setPreviewMode,
  onDiscard,
}: Props) {
  const [activeTab, setActiveTab] = useState<"storefront" | "splash">("storefront");
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [sequencePhase, setSequencePhase] = useState<"splash" | "transition" | "storefront">("splash");
  const [sequenceProgress, setSequenceProgress] = useState(0);

  const phoneRef = useRef<HTMLDivElement | null>(null);

  const isDark = previewMode === "dark";
  const config = isDark
    ? advancedConfig.storefront?.dark || {
        baseColor: "#121212",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#181818",
        footerBg: "#121212",
        primary: "#FFFFFF",
      }
    : advancedConfig.storefront?.light || {
        baseColor: "#FDFBF7",
        gradient: "",
        texture: "none",
        textureOpacity: 0.1,
        headerBg: "#FFFFFF",
        footerBg: "#FDFBF7",
        primary: "#4A0E4E",
      };

  const primaryColor =
    config.primary ||
    (isDark ? "#E899FF" : "#4A0E4E");

  const splashConfig = advancedConfig.splashScreen || {
    enabled: true,
    backgroundType: "solid",
    backgroundValue: isDark ? "#121212" : "#FDFBF7",
    progressBarColor: primaryColor,
  };

  const splashProgressBarColor =
    splashConfig.progressBarColor || primaryColor;

  const isDynamic =
    advancedConfig.themeType === "dynamic" ||
    (isDark ? settings.bgTypeDark === "dynamic" : settings.bgTypeLight === "dynamic");

  const dynamicStyle =
    splashConfig.dynamicStyle ||
    (isDark ? settings.bgValueDark : settings.bgValueLight) === "aurora_orbs"
      ? "aurora_orbs"
      : "constellation";

  // Determina o CSS de Fundo do celular
  const getContainerBg = () => {
    if (activeTab === "splash" || (isPlayingSequence && sequencePhase === "splash")) {
      if (splashConfig.backgroundType === "gradient" && splashConfig.backgroundValue?.includes("gradient")) {
        return splashConfig.backgroundValue;
      }
      if (splashConfig.backgroundType === "solid" && splashConfig.backgroundValue) {
        return splashConfig.backgroundValue;
      }
    }

    if (config.gradient && config.gradient.trim() !== "") {
      return config.gradient;
    }
    return config.baseColor || (isDark ? "#121212" : "#FDFBF7");
  };

  // Testar Sequência Completa (Splash Screen 2s -> Fade-in Vitrine)
  const handlePlayFullSequence = () => {
    if (isPlayingSequence) return;
    setIsPlayingSequence(true);
    setSequencePhase("splash");
    setSequenceProgress(0);

    const startTime = Date.now();
    const duration = 2000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setSequenceProgress(progress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setSequencePhase("transition");

        setTimeout(() => {
          setSequencePhase("storefront");
          setActiveTab("storefront");
          setTimeout(() => {
            setIsPlayingSequence(false);
          }, 800);
        }, 300);
      }
    }, 50);
  };

  const isShowingSplash =
    isPlayingSequence ? sequencePhase === "splash" : activeTab === "splash";

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Top Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (isPlayingSequence) return;
              setActiveTab("storefront");
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "storefront" && !isPlayingSequence
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Vitrine
          </button>
          <button
            type="button"
            onClick={() => {
              if (isPlayingSequence) return;
              setActiveTab("splash");
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "splash" && !isPlayingSequence
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Splash Screen
          </button>
        </div>

        {/* Botão de Teste da Sequência Completa */}
        <button
          type="button"
          onClick={handlePlayFullSequence}
          disabled={isPlayingSequence}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Executa a Splash Screen por 2 segundos e faz a transição suave para a Vitrine"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isPlayingSequence ? "animate-spin" : ""}`} />
          <span>{isPlayingSequence ? "Simulando..." : "Testar Sequência Completa"}</span>
        </button>

        {/* Toggle Tema Claro / Escuro & Descartar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewMode(isDark ? "light" : "dark")}
            className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
            title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
            title="Descartar Alterações Locais"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 bg-muted/20 select-none min-h-[580px]">
        {/* Status Badge durante simulação */}
        {isPlayingSequence && (
          <div className="absolute top-4 z-30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {sequencePhase === "splash" ? "Carregando Splash (2s)..." : "Revelando Vitrine..."}
            </div>
          </div>
        )}

        {/* Moldura do Celular (Mobile Device Mockup) */}
        <div
          ref={phoneRef}
          className="relative w-full max-w-[310px] aspect-[9/19] rounded-[2.8rem] border-[7px] border-neutral-800 dark:border-neutral-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ring-1 ring-black/10"
          style={{ background: getContainerBg() }}
        >
          {/* Dynamic Canvas Background (se o tema for dinâmico) */}
          {isDynamic && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-75">
              <DynamicCanvasBackground
                style={dynamicStyle}
                isDark={isDark}
                previewContainerRef={phoneRef}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Textura Overlay */}
          {config.texture && config.texture !== "none" && (
            <div
              className="absolute inset-0 pointer-events-none z-1 mix-blend-overlay"
              style={{
                opacity: config.textureOpacity || 0.1,
                backgroundImage:
                  config.texture === "dots"
                    ? "radial-gradient(circle, #000 1.5px, transparent 1.5px)"
                    : config.texture === "grid"
                    ? "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)"
                    : config.texture === "noise"
                    ? "radial-gradient(#000 1px, transparent 0)"
                    : "none",
                backgroundSize:
                  config.texture === "dots"
                    ? "12px 12px"
                    : config.texture === "grid"
                    ? "20px 20px"
                    : "8px 8px",
              }}
            />
          )}

          {/* Barra Superior do iPhone (Dynamic Island + Notch) */}
          <div className="h-8 w-full shrink-0 flex items-center justify-between px-6 z-20 text-[10px] font-bold text-foreground/80">
            <span>09:41</span>
            <div className="w-16 h-3 bg-neutral-900 rounded-full mx-auto" />
            <div className="flex items-center gap-1 text-[9px]">
              <span>5G</span>
              <div className="w-3.5 h-2 border border-current rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-current rounded-2xs" />
              </div>
            </div>
          </div>

          {/* ══════════════ TELAS DO PREVIEW ══════════════ */}
          {isShowingSplash ? (
            /* ── TELA DE SPLASH SCREEN ── */
            <div
              className={`flex-1 flex flex-col items-center justify-center p-6 text-center z-10 transition-opacity duration-300 ${
                sequencePhase === "transition" ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              {/* Ícone Central Animado */}
              <div className="relative mb-5 flex items-center justify-center">
                <div
                  className="absolute w-28 h-28 rounded-full blur-xl animate-pulse pointer-events-none"
                  style={{ backgroundColor: `${primaryColor}30` }}
                />
                <div
                  className="w-20 h-20 rounded-3xl bg-card/90 backdrop-blur-md shadow-2xl border border-white/10 flex items-center justify-center text-4xl animate-bounce mb-2"
                >
                  <span className="select-none filter drop-shadow">
                    {settings.centerIcon || "🥣"}
                  </span>
                </div>
              </div>

              {/* Título da Loja */}
              <h3
                className="font-heading font-black text-sm tracking-wider uppercase mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
              >
                Pop Shake Sorveteria
              </h3>

              {/* Barra de Progresso Sincronizada */}
              <div className="w-44 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden my-3 p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: isPlayingSequence ? `${sequenceProgress}%` : "65%",
                    backgroundColor: splashProgressBarColor,
                    boxShadow: `0 0 10px ${splashProgressBarColor}66`,
                  }}
                />
              </div>

              {/* Frase Rotativa */}
              <p className="text-[11px] font-medium text-foreground/75 max-w-[200px] leading-snug min-h-[32px] flex items-center justify-center mt-1">
                {settings.phrases?.[0] || "Carregando delícias artesanais..."}
              </p>

              <span className="text-[9px] uppercase tracking-widest text-foreground/50 mt-4 font-mono font-bold">
                Splash Screen • {settings.theme || "liquid_cream"}
              </span>
            </div>
          ) : (
            /* ── TELA DE VITRINE DA LOJA ── */
            <div
              className={`flex-1 flex flex-col overflow-hidden z-10 transition-opacity duration-300 ${
                sequencePhase === "transition" ? "opacity-0" : "opacity-100"
              }`}
            >
              {/* Header da Vitrine */}
              <div
                className="h-14 w-full shrink-0 flex items-center justify-between px-4 shadow-xs backdrop-blur-md border-b border-black/5 dark:border-white/5"
                style={{ backgroundColor: `${config.headerBg}E6` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ★
                  </div>
                  <div>
                    <h4 className="text-xs font-black font-heading leading-tight text-foreground">
                      Pop Shake
                    </h4>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Loja Aberta
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/70">
                    <Search className="w-3 h-3" />
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ShoppingBag className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Categorias Pills */}
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-black/5 dark:border-white/5">
                {["Açaí", "Combos", "Copos", "Sobremesas"].map((cat, idx) => (
                  <span
                    key={cat}
                    className={`text-[9px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-2xs ${
                      idx === 0
                        ? "text-white"
                        : "bg-background/80 text-foreground/70 border border-border/50"
                    }`}
                    style={idx === 0 ? { backgroundColor: primaryColor } : {}}
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Scroll Content da Vitrine */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto no-scrollbar">
                {/* Banner de Destaque Harmonizado */}
                <div
                  className="w-full rounded-2xl p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[90px]"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}E6, ${primaryColor}99)`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase font-black bg-black/25 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      Destaque do Dia
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div>
                    <h5 className="font-heading font-black text-xs leading-tight">
                      Açaí Puro Artesanal
                    </h5>
                    <p className="text-[9px] text-white/80 line-clamp-1 mt-0.5">
                      Batido na hora, cremoso e super refrescante
                    </p>
                  </div>
                </div>

                {/* Card Real de Produto */}
                <div className="w-full rounded-2xl bg-card border border-border/80 p-2.5 shadow-sm space-y-2">
                  <div className="relative w-full h-24 rounded-xl overflow-hidden bg-muted/60 flex items-center justify-center">
                    {/* Visual ilustrativo de taça de açaí */}
                    <div className="flex flex-col items-center">
                      <span className="text-4xl filter drop-shadow">🥣</span>
                      <span className="text-[9px] font-bold text-muted-foreground mt-1">
                        Açaí Especial Supremo
                      </span>
                    </div>
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-xs text-muted-foreground flex items-center justify-center"
                    >
                      <Heart className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h6 className="font-heading font-black text-xs text-foreground">
                        Açaí Especial Supremo 500ml
                      </h6>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1 rounded">
                        Top 1
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      Açaí artesanal cremoso com morangos frescos, banana fatiada, leite condensado e granola crocante.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[9px] text-muted-foreground block leading-none">A partir de</span>
                      <span className="font-heading font-black text-xs text-foreground">
                        R$ 24,90
                      </span>
                    </div>

                    <button
                      type="button"
                      className="text-[10px] font-black px-3 py-1.5 rounded-xl text-white flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Rodapé / Navigation Bar */}
              <div
                className="h-12 w-full shrink-0 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.04)] backdrop-blur-md border-t border-black/5 dark:border-white/5"
                style={{ backgroundColor: `${config.footerBg}E6` }}
              >
                <div className="flex flex-col items-center gap-0.5 cursor-pointer">
                  <div
                    className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ●
                  </div>
                  <span
                    className="text-[8px] font-bold"
                    style={{ color: primaryColor }}
                  >
                    Início
                  </span>
                </div>

                <div className="flex flex-col items-center gap-0.5 text-foreground/40">
                  <div className="w-4 h-4 rounded-md border border-current" />
                  <span className="text-[8px] font-medium">Cardápio</span>
                </div>

                <div className="flex flex-col items-center gap-0.5 text-foreground/40">
                  <div className="w-4 h-4 rounded-md border border-current" />
                  <span className="text-[8px] font-medium">Pedidos</span>
                </div>

                <div className="flex flex-col items-center gap-0.5 text-foreground/40">
                  <div className="w-4 h-4 rounded-md border border-current" />
                  <span className="text-[8px] font-medium">Perfil</span>
                </div>
              </div>
            </div>
          )}

          {/* Home Indicator inferior do iPhone */}
          <div className="h-4 w-full shrink-0 flex items-center justify-center z-20">
            <div className="w-24 h-1 bg-foreground/20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
