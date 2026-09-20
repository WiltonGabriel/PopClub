"use client";

import { useState, useEffect } from "react";
import { Sparkles, Heart } from "lucide-react";

interface PopShakeLoadingProps {
  fullScreen?: boolean;
  compact?: boolean;
  message?: string;
  subMessage?: string;
}

const DEFAULT_PHRASES = [
  "Batendo o açaí artesanal na cremosidade perfeita...",
  "Separando os acompanhamentos mais fresquinhos...",
  "Preparando as receitas mais deliciosas do cardápio...",
  "Quase pronto! Seu momento doce está chegando...",
];

const STEPS = ["Conectando", "Sincronizando", "Finalizando"];

export function PopShakeLoading({
  fullScreen = false,
  compact = false,
  message,
  subMessage,
}: PopShakeLoadingProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % DEFAULT_PHRASES.length);
        setActiveStep((prev) => (prev + 1) % STEPS.length);
        setFadeState("in");
      }, 250);
    }, 2400);

    return () => clearInterval(interval);
  }, [message]);

  const currentPhrase = message || DEFAULT_PHRASES[phraseIndex];

  const content = (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        compact ? "p-4" : "p-6 sm:p-8"
      }`}
    >
      {/* ── ILUSTRAÇÃO FLUTUANTE COM AURA LUMINOSA ── */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Ondas pulsantes de luz (Efeito Ripple) */}
        <div
          className={`absolute rounded-full bg-[#9306CF]/25 dark:bg-[#9306CF]/35 blur-xl animate-ripple pointer-events-none ${
            compact ? "w-20 h-20" : "w-32 h-32"
          }`}
          aria-hidden="true"
        />
        <div
          className={`absolute rounded-full bg-gradient-to-tr from-[#9306CF]/30 via-[#FF007A]/20 to-[#940068]/30 blur-2xl animate-pulse-glow pointer-events-none ${
            compact ? "w-28 h-28" : "w-40 h-40"
          }`}
          aria-hidden="true"
        />

        {/* Card central com reflexo e levitação suave */}
        <div
          className={`relative rounded-3xl bg-white/90 dark:bg-[#200A23]/90 backdrop-blur-xl border border-purple-200/80 dark:border-[#512B54]/70 shadow-2xl shadow-purple-500/15 flex items-center justify-center animate-float-gentle ${
            compact ? "w-16 h-16" : "w-24 h-24 sm:w-28 sm:h-28"
          }`}
        >
          {/* Tigela de Açaí */}
          <span
            className={`select-none filter drop-shadow-md animate-bounce-subtle ${
              compact ? "text-3xl" : "text-4xl sm:text-5xl"
            }`}
          >
            🥣
          </span>

          {/* Sparkle orbital girando */}
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-tr from-[#9306CF] via-[#FF007A] to-[#940068] text-white flex items-center justify-center shadow-lg shadow-[#9306CF]/30 animate-spin-slow">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          {/* Mini-Sorvete decorativo pulsando */}
          <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-white dark:bg-[#2E1133] border border-purple-200 dark:border-purple-800/60 shadow-md flex items-center justify-center text-xs animate-pulse">
            🍧
          </div>
        </div>
      </div>

      {/* ── NOME DA MARCA COM EFEITO SHIMMER ── */}
      <h3
        className={`font-heading font-black uppercase tracking-wider bg-gradient-to-r from-[#9306CF] via-[#FF007A] to-[#9306CF] bg-clip-text text-transparent animate-shimmer ${
          compact ? "text-sm" : "text-base sm:text-lg mb-1"
        }`}
      >
        Pop Shake Sorveteria
      </h3>

      {/* ── BARRA DE PROGRESSO LÍQUIDA GLOWING ── */}
      <div
        className={`relative rounded-full bg-purple-100/70 dark:bg-[#140616] overflow-hidden border border-purple-200/60 dark:border-[#512B54]/50 my-3 shadow-inner ${
          compact ? "w-36 h-1.5" : "w-48 sm:w-60 h-2"
        }`}
      >
        <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-[#9306CF] via-[#FF007A] to-[#940068] rounded-full animate-loading-bar shadow-sm shadow-[#9306CF]/50" />
      </div>

      {/* ── STATUS EM ETAPAS (PROFISSIONAL & TRANQUILIZADOR) ── */}
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
                    ? "bg-[#9306CF]/15 text-[#9306CF] dark:bg-[#9306CF]/30 dark:text-[#E899FF] border border-[#9306CF]/30 scale-105"
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

      {/* ── MENSAGEM ROTATIVA COM FADE SUAVE ── */}
      <p
        className={`text-xs sm:text-sm font-medium text-muted-foreground dark:text-[#C7A9C9] max-w-xs transition-opacity duration-300 min-h-[38px] flex items-center justify-center leading-snug ${
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

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-[#0E040F]/85 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative max-w-sm w-full mx-4 rounded-3xl bg-white/95 dark:bg-[#1E0921]/95 border border-purple-200/80 dark:border-[#512B54]/60 shadow-2xl p-2 animate-in zoom-in-95 duration-200">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-8">
      {content}
    </div>
  );
}
