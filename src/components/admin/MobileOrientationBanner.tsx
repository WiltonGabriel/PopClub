"use client";

import { useEffect, useState } from "react";
import { Smartphone, RotateCw, X } from "lucide-react";

export function MobileOrientationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
    setIsDismissed(true);
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-sm rounded-2xl shadow-2xl border border-purple-500/20 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative p-6 flex flex-col items-center text-center">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 animate-pulse" />
            <RotateCw className="w-5 h-5 absolute -bottom-1 -right-1 text-pink-500 animate-spin-slow" />
          </div>
          
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Melhor Experiência de Gestão
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            A central operacional possui muitas informações simultâneas. Para trabalhar com mais agilidade e sem cortes, recomendamos acessar pelo <strong>computador</strong> ou virar seu celular para a <strong>horizontal (modo paisagem)</strong>.
          </p>
          
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors active:scale-95 cursor-pointer"
          >
            Continuar na Vertical
          </button>
        </div>
      </div>
    </div>
  );
}
