"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare } from "lucide-react";
import { Button } from "./button";

const DISMISS_KEY = "popshake_pwa_dismissed_until";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaBanner() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Se já estiver rodando como PWA instalado (standalone), não exibe banner
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Verifica se usuário dispensou recentemente (dentro de 7 dias)
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Detecta iOS (iPhone, iPad, iPod) no Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
      // Exibe banner no iOS após 3 segundos para não poluir a entrada imediata
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // Evento padrão em navegadores modernos (Chromium, Android, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("Falha ao invocar prompt de instalação:", err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSGuide(false);
    // Guarda recusa por 7 dias
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!mounted || !isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Instalação do Aplicativo"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 bg-card/95 backdrop-blur-md border-2 border-primary/40 rounded-2xl p-3.5 shadow-2xl shadow-primary/10 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-primary/10 border border-primary/20 shrink-0 shadow-xs">
          <Image
            src="/icon-192x192.png"
            alt="Ícone Pop Shake"
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-heading font-black text-xs text-foreground truncate uppercase tracking-tight">
              Instale o App Pop Shake
            </h4>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Fechar aviso de instalação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
            {isIOS
              ? "Acesse direto da sua tela de início como um app nativo!"
              : "Peça mais rápido com acesso direto da sua tela inicial!"}
          </p>
        </div>
      </div>

      {showIOSGuide ? (
        <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] text-foreground bg-primary/5 rounded-xl p-2.5 space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold flex items-center gap-1.5 text-primary">
            <Share className="w-3.5 h-3.5" /> Como instalar no iPhone/iPad:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[10px] pl-1">
            <li>
              Toque no botão <strong>Compartilhar</strong> (ícone <Share className="w-3 h-3 inline pb-0.5" /> na barra inferior do Safari).
            </li>
            <li>
              Role a lista para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong> (ícone <PlusSquare className="w-3 h-3 inline pb-0.5" />).
            </li>
            <li>
              Confirme no canto superior direito tocando em <strong>Adicionar</strong>.
            </li>
          </ol>
        </div>
      ) : (
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Depois
          </button>
          <Button
            type="button"
            onClick={handleInstallClick}
            size="sm"
            className="h-8 px-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIOS ? "Como Instalar" : "Instalar App"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
