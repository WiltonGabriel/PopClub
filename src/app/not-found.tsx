import Link from "next/link";
import { Home, ShoppingBag, MessageCircle, Sparkles } from "lucide-react";

export default function NotFound() {
  const whatsappPhone = (process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5584999999999").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    "Olá! Estava navegando no cardápio e não encontrei o que procurava."
  )}`;

  return (
    <div className="min-h-screen bg-[#FAF6F9] dark:bg-[#120713] text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* ── BACKGROUND AMBIENT GLOW ANIMADO ── */}
      <div
        className="absolute top-1/4 -left-20 w-88 h-88 bg-[#9306CF]/15 dark:bg-[#9306CF]/25 rounded-full blur-3xl animate-pulse-glow pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -right-20 w-88 h-88 bg-[#FF007A]/15 dark:bg-[#FF007A]/20 rounded-full blur-3xl animate-float-slow pointer-events-none"
        aria-hidden="true"
      />

      {/* ── CARD CENTRAL ── */}
      <main className="relative z-10 max-w-lg w-full text-center space-y-6 bg-white/85 dark:bg-[#1D0A20]/90 backdrop-blur-xl border border-gray-200/90 dark:border-[#512B54]/60 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-purple-500/10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* ── ILUSTRAÇÃO ANIMADA COM 404 ── */}
        <div className="relative inline-block animate-float-gentle">
          {/* Halo luminoso */}
          <div className="absolute inset-0 rounded-3xl bg-[#9306CF]/20 dark:bg-[#9306CF]/35 blur-xl animate-pulse" />

          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-tr from-[#9306CF]/20 via-[#FF007A]/15 to-[#9306CF]/10 dark:from-[#9306CF]/30 dark:to-[#FF007A]/20 flex items-center justify-center border border-purple-200/80 dark:border-[#9306CF]/40 shadow-inner">
            <span className="text-5xl sm:text-6xl select-none filter drop-shadow-md animate-bounce-subtle">
              🍧
            </span>
          </div>

          {/* Badge 404 Estilizado com Shimmer */}
          <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#9306CF] via-[#FF007A] to-[#940068] text-white text-[11px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full shadow-lg shadow-[#9306CF]/30 flex items-center gap-1.5 animate-shimmer">
            <Sparkles className="w-3.5 h-3.5" /> 404
          </span>
        </div>

        {/* ── TEXTOS ── */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-[#4C264F] dark:text-[#F9F5F9]">
            Opa! Essa delícia não está aqui
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-[#C7A9C9] leading-relaxed max-w-md mx-auto">
            A página ou receita que você procurou parece ter derretido ou mudou de endereço. Que tal escolher algo incrível em nosso cardápio?
          </p>
        </div>

        {/* ── BOTÕES DE AÇÃO ── */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#9306CF] via-[#FF007A] to-[#940068] bg-[length:200%_auto] hover:bg-right text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider shadow-lg shadow-[#9306CF]/25 transition-all active:scale-[0.97]"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </Link>

          <Link
            href="/pedidos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/80 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#4C264F] dark:text-[#F9F5F9] border border-gray-200 dark:border-[#512B54]/60 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
          >
            <ShoppingBag className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
            <span>Meus Pedidos</span>
          </Link>
        </div>

        {/* ── LINK WHATSAPP ── */}
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
            <span>Precisa de ajuda? Fale conosco no WhatsApp</span>
          </a>
        </div>
      </main>
    </div>
  );
}
