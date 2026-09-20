"use client";

import { useEffect, useState } from "react";
import { Smartphone, RotateCw, X } from "lucide-react";

const DISMISS_KEY = "popshake_mobile_orientation_dismissed";

export function MobileOrientationBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Se já foi dispensado nesta sessão do navegador, não exibe
    if (sessionStorage.getItem(DISMISS_KEY) === "true") {
      return;
    }

    const checkOrientationAndScreen = () => {
      // Dispositivo móvel ou viewport vertical estreito (< 768px em modo retrato)
      const isNarrow = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;

      if (isNarrow && isPortrait) {
        setIsVisible(true);
      } else {
        // Se girou para paisagem (horizontal) ou alargou a tela, oculta automaticamente
        setIsVisible(false);
      }
    };

    checkOrientationAndScreen();

    window.addEventListener("resize", checkOrientationAndScreen);
    window.addEventListener("orientationchange", checkOrientationAndScreen);

    return () => {
      window.removeEventListener("resize", checkOrientationAndScreen);
      window.removeEventListener("orientationchange", checkOrientationAndScreen);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      className="relative z-40 bg-gradient-to-r from-purple-900/95 via-[#2E0B33]/95 to-pink-950/95 text-white border-b border-purple-500/30 px-3.5 py-2.5 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Smartphone className="w-4 h-4 animate-pulse" />
            <RotateCw className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-pink-400 animate-spin-slow" />
          </div>
          <p className="text-xs text-purple-100/90 leading-tight">
            Para maior produtividade na gestão, dê preferência ao acesso pelo computador. No celular, recomendamos usar o aparelho na <strong>horizontal (modo paisagem)</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors border border-white/15 cursor-pointer"
          title="Fechar aviso de usabilidade"
        >
          <span>Entendido</span>
          <X className="w-3 h-3 ml-0.5 opacity-70" />
        </button>
      </div>
    </div>
  );
}
