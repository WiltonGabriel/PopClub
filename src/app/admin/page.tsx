"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ArrowRight,
  Loader2,
  Store,
  Tag,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Clock,
  Sparkles,
  Ticket,
  BarChart3,
  Image as ImageIcon,
  Zap,
  Pencil,
  Truck,
  History,
  Sun,
  Moon,
  Palette,
  Send,
  User,
  IceCream,
  MessageCircle,
  Bell,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { orderService, Order } from "../../services/orderService";
import { promotionService, Promotion } from "../../services/promotionService";
import { bannerService, HighlightBannerData } from "../../services/bannerService";
import { storeSettingsService, StoreSettings } from "../../services/storeSettingsService";
import { productService, Product } from "../../services/productService";
import { playNewOrderChime } from "../../lib/sound";
import { subscribeToOrderEvents } from "../../lib/orderEvents";
import { Button } from "../../components/ui/button";
import { PromotionFormDialog } from "../../components/admin/PromotionFormDialog";
import { ComboFormDialog } from "../../components/admin/ComboFormDialog";
import { PromotionsBatchMonitor } from "../../components/admin/PromotionsBatchMonitor";
import { CombosBatchMonitor } from "../../components/admin/CombosBatchMonitor";
import { EditBannerModal } from "../../components/admin/EditBannerModal";
import { CouponManagement } from "../../components/admin/CouponManagement";
import { AnalyticsDashboard } from "../../components/admin/AnalyticsDashboard";
import { CardBadgesSection } from "../../components/admin/CardBadgesSection";
import { LoyaltyBadgesSection } from "../../components/admin/LoyaltyBadgesSection";
import { AddonsManagement } from "../../components/admin/AddonsManagement";
import { OrderFlowSettings } from "../../components/admin/OrderFlowSettings";
import { AvatarPresetManager } from "../../components/admin/AvatarPresetManager";
import { VisualIdentitySection } from "../../components/admin/VisualIdentitySection";
import { CommunicationSection } from "../../components/admin/CommunicationSection";
import { MobileOrientationBanner } from "../../components/admin/MobileOrientationBanner";
import { LogisticsAndCouriersSection } from "../../components/admin/LogisticsAndCouriersSection";
import { ChannelsAndSupportSection } from "../../components/admin/ChannelsAndSupportSection";
import { TAB_PERMISSION_MAP, PermissionKey } from "../../lib/permissions";

const TAB_DEFINITIONS = [
  { id: "metricas", label: "📊 Métricas & Desempenho", perm: "metrics_view", icon: BarChart3 },
  { id: "complementos", label: "🍨 Complementos", perm: "menu_manage", icon: IceCream },
  { id: "combos", label: "⚡ Combos", perm: "menu_manage", icon: Zap },
  { id: "promocoes", label: "🏷️ Promoções", perm: "promotions_manage", icon: Tag },
  { id: "cupons", label: "🎟️ Cupons", perm: "coupons_manage", icon: Ticket },
  { id: "identidade_visual", label: "🎨 Identidade Visual", perm: "theme_manage", icon: Palette },
  { id: "avatares", label: "✨ Avatares Oficiais", perm: "theme_manage", icon: User },
  { id: "banners_selos", label: "🖼️ Banners & Selos", perm: "theme_manage", icon: ImageIcon },
  { id: "logistica_entregadores", label: "🛵 Logística & Entregadores", perm: "settings_manage", icon: Truck },
  { id: "canais_atendimento", label: "💬 Canais & Atendimento", perm: "settings_manage", icon: MessageCircle },
  { id: "disparos_notificacoes", label: "📢 Disparos & Notificações", perm: "settings_manage", icon: Bell },
] as const;

export type AdminTab = typeof TAB_DEFINITIONS[number]["id"];

export default function AdminDashboard() {
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const { user, loading: authLoading, isAdmin, isEditor, canAccess } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);
  const [highlightBanner, setHighlightBanner] = useState<HighlightBannerData>({
    icon: "🥣",
    title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
    subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha.",
    badge: "Refrescância Artesanal",
  });
  const [fetching, setFetching] = useState(true);
  const visibleTabs = TAB_DEFINITIONS.filter(tab => isAdmin || canAccess(tab.perm as PermissionKey));
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    return (visibleTabs[0]?.id as AdminTab) || "complementos";
  });
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [comboToEdit, setComboToEdit] = useState<Product | null>(null);
  const [editBannerModalOpen, setEditBannerModalOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const previousOrderCountRef = useRef(0);
  const [advanceModal, setAdvanceModal] = useState<{
    orderId: string;
    targetStatus: "accepted" | "preparing" | "ready" | "delivering" | "completed";
    targetLabel: string;
    description: string;
  } | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const getNextStageInfo = (status: string, isPickup: boolean) => {
    switch (status) {
      case "pending":
        return {
          targetStatus: "accepted" as const,
          targetLabel: "Aceitar Pedido",
          description: "O pedido será confirmado e enviado para a esteira de produção.",
        };
      case "accepted":
        return {
          targetStatus: "preparing" as const,
          targetLabel: "Iniciar Preparo",
          description: "A cozinha começará a montagem dos itens.",
        };
      case "preparing":
        return {
          targetStatus: "ready" as const,
          targetLabel: isPickup ? "Pronto p/ Balcão" : "Pronto p/ Saída",
          description: isPickup
            ? "O cliente será notificado que o pedido está pronto para retirada."
            : "O pedido estará pronto aguardando o entregador.",
        };
      case "ready":
        if (isPickup) {
          return {
            targetStatus: "completed" as const,
            targetLabel: "Finalizar Retirada",
            description: "O cliente retirou o pedido e o ciclo será concluído.",
          };
        }
        return {
          targetStatus: "delivering" as const,
          targetLabel: "Despachar Entrega",
          description: "O pedido sairá em rota e o cliente poderá acompanhar no mapa.",
        };
      case "delivering":
        return {
          targetStatus: "completed" as const,
          targetLabel: "Finalizar Entrega",
          description: "A entrega foi realizada com sucesso e o pedido será arquivado.",
        };
      default:
        return null;
    }
  };

  const handleConfirmAdvance = async () => {
    if (!advanceModal) return;
    setIsAdvancing(true);
    try {
      await orderService.updateOrderStatus(advanceModal.orderId, advanceModal.targetStatus);
      await fetchOrders();
      setAdvanceModal(null);
    } catch (error) {
      console.error("Erro ao avançar pedido:", error);
      alert("Falha ao avançar status do pedido.");
    } finally {
      setIsAdvancing(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getAllOrders(true);
      setOrders((_prev) => {
        if (previousOrderCountRef.current > 0 && data.length > previousOrderCountRef.current) {
          playNewOrderChime();
        }
        previousOrderCountRef.current = data.length;
        return data;
      });
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  }, []);

  const fetchPromos = useCallback(async () => {
    try {
      const data = await promotionService.getAllPromotions();
      setPromotions(data);
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    }
  }, []);

  const fetchCombos = useCallback(async () => {
    try {
      const data = await productService.getProducts();
      setCombos(data.filter((p) => p.isCombo));
    } catch (error) {
      console.error("Erro ao buscar combos:", error);
    }
  }, []);

  const fetchBanner = useCallback(async () => {
    try {
      const banner = await bannerService.getHighlightBanner();
      if (banner) {
        setHighlightBanner(banner);
      }
    } catch (error) {
      console.error("Erro ao buscar banner de destaque:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setFetching(true);
    await Promise.all([
      fetchOrders(),
      fetchPromos(),
      fetchCombos(),
      fetchBanner(),
      storeSettingsService.getSettings().then(setStoreSettings).catch(() => null),
    ]);
    setFetching(false);
  }, [fetchOrders, fetchPromos, fetchCombos, fetchBanner]);

  useEffect(() => {
    loadAll();
    setCurrentTime(Date.now());

    // Polling contínuo a cada 15s pausado caso aba esteja inativa
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchOrders();
      setCurrentTime(Date.now());
    }, 15000);

    // Ouvinte imediato de eventos de pedidos locais
    const unsubscribe = subscribeToOrderEvents((event) => {
      if (event.type === "order_created") {
        playNewOrderChime();
      }
      fetchOrders();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadAll, fetchOrders]);

  // Validação de acesso e permissões de abas para Editor vs Admin
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/admin");
      return;
    }

    const tabParam = searchParams.get("tab") as AdminTab | null;

    if (tabParam) {
      const requiredPerm = TAB_PERMISSION_MAP[tabParam];
      if (requiredPerm) {
        if (!isAdmin && !canAccess(requiredPerm)) {
          router.push("/admin/pedidos?unauthorized=true");
          return;
        }
        setActiveTab(tabParam);
      }
    } else if (isEditor && !isAdmin) {
      if (!visibleTabs.find(t => t.id === activeTab)) {
        if (visibleTabs.length > 0) {
          setActiveTab(visibleTabs[0].id);
        } else {
          router.push("/admin/pedidos?unauthorized=true");
        }
      }
    }
  }, [user, authLoading, isAdmin, isEditor, canAccess, searchParams, router]);

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;
    try {
      await promotionService.deletePromotion(id);
      fetchPromos();
    } catch (error) {
      console.error("Erro ao excluir promoção:", error);
    }
  };

  const handleDeleteCombo = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este combo?")) return;
    try {
      await productService.deleteProduct(id);
      fetchCombos();
    } catch (error) {
      console.error("Erro ao excluir combo:", error);
    }
  };

  if ((fetching && orders.length === 0) || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col font-sans pb-16 bg-transparent text-foreground transition-colors duration-200 w-full max-w-full min-w-0 overflow-x-clip">
      {/* Alerta Não-Bloqueante de Orientação Mobile */}
      <MobileOrientationBanner />

      {/* Header do Painel */}
      <header className="bg-white/80 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-border/40 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-heading font-black text-xl tracking-tight flex items-center gap-1.5 select-none hover:opacity-85 transition-opacity">
            <div className="flex items-center gap-0.5 font-heading font-black text-xl tracking-tight">
              <span className="text-foreground">Pop</span>
              <span className="text-primary font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">Shake</span>
              <span className="ml-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Sorveteria • Gestão
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          {(isAdmin || canAccess("ORDERS_HISTORY")) && (
            <Link
              href="/admin/historico"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Histórico</span>
            </Link>
          )}

          {(isAdmin || canAccess("ORDERS_KANBAN")) && (
            <Link
              href="/admin/pedidos"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-primary to-accent hover:opacity-95 rounded-xl px-3.5 py-2 shadow-sm shadow-primary/20 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Gerenciar Pedidos</span>
            </Link>
          )}

          <Link
            href="/conta"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <User className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Meu Perfil</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Página Inicial</span>
          </Link>

          <button
            onClick={toggleTheme}
            aria-label={(resolvedTheme || theme) === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={(resolvedTheme || theme) === "dark" ? "Modo claro" : "Modo escuro"}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {(resolvedTheme || theme) === "dark" ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full max-w-full min-w-0 space-y-8">
        {/* Mini Esteira Live (Monitor Compacto no Topo) */}
        {(() => {
          const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
          return (
            <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {storeSettings?.isOpen ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  )}
                  <h3 className="font-heading font-bold text-sm sm:text-base text-foreground dark:text-foreground uppercase tracking-wide flex items-center gap-2">
                    Mini Esteira Live
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 normal-case">
                      ({activeOrders.length} {activeOrders.length === 1 ? "pedido em andamento" : "pedidos em andamento"})
                    </span>
                  </h3>
                  {/* Bloco 1: Badge de Status da Loja */}
                  {storeSettings?.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LOJA ABERTA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-800 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>LOJA FECHADA</span>
                    </span>
                  )}

                  {/* Bloco 2: Card de Tempo Médio Independente com Botão Ajustar */}
                  <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-xl bg-primary/5 text-primary/80 dark:bg-primary/95/50 dark:text-primary/30 border border-primary/20 dark:border-primary/80 shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-primary dark:text-[#E899FF]" />
                    <span>Tempo Médio: <strong className="font-mono text-primary/90 dark:text-purple-200">{storeSettings?.estimatedDeliveryTime || "30-50 min"}</strong></span>
                    <Link
                      href="/admin/pedidos"
                      className="text-[10px] uppercase font-bold text-primary dark:text-[#E899FF] hover:underline bg-primary/10 dark:bg-primary/90/40 px-2 py-0.5 rounded-lg transition-colors border border-primary/20/60 dark:border-primary/80/60"
                      title="Ajustar tempo médio na central de pedidos"
                    >
                      Ajustar
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400">
                    Sincronização a cada 15s
                  </span>
                  <Link
                    href="/admin/pedidos"
                    className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline inline-flex items-center gap-1"
                  >
                    <span>Abrir Esteira Completa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {activeOrders.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50/70 dark:bg-background/60 rounded-xl border border-dashed border-gray-200 dark:border-border/30 flex items-center justify-center gap-2">
                  <span>🍳 Tudo tranquilo na cozinha! Nenhum pedido ativo no momento.</span>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {activeOrders.map((order) => {
                    const clientName = order.user?.fullName || order.user?.username || "Cliente";
                    const isPickup =
                      !order.delivery_address?.street ||
                      order.delivery_address?.street.toLowerCase().includes("retirada");

                    const diffMins = currentTime
                      ? Math.max(0, Math.floor((currentTime - new Date(order.created_at).getTime()) / 60000))
                      : 0;
                    const timeStr =
                      diffMins < 1
                        ? "Agora"
                        : diffMins >= 60
                        ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`
                        : `${diffMins} min`;

                    let statusBadge = { label: "Pendente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" };
                    if (order.status === "accepted") {
                      statusBadge = { label: "Confirmado", color: "bg-primary/10 text-primary/80 dark:bg-primary/95/40 dark:text-primary/30 border-primary/20" };
                    } else if (order.status === "preparing") {
                      statusBadge = { label: "Em Preparo", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200" };
                    } else if (order.status === "ready") {
                      statusBadge = { label: isPickup ? "Pronto no Balcão" : "Pronto p/ Saída", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200" };
                    } else if (order.status === "delivering") {
                      statusBadge = { label: "A Caminho", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" };
                    }

                    const nextInfo = getNextStageInfo(order.status, isPickup);

                    return (
                      <div
                        key={order.id}
                        className="shrink-0 bg-gray-50/80 dark:bg-background border border-gray-200 dark:border-border/40 hover:border-primary/40 rounded-xl p-3 flex flex-col justify-between gap-2.5 min-w-[240px] max-w-[280px] shadow-xs transition-all"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono font-bold text-xs text-primary dark:text-muted-foreground">
                            #{order.id.substring(0, 6)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-xs text-foreground dark:text-foreground truncate" title={clientName}>
                            {clientName}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {timeStr}
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              R$ {Number(order.total_amount).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-border/30">
                          <span className="text-[10px] font-bold text-gray-500">
                            {isPickup ? "🛍️ Balcão" : "🛵 Entrega"}
                          </span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/pedidos?orderId=${order.id}`}
                              className="text-[11px] font-bold text-primary dark:text-muted-foreground hover:underline inline-flex items-center"
                            >
                              <span>Central</span>
                            </Link>
                            {nextInfo && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAdvanceModal({
                                    orderId: order.id,
                                    targetStatus: nextInfo.targetStatus,
                                    targetLabel: nextInfo.targetLabel,
                                    description: nextInfo.description,
                                  })
                                }
                                title={`Avançar para: ${nextInfo.targetLabel}`}
                                className="p-1.5 rounded-lg bg-primary text-white hover:bg-[#7b05ad] active:scale-95 transition-all shadow-xs flex items-center justify-center"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

        {/* Navegação por Abas Principais (Posicionada Logo Abaixo da Mini Esteira) */}
        {(() => {
          const bannerPromos = promotions.filter((p) => Boolean(p.bannerImageUrl));
          const directPromos = promotions.filter((p) => !p.bannerImageUrl);

          return (
            <div className="space-y-6">
              {/* Barra de Abas */}
              <div className="flex overflow-x-auto items-center gap-2 p-1.5 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl shadow-xs scrollbar-hide">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  let badge = null;
                  
                  if (tab.id === "combos") badge = combos.length;
                  if (tab.id === "promocoes") badge = directPromos.length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                      {badge !== null && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            activeTab === tab.id
                              ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* CONTEÚDO DA ABA 1: MÉTRICAS & DESEMPENHO */}
              {activeTab === "metricas" && (
                <div className="animate-in fade-in duration-150">
                  <AnalyticsDashboard
                    orders={orders}
                    loading={fetching}
                    currentShiftId={storeSettings?.currentShiftId}
                  />
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: COMBOS */}
              {activeTab === "combos" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Seção 1: Monitoramento Dedicado de Lotes & Vigência de Combos */}
                  <CombosBatchMonitor combos={combos} onRefresh={fetchCombos} />

                  <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-border/30">
                      <div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground dark:text-foreground">
                          <Zap className="w-5 h-5 text-primary" />
                          Combos & Kits Especiais
                        </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Gerencie a montagem e precificação de combos que agrupam dois ou mais produtos com desconto automático.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setComboToEdit(null);
                        setComboDialogOpen(true);
                      }}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-primary/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Novo Combo
                    </Button>
                  </div>

                  {combos.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-gray-200 dark:border-border/40 rounded-2xl space-y-3 bg-gray-50/50 dark:bg-background/40">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 dark:bg-primary/95/40 text-primary flex items-center justify-center mx-auto text-2xl">
                        ⚡
                      </div>
                      <h4 className="font-heading font-bold text-sm text-foreground dark:text-foreground">
                        Nenhum combo cadastrado ainda
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Clique em &ldquo;Novo Combo&rdquo; para criar kits promocionais (ex: Açaí + Pop Shake) com precificação especial para seus clientes.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {combos.map((combo) => {
                        const finalPrice = Number(combo.price) || 0;
                        const originalTotal = combo.comboItems?.reduce((s, it) => s + Number(it.product?.price || 0) * it.quantity, 0) || finalPrice;
                        const savings = Math.max(0, originalTotal - finalPrice);

                        return (
                          <div
                            key={combo.id}
                            className="bg-white dark:bg-background border border-gray-200 dark:border-border/40 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-primary/50 transition-all"
                          >
                            <div
                              className="h-1.5 w-full absolute top-0 left-0"
                              style={{
                                background: `linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))`,
                              }}
                            />
                            <div className="p-5 flex flex-col h-full">
                              <div className="flex justify-between items-start mb-3 pt-1">
                                <span className="bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                                  {combo.cardBadge?.text || "COMBO ESPECIAL"}
                                </span>
                              </div>

                              <h4 className="font-heading font-bold text-base leading-snug text-foreground dark:text-foreground line-clamp-2">
                                {combo.name}
                              </h4>
                              {combo.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                  {combo.description}
                                </p>
                              )}

                              {/* Itens do Combo */}
                              <div className="mt-4 space-y-2 bg-gray-50 dark:bg-[#200B22] rounded-xl p-3 border border-gray-100 dark:border-border/30">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                  Itens Inclusos ({combo.comboItems?.length || 0}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {combo.comboItems?.map((it) => (
                                    <span
                                      key={it.id}
                                      className="text-[11px] font-semibold bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg shadow-xs"
                                    >
                                      {it.quantity}x {it.product?.name || "Produto Removido"}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Precificação */}
                              <div className="flex items-baseline gap-2 pt-1">
                                {originalTotal > finalPrice && (
                                  <span className="text-xs text-gray-400 font-mono line-through">
                                    R$ {originalTotal.toFixed(2).replace(".", ",")}
                                  </span>
                                )}
                                <span className="font-heading font-black text-xl text-emerald-600 dark:text-emerald-400 font-mono">
                                  R$ {finalPrice.toFixed(2).replace(".", ",")}
                                </span>
                                {savings > 0 && (
                                  <span className="text-[11px] font-bold text-primary dark:text-primary/40">
                                    (-R$ {savings.toFixed(2).replace(".", ",")})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-200 dark:border-border/30">
                              <Link
                                href={`/promo/${combo.id}`}
                                className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1"
                              >
                                Ver Página <ChevronRight className="w-3.5 h-3.5" />
                              </Link>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComboToEdit(combo);
                                    setComboDialogOpen(true);
                                  }}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                                  title="Editar Combo"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCombo(combo.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                                  title="Excluir Combo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

              {/* CONTEÚDO DA ABA 3: PROMOÇÕES (Descontos diretos e ofertas relâmpago) */}
              {activeTab === "promocoes" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Seção 1: Monitoramento Dedicado de Lotes & Vigência de Promoções */}
                  <PromotionsBatchMonitor promotions={promotions} onRefresh={fetchPromos} />

                  <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-border/30">
                      <div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground dark:text-foreground">
                          <Tag className="w-5 h-5 text-primary" />
                          Promoções do Cardápio & Ofertas Relâmpago
                        </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Gerencie descontos diretos em produtos específicos do catálogo e campanhas relâmpago de vendas.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setPromoToEdit(null);
                        setPromoDialogOpen(true);
                      }}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-primary/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Nova Promoção
                    </Button>
                  </div>

                  {directPromos.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-gray-200 dark:border-border/40 rounded-2xl space-y-3 bg-gray-50/50 dark:bg-background/40">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 dark:bg-primary/95/40 text-primary flex items-center justify-center mx-auto text-2xl">
                        🏷️
                      </div>
                      <h4 className="font-heading font-bold text-sm text-foreground dark:text-foreground">
                        Nenhuma promoção de item ativa
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Crie descontos direcionados para itens do cardápio e ofertas relâmpago para estimular as vendas na vitrine.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {directPromos.map((promo) => (
                        <div
                          key={promo.id}
                          className="bg-gray-50/80 dark:bg-background/80 border border-gray-200 dark:border-border/40 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-primary/50 transition-all"
                        >
                          <div
                            className="h-1.5 w-full absolute top-0 left-0"
                            style={{
                              background: `linear-gradient(to right, ${promo.gradientStart || "hsl(var(--primary))"}, ${promo.gradientEnd || "hsl(var(--accent))"})`,
                            }}
                          />

                          <div className="space-y-3 pt-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-primary/20/60 shadow-xs">
                                {promo.badge || "OFERTA"}
                              </span>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/50">
                                {promo.discountType === "percentage"
                                  ? `${promo.discountValue}% OFF`
                                  : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-heading font-bold text-base leading-snug text-foreground dark:text-foreground">
                                {promo.title}
                              </h4>
                              {promo.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                  {promo.description}
                                </p>
                              )}
                            </div>

                            {promo.product && (
                              <div className="space-y-1.5 bg-white dark:bg-[#200B22] rounded-xl p-3 border border-gray-200 dark:border-border/30">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                  Produto Vinculado:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  <span
                                    key={promo.product.id}
                                    className="text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                                  >
                                    {promo.product.name}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-200 dark:border-border/30">
                            <Link
                              href={`/promo/${promo.id}`}
                              className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1"
                            >
                              Ver Detalhes <ChevronRight className="w-3.5 h-3.5" />
                            </Link>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPromoToEdit(promo);
                                  setPromoDialogOpen(true);
                                }}
                                className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                                title="Editar Promoção"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePromo(promo.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                                title="Excluir Promoção"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

              {/* CONTEÚDO DA ABA 4: COMPLEMENTOS (Grupos de Adicionais Globais) */}
              {activeTab === "complementos" && <AddonsManagement />}

              {/* CONTEÚDO DA ABA 4: BANNERS E SELOS (Faixas e Carrossel da Vitrine) */}
              {(activeTab as string) === "banners_selos" && (
                <section className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-8 animate-in fade-in duration-150">
                  {/* SEÇÃO 1: Faixa de Destaque da Vitrine (Home Banner) */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-border/30">
                      <div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground dark:text-foreground">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Faixa de Destaque da Vitrine (Home)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Mensagem de apelo comercial fixada entre o carrossel de ofertas e o catálogo principal na página inicial.
                        </p>
                      </div>

                      <Button
                        onClick={() => setEditBannerModalOpen(true)}
                        className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-4 shadow-md shadow-primary/20 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar Faixa
                      </Button>
                    </div>

                    {/* Preview da Faixa */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-[#10B981]/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-3xl sm:text-4xl shrink-0">{highlightBanner.icon || "🥣"}</span>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-sm sm:text-base text-foreground dark:text-foreground">
                            {highlightBanner.title || "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos"}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {highlightBanner.subtitle || "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white dark:bg-background text-primary dark:text-muted-foreground border border-primary/25 shadow-xs">
                          {highlightBanner.badge || "Refrescância Artesanal"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: Carrossel do Topo (Banners Rotativos) */}
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-border/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground dark:text-foreground">
                          <ImageIcon className="w-5 h-5 text-primary" />
                          Carrossel do Topo (Banners Rotativos)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Cards visuais com imagens de capa, gradientes e artes promocionais exibidos no topo da loja.
                        </p>
                      </div>

                      <Button
                        onClick={() => {
                          setPromoToEdit(null);
                          setPromoDialogOpen(true);
                        }}
                        className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-4 shadow-md shadow-primary/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Novo Banner
                      </Button>
                    </div>

                    {bannerPromos.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-gray-200 dark:border-border/40 rounded-2xl space-y-2 bg-gray-50/50 dark:bg-background/40">
                        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                          Nenhum banner visual adicionado ao carrossel do topo.
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Clique em &ldquo;Novo Banner&rdquo; para fazer upload de artes com proporção ideal para a vitrine.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {bannerPromos.map((promo) => (
                          <div
                            key={promo.id}
                            className="bg-gray-50/80 dark:bg-background/80 border border-gray-200 dark:border-border/40 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-primary/50 transition-all"
                          >
                            <div
                              className="h-2 w-full absolute top-0 left-0"
                              style={{
                                background: `linear-gradient(to right, ${promo.gradientStart || "hsl(var(--primary))"}, ${promo.gradientEnd || "hsl(var(--accent))"})`,
                              }}
                            />

                            <div>
                              <div className="flex justify-between items-start mb-3 pt-1">
                                <span className="bg-white dark:bg-white/10 text-foreground dark:text-foreground text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                                  {promo.badge || "DESTAQUE"}
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                                  {promo.discountType === "percentage"
                                    ? `${promo.discountValue}% OFF`
                                    : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                                </span>
                              </div>

                              <h4 className="font-heading font-bold text-base leading-snug text-foreground dark:text-foreground">
                                {promo.title}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                {promo.description}
                              </p>

                              {promo.bannerImageUrl && (
                                <div className="mt-3.5 h-28 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-border/30 shadow-xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={promo.bannerImageUrl}
                                    alt={promo.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-200 dark:border-border/30">
                              <Link
                                href={`/promo/${promo.id}`}
                                className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1"
                              >
                                Ver Página <ChevronRight className="w-3.5 h-3.5" />
                              </Link>

                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPromoToEdit(promo);
                                    setPromoDialogOpen(true);
                                  }}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                                  title="Editar Banner"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePromo(promo.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                                  title="Excluir Banner"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO 3: Gestão de Selos / Badges Flutuantes dos Cards */}
                  <CardBadgesSection onBadgesUpdated={fetchPromos} />

                  {/* SEÇÃO 4: Gestão de Selos de Fidelidade (Perfil do Cliente) */}
                  <LoyaltyBadgesSection />
                </section>
              )}

              {/* CONTEÚDO DA ABA: APARÊNCIA & IDENTIDADE VISUAL */}
              {activeTab === "identidade_visual" && (
                <div className="animate-in fade-in duration-150">
                  <VisualIdentitySection />
                </div>
              )}

              {/* CONTEÚDO DA ABA 5: CUPONS */}
              {activeTab === "cupons" && (
                <div className="animate-in fade-in duration-150">
                  <CouponManagement />
                </div>
              )}

              {/* CONTEÚDO: LOGÍSTICA & ENTREGADORES */}
              {(activeTab === "logistica_entregadores") && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <LogisticsAndCouriersSection />
                  <OrderFlowSettings />
                </div>
              )}

              {/* CONTEÚDO: CANAIS & ATENDIMENTO */}
              {activeTab === "canais_atendimento" && (
                <div className="animate-in fade-in duration-150">
                  <ChannelsAndSupportSection />
                </div>
              )}

              {/* CONTEÚDO: DISPAROS & NOTIFICAÇÕES */}
              {(activeTab as string) === "disparos_notificacoes" && (
                <div className="animate-in fade-in duration-150">
                  <CommunicationSection />
                </div>
              )}

              {/* CONTEÚDO DA ABA 7: GESTÃO DO CATÁLOGO DE AVATARES */}
              {(activeTab as string) === "avatares" && (
                <div className="animate-in fade-in duration-150">
                  <AvatarPresetManager />
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Modal Administrativo de Promoções / Banners */}
      <PromotionFormDialog
        open={promoDialogOpen}
        onOpenChange={setPromoDialogOpen}
        onSaved={fetchPromos}
        promoToEdit={promoToEdit}
      />

      {/* Modal Administrativo de Combos de Produtos */}
      <ComboFormDialog
        open={comboDialogOpen}
        onOpenChange={setComboDialogOpen}
        onSaved={() => {
          fetchCombos();
          fetchPromos();
        }}
        comboToEdit={comboToEdit}
      />

      {/* Modal Administrativo da Faixa de Destaque da Vitrine */}
      <EditBannerModal
        open={editBannerModalOpen}
        onOpenChange={setEditBannerModalOpen}
        currentBanner={highlightBanner}
        onSaved={(updated) => setHighlightBanner(updated)}
      />

      {/* Modal Explicativo de Confirmação de Avanço de Pedido */}
      {advanceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-background border border-gray-200 dark:border-border/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 shrink-0 mt-0.5">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground dark:text-foreground">
                  Avançar Pedido #{advanceModal.orderId.substring(0, 6)} para {advanceModal.targetLabel}?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {advanceModal.description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-border/30">
              <button
                type="button"
                disabled={isAdvancing}
                onClick={() => setAdvanceModal(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isAdvancing}
                onClick={handleConfirmAdvance}
                className="px-4 py-1.5 text-xs font-bold bg-primary hover:bg-[#7b05ad] text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAdvancing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Avanço</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
