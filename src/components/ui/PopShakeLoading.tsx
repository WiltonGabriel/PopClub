"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

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

export function PopShakeLoading({
  fullScreen = false,
  compact = false,
  message,
  subMessage,
}: PopShakeLoadingProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  useEffect(() => {
    if (message) return; // Se mensagem customizada foi passada, não rotaciona
    const interval = setInterval(() => {
      setFadeState("out");
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % DEFAULT_PHRASES.length);
        setFadeState("in");
      }, 300);
    }, 2600);

    return () => clearInterval(interval);
  }, [message]);

  const currentPhrase = message || DEFAULT_PHRASES[phraseIndex];

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${compact ? "p-4" : "p-6 sm:p-8"}`}>
      {/* ── AURA LUMINOSA E TIGELA DE AÇAÍ ANIMADA ── */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Halo de luz com pulso radial nos tons da marca */}
        <div
          className={`absolute rounded-full bg-gradient-to-tr from-[#9306CF]/30 via-[#940068]/20 to-[#9306CF]/10 blur-2xl animate-pulse ${
            compact ? "w-24 h-24" : "w-36 h-36"
          }`}
          aria-hidden="true"
        />

        {/* Círculo com borda gradiente e efeito clay */}
        <div
          className={`relative rounded-3xl bg-white/80 dark:bg-[#230E26]/80 backdrop-blur-md border border-[#9306CF]/30 shadow-xl shadow-[#9306CF]/15 flex items-center justify-center transition-transform ${
            compact ? "w-16 h-16" : "w-24 h-24"
          }`}
        >
          {/* Ícone principal temático com animação de flutuação */}
          <div className="animate-bounce-subtle text-3xl sm:text-4xl flex items-center justify-center">
            🥣
          </div>

          {/* Partícula / Brilho orbital flutuante */}
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-r from-[#9306CF] to-[#940068] text-white flex items-center justify-center shadow-md animate-spin-slow">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          {/* Sorvete / Açaí flutuando no canto inferior */}
          <div className="absolute -bottom-1 -left-1 text-sm animate-pulse">
            🍧
          </div>
        </div>
      </div>

      {/* ── TÍTULO DA MARCA ── */}
      <h3 className={`font-heading font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#9306CF] via-[#940068] to-[#9306CF] bg-[length:200%_auto] ${
        compact ? "text-sm" : "text-base sm:text-lg mb-1"
      }`}>
        Pop Shake Sorveteria
      </h3>

      {/* ── BARRA DE PROGRESSO LÍQUIDA GLOWING ── */}
      <div className={`rounded-full bg-muted/60 dark:bg-[#190B1A] overflow-hidden border border-purple-200/50 dark:border-purple-900/40 my-3 ${
        compact ? "w-36 h-1.5" : "w-48 sm:w-56 h-2"
      }`}>
        <div className="h-full bg-gradient-to-r from-[#9306CF] via-[#940068] to-[#9306CF] bg-[length:200%_100%] animate-loading-bar rounded-full shadow-sm" />
      </div>

      {/* ── MENSAGEM DINÂMICA ROTATIVA COM TRANSIÇÃO SUAVE ── */}
      <p
        className={`text-xs sm:text-sm font-medium text-muted-foreground max-w-xs transition-opacity duration-300 min-h-[38px] flex items-center justify-center ${
          fadeState === "in" ? "opacity-100" : "opacity-0"
        }`}
      >
        {currentPhrase}
      </p>

      {subMessage && (
        <span className="text-[11px] text-muted-foreground/80 mt-1">
          {subMessage}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 dark:bg-[#190B1A]/85 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative max-w-sm w-full mx-4 rounded-3xl bg-card/90 dark:bg-[#230E26]/90 border border-border/40 dark:border-[#512B54]/50 shadow-2xl p-2">
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
