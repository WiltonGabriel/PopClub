import Link from "next/link";
import { Home, ShoppingBag, ArrowLeft, MessageCircle, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF6F9] dark:bg-[#120713] text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#9306CF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#FF007A]/10 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 max-w-lg w-full text-center space-y-6 bg-white/70 dark:bg-[#1F0B22]/70 backdrop-blur-xl border border-gray-200/80 dark:border-[#512B54]/40 p-8 sm:p-10 rounded-3xl shadow-xl shadow-purple-500/5">
        {/* Visual Badge / Icon */}
        <div className="relative inline-block">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-tr from-[#9306CF]/20 via-[#FF007A]/15 to-[#9306CF]/10 dark:from-[#9306CF]/30 dark:to-[#FF007A]/20 flex items-center justify-center border border-purple-200/60 dark:border-[#9306CF]/30 shadow-inner">
            <span className="text-5xl sm:text-6xl select-none filter drop-shadow-md animate-bounce duration-1000">
              🍧
            </span>
          </div>
          <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#9306CF] to-[#940068] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 404
          </span>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-[#4C264F] dark:text-[#F9F5F9]">
            Opa! Essa delícia não está aqui
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
            A página ou receita que você procurou parece ter derretido ou mudou de endereço. Que tal escolher algo incrível em nosso cardápio?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider shadow-lg shadow-[#9306CF]/25 transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </Link>

          <Link
            href="/pedidos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#4C264F] dark:text-[#F9F5F9] border border-gray-200 dark:border-[#512B54]/50 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
          >
            <ShoppingBag className="w-4 h-4 text-[#9306CF]" />
            <span>Meus Pedidos</span>
          </Link>
        </div>

        {/* Subtle Help Link */}
        <div className="pt-4 border-t border-gray-100 dark:border-[#512B54]/30">
          <a
            href={`https://wa.me/${(process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5584999999999").replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Estava navegando no cardápio e não encontrei o que procurava.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Precisa de ajuda? Fale conosco no WhatsApp</span>
          </a>
        </div>
      </main>
    </div>
  );
}
