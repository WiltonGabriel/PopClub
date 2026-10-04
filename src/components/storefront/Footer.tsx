"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { storeSettingsService, StoreSettings } from "../../services/storeSettingsService";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function Footer() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((data) => setSettings(data))
      .catch((err) => console.error("Erro ao carregar configurações no rodapé:", err));
  }, []);

  const rawWhatsapp = settings?.whatsappNumber || "5565999999999";
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, "");
  const waMessage =
    settings?.whatsappMessage ||
    "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.";
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(waMessage)}`;

  // Formata o WhatsApp para exibição
  let displayWhatsapp = "(65) 99999-9999";
  if (cleanWhatsapp.length >= 10) {
    const ddd = cleanWhatsapp.slice(-11, -9);
    const part1 = cleanWhatsapp.slice(-9, -4);
    const part2 = cleanWhatsapp.slice(-4);
    displayWhatsapp = `(${ddd}) ${part1}-${part2}`;
  }

  // Telefone comercial ou suporte
  const displayPhone = settings?.supportPhone || "(65) 3682-0000";

  // Instagram URL formatada
  let instagramHref = settings?.instagramUrl || "https://instagram.com/popshake";
  if (!instagramHref.startsWith("http")) {
    const handle = instagramHref.replace(/^@/, "");
    instagramHref = `https://instagram.com/${handle}`;
  }

  const storeAddress = settings?.storeAddress || "Av. Filinto Müller, 1420 - Centro, Várzea Grande - MT";
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`;
  const openingHours = settings?.openingHoursText || "Terça a Domingo das 14h às 22h";
  const isOpen = settings?.isOpen ?? true;

  return (
    <footer className="w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-800 transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Coluna 1 (Marca & Propósito) */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 select-none">
              <span className="font-heading text-2xl tracking-tight text-zinc-900 dark:text-white font-bold">
                Pop<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-black">Shake</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-violet-300 border border-primary/20">
                Sorveteria
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              O açaí mais cremoso e refrescante de Várzea Grande, com marmitas fartas, sorvetes artesanais e recheios generosos batidos na hora.
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Delivery Próprio e Artesanal</span>
            </div>
          </div>

          {/* Coluna 2 (Horários & Status em Tempo Real) */}
          <div className="space-y-3.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
              Horário de Funcionamento
            </h3>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-primary dark:text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Atendimento e Entregas</p>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{openingHours}</p>
                </div>
              </div>

              {/* Badge em tempo real */}
              <div className="pt-1">
                {isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Aberto Agora
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    Fechado no Momento
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 3 (Endereço Físico & Google Maps) */}
          <div className="space-y-3.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
              Endereço da Loja
            </h3>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary dark:text-violet-400 shrink-0 mt-0.5" />
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {storeAddress}
                </p>
              </div>

              <div>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-violet-400 hover:underline hover:opacity-80 transition-all cursor-pointer"
                >
                  <span>Abrir no Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Coluna 4 (Redes Sociais & Contatos Oficiais) */}
          <div className="space-y-3.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
              Redes & Atendimento
            </h3>

            <div className="space-y-2.5">
              {/* WhatsApp Oficial */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                title="Conversar pelo WhatsApp"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>WhatsApp: {displayWhatsapp}</span>
                </div>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
              </a>

              {/* Instagram Oficial */}
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                title="Seguir no Instagram"
              >
                <div className="flex items-center gap-2">
                  <InstagramIcon className="w-4 h-4 shrink-0" />
                  <span>Siga @popshake</span>
                </div>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
              </a>

              {/* Telefone Comercial */}
              <div className="flex items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
                <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Telefone: <strong className="text-zinc-800 dark:text-zinc-200">{displayPhone}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Divisória e Rodapé Discreto */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} Pop Shake Sorveteria. Todos os direitos reservados.
          </p>
          <p className="text-[11px]">
            Plataforma PopClub • Delivery Oficial em Várzea Grande – MT
          </p>
        </div>
      </div>
    </footer>
  );
}
