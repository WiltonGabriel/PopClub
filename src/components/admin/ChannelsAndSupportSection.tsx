"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Phone,
  ExternalLink,
  Save,
  Loader2,
  Sparkles,
  Share2,
  Mail,
  Headphones,
  CheckCircle2,
  HelpCircle,
  HeartHandshake,
  Smartphone,
  Eye,
} from "lucide-react";
import { storeSettingsService, StoreSettings } from "@/services/storeSettingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/ToastNotification";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function ChannelsAndSupportSection() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // WhatsApp Oficial
  const [whatsappNumber, setWhatsappNumber] = useState("5565999999999");
  const [whatsappMessage, setWhatsappMessage] = useState(
    "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria."
  );

  // Mensagens Automáticas & Pós-Venda
  const [postSaleMessage, setPostSaleMessage] = useState(
    "Obrigado pelo seu pedido no Pop Shake! Como foi sua experiência hoje? Avalie nosso atendimento e ganhe um cupom de desconto para o próximo pedido! 🍧"
  );
  const [supportMessage, setSupportMessage] = useState(
    "Olá! Preciso de ajuda com meu pedido no Pop Shake."
  );
  const [supportPhone, setSupportPhone] = useState("5565999999999");

  // Redes Sociais & Contato Direto
  const [instagramUrl, setInstagramUrl] = useState("https://instagram.com/popshake");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("contato@popshake.com.br");

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        if (settings.whatsappNumber) setWhatsappNumber(settings.whatsappNumber);
        if (settings.whatsappMessage) setWhatsappMessage(settings.whatsappMessage);
        if (settings.postSaleMessage) setPostSaleMessage(settings.postSaleMessage);
        if (settings.supportMessage) setSupportMessage(settings.supportMessage);
        if (settings.supportPhone) setSupportPhone(settings.supportPhone);
        if (settings.instagramUrl) setInstagramUrl(settings.instagramUrl);
        if (settings.facebookUrl) setFacebookUrl(settings.facebookUrl);
      })
      .catch((err) => {
        console.error("Erro ao carregar canais:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveChannels = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await storeSettingsService.updateSettings({
        whatsappNumber,
        whatsappMessage,
        postSaleMessage,
        supportMessage,
        supportPhone,
        instagramUrl,
        facebookUrl,
      });

      showToast({
        type: "success",
        title: "Canais Salvos com Sucesso! 💬",
        message: "Configurações de WhatsApp, redes sociais e mensagens pós-venda atualizadas.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Erro ao Salvar",
        message: err.message || "Não foi possível salvar os canais.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cleanWhatsapp = whatsappNumber.replace(/\D/g, "");
  const waTestLink = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
  const waPostSaleLink = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(postSaleMessage)}`;

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono">Carregando canais de atendimento...</span>
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in duration-150">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span>Canais & Atendimento ao Cliente</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Centralize os canais de contato, WhatsApp comercial da loja, mensagens automáticas de pós-venda e redes sociais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Atendimento Online
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveChannels} className="space-y-8">
        {/* BLOCO 1: WHATSAPP COMERCIAL OFICIAL */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                  Canal Oficial de WhatsApp (Atendimento Geral)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Número acionado quando o cliente clica no botão flutuante da loja ou na opção &quot;Falar com a Loja&quot;.
                </p>
              </div>
            </div>

            {whatsappNumber && (
              <a
                href={waTestLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <span>💬 Testar Conversa</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Número do WhatsApp Comercial (DDI + DDD + Número) *
              </Label>
              <Input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="5565999999999"
                className="font-mono text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Ex: 5565999999999 (Sem espaços, traços ou parênteses).
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mensagem Padrão de Boas-Vindas *
              </Label>
              <Input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake."
                className="text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Texto que já virá digitado para o cliente enviar com 1 toque.
              </span>
            </div>
          </div>
        </div>

        {/* BLOCO 2: MENSAGENS AUTOMÁTICAS DE PÓS-VENDA E SUPORTE */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center font-bold">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                Mensagens Automáticas de Pós-Venda & Suporte
              </h4>
              <p className="text-xs text-muted-foreground">
                Padronize os templates enviados aos clientes para fidelização, pesquisa de satisfação e resolução de problemas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Template Pós-Venda */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#181D2D] border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Template de Pós-Venda & Avaliação
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {postSaleMessage.length}/250
                </span>
              </div>
              <textarea
                value={postSaleMessage}
                onChange={(e) => setPostSaleMessage(e.target.value.slice(0, 250))}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 resize-none outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Mensagem amigável de agradecimento e solicitação de feedback..."
              />
              <span className="text-[10px] text-muted-foreground block">
                Pode ser acionada na esteira de pedidos concluídos para enviar ao cliente via WhatsApp.
              </span>
            </div>

            {/* Template Suporte ao Cliente */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#181D2D] border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-blue-500" />
                  Template de Ajuda / Suporte Imediato
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {supportMessage.length}/250
                </span>
              </div>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value.slice(0, 250))}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 resize-none outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Texto padrão ao acionar ajuda sobre atraso ou pedido..."
              />
              <span className="text-[10px] text-muted-foreground block">
                Exibido na tela de rastreamento do cliente se houver alguma intercorrência.
              </span>
            </div>
          </div>
        </div>

        {/* BLOCO 3: REDES SOCIAIS & CANAIS DE CONTATO DIRETO */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                Redes Sociais & Contatos Oficiais
              </h4>
              <p className="text-xs text-muted-foreground">
                Links exibidos no rodapé do aplicativo e na página &quot;Sobre nós&quot; para os clientes seguirem sua marca.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Instagram */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                Instagram da Loja
              </Label>
              <Input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/popshake"
                className="text-xs h-10 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
            </div>

            {/* Facebook */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FacebookIcon className="w-3.5 h-3.5 text-blue-600" />
                Facebook da Loja (Opcional)
              </Label>
              <Input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/popshake"
                className="text-xs h-10 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-500" />
                E-mail de Atendimento
              </Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="contato@popshake.com.br"
                className="text-xs h-10 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Botão de Salvar Canais */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold h-12 px-8 shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Salvando Canais...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Canais & Atendimento
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
