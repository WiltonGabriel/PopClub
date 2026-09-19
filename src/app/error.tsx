"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home, AlertCircle, MessageCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log seguro do erro no console do cliente sem expor dados confidenciais
    console.error("[ErrorBoundary:Page]", error.message, error.digest ? `(Digest: ${error.digest})` : "");
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAF6F9] dark:bg-[#120713] text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Glow de fundo */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-[#9306CF]/10 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-md w-full text-center space-y-6 bg-white/70 dark:bg-[#1F0B22]/70 backdrop-blur-xl border border-gray-200/80 dark:border-[#512B54]/40 p-8 rounded-3xl shadow-xl shadow-purple-500/5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-heading font-black tracking-tight text-[#4C264F] dark:text-[#F9F5F9]">
            Algo inesperado aconteceu
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Não se preocupe, seus dados e pedidos estão seguros. Tente recarregar a página ou voltar para o início.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider shadow-md shadow-[#9306CF]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar Novamente</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#4C264F] dark:text-[#F9F5F9] border border-gray-200 dark:border-[#512B54]/50 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4 text-[#9306CF]" />
            <span>Página Inicial</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-[#512B54]/30">
          <a
            href={`https://wa.me/${(process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5584999999999").replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Ocorreu uma instabilidade no aplicativo e gostaria de auxílio.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#9306CF] transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Falar no suporte via WhatsApp</span>
          </a>
        </div>
      </main>
    </div>
  );
}
