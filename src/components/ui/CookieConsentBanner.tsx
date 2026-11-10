"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, Check, Settings2, X, ChevronRight, Ban } from "lucide-react";
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
      // Nenhum consentimento registrado ainda: exibe banner sutil (Quiet Design)
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

  const handleRejectNonEssential = () => {
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
      {/* BANNER FLUTUANTE DISCRETO (Quiet Design, sem travar navegação, conforme LGPD e ANPD) */}
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
                    Privacidade e Cookies no PopShake
                  </h3>
                  <button
                    onClick={handleRejectNonEssential}
                    title="Fechar banner e manter apenas cookies estritamente necessários"
                    aria-label="Fechar banner e manter apenas cookies necessários"
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300">
                  Utilizamos armazenamento essencial para manter sua sacola e calcular a entrega. Recursos opcionais dependem da sua permissão, respeitando a LGPD e as orientações da ANPD.
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-medium text-pink-600 dark:text-pink-400">
                  <Link href="/cookies" className="hover:underline flex items-center gap-0.5">
                    Política de Cookies <ChevronRight className="w-3 h-3" />
                  </Link>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <Link href="/privacidade" className="hover:underline flex items-center gap-0.5">
                    Política de Privacidade <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Ações com Equilíbrio Visual Obrigatório (Opção de Rejeitar com Destaque Paritário) */}
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Personalizar
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-3 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors border border-zinc-300 dark:border-zinc-700 cursor-pointer flex items-center gap-1"
              >
                <Ban className="w-3 h-3 text-zinc-500" />
                Apenas Necessários
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-3 py-1.5 text-xs font-semibold bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                    Preferências de Armazenamento e Cookies
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Em conformidade com a LGPD (Lei nº 13.709/2018) e o Guia da ANPD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Fechar preferências de privacidade"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
              <p className="text-zinc-600 dark:text-zinc-300">
                Você pode escolher quais categorias de armazenamento autoriza no PopShake. Suas escolhas são salvas no seu navegador e você pode alterá-las ou revogá-las quando desejar.
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
                  Indispensáveis para autenticação de sessão segura (<code className="text-zinc-700 dark:text-zinc-300">popshake_session</code>), persistência dos itens na sacola de compras, segurança anti-CSRF e cálculo da rota de entrega (Art. 7º, V da LGPD). Não podem ser desativados.
                </p>
              </div>

              {/* Categoria 2: Preferências Opcionais */}
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Preferências e Personalização (Opcional)
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
                  Memoriza personalizações da interface (tema claro/escuro, modos de acessibilidade e cupons salvos temporariamente na sacola). Desativado por padrão até manifestação voluntária.
                </p>
              </div>

              {/* Categoria 3: Métricas e Desempenho */}
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
                  Reserva a permissão para eventuais medições técnicas de desempenho (atualmente nenhuma coleta de telemetria encontra-se ativa na plataforma). O PopShake NÃO utiliza rastreadores de terceiros (como Google Analytics ou Facebook Pixel).
                </p>
              </div>

              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 space-y-1">
                <p>
                  Para a lista completa de chaves armazenadas, prazos e direitos (Art. 18 da LGPD), consulte nossa{" "}
                  <Link
                    href="/cookies"
                    onClick={() => setShowPreferencesModal(false)}
                    className="text-pink-600 dark:text-pink-400 font-semibold underline underline-offset-2"
                  >
                    Política de Cookies
                  </Link>{" "}
                  ou a{" "}
                  <Link
                    href="/privacidade"
                    onClick={() => setShowPreferencesModal(false)}
                    className="text-pink-600 dark:text-pink-400 font-semibold underline underline-offset-2"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Footer de Ações com Rejeição Paritária */}
            <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 rounded-xl transition-colors cursor-pointer"
              >
                Rejeitar Opcionais
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Salvar Preferências
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
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
