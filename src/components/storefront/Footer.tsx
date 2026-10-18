"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { privacyService } from "@/services/privacyService";
import {
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  MessageCircle,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  ChevronDown,
  PhoneCall,
  ShieldCheck,
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

const DEFAULT_SLOGAN = "Açaí artesanal, cremosidade única e o sabor que transforma o seu dia.";
const DEFAULT_BADGE = "Delivery Próprio e Artesanal";
const DEFAULT_ADDRESS = "Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT";
const DEFAULT_HOURS = "Terça a Domingo das 14h às 22h";

export function Footer() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isContactMenuOpen, setIsContactMenuOpen] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((data) => setSettings(data))
      .catch((err) => console.error("Erro ao carregar configurações no rodapé:", err));
  }, []);

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setIsContactMenuOpen(false);
      }
    };
    if (isContactMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isContactMenuOpen]);

  // WhatsApp e Contatos
  const rawWhatsapp = settings?.whatsappNumber || "5565999999999";
  const cleanWhatsapp = rawWhatsapp.replace(/\D/g, "");
  const waMessage =
    settings?.whatsappMessage ||
    "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.";
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(waMessage)}`;

  let displayWhatsapp = "(65) 99999-9999";
  if (cleanWhatsapp.length >= 10) {
    const ddd = cleanWhatsapp.slice(-11, -9);
    const part1 = cleanWhatsapp.slice(-9, -4);
    const part2 = cleanWhatsapp.slice(-4);
    displayWhatsapp = `(${ddd}) ${part1}-${part2}`;
  }

  // Telefone Comercial / Chamada
  const rawSupportPhone = settings?.supportPhone || "";
  const cleanPhone = rawSupportPhone.replace(/\D/g, "");
  const displayPhone = rawSupportPhone || "(65) 3682-0000";

  // Identifica se há telefone comercial cadastrado diferente do WhatsApp
  const hasDistinctPhone = cleanPhone.length >= 8 && cleanPhone !== cleanWhatsapp;

  // Instagram URL formatada
  const rawInstagram = settings?.instagramUrl?.trim() || "@popshake";
  let instagramHref = "";
  let displayInstagram = "";

  if (rawInstagram) {
    if (!rawInstagram.startsWith("http")) {
      const handle = rawInstagram.replace(/^@/, "");
      instagramHref = `https://instagram.com/${handle}`;
      displayInstagram = `@${handle}`;
    } else {
      instagramHref = rawInstagram;
      const match = rawInstagram.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      displayInstagram = match ? `@${match[1]}` : "Instagram";
    }
  }

  // Textos Dinâmicos e Endereço
  const footerSlogan = settings?.footerSlogan || DEFAULT_SLOGAN;
  const footerBadgeText = settings?.footerBadgeText || DEFAULT_BADGE;
  const storeAddress = settings?.storeAddress || DEFAULT_ADDRESS;
  const googleMapsUrl =
    settings?.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeAddress)}`;
  const openingHours = settings?.openingHoursText || DEFAULT_HOURS;
  const storeCnpj = settings?.storeCnpj || null;
  const isOpen = settings?.isOpen ?? true;

  // Formas de Pagamento
  const showPaymentMethods = settings?.showPaymentMethods ?? true;
  const acceptedPayments = settings?.acceptedPayments || ["pix", "dinheiro", "credito", "debito"];

  return (
    <footer className="w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-800 transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Coluna 1 (Marca & Slogan Dinâmico) */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 select-none">
              <span className="font-heading text-2xl tracking-tight text-zinc-900 dark:text-white font-bold">
                Pop<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-black">Shake</span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-violet-300 border border-primary/20">
                Sorveteria
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              {footerSlogan}
            </p>

            {footerBadgeText && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{footerBadgeText}</span>
              </div>
            )}
          </div>

          {/* Coluna 2 (Horário & Status em Tempo Real) */}
          <div className="space-y-3.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
              Horário de Funcionamento
            </h3>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-primary dark:text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Atendimento e Entregas</p>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{openingHours}</p>
                </div>
              </div>

              {/* Badge Dinâmico Aberto / Fechado */}
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

          {/* Coluna 3 (Endereço & Google Maps) */}
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

          {/* Coluna 4 (Redes Sociais & Contato Inteligente) */}
          <div className="space-y-3.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
              Redes & Atendimento
            </h3>

            <div className="space-y-2.5">
              {/* Botão de Contato Inteligente */}
              <div className="relative" ref={contactMenuRef}>
                {hasDistinctPhone ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsContactMenuOpen(!isContactMenuOpen)}
                      className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                      title="Opções de Atendimento e Contato"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>Falar com Atendente</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                          isContactMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Popover / Menu Suspenso Inteligente */}
                    {isContactMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                          <p className="text-[11px] font-bold text-foreground">
                            Canais de Atendimento Pop Shake
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Escolha como prefere falar conosco:
                          </p>
                        </div>

                        {/* Opção 1: WhatsApp */}
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsContactMenuOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-foreground transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              Conversar no WhatsApp
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {displayWhatsapp} • Chat direto
                            </p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                        </a>

                        {/* Opção 2: Telefone Comercial / Chamada */}
                        <a
                          href={`tel:${cleanPhone}`}
                          onClick={() => setIsContactMenuOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-foreground transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <PhoneCall className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              Ligar para {displayPhone}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Telefone Comercial / Atendimento
                            </p>
                          </div>
                          <Phone className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  /* WhatsApp Direto quando não há telefone diferente */
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
                )}
              </div>

              {/* Instagram Oficial (se preenchido) */}
              {rawInstagram && (
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                  title="Seguir no Instagram"
                >
                  <div className="flex items-center gap-2">
                    <InstagramIcon className="w-4 h-4 shrink-0" />
                    <span>Siga {displayInstagram}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Formas de Pagamento Aceitas (Restaurada Dinamicamente) */}
        {showPaymentMethods && acceptedPayments.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800/80 mt-10 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Formas de Pagamento Aceitas
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {/* Pix */}
                {acceptedPayments.includes("pix") && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-2xs">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Pix Instantâneo</span>
                  </div>
                )}

                {/* Cartão de Crédito */}
                {acceptedPayments.includes("credito") && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-semibold shadow-2xs">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Cartão de Crédito</span>
                  </div>
                )}

                {/* Cartão de Débito */}
                {acceptedPayments.includes("debito") && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-semibold shadow-2xs">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Cartão de Débito</span>
                  </div>
                )}

                {/* Dinheiro */}
                {acceptedPayments.includes("dinheiro") && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-2xs">
                    <Banknote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Dinheiro</span>
                  </div>
                )}

                {/* VR / VA */}
                {acceptedPayments.includes("vr_va") && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800 text-orange-800 dark:text-orange-300 text-xs shadow-2xs">
                    <CreditCard className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="font-semibold">VR / VA</span>
                      <span className="text-[9px] opacity-80 uppercase tracking-wide">Benefícios</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CNPJ Info */}
        {storeCnpj && (
          <div className="mt-8 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/40 flex justify-center">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-zinc-400" />
              CNPJ: {storeCnpj}
            </span>
          </div>
        )}

        {/* Linha Divisória e Rodapé Discreto com Governança e LGPD */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 mt-6 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} Pop Shake Sorveteria. Todos os direitos reservados.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/privacidade" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
              Privacidade & LGPD
            </Link>
            <span className="opacity-40">•</span>
            <Link href="/termos" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
              Termos de Uso
            </Link>
            <span className="opacity-40">•</span>
            <button
              type="button"
              onClick={() => privacyService.openPreferencesModal()}
              className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
            >
              Preferências de Cookies
            </button>
          </div>

          <p className="text-[11px]">
            Plataforma PopClub • Delivery Oficial em Várzea Grande – MT
          </p>
        </div>
      </div>
    </footer>
  );
}
