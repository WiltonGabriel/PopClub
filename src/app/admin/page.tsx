"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
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
  UtensilsCrossed,
  Ticket,
  Percent,
  BarChart3,
  Image as ImageIcon,
  Zap,
  Pencil,
  Truck,
} from "lucide-react";
import { orderService, Order } from "../../services/orderService";
import { promotionService, Promotion } from "../../services/promotionService";
import { bannerService, HighlightBannerData } from "../../services/bannerService";
import { authService } from "../../services/authService";
import { playNewOrderChime } from "../../lib/sound";
import { subscribeToOrderEvents } from "../../lib/orderEvents";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { PromotionFormDialog } from "../../components/admin/PromotionFormDialog";
import { ComboFormDialog } from "../../components/admin/ComboFormDialog";
import { EditBannerModal } from "../../components/admin/EditBannerModal";
import { CouponManagement } from "../../components/admin/CouponManagement";
import { AnalyticsDashboard } from "../../components/admin/AnalyticsDashboard";
import { DeliveryFeeSettings } from "../../components/admin/DeliveryFeeSettings";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [highlightBanner, setHighlightBanner] = useState<HighlightBannerData>({
    icon: "🥣",
    title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
    subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha.",
    badge: "Refrescância Artesanal",
  });
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"metrics" | "combos" | "promotions" | "banners" | "coupons" | "delivery">("metrics");
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [comboToEdit, setComboToEdit] = useState<Promotion | null>(null);
  const [editBannerModalOpen, setEditBannerModalOpen] = useState(false);
  const previousOrderCountRef = useRef(0);

  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getAllOrders();
      setOrders((prev) => {
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
    await Promise.all([fetchOrders(), fetchPromos(), fetchBanner()]);
    setFetching(false);
  }, [fetchOrders, fetchPromos, fetchBanner]);

  useEffect(() => {
    loadAll();

    // Polling contínuo leve a cada 15 segundos para atualizar pedidos ativos
    const interval = setInterval(() => {
      fetchOrders();
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

  const handleDeletePromo = async (id: string) => {
    if (confirm("Deseja realmente remover esta promoção?")) {
      try {
        await promotionService.deletePromotion(id);
        fetchPromos();
      } catch (err) {
        alert("Erro ao excluir promoção");
      }
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  if (fetching && orders.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9306CF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-[#F8F9FA] dark:bg-[#190B1A] text-foreground transition-colors duration-200">
      {/* Header do Painel */}
      <header className="bg-white/80 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-[#512B54]/40 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-heading font-black text-xl tracking-tight flex items-center gap-1">
            <span className="text-[#4C264F] dark:text-[#F9F5F9]">Pop</span>
            <span
              style={{
                background: "linear-gradient(135deg, #9306CF 0%, #940068 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Shake
            </span>
            <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
              Sorveteria • Gestão
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 rounded-xl px-3.5 py-2 shadow-sm shadow-[#9306CF]/20 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Gerenciar Pedidos</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Página Inicial</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-red-200 dark:border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Banner de Acesso Rápido ao Painel de Pedidos */}
        <div className="bg-gradient-to-r from-[#9306CF]/10 to-[#940068]/10 border border-[#9306CF]/25 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#9306CF] to-[#940068] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#9306CF]/20">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
                Central de Despacho & Cozinha
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                Acompanhe a esteira de pedidos ao vivo, despache entregas e controle o fluxo de preparo no Kanban dedicado.
              </p>
            </div>
          </div>

          <Link
            href="/admin/pedidos"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider font-bold h-11 px-5 rounded-xl shadow-md shadow-[#9306CF]/20 transition-all shrink-0"
          >
            <span>Gerenciar Pedidos ➔</span>
          </Link>
        </div>

        {/* Mini Esteira Live (Monitor Compacto no Topo) */}
        {(() => {
          const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
          return (
            <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide flex items-center gap-2">
                    Mini Esteira Live
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 normal-case">
                      ({activeOrders.length} {activeOrders.length === 1 ? "pedido em andamento" : "pedidos em andamento"})
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400">
                    Sincronização a cada 15s
                  </span>
                  <Link
                    href="/admin/pedidos"
                    className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Abrir Esteira Completa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {activeOrders.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50/70 dark:bg-[#190B1A]/60 rounded-xl border border-dashed border-gray-200 dark:border-[#512B54]/30 flex items-center justify-center gap-2">
                  <span>🍳 Tudo tranquilo na cozinha! Nenhum pedido ativo no momento.</span>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {activeOrders.map((order) => {
                    const clientName = order.user?.fullName || order.user?.username || "Cliente";
                    const isPickup =
                      !order.delivery_address?.street ||
                      order.delivery_address?.street.toLowerCase().includes("retirada");

                    const diffMins = Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));
                    const timeStr =
                      diffMins < 1
                        ? "Agora"
                        : diffMins >= 60
                        ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`
                        : `${diffMins} min`;

                    let statusBadge = { label: "Novo", color: "bg-[#9306CF]/10 text-[#9306CF] border-[#9306CF]/20" };
                    if (order.status === "preparing") {
                      statusBadge = { label: "Em Preparo", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" };
                    } else if (order.status === "ready" || order.status === "delivering") {
                      statusBadge = { label: "A Caminho", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" };
                    }

                    return (
                      <div
                        key={order.id}
                        className="shrink-0 bg-gray-50/80 dark:bg-[#1A0B1C] border border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/40 rounded-xl p-3 flex flex-col justify-between gap-2.5 min-w-[230px] max-w-[270px] shadow-xs transition-all"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono font-bold text-xs text-[#9306CF] dark:text-[#C7A9C9]">
                            #{order.id.substring(0, 6)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </div>

                        <div>
                          <p className="font-bold text-xs text-[#4C264F] dark:text-[#F9F5F9] truncate" title={clientName}>
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

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#512B54]/30">
                          <span className="text-[10px] font-bold text-gray-500">
                            {isPickup ? "🛍️ Balcão" : "🛵 Entrega"}
                          </span>
                          <Link
                            href={`/admin/pedidos?orderId=${order.id}`}
                            className="text-[11px] font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Ver na Central ➔</span>
                          </Link>
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
          const combos = promotions.filter((p) => p.items && p.items.length >= 2);
          const bannerPromos = promotions.filter((p) => Boolean(p.bannerImageUrl));
          const directPromos = promotions.filter((p) => !p.bannerImageUrl && (!p.items || p.items.length < 2));

          return (
            <div className="space-y-6">
              {/* Barra de Abas */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("metrics")}
                  className={`flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "metrics"
                      ? "bg-[#9306CF] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>📊 Métricas & Desempenho</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("combos")}
                  className={`flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "combos"
                      ? "bg-[#9306CF] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Combos</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === "combos"
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {combos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("promotions")}
                  className={`flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "promotions"
                      ? "bg-[#9306CF] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>🏷️ Promoções</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === "promotions"
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {directPromos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("banners")}
                  className={`flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "banners"
                      ? "bg-[#9306CF] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>🖼️ Banners</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      activeTab === "banners"
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {bannerPromos.length + 1}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("coupons")}
                  className={`flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "coupons"
                      ? "bg-[#9306CF] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  <span>🎟️ Cupons</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("delivery")}
                  className={`flex items-center gap-2 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "delivery"
                      ? "bg-[#9306CF] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>🛵 Entrega & WhatsApp</span>
                </button>
              </div>

              {/* CONTEÚDO DA ABA 1: MÉTRICAS & DESEMPENHO */}
              {activeTab === "metrics" && (
                <div className="animate-in fade-in duration-150">
                  <AnalyticsDashboard orders={orders} loading={fetching} />
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: COMBOS */}
              {activeTab === "combos" && (
                <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#512B54]/30">
                    <div>
                      <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                        <Zap className="w-5 h-5 text-[#9306CF]" />
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
                      className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-[#9306CF]/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Novo Combo
                    </Button>
                  </div>

                  {combos.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-2xl space-y-3 bg-gray-50/50 dark:bg-[#190B1A]/40">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#9306CF] flex items-center justify-center mx-auto text-2xl">
                        ⚡
                      </div>
                      <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9]">
                        Nenhum combo cadastrado ainda
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        Clique em &ldquo;Novo Combo&rdquo; para criar kits promocionais (ex: Açaí + Pop Shake) com precificação especial para seus clientes.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {combos.map((combo) => {
                        const originalTotal = combo.originalTotal || combo.items?.reduce((s, it) => s + Number(it.product.price) * it.quantity, 0) || 0;
                        const finalPrice = combo.finalPrice || originalTotal;
                        const savings = Math.max(0, originalTotal - finalPrice);

                        return (
                          <div
                            key={combo.id}
                            className="bg-gray-50/80 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-[#9306CF]/50 transition-all"
                          >
                            <div
                              className="h-1.5 w-full absolute top-0 left-0"
                              style={{
                                background: `linear-gradient(to right, ${combo.gradientStart || "#9306CF"}, ${combo.gradientEnd || "#940068"})`,
                              }}
                            />

                            <div className="space-y-3.5 pt-1">
                              <div className="flex justify-between items-start gap-2">
                                <span className="bg-purple-100 dark:bg-purple-950/60 text-[#9306CF] dark:text-[#C7A9C9] text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-purple-200/60 shadow-xs">
                                  {combo.badge}
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200/50">
                                  {combo.discountType === "percentage"
                                    ? `${combo.discountValue}% OFF`
                                    : `Economize R$ ${savings.toFixed(2).replace(".", ",")}`}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-heading font-bold text-base leading-snug text-[#4C264F] dark:text-[#F9F5F9]">
                                  {combo.title}
                                </h4>
                                {combo.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                    {combo.description}
                                  </p>
                                )}
                              </div>

                              {/* Itens do Combo */}
                              <div className="space-y-2 bg-white dark:bg-[#200B22] rounded-xl p-3 border border-gray-200 dark:border-[#512B54]/30">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                  Itens Inclusos ({combo.items?.length || 0}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {combo.items?.map((it) => (
                                    <span
                                      key={it.id}
                                      className="text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                                    >
                                      {it.quantity}x {it.product.name}
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
                                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                    (-R$ {savings.toFixed(2).replace(".", ",")})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-200 dark:border-[#512B54]/30">
                              <Link
                                href={`/promo/${combo.id}`}
                                className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1"
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
                                  className="p-2 text-[#9306CF] hover:bg-[#9306CF]/10 rounded-xl transition-colors cursor-pointer"
                                  title="Editar Combo"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePromo(combo.id)}
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
              )}

              {/* CONTEÚDO DA ABA 3: PROMOÇÕES (Descontos diretos e ofertas relâmpago) */}
              {activeTab === "promotions" && (
                <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#512B54]/30">
                    <div>
                      <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                        <Tag className="w-5 h-5 text-[#9306CF]" />
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
                      className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-[#9306CF]/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Nova Promoção
                    </Button>
                  </div>

                  {directPromos.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-2xl space-y-3 bg-gray-50/50 dark:bg-[#190B1A]/40">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#9306CF] flex items-center justify-center mx-auto text-2xl">
                        🏷️
                      </div>
                      <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9]">
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
                          className="bg-gray-50/80 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-[#9306CF]/50 transition-all"
                        >
                          <div
                            className="h-1.5 w-full absolute top-0 left-0"
                            style={{
                              background: `linear-gradient(to right, ${promo.gradientStart || "#9306CF"}, ${promo.gradientEnd || "#940068"})`,
                            }}
                          />

                          <div className="space-y-3 pt-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="bg-purple-100 dark:bg-purple-950/60 text-[#9306CF] dark:text-[#C7A9C9] text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-purple-200/60 shadow-xs">
                                {promo.badge || "OFERTA"}
                              </span>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/50">
                                {promo.discountType === "percentage"
                                  ? `${promo.discountValue}% OFF`
                                  : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-heading font-bold text-base leading-snug text-[#4C264F] dark:text-[#F9F5F9]">
                                {promo.title}
                              </h4>
                              {promo.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                  {promo.description}
                                </p>
                              )}
                            </div>

                            {promo.items && promo.items.length > 0 && (
                              <div className="space-y-1.5 bg-white dark:bg-[#200B22] rounded-xl p-3 border border-gray-200 dark:border-[#512B54]/30">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                  Produtos com Desconto ({promo.items.length}):
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {promo.items.map((it) => (
                                    <span
                                      key={it.id}
                                      className="text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                                    >
                                      {it.product.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-200 dark:border-[#512B54]/30">
                            <Link
                              href={`/promo/${promo.id}`}
                              className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1"
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
                                className="p-2 text-[#9306CF] hover:bg-[#9306CF]/10 rounded-xl transition-colors cursor-pointer"
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
              )}

              {/* CONTEÚDO DA ABA 4: BANNERS (Faixas e Carrossel da Vitrine) */}
              {activeTab === "banners" && (
                <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-8 animate-in fade-in duration-150">
                  {/* SEÇÃO 1: Faixa de Destaque da Vitrine (Home Banner) */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#512B54]/30">
                      <div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                          <Sparkles className="w-5 h-5 text-[#9306CF]" />
                          Faixa de Destaque da Vitrine (Home)
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Mensagem de apelo comercial fixada entre o carrossel de ofertas e o catálogo principal na página inicial.
                        </p>
                      </div>

                      <Button
                        onClick={() => setEditBannerModalOpen(true)}
                        className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-4 shadow-md shadow-[#9306CF]/20 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar Faixa
                      </Button>
                    </div>

                    {/* Preview da Faixa */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#9306CF]/10 via-[#940068]/10 to-[#10B981]/10 border border-[#9306CF]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-3xl sm:text-4xl shrink-0">{highlightBanner.icon || "🥣"}</span>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9]">
                            {highlightBanner.title || "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos"}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {highlightBanner.subtitle || "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1A0B1C] text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/25 shadow-xs">
                          {highlightBanner.badge || "Refrescância Artesanal"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: Carrossel do Topo (Banners Rotativos) */}
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-[#512B54]/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                          <ImageIcon className="w-5 h-5 text-[#9306CF]" />
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
                        className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-10 px-4 shadow-md shadow-[#9306CF]/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Novo Banner
                      </Button>
                    </div>

                    {bannerPromos.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-2xl space-y-2 bg-gray-50/50 dark:bg-[#190B1A]/40">
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
                            className="bg-gray-50/80 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-[#9306CF]/50 transition-all"
                          >
                            <div
                              className="h-2 w-full absolute top-0 left-0"
                              style={{
                                background: `linear-gradient(to right, ${promo.gradientStart || "#9306CF"}, ${promo.gradientEnd || "#940068"})`,
                              }}
                            />

                            <div>
                              <div className="flex justify-between items-start mb-3 pt-1">
                                <span className="bg-white dark:bg-white/10 text-[#4C264F] dark:text-[#F9F5F9] text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                                  {promo.badge || "DESTAQUE"}
                                </span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                                  {promo.discountType === "percentage"
                                    ? `${promo.discountValue}% OFF`
                                    : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                                </span>
                              </div>

                              <h4 className="font-heading font-bold text-base leading-snug text-[#4C264F] dark:text-[#F9F5F9]">
                                {promo.title}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                {promo.description}
                              </p>

                              {promo.bannerImageUrl && (
                                <div className="mt-3.5 h-28 rounded-xl overflow-hidden bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-[#512B54]/30 shadow-xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={promo.bannerImageUrl}
                                    alt={promo.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-gray-200 dark:border-[#512B54]/30">
                              <Link
                                href={`/promo/${promo.id}`}
                                className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1"
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
                                  className="p-2 text-[#9306CF] hover:bg-[#9306CF]/10 rounded-xl transition-colors cursor-pointer"
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
                </section>
              )}

              {/* CONTEÚDO DA ABA 5: CUPONS */}
              {activeTab === "coupons" && (
                <div className="animate-in fade-in duration-150">
                  <CouponManagement />
                </div>
              )}

              {/* CONTEÚDO DA ABA 6: TAXA DE ENTREGA */}
              {activeTab === "delivery" && (
                <div className="animate-in fade-in duration-150">
                  <DeliveryFeeSettings />
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
        onSaved={fetchPromos}
        comboToEdit={comboToEdit}
      />

      {/* Modal Administrativo da Faixa de Destaque da Vitrine */}
      <EditBannerModal
        open={editBannerModalOpen}
        onOpenChange={setEditBannerModalOpen}
        currentBanner={highlightBanner}
        onSaved={(updated) => setHighlightBanner(updated)}
      />
    </div>
  );
}
