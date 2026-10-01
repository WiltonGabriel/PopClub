"use client";

import { useEffect, useState } from "react";
import { Tablet, Monitor, X } from "lucide-react";

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
        // Se abriu em tela maior ou tablet na horizontal, oculta automaticamente
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
      <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-sm rounded-2xl shadow-2xl border border-primary/20 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative p-6 flex flex-col items-center text-center">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-violet-400 flex items-center justify-center mb-4">
            <Tablet className="w-8 h-8 -rotate-90 text-primary dark:text-violet-400" />
            <Monitor className="w-4 h-4 absolute -bottom-1 -right-1 text-accent dark:text-purple-300 bg-white dark:bg-[#1a1a2e] rounded-full p-0.5" />
          </div>
          
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Melhor Experiência de Gestão
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Recomendamos utilizar um tablet na horizontal ou um computador/notebook para uma melhor experiência de gestão.
          </p>
          
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors active:scale-95 cursor-pointer text-xs uppercase tracking-wider font-heading font-bold"
          >
            Prosseguir no Celular
          </button>
        </div>
      </div>
    </div>
  );
}
