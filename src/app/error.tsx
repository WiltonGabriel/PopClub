"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertCircle, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Log seguro do erro no console do cliente
    console.error("[ErrorBoundary:Page]", error.message, error.digest ? `(Digest: ${error.digest})` : "");
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 400);
  };

  const whatsappPhone = (process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5584999999999").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    "Olá! Ocorreu uma instabilidade no aplicativo e gostaria de auxílio."
  )}`;

  return (
    <div className="min-h-screen bg-[#FAF6F9] dark:bg-[#120713] text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* ── AMBIENT GLOW ANIMADO ── */}
      <div
        className="absolute top-1/4 -left-24 w-88 h-88 bg-rose-500/15 dark:bg-rose-500/20 rounded-full blur-3xl animate-pulse-glow pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -right-24 w-88 h-88 bg-[#9306CF]/15 dark:bg-[#9306CF]/25 rounded-full blur-3xl animate-float-slow pointer-events-none"
        aria-hidden="true"
      />

      {/* ── CARD PRINCIPAL ── */}
      <main className="relative z-10 max-w-md w-full text-center space-y-6 bg-white/85 dark:bg-[#1D0A20]/90 backdrop-blur-xl border border-gray-200/90 dark:border-[#512B54]/60 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-purple-500/10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* ── ÍCONE ANIMADO COM LEVITAÇÃO E ATENÇÃO ── */}
        <div className="relative inline-block animate-float-gentle">
          {/* Halo pulsante */}
          <div className="absolute inset-0 rounded-3xl bg-rose-500/20 dark:bg-rose-500/30 blur-lg animate-pulse" />

          {/* Container do ícone */}
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-rose-50 to-rose-100 dark:from-rose-950/60 dark:to-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-inner">
            <div className="animate-shake-attention">
              <AlertCircle className="w-10 h-10" />
            </div>
          </div>

          {/* Badge flutuante de proteção */}
          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 animate-bounce-subtle">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* ── TEXTOS ── */}
        <div className="space-y-2.5">
          <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-[#4C264F] dark:text-[#F9F5F9]">
            Algo inesperado aconteceu
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-[#C7A9C9] leading-relaxed">
            Não se preocupe, seus dados e pedidos estão seguros. Tente recarregar a página ou voltar para o início.
          </p>

          {/* Pílula de segurança */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sua sacola e dados permanecem salvos</span>
          </div>
        </div>

        {/* ── BOTÕES DE AÇÃO COM MICRO-INTERAÇÕES ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#9306CF] via-[#FF007A] to-[#940068] bg-[length:200%_auto] hover:bg-right text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider shadow-lg shadow-[#9306CF]/25 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            <span>{isRetrying ? "Recarregando..." : "Tentar Novamente"}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/80 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#4C264F] dark:text-[#F9F5F9] border border-gray-200 dark:border-[#512B54]/60 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
          >
            <Home className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
            <span>Página Inicial</span>
          </Link>
        </div>

        {/* ── LINK DE SUPORTE WHATSAPP ── */}
        <div className="pt-4 border-t border-gray-100 dark:border-[#512B54]/40">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-[#C7A9C9] hover:text-[#9306CF] dark:hover:text-[#E899FF] transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <span>Falar no suporte via WhatsApp</span>
          </a>
        </div>
      </main>
    </div>
  );
}
