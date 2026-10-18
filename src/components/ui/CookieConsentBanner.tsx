"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, Check, Settings2, X, ChevronRight } from "lucide-react";
import {
  privacyService,
  CookieConsentPreferences,
  DEFAULT_COOKIE_PREFERENCES,
} from "@/services/privacyService";

export function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsentPreferences>(DEFAULT_COOKIE_PREFERENCES);

  useEffect(() => {
    setMounted(true);
    const stored = privacyService.getConsent();
    if (!stored) {
      // Nenhum consentimento registrado ainda: exibe banner sutil
      setShowBanner(true);
    } else {
      setPreferences(stored);
    }

    const handleOpenModal = () => {
      const current = privacyService.getConsent() || DEFAULT_COOKIE_PREFERENCES;
      setPreferences(current);
      setShowPreferencesModal(true);
    };

    const handleConsentUpdated = (e: Event) => {
      const custom = e as CustomEvent<CookieConsentPreferences>;
      if (custom.detail) {
        setPreferences(custom.detail);
      }
    };

    window.addEventListener("popclub:open-cookie-preferences", handleOpenModal);
    window.addEventListener("popclub:cookie-consent-updated", handleConsentUpdated as EventListener);

    return () => {
      window.removeEventListener("popclub:open-cookie-preferences", handleOpenModal);
      window.removeEventListener("popclub:cookie-consent-updated", handleConsentUpdated as EventListener);
    };
  }, []);

  if (!mounted) return null;

  const handleAcceptAll = () => {
    const saved = privacyService.saveConsent({ analytics: true, preferences: true });
    setPreferences(saved);
    setShowBanner(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptEssentialOnly = () => {
    const saved = privacyService.saveConsent({ analytics: false, preferences: false });
    setPreferences(saved);
    setShowBanner(false);
    setShowPreferencesModal(false);
  };

  const handleSaveCustom = () => {
    const saved = privacyService.saveConsent({
      analytics: preferences.analytics,
      preferences: preferences.preferences,
    });
    setPreferences(saved);
    setShowBanner(false);
    setShowPreferencesModal(false);
  };

  return (
    <>
      {/* BANNER FLUTUANTE DISCRETO (Não cobre a tela, não trava a compra no mobile) */}
      {showBanner && !showPreferencesModal && (
        <aside
          role="region"
          aria-label="Aviso de Cookies e Privacidade"
          className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:right-4 sm:left-auto z-50 sm:max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
        >
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl rounded-2xl p-4 text-zinc-800 dark:text-zinc-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-xl shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs leading-relaxed">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Sua Privacidade no PopClub
                  </h3>
                  <button
                    onClick={handleAcceptEssentialOnly}
                    title="Fechar e manter apenas essenciais"
                    aria-label="Fechar banner e manter apenas cookies essenciais"
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">
                  Usamos cookies necessários para sua sacola e entrega. Dados opcionais só são ativados com sua permissão (LGPD).
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-pink-600 dark:text-pink-400 font-medium">
                  <Link href="/privacidade" className="hover:underline flex items-center gap-0.5">
                    Política de Privacidade <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Preferências
              </button>
              <button
                type="button"
                onClick={handleAcceptEssentialOnly}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors"
              >
                Apenas Essenciais
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-3 py-1.5 text-xs font-semibold bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Aceitar Todos
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MODAL DE PREFERÊNCIAS GRANULARES (LGPD & GUIA DE COOKIES DA ANPD) */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-modal-title"
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="cookie-modal-title" className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Preferências de Privacidade
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Em conformidade com a LGPD e o Guia Oficial da ANPD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Fechar preferências de privacidade"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
              <p className="text-zinc-600 dark:text-zinc-300">
                Você tem o direito de escolher quais categorias de armazenamento e cookies autoriza no PopClub. A qualquer momento você pode rever suas opções aqui ou no rodapé do site.
              </p>

              {/* Categoria 1: Necessários */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Estritamente Necessários
                  </span>
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                    Sempre Ativo
                  </span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Indispensáveis para autenticação segura, persistência dos itens na sacola de compras, proteção anti-CSRF e cálculo da rota de entrega (Art. 7º, V da LGPD). Não podem ser desligados.
                </p>
              </div>

              {/* Categoria 2: Analíticos */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Métricas e Desempenho (Opcional)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Coleta telemetria anônima sobre velocidade de carregamento e produtos mais acessados para aprimorar os sabores disponíveis e a experiência do app. Desativado por padrão (Privacy by Default).
                </p>
              </div>

              {/* Categoria 3: Preferências Opcionais */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Personalização da Experiência (Opcional)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.preferences}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, preferences: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Permite memorizar filtros de categorias preferidas e opções estéticas para visitas recorrentes.
                </p>
              </div>

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                Para detalhes completos sobre retenção e exercício dos seus direitos (Art. 18 da LGPD), consulte nossa{" "}
                <Link
                  href="/privacidade"
                  onClick={() => setShowPreferencesModal(false)}
                  className="text-pink-600 dark:text-pink-400 font-medium underline underline-offset-2"
                >
                  Política de Privacidade
                </Link>
                .
              </div>
            </div>

            {/* Footer de Ações */}
            <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleAcceptEssentialOnly}
                className="px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Rejeitar Opcionais
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl transition-colors shadow-sm"
              >
                Salvar Preferências
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Aceitar Todos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
