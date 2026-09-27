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
import { getContrastTextColor, isLightColor } from "./themePresets";

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
    ((isDark ? settings.bgValueDark : settings.bgValueLight) === "aurora_orbs"
      ? "aurora_orbs"
      : "constellation");

  // Cores inteligentes de contraste (WCAG AA)
  const primaryContrastText = getContrastTextColor(primaryColor);
  const headerBg = config.headerBg || (isDark ? "#181818" : "#FFFFFF");
  const headerTextColor = getContrastTextColor(headerBg);
  const headerMutedColor = isLightColor(headerBg) ? "#64748B" : "#94A3B8";

  const footerBg = config.footerBg || (isDark ? "#121212" : "#FDFBF7");
  const footerTextColor = getContrastTextColor(footerBg);
  const footerMutedColor = isLightColor(footerBg) ? "#64748B" : "#94A3B8";

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

  const containerBg = getContainerBg();
  const rawBgColor =
    typeof containerBg === "string" && containerBg.startsWith("#")
      ? containerBg
      : isDark
      ? "#121212"
      : "#FDFBF7";
  const statusTextColor = isDynamic
    ? (isDark ? "#F8FAFC" : "#0F172A")
    : getContrastTextColor(rawBgColor);

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
          className={`relative w-full max-w-[310px] aspect-[9/19] rounded-[2.8rem] border-[7px] border-neutral-800 dark:border-neutral-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ring-1 ring-black/10 ${
            isDark ? "dark" : ""
          }`}
          style={{
            background: getContainerBg(),
            colorScheme: isDark ? "dark" : "light",
            ...(isDark
              ? ({
                  "--background": "222 47% 11%",
                  "--card": "223 31% 14%",
                  "--card-foreground": "210 40% 98%",
                  "--popover": "223 31% 14%",
                  "--popover-foreground": "210 40% 98%",
                  "--foreground": "210 40% 98%",
                  "--muted": "224 25% 18%",
                  "--muted-foreground": "215 20% 65%",
                  "--border": "220 20% 20%",
                  "--primary": primaryColor === "#A855F7" || !primaryColor ? "258 90% 66%" : undefined,
                } as React.CSSProperties)
              : ({
                  "--background": "210 17% 98%",
                  "--card": "0 0% 100%",
                  "--card-foreground": "296 33% 23%",
                  "--popover": "0 0% 100%",
                  "--popover-foreground": "296 33% 23%",
                  "--foreground": "296 33% 23%",
                  "--muted": "240 5% 96%",
                  "--muted-foreground": "291 7% 45%",
                  "--border": "240 5% 90%",
                } as React.CSSProperties)),
          }}
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
          <div
            className="h-8 w-full shrink-0 flex items-center justify-between px-6 z-20 text-[10px] font-bold"
            style={{ color: statusTextColor }}
          >
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
                className="font-heading font-black text-sm tracking-wider uppercase mb-3 text-center"
                style={{
                  color: isLightColor(splashConfig.backgroundValue || (isDark ? "#121212" : "#FDFBF7"))
                    ? "#0F172A"
                    : "#FFFFFF",
                }}
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
              <p
                className="text-[11px] font-medium max-w-[200px] leading-snug min-h-[32px] flex items-center justify-center mt-1 text-center"
                style={{
                  color: isLightColor(splashConfig.backgroundValue || (isDark ? "#121212" : "#FDFBF7"))
                    ? "#334155"
                    : "#CBD5E1",
                }}
              >
                {settings.phrases?.[0] || "Carregando delícias artesanais..."}
              </p>

              <span
                className="text-[9px] uppercase tracking-widest mt-4 font-mono font-bold"
                style={{
                  color: isLightColor(splashConfig.backgroundValue || (isDark ? "#121212" : "#FDFBF7"))
                    ? "#64748B"
                    : "#94A3B8",
                }}
              >
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
                style={{ backgroundColor: `${headerBg}F2`, color: headerTextColor }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-xs"
                    style={{ backgroundColor: primaryColor, color: primaryContrastText }}
                  >
                    ★
                  </div>
                  <div>
                    <h4 className="text-xs font-black font-heading leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                      <span className="text-zinc-900 dark:text-white">Pop</span>
                      <span className="text-primary dark:text-violet-400">Shake</span>
                    </h4>
                    <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: headerMutedColor }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Loja Aberta
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10"
                    style={{ color: headerTextColor }}
                  >
                    <Search className="w-3 h-3" />
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: primaryColor, color: primaryContrastText }}
                  >
                    <ShoppingBag className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Categorias Pills */}
              <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-black/5 dark:border-white/5">
                {[
                  { name: "Açaí", emoji: "🥣" },
                  { name: "Combos", emoji: "⚡" },
                  { name: "Shakes", emoji: "🥤" },
                  { name: "Sorvetes", emoji: "🍧" },
                ].map((cat, idx) => (
                  <span
                    key={cat.name}
                    className={`text-[9px] px-2.5 py-1 rounded-full whitespace-nowrap shadow-2xs inline-flex items-center gap-1 active:scale-95 transition-transform duration-150 ease-out cursor-pointer ${
                      idx === 0
                        ? "bg-primary text-white font-medium shadow-sm"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 font-medium"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </span>
                ))}
              </div>

              {/* Scroll Content da Vitrine */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto no-scrollbar">
                {/* Banner de Destaque Harmonizado */}
                <div
                  className="w-full rounded-2xl p-3 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[90px] border border-border/60 dark:border-zinc-800 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent dark:from-[#181D2D] dark:to-[#1E2538]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[8px] font-mono uppercase font-black px-1.5 py-0.5 rounded-md bg-primary/10 text-primary dark:text-violet-300 border border-primary/20 backdrop-blur-xs"
                    >
                      Destaque do Dia
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-primary dark:text-violet-400" />
                  </div>
                  <div className="mt-2">
                    <h5 className="font-heading text-xs font-semibold text-foreground dark:text-zinc-100 leading-tight">
                      Monte do seu jeito 🥣
                    </h5>
                    <p className="text-[9px] mt-0.5 text-muted-foreground dark:text-zinc-300 font-normal line-clamp-1">
                      Açaí artesanal batido na hora com os melhores complementos.
                    </p>
                  </div>
                </div>

                {/* Card Real de Produto */}
                <div className="w-full rounded-2xl bg-card border border-border/80 dark:border-zinc-800 p-2.5 shadow-sm space-y-2">
                  <div className="relative w-full h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center group">
                    <img
                      src="https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80"
                      alt="Açaí Especial Supremo"
                      className="w-full h-full object-cover transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs px-1.5 py-0.5 rounded-md">
                      Mais Vendido
                    </span>
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-xs text-muted-foreground flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h6 className="font-heading text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Açaí Especial Supremo 500ml
                      </h6>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                        Top 1
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                      Açaí artesanal cremoso batido com morangos frescos, banana fatiada, leite condensado e granola crocante.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[9px] text-muted-foreground dark:text-zinc-400 block leading-none">A partir de</span>
                      <span className="font-heading text-xs font-bold text-primary dark:text-violet-400">
                        R$ 24,90
                      </span>
                    </div>

                    <button
                      type="button"
                      className="text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-transform cursor-pointer bg-primary text-white"
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
                style={{ backgroundColor: `${footerBg}F2`, color: footerTextColor }}
              >
                <div className="flex flex-col items-center gap-0.5 cursor-pointer">
                  <div
                    className="w-4 h-4 rounded-md flex items-center justify-center text-[10px]"
                    style={{ backgroundColor: primaryColor, color: primaryContrastText }}
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

                <div className="flex flex-col items-center gap-0.5" style={{ color: footerMutedColor }}>
                  <div className="w-4 h-4 rounded-md border border-current" />
                  <span className="text-[8px] font-medium">Cardápio</span>
                </div>

                <div className="flex flex-col items-center gap-0.5" style={{ color: footerMutedColor }}>
                  <div className="w-4 h-4 rounded-md border border-current" />
                  <span className="text-[8px] font-medium">Pedidos</span>
                </div>

                <div className="flex flex-col items-center gap-0.5" style={{ color: footerMutedColor }}>
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
