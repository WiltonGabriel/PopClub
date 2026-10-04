"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Phone,
  ExternalLink,
  Save,
  Loader2,
  Sparkles,
  Mail,
  Clock,
  MapPin,
  Send,
  RotateCcw,
  CheckCircle2,
  Copy,
  ChefHat,
  PackageCheck,
  Bike,
  HelpCircle,
} from "lucide-react";
import { storeSettingsService, OrderNotificationTemplates } from "@/services/storeSettingsService";
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

const DEFAULT_NOTIFICATION_TEMPLATES: Required<OrderNotificationTemplates> = {
  pending: "Olá, {cliente}! Recebemos seu pedido #{codigo_pedido} no Pop Shake. Estamos preparando tudo com muito carinho! Total: {total} ({forma_pagamento}).",
  preparing: "Seu pedido #{codigo_pedido} já está na cozinha sendo preparado! Tempo estimado: {tempo_estimado}.",
  ready: "Oba, {cliente}! Seu pedido #{codigo_pedido} está prontinho na bancada aguardando saída.",
  delivering: "Seu pedido #{codigo_pedido} saiu para entrega com nosso motoboy! Acompanhe o trajeto em tempo real: {link_rastreamento}",
  completed: "Pedido #{codigo_pedido} entregue com sucesso! Obrigado pela preferência, {cliente}! 🍧 Avalie nosso atendimento e ganhe um cupom especial para o próximo pedido!",
  support: "Olá, {cliente}! Precisa de ajuda com o pedido #{codigo_pedido}? Estamos à disposição pelo WhatsApp ou telefone da loja para resolver rapidamente.",
};

const TEMPLATE_STAGES = [
  {
    key: "pending" as const,
    label: "1. Pedido na Fila",
    shortLabel: "Fila",
    description: "Confirmação imediata de recebimento do pedido pela loja",
    icon: Clock,
    color: "amber",
  },
  {
    key: "preparing" as const,
    label: "2. Em Preparo",
    shortLabel: "Preparo",
    description: "Início da produção artesanal na cozinha e tempo estimado",
    icon: ChefHat,
    color: "blue",
  },
  {
    key: "ready" as const,
    label: "3. Pronto na Bancada",
    shortLabel: "Pronto",
    description: "Pedido finalizado pronto para retirada no balcão ou motoboy",
    icon: PackageCheck,
    color: "purple",
  },
  {
    key: "delivering" as const,
    label: "4. Em Rota / Despachado",
    shortLabel: "Despachado",
    description: "Saída para entrega com link de rastreamento do motoboy",
    icon: Bike,
    color: "emerald",
  },
  {
    key: "completed" as const,
    label: "5. Concluído",
    shortLabel: "Entregue",
    description: "Agradecimento pela compra e convite para avaliação",
    icon: CheckCircle2,
    color: "teal",
  },
  {
    key: "support" as const,
    label: "6. Suporte & Pós-Venda",
    shortLabel: "Suporte",
    description: "Mensagem padrão para assistência e intercorrências no pedido",
    icon: HelpCircle,
    color: "rose",
  },
];

const AVAILABLE_TAGS = [
  { tag: "{cliente}", label: "Nome do Cliente", example: "Lucas Silva" },
  { tag: "{codigo_pedido}", label: "Código do Pedido", example: "POP-104" },
  { tag: "{tempo_estimado}", label: "Tempo Estimado", example: "35-50 min" },
  { tag: "{total}", label: "Valor Total", example: "R$ 48,50" },
  { tag: "{link_rastreamento}", label: "Link de Rastreio", example: "https://popshake.com/rastreamento/POP-104" },
  { tag: "{forma_pagamento}", label: "Forma de Pagamento", example: "Pix" },
];

export function ChannelsAndSupportSection() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Contatos Oficiais & Redes Sociais
  const [whatsappNumber, setWhatsappNumber] = useState("5565999999999");
  const [whatsappMessage, setWhatsappMessage] = useState(
    "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria."
  );
  const [supportPhone, setSupportPhone] = useState("(65) 3682-0000");
  const [storeAddress, setStoreAddress] = useState("Av. Filinto Müller, 1420 - Centro, Várzea Grande - MT");
  const [openingHoursText, setOpeningHoursText] = useState("Terça a Domingo das 14h às 22h");
  const [instagramUrl, setInstagramUrl] = useState("https://instagram.com/popshake");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("contato@popshake.com.br");

  // 2. Templates de Notificação por Etapa
  const [selectedStage, setSelectedStage] = useState<keyof Required<OrderNotificationTemplates>>("pending");
  const [notificationTemplates, setNotificationTemplates] = useState<Required<OrderNotificationTemplates>>(DEFAULT_NOTIFICATION_TEMPLATES);

  // Referência do textarea para inserção de tags na posição do cursor
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        if (settings.whatsappNumber) setWhatsappNumber(settings.whatsappNumber);
        if (settings.whatsappMessage) setWhatsappMessage(settings.whatsappMessage);
        if (settings.supportPhone) setSupportPhone(settings.supportPhone);
        if (settings.storeAddress) setStoreAddress(settings.storeAddress);
        if (settings.openingHoursText) setOpeningHoursText(settings.openingHoursText);
        if (settings.instagramUrl) setInstagramUrl(settings.instagramUrl);
        if (settings.facebookUrl) setFacebookUrl(settings.facebookUrl);

        if (settings.orderNotificationTemplates) {
          setNotificationTemplates({
            pending: settings.orderNotificationTemplates.pending || DEFAULT_NOTIFICATION_TEMPLATES.pending,
            preparing: settings.orderNotificationTemplates.preparing || DEFAULT_NOTIFICATION_TEMPLATES.preparing,
            ready: settings.orderNotificationTemplates.ready || DEFAULT_NOTIFICATION_TEMPLATES.ready,
            delivering: settings.orderNotificationTemplates.delivering || DEFAULT_NOTIFICATION_TEMPLATES.delivering,
            completed: settings.orderNotificationTemplates.completed || DEFAULT_NOTIFICATION_TEMPLATES.completed,
            support: settings.orderNotificationTemplates.support || DEFAULT_NOTIFICATION_TEMPLATES.support,
          });
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar canais:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleInsertTag = (tag: string) => {
    const currentText = notificationTemplates[selectedStage] || "";
    const textarea = textareaRef.current;

    if (!textarea) {
      setNotificationTemplates((prev) => ({
        ...prev,
        [selectedStage]: currentText ? `${currentText} ${tag}` : tag,
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = currentText.substring(0, start) + tag + currentText.substring(end);

    setNotificationTemplates((prev) => ({
      ...prev,
      [selectedStage]: newText,
    }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleResetStageTemplate = () => {
    setNotificationTemplates((prev) => ({
      ...prev,
      [selectedStage]: DEFAULT_NOTIFICATION_TEMPLATES[selectedStage],
    }));
    showToast({
      type: "info",
      title: "Template Restaurado",
      message: `O template de "${TEMPLATE_STAGES.find((s) => s.key === selectedStage)?.label}" voltou ao padrão.`,
    });
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await storeSettingsService.updateSettings({
        whatsappNumber,
        whatsappMessage,
        supportPhone,
        storeAddress,
        openingHoursText,
        instagramUrl,
        facebookUrl,
        postSaleMessage: notificationTemplates.completed,
        supportMessage: notificationTemplates.support,
        orderNotificationTemplates: notificationTemplates,
      });

      showToast({
        type: "success",
        title: "Canais & Templates Salvos! 💬",
        message: "Contatos, horários, endereço e mensagens automáticas foram atualizados com sucesso.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar os canais.";
      showToast({
        type: "error",
        title: "Erro ao Salvar",
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  // Renderiza pré-visualização interpolada com valores amigáveis de exemplo
  const renderPreviewMessage = (templateText: string) => {
    return templateText
      .replace(/\{cliente\}/g, "Lucas Silva")
      .replace(/\{codigo_pedido\}/g, "POP-104")
      .replace(/\{tempo_estimado\}/g, "35-50 min")
      .replace(/\{total\}/g, "R$ 48,50")
      .replace(/\{link_rastreamento\}/g, "https://popshake.com/rastreamento/POP-104")
      .replace(/\{forma_pagamento\}/g, "Pix");
  };

  const cleanWhatsapp = whatsappNumber.replace(/\D/g, "");
  const waTestLink = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
  const activeStageConfig = TEMPLATE_STAGES.find((s) => s.key === selectedStage) || TEMPLATE_STAGES[0];

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono">Carregando canais e templates...</span>
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
            <span>Canais Operacionais & Mensagens de Atendimento</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Configure os dados de contato oficiais da loja (alimentando o rodapé da vitrine) e edite os templates de notificação disparados aos clientes em cada estágio do pedido.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizado com o Rodapé
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* PARTE 1: CONTATOS OFICIAIS & REDES SOCIAIS DA LOJA */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                  Contatos Oficiais, Localização & Redes Sociais
                </h4>
                <p className="text-xs text-muted-foreground">
                  Informações públicas exibidas no rodapé da loja, no menu de suporte e nas confirmações de pedido.
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
                <span>💬 Testar wa.me</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* WhatsApp de Atendimento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp Oficial (wa.me) *
              </Label>
              <Input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="5565999999999"
                className="font-mono text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Com DDI e DDD (ex: 5565999999999). Gera o link wa.me direto.
              </span>
            </div>

            {/* Telefone Comercial / Fixo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                Telefone Comercial / Fixo
              </Label>
              <Input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="(65) 3682-0000"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
              />
              <span className="text-[10px] text-muted-foreground block">
                Exibido com clareza na coluna de contatos do rodapé.
              </span>
            </div>

            {/* Instagram Oficial */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                Instagram Oficial
              </Label>
              <Input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="@popshakeacai ou https://instagram.com/..."
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Perfil oficial (ex: @popshake ou URL completa).
              </span>
            </div>

            {/* Facebook Oficial */}
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
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Página no Facebook (opcional).
              </span>
            </div>

            {/* Endereço Físico (Várzea Grande - MT) */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Endereço Físico da Loja *
              </Label>
              <Input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Av. Filinto Müller, 1420 - Centro, Várzea Grande - MT"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Alimenta o card de endereço e gera o link direto para o Google Maps.
              </span>
            </div>

            {/* Horário de Funcionamento Informativo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-500" />
                Horário de Funcionamento *
              </Label>
              <Input
                type="text"
                value={openingHoursText}
                onChange={(e) => setOpeningHoursText(e.target.value)}
                placeholder="Terça a Domingo das 14h às 22h"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Texto informativo exibido na coluna de horários do rodapé.
              </span>
            </div>

            {/* Mensagem Inicial de Boas-Vindas */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-500" />
                Mensagem Padrão de Abertura no WhatsApp
              </Label>
              <Input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake."
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
              />
              <span className="text-[10px] text-muted-foreground block">
                Texto pré-digitado que aparece para o cliente ao clicar no WhatsApp.
              </span>
            </div>

            {/* E-mail de Atendimento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-500" />
                E-mail Institucional
              </Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="contato@popshake.com.br"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* PARTE 2: GERENCIADOR DE TEMPLATES DE NOTIFICAÇÃO POR ETAPA DO PEDIDO */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                  Gerenciador de Templates por Etapa do Pedido
                </h4>
                <p className="text-xs text-muted-foreground">
                  Personalize as mensagens automáticas disparadas para o cliente nos 6 estágios operacionais da plataforma.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetStageTemplate}
              className="text-xs gap-1.5 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão desta Etapa
            </Button>
          </div>

          {/* Seleção de Etapa em Abas / Segmented Control */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TEMPLATE_STAGES.map((stage) => {
              const Icon = stage.icon;
              const isActive = selectedStage === stage.key;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setSelectedStage(stage.key)}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer
                    ${isActive
                      ? "bg-white dark:bg-zinc-800 border-primary text-primary dark:text-white shadow-md shadow-primary/10 ring-2 ring-primary/20"
                      : "bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 text-muted-foreground hover:bg-white dark:hover:bg-zinc-800 hover:text-foreground"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isActive ? "text-primary dark:text-violet-400" : "text-muted-foreground"}`} />
                  <span className="font-bold text-xs truncate max-w-full">{stage.shortLabel}</span>
                  <span className="text-[10px] text-muted-foreground/70 hidden sm:block truncate">{stage.key}</span>
                </button>
              );
            })}
          </div>

          {/* Editor da Etapa Selecionada & Badges de Interpolação */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Coluna Esquerda (7 cols): Editor de Texto e Badges */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    {activeStageConfig.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {activeStageConfig.description}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {notificationTemplates[selectedStage]?.length || 0}/300 caracteres
                </span>
              </div>

              {/* Textarea do Template */}
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={notificationTemplates[selectedStage] || ""}
                  onChange={(e) =>
                    setNotificationTemplates((prev) => ({
                      ...prev,
                      [selectedStage]: e.target.value.slice(0, 300),
                    }))
                  }
                  rows={4}
                  className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#181D2D] text-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans leading-relaxed"
                  placeholder="Escreva a mensagem personalizada para esta etapa..."
                />

                {/* Badges de Interpolação Clicáveis */}
                <div className="p-3 rounded-xl bg-white dark:bg-[#181D2D] border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Tags de Interpolação Disponíveis (Clique para inserir)
                    </span>
                    <span className="text-[10px] text-muted-foreground">Insere no cursor</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAGS.map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => handleInsertTag(item.tag)}
                        title={`Insere a tag ${item.tag} (${item.label})`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-primary/10 hover:bg-primary/20 text-primary dark:text-violet-300 border border-primary/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <span>{item.tag}</span>
                        <Copy className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita (5 cols): Preview Realista tipo WhatsApp / Notificação */}
            <div className="lg:col-span-5 flex flex-col">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-500" />
                Como o Cliente Receberá (Preview Real)
              </span>

              <div className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
                {/* Header do balão simulando WhatsApp / Notificação */}
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                      PS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">Pop Shake Sorveteria</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Notificação de Pedido</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">Agora</span>
                </div>

                {/* Balão de Mensagem */}
                <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-foreground leading-relaxed shadow-xs">
                  <p className="whitespace-pre-wrap font-sans">
                    {renderPreviewMessage(notificationTemplates[selectedStage] || "")}
                  </p>
                </div>

                {/* Rodapé informativo */}
                <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Simulação com dados de teste</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">✓✓ Entregue</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Salvar Alterações */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold h-12 px-8 shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Salvando Tudo...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Canais & Notificações
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
