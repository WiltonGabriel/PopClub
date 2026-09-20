"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
} from "lucide-react";
import { storeSettingsService } from "../../services/storeSettingsService";

export function Footer() {
  const [whatsappUrl, setWhatsappUrl] = useState(
    "https://wa.me/5565999999999?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20os%20pedidos%20da%20Pop%20Shake%20Sorveteria."
  );
  const [displayPhone, setDisplayPhone] = useState("(65) 99999-9999");

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        const rawNumber = settings.whatsappNumber || "5565999999999";
        const cleanNumber = rawNumber.replace(/\D/g, "");
        const rawMessage =
          settings.whatsappMessage ||
          "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.";
        setWhatsappUrl(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(rawMessage)}`);

        // Formata para exibição amigável
        if (cleanNumber.length >= 10) {
          const ddd = cleanNumber.slice(-11, -9);
          const part1 = cleanNumber.slice(-9, -4);
          const part2 = cleanNumber.slice(-4);
          setDisplayPhone(`(${ddd}) ${part1}-${part2}`);
        }
      })
      .catch((err) => console.error("Erro ao carregar contato no rodapé:", err));
  }, []);

  return (
    <footer className="w-full bg-background/80 backdrop-blur-md border-t border-border/40 text-foreground transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Coluna 1: Marca & Propósito */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 select-none">
              <span className="font-heading font-black text-2xl tracking-tight text-[#4C264F] dark:text-[#F9F5F9]">
                Pop<span className="gradient-text-brand">Shake</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
                Sorveteria
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              O açaí mais cremoso e batido na hora, marmitas fartas, sorvetes e a
              verdadeira explosão de recheios que você ama.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-gray-600 dark:text-gray-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Qualidade garantida & Os melhores sabores</span>
            </div>
          </div>

          {/* Coluna 2: Atendimento & Horário */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-gray-800 dark:text-gray-200">
              Horário de Funcionamento
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#9306CF] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground block">Todos os dias</span>
                  <span>13:00 às 23:30</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#9306CF] shrink-0 mt-0.5" />
                <span>Atendimento presencial no balcão e entrega em domicílio</span>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Contato & WhatsApp */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-gray-800 dark:text-gray-200">
              Fale Conosco
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dúvidas sobre o cardápio ou seu pedido em andamento?
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp: {displayPhone}</span>
            </a>
          </div>

          {/* Coluna 4: Formas de Pagamento */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-gray-800 dark:text-gray-200">
              Formas de Pagamento
            </h3>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-[#512B54]/30 font-medium">
                <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pix na Entrega</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-[#512B54]/30 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                <span>Cartão (Maquininha)</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-[#512B54]/30 font-medium">
                <Banknote className="w-3.5 h-3.5 text-amber-500" />
                <span>Dinheiro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Divisória */}
        <div className="border-t border-gray-200/80 dark:border-[#512B54]/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          {/* Copyright Oficial */}
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            © 2026 Pop Shake Sorveteria. Todos os direitos reservados.
          </p>

          {/* Créditos Equipe ADP */}
          <p className="text-xs text-gray-400 dark:text-gray-500 font-normal">
            Desenvolvido pela{" "}
            <span className="font-bold text-gray-600 dark:text-gray-300 hover:text-[#9306CF] transition-colors">
              Equipe ADP
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
