"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Send,
  Users,
  UserPlus,
  Sparkles,
  Ticket,
  Clock,
  Crown,
  HeartHandshake,
  MessageSquare,
  Plus,
  Save,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  Layers,
  ChevronRight,
  Eye,
  RotateCcw,
  Award,
} from "lucide-react";
import {
  notificationService,
  NotificationTemplateItem,
} from "../../services/notificationService";
import { couponService, Coupon } from "../../services/couponService";
import { 
  loyaltyBadgeService, 
  LoyaltyBadgeConfig, 
  DEFAULT_LOYALTY_BADGES,
  formatLoyaltyBadgeRequirement,
} from "../../services/loyaltyBadgeService";
import { useToast } from "../ui/ToastNotification";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { playDingSound } from "../../lib/sound";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CustomAudienceModal } from "./CustomAudienceModal";

type AudienceType =
  | "ALL"
  | "NEW_CUSTOMERS"
  | "ACTIVATION"
  | "VIP"
  | "INACTIVE_15"
  | "INACTIVE_30"
  | "INACTIVE_60"
  | "CUSTOM";

interface AudienceOption {
  id: AudienceType;
  title: string;
  subtitle: string;
  badge: string;
  icon: any;
  color: string;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    id: "ALL",
    title: "Todos os Clientes",
    subtitle: "Disparo geral para toda a base de clientes cadastrados",
    badge: "Geral",
    icon: Users,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "NEW_CUSTOMERS",
    title: "Novos Clientes",
    subtitle: "0 pedidos realizados • Ideal para cupom de boas-vindas",
    badge: "Boas-vindas",
    icon: UserPlus,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "ACTIVATION",
    title: "Em Ativação",
    subtitle: "1 a 2 pedidos • Incentivo à recorrência e segunda compra",
    badge: "Ativação",
    icon: HeartHandshake,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "VIP",
    title: "Clientes VIP / Recorrentes",
    subtitle: "3 ou mais pedidos • Clientes fiéis e mais lucrativos",
    badge: "VIP",
    icon: Crown,
    color: "from-purple-600 to-fuchsia-600",
  },
  {
    id: "INACTIVE_15",
    title: "Inativos (15 dias)",
    subtitle: "Clientes sem pedidos nos últimos 15 dias",
    badge: "15 dias",
    icon: Clock,
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "INACTIVE_30",
    title: "Inativos (30 dias)",
    subtitle: "Clientes sem pedidos nos últimos 30 dias",
    badge: "30 dias",
    icon: Clock,
    color: "from-rose-600 to-red-700",
  },
  {
    id: "INACTIVE_60",
    title: "Inativos (60 dias)",
    subtitle: "Clientes ausentes há mais de 2 meses • Resgate urgente",
    badge: "60 dias",
    icon: RotateCcw,
    color: "from-red-600 to-rose-700",
  },
  {
    id: "CUSTOM",
    title: "Personalizado",
    subtitle: "Selecione clientes manualmente ou carregue listas salvas",
    badge: "Custom",
    icon: Users,
    color: "from-primary to-accent",
  },
];

export function CommunicationSection() {
  const { showToast } = useToast();

  // Estados do Formulário de Disparo
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>("ALL");
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState<boolean>(true);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");

  // Custom Audience
  const [isCustomAudienceModalOpen, setIsCustomAudienceModalOpen] = useState(false);
  const [customAudienceUserIds, setCustomAudienceUserIds] = useState<string[]>([]);
  const [templateIdToDelete, setTemplateIdToDelete] = useState<string | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  // Presets / Modelos
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Cupons Ativos
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  // Estado de envio
  const [isSending, setIsSending] = useState(false);

  // Modal para salvar novo modelo
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Segmentação por Fidelidade
  const [audienceFilterMode, setAudienceFilterMode] = useState<"ALL" | "LOYALTY">("ALL");
  const [loyaltyBadges, setLoyaltyBadges] = useState<LoyaltyBadgeConfig[]>(DEFAULT_LOYALTY_BADGES);
  const [selectedLoyaltyBadgeIds, setSelectedLoyaltyBadgeIds] = useState<string[]>([]);

  // Carrega modelos, cupons ativos e selos de fidelidade
  useEffect(() => {
    notificationService
      .getTemplates()
      .then((data) => {
        setTemplates(data);
        // Pré-seleciona o primeiro preset por conveniência se o formulário estiver vazio
        if (data.length > 0 && !title && !message) {
          setTitle(data[0].title);
          setMessage(data[0].message);
          setSelectedTemplateId(data[0].id);
        }
      })
      .catch((err) => console.error("Erro ao carregar templates:", err))
      .finally(() => setLoadingTemplates(false));

    couponService
      .getCoupons()
      .then((data) => {
        setCoupons(data.filter((c) => c.isActive));
      })
      .catch((err) => console.error("Erro ao carregar cupons:", err))
      .finally(() => setLoadingCoupons(false));

    loyaltyBadgeService
      .getBadges()
      .then((badges) => {
        setLoyaltyBadges(badges);
        setSelectedLoyaltyBadgeIds(badges.map((b) => b.id));
      })
      .catch((err) => console.error("Erro ao carregar selos para segmentação:", err));
  }, []);

  const fetchAudienceCount = useCallback(async (audience: AudienceType | "LOYALTY", customLoyaltyIds?: string[]) => {
    if (audience === "CUSTOM") {
      setAudienceCount(customAudienceUserIds.length);
      setLoadingCount(false);
      return;
    }
    
    setLoadingCount(true);
    try {
      const ids = customLoyaltyIds !== undefined ? customLoyaltyIds : selectedLoyaltyBadgeIds;
      const count = await notificationService.getAudienceCount(audience, audience === "LOYALTY" ? ids : undefined);
      setAudienceCount(count);
    } catch (err) {
      console.error(err);
      setAudienceCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, [customAudienceUserIds.length, selectedLoyaltyBadgeIds]);

  useEffect(() => {
    if (audienceFilterMode === "ALL") {
      fetchAudienceCount(selectedAudience);
    } else {
      fetchAudienceCount("LOYALTY", selectedLoyaltyBadgeIds);
    }
  }, [audienceFilterMode, selectedAudience, selectedLoyaltyBadgeIds, fetchAudienceCount]);

  const toggleLoyaltyBadge = (id: string) => {
    setSelectedLoyaltyBadgeIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      fetchAudienceCount("LOYALTY", next);
      return next;
    });
  };

  const handleSelectAllBadges = () => {
    const allIds = loyaltyBadges.map((b) => b.id);
    setSelectedLoyaltyBadgeIds(allIds);
    fetchAudienceCount("LOYALTY", allIds);
  };

  const handleDeselectAllBadges = () => {
    setSelectedLoyaltyBadgeIds([]);
    fetchAudienceCount("LOYALTY", []);
  };

  // Aplica um modelo selecionado
  const handleSelectTemplate = (tpl: NotificationTemplateItem) => {
    setSelectedTemplateId(tpl.id);
    setTitle(tpl.title);
    setMessage(tpl.message);
    if (tpl.couponId) {
      setSelectedCouponId(tpl.couponId);
    }
  };

  // Inserção de variáveis dinâmicas no texto
  const insertVariable = (variable: "{NOME}" | "{CUPOM}") => {
    setMessage((prev) => `${prev} ${variable}`.trim());
  };

  // Salva mensagem atual como novo preset
  const handleSaveAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("Preencha título e mensagem antes de salvar o modelo.", "error");
      return;
    }
    try {
      setIsSavingTemplate(true);
      const created = await notificationService.createTemplate({
        title: newTemplateTitle.trim() || title.trim(),
        message: message.trim(),
        category: "custom",
        couponId: selectedCouponId || null,
      });
      setTemplates((prev) => [...prev, created]);
      setSelectedTemplateId(created.id);
      setIsSaveTemplateModalOpen(false);
      setNewTemplateTitle("");
      showToast("Modelo salvo com sucesso!", "success");
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar modelo.", "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Deleta preset customizado
  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTemplateIdToDelete(id);
  };

  const executeDeleteTemplate = async () => {
    if (!templateIdToDelete) return;
    setDeletingTemplate(true);
    try {
      await notificationService.deleteTemplate(templateIdToDelete);
      setTemplates((prev) => prev.filter((t) => t.id !== templateIdToDelete));
      if (selectedTemplateId === templateIdToDelete) setSelectedTemplateId(null);
      showToast("Modelo removido.", "info");
      setTemplateIdToDelete(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir modelo.", "error");
    } finally {
      setDeletingTemplate(false);
    }
  };

  // Cupom selecionado
  const attachedCoupon = useMemo(() => {
    return coupons.find((c) => c.id === selectedCouponId) || null;
  }, [coupons, selectedCouponId]);

  // Mensagem simulada no Live Preview
  const simulatedMessage = useMemo(() => {
    let text = message || "Escreva uma mensagem para visualizar a prévia...";
    text = text.replace(/\{NOME\}/gi, "Ana");
    if (attachedCoupon) {
      text = text.replace(/\{CUPOM\}/gi, attachedCoupon.code);
    } else {
      text = text.replace(/\{CUPOM\}/gi, "[CUPOM]");
    }
    return text;
  }, [message, attachedCoupon]);

  // Disparo
  const handleDispatch = async () => {
    if (!title.trim()) {
      showToast("Digite o título da notificação.", "error");
      return;
    }
    if (!message.trim()) {
      showToast("Digite o conteúdo da mensagem.", "error");
      return;
    }
    if (audienceFilterMode === "LOYALTY" && selectedLoyaltyBadgeIds.length === 0) {
      showToast("Selecione ao menos um selo de fidelidade.", "error");
      return;
    }
    if (audienceCount === 0) {
      showToast("Nenhum cliente atende ao público selecionado para disparo.", "error");
      return;
    }

    try {
      setIsSending(true);
      const isBroadcast = audienceFilterMode === "ALL" && selectedAudience === "ALL" && !selectedCouponId;
      const res = await notificationService.dispatchNotification({
        title: title.trim(),
        message: message.trim(),
        targetAudience: audienceFilterMode === "LOYALTY" ? "LOYALTY" : selectedAudience,
        loyaltyBadgeIds: audienceFilterMode === "LOYALTY" ? selectedLoyaltyBadgeIds : undefined,
        customUserIds: audienceFilterMode !== "LOYALTY" && selectedAudience === "CUSTOM" ? customAudienceUserIds : undefined,
        couponId: selectedCouponId || null,
        type: selectedCouponId ? "COUPON" : isBroadcast ? "BROADCAST" : "TARGETED",
      });

      playDingSound();
      showToast(res.message || `Mensagem disparada com sucesso para ${res.recipientsCount} cliente(s)!`, "success");
    } catch (err: any) {
      showToast(err.message || "Erro ao disparar notificação.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Cabeçalho da Seção */}
      <div className="border-b border-gray-100 dark:border-border/30 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground dark:text-foreground">
            <Send className="w-6 h-6 text-primary" />
            Comunicação & Mensagens da Loja
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Envie comunicados, avisos e cupons segmentados por comportamento de compra da base de clientes.
          </p>
        </div>

        {/* Indicador de Destinatários Elegíveis em Destaque */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/5 dark:bg-primary/95/40 border border-primary/30 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {loadingCount ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              audienceCount
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Destinatários Elegíveis
            </span>
            <span className="font-heading font-black text-sm text-foreground dark:text-foreground">
              {loadingCount ? "Calculando..." : `${audienceCount} cliente(s)`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Seletor de Segmentação Inteligente */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            1. Escolha o Público Alvo
          </Label>

          {/* Seletor Principal: [ Todos os Clientes ] vs [ Filtrar por Nível de Fidelidade ] */}
          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800/80 rounded-xl border border-gray-200 dark:border-zinc-700/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setAudienceFilterMode("ALL");
                fetchAudienceCount(selectedAudience);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                audienceFilterMode === "ALL"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos os Clientes
            </button>
            <button
              type="button"
              onClick={() => {
                setAudienceFilterMode("LOYALTY");
                fetchAudienceCount("LOYALTY", selectedLoyaltyBadgeIds);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                audienceFilterMode === "LOYALTY"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Filtrar por Nível de Fidelidade
            </button>
          </div>
        </div>

        {audienceFilterMode === "ALL" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Filtro comportamental: <strong className="text-primary">{AUDIENCE_OPTIONS.find((a) => a.id === selectedAudience)?.title}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {AUDIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedAudience === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedAudience(opt.id);
                      if (opt.id === "CUSTOM") {
                        setIsCustomAudienceModalOpen(true);
                      }
                    }}
                    className={`
                      p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer
                      ${
                        isSelected
                          ? "bg-primary/5/90 dark:bg-primary/95/40 border-primary ring-2 ring-primary/30 shadow-md"
                          : "bg-white dark:bg-background border-gray-200 dark:border-border/40 hover:border-primary/50 shadow-xs"
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr ${opt.color} shadow-xs shrink-0`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? "bg-primary text-white border-transparent"
                            : "bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground dark:text-foreground">
                        {opt.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 dark:bg-zinc-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Selos de Fidelidade Elegíveis
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Marque quais selos de clientes receberão este comunicado (calculado por tempo de conta e/ou pedidos concluídos):
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllBadges}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span className="text-muted-foreground text-xs">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllBadges}
                  className="text-xs text-muted-foreground font-semibold hover:underline cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {loyaltyBadges.map((b) => {
                const isChecked = selectedLoyaltyBadgeIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "bg-white dark:bg-zinc-800/90 border-primary ring-1 ring-primary/40 shadow-xs"
                        : "bg-white/60 dark:bg-zinc-900/40 border-gray-200 dark:border-zinc-800 hover:border-gray-300 opacity-75"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleLoyaltyBadge(b.id)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-zinc-700 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-lg">{b.icon}</span>
                      <div className="min-w-0">
                        <span className="font-heading font-bold text-xs text-zinc-900 dark:text-zinc-100 block truncate">
                          {b.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {formatLoyaltyBadgeRequirement(b)}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Modelos Prontos (Presets) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            2. Modelos Prontos & Presets de Mensagem
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              ({templates.length}/5 salvos)
            </span>
            <button
              type="button"
              onClick={() => {
                if (templates.length >= 5) {
                  showToast("Limite atingido: Você já possui 5 modelos de mensagem salvos. Exclua um modelo existente para salvar um novo.", "error");
                  return;
                }
                setIsSaveTemplateModalOpen(true);
              }}
              disabled={templates.length >= 5}
              className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                templates.length >= 5
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-primary dark:text-muted-foreground hover:underline cursor-pointer"
              }`}
            >
              <Save className="w-3.5 h-3.5" /> Salvar Mensagem Atual como Preset
            </button>
          </div>
        </div>

        {loadingTemplates ? (
          <div className="p-4 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`
                    px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all select-none
                    ${
                      isSelected
                        ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-sm shadow-primary/30"
                        : "bg-white dark:bg-background border-gray-200 dark:border-border/40 hover:border-primary/60 text-foreground dark:text-gray-200"
                    }
                  `}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{tpl.title}</span>

                  {tpl.category === "custom" && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTemplate(e, tpl.id)}
                      title="Excluir este preset"
                      className="ml-1 p-0.5 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Formulário de Mensagem & Live Preview Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Edição da Mensagem */}
        <div className="lg:col-span-7 space-y-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-background border border-gray-200 dark:border-border/40 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-border/30 pb-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              3. Conteúdo da Mensagem
            </Label>
            {/* Pílulas de Inserção Dinâmica */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground mr-1">Inserir:</span>
              <button
                type="button"
                onClick={() => insertVariable("{NOME}")}
                className="px-2 py-0.5 rounded-lg bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground text-[11px] font-mono font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                title="Substitui pelo primeiro nome do cliente (ex: Olá Ana,)"
              >
                + &#123;NOME&#125;
              </button>
              <button
                type="button"
                onClick={() => insertVariable("{CUPOM}")}
                className="px-2 py-0.5 rounded-lg bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground text-[11px] font-mono font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                title="Substitui pelo código do cupom anexado (ex: POP10)"
              >
                + &#123;CUPOM&#125;
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Título da Notificação *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Um presente especial para você! 🍧"
              className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 text-sm font-semibold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Texto da Mensagem *
            </Label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá {NOME}, preparamos um presente especial para sua primeira experiência com a gente! Aproveite o cupom exclusivo {CUPOM}."
              className="w-full p-3 text-xs sm:text-sm bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              As variáveis <code>&#123;NOME&#125;</code> e <code>&#123;CUPOM&#125;</code> serão substituídas automaticamente para cada destinatário.
            </p>
          </div>

          {/* Anexo Direto de Cupom */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-border/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-primary" />
                Anexo Direto de Cupom (Opcional)
              </Label>
              {selectedCouponId && (
                <button
                  type="button"
                  onClick={() => setSelectedCouponId("")}
                  className="text-xs text-red-500 hover:underline cursor-pointer"
                >
                  Remover cupom
                </button>
              )}
            </div>

            <select
              value={selectedCouponId}
              onChange={(e) => setSelectedCouponId(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-background border border-gray-200 dark:border-border/40 rounded-xl text-xs sm:text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Nenhum cupom anexado</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `R$ ${c.discountValue.toFixed(2)} OFF`}
                  {c.oncePerUser ? " (1 uso por cliente)" : ""}
                  {c.minOrderValue > 0 ? ` [mín. R$ ${c.minOrderValue}]` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Disparo Principal */}
          <div className="pt-3">
            <Button
              type="button"
              onClick={handleDispatch}
              disabled={isSending || audienceCount === 0 || !title.trim() || !message.trim()}
              className="w-full h-12 rounded-xl font-heading font-bold uppercase tracking-widest text-sm bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white shadow-lg shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Disparando Notificações...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Disparar para {audienceCount} Cliente(s)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Coluna Direita: Live Preview na Visão do Cliente */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-background border border-gray-200 dark:border-border/40 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-border/30 pb-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                Live Preview (Visão do Cliente)
              </Label>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100/70 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                Simulação em Tempo Real
              </span>
            </div>

            {/* Simulação do Card no Perfil */}
            <div className="p-4 rounded-2xl bg-primary/5/70 dark:bg-primary/95/20 border border-primary/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-600 text-white">
                    Nova
                  </span>
                  <h5 className="font-heading font-bold text-xs sm:text-sm text-foreground dark:text-foreground">
                    {title || "Título da notificação"}
                  </h5>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  Agora mesmo
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {simulatedMessage}
              </p>

              {attachedCoupon && (
                <div className="mt-3 p-3 rounded-xl bg-white dark:bg-background border border-primary/20 dark:border-primary/80/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-primary dark:text-muted-foreground bg-primary/5 dark:bg-primary/95/50 px-2 py-0.5 rounded-md border border-primary/20 dark:border-primary/80/30">
                      {attachedCoupon.code}
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                      {attachedCoupon.discountType === "percentage"
                        ? `${attachedCoupon.discountValue}% OFF`
                        : `R$ ${attachedCoupon.discountValue.toFixed(2)} OFF`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
                    <div className="flex-1 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-[10px] font-bold text-center text-gray-600 dark:text-gray-300">
                      [ Copiar Código ]
                    </div>
                    <div className="flex-1 py-1 rounded-lg bg-primary text-white text-[10px] font-bold text-center">
                      [ Aplicar no Carrinho ]
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-background/80 border border-gray-200 dark:border-border/30 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Entrega Direta na Caixa de Entrada
              </p>
              <p className="text-[11px] leading-relaxed">
                Ao disparar, a mensagem acenderá o sino na Home dos clientes selecionados e será registrada permanentemente na aba &quot;Notificações&quot; do perfil deles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Salvar como Novo Modelo */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#200B22] border border-gray-200 dark:border-border/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <h4 className="font-heading font-bold text-base text-foreground dark:text-foreground flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Salvar Mensagem como Modelo (Preset)
            </h4>

            <p className="text-xs text-muted-foreground">
              Dê um nome para identificar este modelo em campanhas futuras.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nome do Preset *
              </Label>
              <Input
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder="Ex: Campanha de Aniversário PopShake"
                className="bg-gray-50 dark:bg-background border-gray-200 dark:border-border/40 h-11 text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="rounded-xl h-10 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveAsPreset}
                disabled={isSavingTemplate}
                className="bg-gradient-to-r from-primary to-accent text-white rounded-xl h-10 text-xs font-bold"
              >
                {isSavingTemplate ? "Salvando..." : "Salvar Preset"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Custom Audience */}
      <CustomAudienceModal
        open={isCustomAudienceModalOpen}
        onOpenChange={setIsCustomAudienceModalOpen}
        onSelectionSaved={setCustomAudienceUserIds}
      />
      <ConfirmDialog
        open={!!templateIdToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingTemplate) setTemplateIdToDelete(null);
        }}
        title="Excluir Modelo de Mensagem"
        description="Deseja realmente excluir este modelo de mensagem salvo?"
        confirmLabel="Excluir Modelo"
        variant="danger"
        loading={deletingTemplate}
        onConfirm={executeDeleteTemplate}
      />
    </div>
  );
}
