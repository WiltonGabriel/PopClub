"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "./button";
import {
  pwaInstallService,
  BeforeInstallPromptEvent,
} from "@/services/pwaInstallService";

export function InstallPwaBanner() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const checkAutoVisibility = useCallback(() => {
    // Se o serviço indicar que não deve exibir automaticamente, esconde
    if (!pwaInstallService.canShowAutomaticPrompt()) {
      setIsVisible(false);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    setMounted(true);

    // Se já estiver rodando em standalone, encerra
    if (pwaInstallService.isStandalone()) {
      return;
    }

    // Detecta iOS (iPhone, iPad, iPod) no Safari
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    if (isIosDevice && isSafari) {
      setIsIOS(true);
      if (checkAutoVisibility()) {
        const timer = setTimeout(() => {
          if (pwaInstallService.canShowAutomaticPrompt()) {
            setIsVisible(true);
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // Evento padrão em navegadores modernos (Chromium, Edge, Opera, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      pwaInstallService.setCapturedPrompt(promptEvent);
      setDeferredPrompt(promptEvent);

      // Só exibe automaticamente se as preferências e o prazo de 4 meses permitirem
      if (pwaInstallService.canShowAutomaticPrompt()) {
        setIsVisible(true);
      }
    };

    // Ouvinte para abertura manual a partir das configurações (/conta)
    const handleOpenManual = () => {
      setIsVisible(true);
      if (isIosDevice) {
        setShowIOSGuide(true);
      } else {
        const captured = pwaInstallService.getCapturedPrompt();
        if (captured) {
          setDeferredPrompt(captured);
        }
      }
    };

    // Ouvinte para alteração de preferências em tempo real
    const handlePreferenceChanged = (e: Event) => {
      const custom = e as CustomEvent<{ enabled: boolean }>;
      if (!custom.detail?.enabled) {
        setIsVisible(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("popshake:open-pwa-install", handleOpenManual);
    window.addEventListener(
      "popshake:pwa-prompt-preference-changed",
      handlePreferenceChanged as EventListener
    );

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("popshake:open-pwa-install", handleOpenManual);
      window.removeEventListener(
        "popshake:pwa-prompt-preference-changed",
        handlePreferenceChanged as EventListener
      );
    };
  }, [checkAutoVisibility]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    const prompt = deferredPrompt || pwaInstallService.getCapturedPrompt();
    if (!prompt) {
      // Se não houver prompt nativo capturado, exibe instruções amigáveis
      setShowIOSGuide(true);
      return;
    }

    try {
      await prompt.prompt();
      const choiceResult = await prompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsVisible(false);
        pwaInstallService.setCapturedPrompt(null);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("Falha ao invocar prompt de instalação:", err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSGuide(false);
    // Guarda recusa por 4 meses (120 dias)
    pwaInstallService.dismissPrompt();
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
            <h4 className="font-heading font-black text-xs text-foreground truncate uppercase tracking-tight flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              Instale o App Pop Shake
            </h4>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
              aria-label="Fechar aviso de instalação"
              title="Dispensar aviso por 4 meses"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
            {isIOS
              ? "Acesse direto da sua tela de início como um app nativo, sem ocupar memória!"
              : "Peça mais rápido com acesso direto da sua tela inicial!"}
          </p>
        </div>
      </div>

      {showIOSGuide ? (
        <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] text-foreground bg-primary/5 rounded-xl p-2.5 space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold flex items-center gap-1.5 text-primary">
            <Share className="w-3.5 h-3.5" /> Como instalar no seu aparelho:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[10px] pl-1">
            <li>
              Toque no botão <strong>Compartilhar</strong> (ícone <Share className="w-3 h-3 inline pb-0.5" /> no menu do navegador).
            </li>
            <li>
              Selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong> ou <strong>&quot;Instalar Aplicativo&quot;</strong> (ícone <PlusSquare className="w-3 h-3 inline pb-0.5" />).
            </li>
            <li>
              Confirme tocando em <strong>Adicionar / Instalar</strong>.
            </li>
          </ol>
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="text-[10px] text-primary hover:underline font-semibold"
            >
              Entendi
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            Dispensar silencia por 4 meses
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Agora não
            </button>
            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
