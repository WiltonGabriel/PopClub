"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Phone,
  ExternalLink,
  Save,
  Loader2,
  Sparkles,
  Clock,
  MapPin,
  Send,
  RotateCcw,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Bike,
  HelpCircle,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Check,
  Compass,
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

const DEFAULT_SLOGAN = "Açaí artesanal, cremosidade única e o sabor que transforma o seu dia.";
const DEFAULT_BADGE = "Delivery Próprio e Artesanal";
const DEFAULT_ADDRESS = "Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT";
const DEFAULT_MAPS = "https://maps.google.com/?q=Av.+Filinto+M%C3%BCller,+850+-+Centro+Sul,+V%C3%A1rzea+Grande+-+MT";
const DEFAULT_HOURS = "Terça a Domingo das 14h às 22h";

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

const PAYMENT_OPTIONS = [
  {
    id: "pix",
    label: "Pix",
    description: "Aprovação instantânea via QR Code ou Chave Copia e Cola",
    icon: QrCode,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    id: "credito",
    label: "Cartão de Crédito",
    description: "Visa, Mastercard, Elo, Hipercard na maquineta",
    icon: CreditCard,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    id: "debito",
    label: "Cartão de Débito",
    description: "Débito direto na entrega com aproximação",
    icon: CreditCard,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    id: "dinheiro",
    label: "Dinheiro",
    description: "Pagamento em espécie na entrega com troco informado",
    icon: Banknote,
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    id: "vr_va",
    label: "Vale-Refeição / Alimentação",
    description: "Cartões de benefícios (Sodexo, Alelo, Ticket, etc.)",
    icon: CreditCard,
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  },
];

export function ChannelsAndSupportSection() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Identidade do Rodapé & Localização
  const [footerSlogan, setFooterSlogan] = useState(DEFAULT_SLOGAN);
  const [footerBadgeText, setFooterBadgeText] = useState(DEFAULT_BADGE);
  const [storeAddress, setStoreAddress] = useState(DEFAULT_ADDRESS);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(DEFAULT_MAPS);
  const [storeCnpj, setStoreCnpj] = useState("");
  const [openingHoursText, setOpeningHoursText] = useState(DEFAULT_HOURS);

  // 2. Contatos Oficiais & Redes Sociais
  const [whatsappNumber, setWhatsappNumber] = useState("5565999999999");
  const [whatsappMessage, setWhatsappMessage] = useState(
    "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria."
  );
  const [supportPhone, setSupportPhone] = useState("(65) 3682-0000");
  const [instagramUrl, setInstagramUrl] = useState("@popshake");
  const [facebookUrl, setFacebookUrl] = useState("");

  // 3. Formas de Pagamento no Rodapé
  const [showPaymentMethods, setShowPaymentMethods] = useState(true);
  const [acceptedPayments, setAcceptedPayments] = useState<string[]>([
    "pix",
    "dinheiro",
    "credito",
    "debito",
  ]);

  // 4. Templates de Notificação por Etapa
  const [selectedStage, setSelectedStage] = useState<keyof Required<OrderNotificationTemplates>>("pending");
  const [notificationTemplates, setNotificationTemplates] = useState<Required<OrderNotificationTemplates>>(
    DEFAULT_NOTIFICATION_TEMPLATES
  );

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
        if (settings.storeCnpj) setStoreCnpj(settings.storeCnpj);

        if (settings.footerSlogan !== undefined && settings.footerSlogan !== null) {
          setFooterSlogan(settings.footerSlogan || DEFAULT_SLOGAN);
        }
        if (settings.footerBadgeText !== undefined && settings.footerBadgeText !== null) {
          setFooterBadgeText(settings.footerBadgeText || DEFAULT_BADGE);
        }
        if (settings.googleMapsUrl !== undefined && settings.googleMapsUrl !== null) {
          setGoogleMapsUrl(settings.googleMapsUrl || DEFAULT_MAPS);
        }
        if (settings.showPaymentMethods !== undefined) {
          setShowPaymentMethods(settings.showPaymentMethods);
        }
        if (settings.acceptedPayments && Array.isArray(settings.acceptedPayments)) {
          setAcceptedPayments(settings.acceptedPayments);
        }

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

  const handleTogglePayment = (methodId: string) => {
    setAcceptedPayments((prev) =>
      prev.includes(methodId) ? prev.filter((m) => m !== methodId) : [...prev, methodId]
    );
  };

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
        footerSlogan,
        footerBadgeText,
        googleMapsUrl,
        storeCnpj,
        showPaymentMethods,
        acceptedPayments,
        postSaleMessage: notificationTemplates.completed,
        supportMessage: notificationTemplates.support,
        orderNotificationTemplates: notificationTemplates,
      });

      showToast({
        type: "success",
        title: "Configurações Salvas! 🍧",
        message: "O rodapé público, canais e mensagens foram atualizados com sucesso.",
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
  const cleanPhone = supportPhone.replace(/\D/g, "");
  const isSmartMenuTriggered = cleanPhone.length >= 8 && cleanPhone !== cleanWhatsapp;

  // Instagram handle formatado para link
  const rawInstagram = instagramUrl.trim();
  const instagramHandle = rawInstagram
    .replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "")
    .replace(/^@/, "");
  const instagramWebUrl = instagramHandle ? `https://instagram.com/${instagramHandle}` : "";
  const activeStageConfig = TEMPLATE_STAGES.find((s) => s.key === selectedStage) || TEMPLATE_STAGES[0];

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono">Carregando canais e rodapé...</span>
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
            <span>Canais Operacionais, Rodapé & Atendimento</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Gerencie toda a identidade pública do rodapé (slogan, selo, horários, endereço e formas de pagamento aceitas) e os canais de atendimento e mensagens automáticas da loja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizado com o Rodapé Público
          </span>
        </div>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* SUBSEÇÃO 1: IDENTIDADE DO RODAPÉ & CONTATOS DA LOJA */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                  Identidade do Rodapé & Contatos da Loja
                </h4>
                <p className="text-xs text-muted-foreground">
                  Textos principais, slogan, selo institucional, endereço e horário exibidos no rodapé da vitrine pública.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Slogan / Frase de Efeito */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Slogan / Frase de Efeito no Rodapé
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {footerSlogan.length} caracteres
                  </span>
                  <button
                    type="button"
                    onClick={() => setFooterSlogan(DEFAULT_SLOGAN)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline hover:opacity-80 transition-opacity cursor-pointer"
                    title="Restaurar slogan original"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>
              </div>
              <Input
                type="text"
                value={footerSlogan}
                onChange={(e) => setFooterSlogan(e.target.value)}
                placeholder="Açaí artesanal, cremosidade única e o sabor que transforma o seu dia."
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-medium"
              />
              <span className="text-[10px] text-muted-foreground block">
                Exibido com destaque abaixo da logomarca na primeira coluna do rodapé.
              </span>
            </div>

            {/* Texto do Selo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  Texto do Selo Visual
                </Label>
                <button
                  type="button"
                  onClick={() => setFooterBadgeText(DEFAULT_BADGE)}
                  className="text-[11px] font-medium text-primary hover:underline transition-opacity cursor-pointer"
                >
                  Padrão
                </button>
              </div>
              <Input
                type="text"
                value={footerBadgeText}
                onChange={(e) => setFooterBadgeText(e.target.value)}
                placeholder="Delivery Próprio e Artesanal"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
              />
              <span className="text-[10px] text-muted-foreground block">
                Distintivo dourado de credibilidade na Coluna 1 do rodapé.
              </span>
            </div>

            {/* Horário de Atendimento Informativo */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-500" />
                Horário de Atendimento no Rodapé *
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
                Exibido ao lado do badge dinâmico &quot;Aberto Agora&quot; / &quot;Fechado&quot;.
              </span>
            </div>

            {/* CNPJ da Empresa */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                CNPJ (Opcional)
              </Label>
              <Input
                type="text"
                value={storeCnpj}
                onChange={(e) => setStoreCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Exibido no rodapé da vitrine para transparência fiscal.
              </span>
            </div>

            {/* Endereço Físico */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Endereço Completo da Loja *
              </Label>
              <Input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                required
              />
              <span className="text-[10px] text-muted-foreground block">
                Localização física exibida na Coluna 3 do rodapé.
              </span>
            </div>

            {/* Link do Google Maps */}
            <div className="space-y-2 md:col-span-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-500" />
                  Link do Google Maps (Rotas & Localização)
                </Label>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Testar no Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <Input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Link direto acionado ao clicar em &quot;Abrir no Google Maps&quot; no rodapé.
              </span>
            </div>
          </div>
        </div>

        {/* SUBSEÇÃO 2: CANAIS DE CONTATO & REDES SOCIAIS */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                  Canais de Contato & Redes Sociais
                </h4>
                <p className="text-xs text-muted-foreground">
                  Canais oficiais de atendimento que alimentam o botão de contato inteligente e os botões sociais.
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* WhatsApp Oficial */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp Oficial de Atendimento *
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
                Com DDI e DDD (ex: 5565999999999). Alimenta o botão principal de WhatsApp.
              </span>
            </div>

            {/* Telefone Comercial / Chamada */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                Telefone Comercial / Chamada (Opcional)
              </Label>
              <Input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="(65) 3682-0000"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Se preenchido e diferente do WhatsApp, ativa o menu de contato inteligente no rodapé.
              </span>
            </div>

            {/* Instagram Oficial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                  Instagram Oficial
                </Label>
                {instagramWebUrl && (
                  <a
                    href={instagramWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    <span>@{instagramHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <Input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="@popshake ou https://instagram.com/popshake"
                className="text-xs sm:text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl font-mono"
              />
              <span className="text-[10px] text-muted-foreground block">
                Botão gradiente exibido na Coluna 4 do rodapé.
              </span>
            </div>

            {/* Indicador do Menu de Contato Inteligente */}
            <div className="md:col-span-2 lg:col-span-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-start gap-3 text-xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">
                  Status do Botão de Contato no Rodapé:
                </p>
                {isSmartMenuTriggered ? (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✨ <strong>Menu Inteligente Ativo:</strong> O número de telefone ({supportPhone}) é diferente do WhatsApp. O botão exibirá um popover elegante com opções de &quot;Conversar no WhatsApp&quot; e &quot;Ligar para {supportPhone}&quot;.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Direct wa.me: O telefone não está cadastrado ou é o mesmo do WhatsApp. O botão abrirá a conversa do WhatsApp diretamente em nova aba.
                  </p>
                )}
              </div>
            </div>

            {/* Mensagem Padrão de Abertura no WhatsApp */}
            <div className="space-y-2 md:col-span-2">
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
                Texto inicial pré-preenchido que aparece no chat do cliente.
              </span>
            </div>

            {/* Facebook Oficial */}
            <div className="space-y-2">
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
            </div>
          </div>
        </div>

        {/* SUBSEÇÃO 3: CONTROLE DE FORMAS DE PAGAMENTO NO RODAPÉ */}
        <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                  Controle de Formas de Pagamento no Rodapé
                </h4>
                <p className="text-xs text-muted-foreground">
                  Ative ou desative a barra estilizada de métodos aceitos que antecede os créditos e direitos autorais.
                </p>
              </div>
            </div>

            {/* Switch de Ativação Geral */}
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start sm:self-auto shadow-xs">
              <span className="text-xs font-bold text-foreground">
                Exibir Barra no Rodapé:
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showPaymentMethods}
                onClick={() => setShowPaymentMethods(!showPaymentMethods)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showPaymentMethods ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showPaymentMethods ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Grid de Formas Aceitas */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Selecione as modalidades aceitas na loja:
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = acceptedPayments.includes(opt.id);
                const IconComponent = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleTogglePayment(opt.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-white dark:bg-zinc-950 border-emerald-500/60 dark:border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/20"
                        : "bg-zinc-100/60 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/80 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border ${opt.badgeColor}`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-heading font-bold text-xs text-foreground uppercase tracking-wide">
                          {opt.label}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-emerald-500 text-white"
                            : "border border-zinc-300 dark:border-zinc-700 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {opt.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SUBSEÇÃO 4: GERENCIADOR DE TEMPLATES DE NOTIFICAÇÃO POR ETAPA */}
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
                  Edite os textos disparados via WhatsApp ao cliente em cada mudança de status no PDV / Cozinha.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetStageTemplate}
              className="text-xs h-9 rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-muted-foreground" />
              <span>Restaurar Padrão desta Etapa</span>
            </Button>
          </div>

          {/* Abas das 6 Etapas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TEMPLATE_STAGES.map((stage) => {
              const isSelected = selectedStage === stage.key;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setSelectedStage(stage.key)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-zinc-800/90 border-primary shadow-xs ring-1 ring-primary/30"
                      : "bg-white/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-heading text-xs font-bold text-foreground">
                    {stage.shortLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                    {stage.label.split(". ")[1]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Painel de Edição + Preview Lado a Lado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Coluna Esquerda: Editor de Texto com Inserção de Tags */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <activeStageConfig.icon className="w-3.5 h-3.5 text-primary" />
                  <span>Mensagem para: {activeStageConfig.label}</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeStageConfig.description}
                </p>
              </div>

              <textarea
                ref={textareaRef}
                rows={4}
                value={notificationTemplates[selectedStage] || ""}
                onChange={(e) =>
                  setNotificationTemplates((prev) => ({
                    ...prev,
                    [selectedStage]: e.target.value,
                  }))
                }
                placeholder="Digite a mensagem padrão..."
                className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181D2D] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans"
              />

              {/* Botões de Inserção de Tags Dinâmicas */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Inserir Variável Dinâmica:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map((tag) => (
                    <button
                      key={tag.tag}
                      type="button"
                      onClick={() => handleInsertTag(tag.tag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200/70 hover:bg-primary hover:text-white dark:bg-zinc-800 dark:hover:bg-primary text-[11px] font-mono font-medium transition-colors cursor-pointer"
                      title={`Exemplo: ${tag.example}`}
                    >
                      <span>{tag.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Preview Realista */}
            <div className="lg:col-span-5 flex flex-col">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-500" />
                Como o Cliente Receberá (Preview Real)
              </span>

              <div className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between relative overflow-hidden shadow-inner">
                {/* Header simulando WhatsApp */}
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
                Salvar Rodapé, Canais & Notificações
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}
