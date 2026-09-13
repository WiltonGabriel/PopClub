"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PackageSearch,
  Activity,
  DollarSign,
  Info,
  ChevronRight,
  LogOut,
  ArrowRight,
  Loader2,
  Store,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Clock,
  MessageCircle,
  MapPin,
  User,
  CheckCircle2,
  Phone,
  RefreshCw,
  ShoppingBag,
  Bike,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { orderService, Order, OrderStatus } from "../../services/orderService";
import { promotionService, Promotion } from "../../services/promotionService";
import { authService } from "../../services/authService";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { PromotionFormDialog } from "../../components/admin/PromotionFormDialog";
import { OrderCancelDialog } from "../../components/admin/OrderCancelDialog";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<Promotion | null>(null);

  const router = useRouter();

  const fetchOrders = async (manual = false) => {
    if (manual) setIsRefreshingOrders(true);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      if (manual) setIsRefreshingOrders(false);
    }
  };

  const fetchPromos = useCallback(async () => {
    try {
      const data = await promotionService.getAllPromotions();
      setPromotions(data);
    } catch (error) {
      console.error("Erro ao buscar promoções:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setFetching(true);
    await Promise.all([fetchOrders(), fetchPromos()]);
    setFetching(false);
  }, [fetchPromos]);

  useEffect(() => {
    loadAll();
    // Auto-refresh a cada 30 segundos no Kanban
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const getNextStage = (currentStatus: OrderStatus): { nextStatus: OrderStatus; label: string } | null => {
    switch (currentStatus) {
      case "pending":
      case "accepted":
        return { nextStatus: "preparing", label: "Avançar para Preparo ➔" };
      case "preparing":
        return { nextStatus: "ready", label: "Pronto p/ Saída ➔" };
      case "ready":
        return { nextStatus: "delivering", label: "Despachar Entrega 🛵" };
      case "delivering":
        return { nextStatus: "completed", label: "Finalizar Pedido ✓" };
      default:
        return null;
    }
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const stage = getNextStage(currentStatus);
    if (!stage) return;
    try {
      await orderService.updateOrderStatus(orderId, stage.nextStatus);
      fetchOrders();
    } catch (err) {
      alert("Erro ao atualizar status do pedido");
    }
  };

  const handleConfirmCancel = async (orderId: string, reason: string) => {
    await orderService.cancelOrder(orderId, reason);
    fetchOrders();
  };

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

  // Métricas
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const revenueToday = todayOrders.reduce((acc, o) => acc + Number(o.total_amount), 0);
  const activeOrdersCount = orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length;

  const getWhatsAppLink = (phone?: string | null, clientName?: string, orderId?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (!clean || clean.length < 10) return null;
    const full = clean.startsWith("55") ? clean : `55${clean}`;
    const shortCode = orderId ? `#${orderId.substring(0, 6)}` : "";
    const msg = encodeURIComponent(`Olá ${clientName || ""}! Aqui é da PopClub referente ao seu pedido ${shortCode}.`);
    return `https://wa.me/${full}?text=${msg}`;
  };

  const renderKanbanColumn = (title: string, statuses: OrderStatus[], color: string) => {
    const colOrders = orders.filter((o) => statuses.includes(o.status));

    return (
      <div className="bg-white/80 dark:bg-[#230E26]/80 rounded-2xl border border-gray-200 dark:border-[#512B54]/40 p-3.5 sm:p-4 shadow-sm flex flex-col min-w-[280px]">
        {/* Cabeçalho da Coluna */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-[#512B54]/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <span className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
            {colOrders.length}
          </span>
        </div>

        {/* Lista de Cards */}
        <div className="space-y-3.5 flex-1">
          {colOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
              Nenhum pedido nesta etapa
            </div>
          ) : (
            colOrders.map((order) => {
              const clientName = order.user?.fullName || order.user?.username || "Cliente";
              const isPickup =
                !order.delivery_address?.street ||
                order.delivery_address?.street.toLowerCase().includes("retirada");

              // Cálculo de tempo decorrido
              const createdDate = new Date(order.created_at);
              const diffMins = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60000));
              const isUrgent = diffMins >= 40 && order.status !== "completed";
              const isWarning = diffMins >= 20 && diffMins < 40 && order.status !== "completed";

              const nextStage = getNextStage(order.status);
              const whatsAppLink = getWhatsAppLink(order.user?.phone, clientName, order.id);

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-[#1A0B1C] border border-gray-200/90 dark:border-[#512B54]/50 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative"
                >
                  {/* 1. Cabeçalho do Card */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#9306CF] dark:text-[#C7A9C9] bg-[#9306CF]/10 px-2 py-0.5 rounded-md border border-[#9306CF]/20">
                        #{order.id.substring(0, 6)}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                        {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Badge de Tempo */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isUrgent
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40 animate-pulse"
                            : isWarning
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                            : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10"
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {diffMins < 1 ? "Agora" : `${diffMins} min`}
                      </span>

                      {/* Modalidade */}
                      {isPickup ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                          🛍️ Retirada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                          🛵 Entrega
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Dados do Cliente */}
                  <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-[#9306CF] shrink-0" />
                        <span className="font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] truncate">
                          {clientName}
                        </span>
                      </div>

                      {/* Botão de WhatsApp */}
                      {whatsAppLink ? (
                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/40 transition-colors shrink-0"
                          title={`Abrir WhatsApp de ${clientName}`}
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 shrink-0"
                          title="Telefone não informado pelo cliente"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>Sem whats</span>
                        </span>
                      )}
                    </div>

                    {/* Endereço / Retirada */}
                    {isPickup ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <Store className="w-3.5 h-3.5 shrink-0" />
                        <span>Retirada no Balcão da Loja</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50/80 dark:bg-white/5 p-2 rounded-xl border border-gray-100 dark:border-[#512B54]/20">
                        <MapPin className="w-3.5 h-3.5 text-[#9306CF] shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">
                          {order.delivery_address?.street}, {order.delivery_address?.number}
                          {order.delivery_address?.neighborhood ? ` - ${order.delivery_address.neighborhood}` : ""}
                          {order.delivery_address?.complement ? ` (${order.delivery_address.complement})` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. Lista de Itens e Adicionais */}
                  <div className="bg-gray-50/80 dark:bg-[#190B1A]/80 rounded-xl p-2.5 space-y-1.5 border border-gray-100 dark:border-[#512B54]/30 max-h-36 overflow-y-auto">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((it) => (
                        <div key={it.id} className="text-xs">
                          <div className="flex items-center justify-between font-semibold text-[#4C264F] dark:text-[#F9F5F9]">
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="text-[#9306CF] font-black">{it.quantity}x</span>
                              <span className="truncate">{it.product?.name || "Produto"}</span>
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px] shrink-0 ml-2">
                              R$ {(it.price_at_time * it.quantity).toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                          {it.product?.description && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-4 mt-0.5 line-clamp-1 italic">
                              {it.product.description}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Itens não detalhados</p>
                    )}
                  </div>

                  {/* 4. Rodapé do Card (Valor + Pagamento + Ação) */}
                  <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total</span>
                        <span className="font-heading font-black text-sm text-emerald-600 dark:text-emerald-400">
                          R$ {order.total_amount?.toFixed(2).replace(".", ",")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Pagamento</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 inline-flex items-center gap-1">
                          {order.payment_method_type === "pix_entrega" && "⚡ Pix (Confirmado)"}
                          {order.payment_method_type === "cartao_maquininha" && "💳 Cartão"}
                          {order.payment_method_type === "dinheiro" && (
                            order.payment_change_for 
                              ? `💵 Dinheiro (Troco p/ R$ ${order.payment_change_for.toFixed(2)})`
                              : "💵 Dinheiro"
                          )}
                          {!order.payment_method_type && "⚡ Pix"}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Avanço de Estágio */}
                    {nextStage && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, order.status)}
                        className="w-full h-9 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-md shadow-[#9306CF]/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>{nextStage.label}</span>
                      </Button>
                    )}

                    {order.status === "completed" && (
                      <div className="w-full py-1.5 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pedido Entregue</span>
                      </div>
                    )}

                    {order.status !== "completed" && order.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderToCancel(order);
                          setCancelDialogOpen(true);
                        }}
                        className="w-full py-1.5 px-3 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span>Cancelar Pedido</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
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
              Club
            </span>
            <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
              Gestão
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Ver Vitrine</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-[#9306CF]/10 to-[#940068]/10 border border-[#9306CF]/20 rounded-2xl p-4 flex items-start gap-4">
          <Info className="w-5 h-5 text-[#9306CF] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9]">
              Painel Operacional de Cozinha e Delivery
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              Gerencie os pedidos em tempo real pelo Kanban abaixo e cadastre promoções e combos que aparecem na vitrine.
            </p>
          </div>
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline shrink-0"
          >
            Ir para a Vitrine <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Controle de Faturamento e Vendas do Dia */}
        <section className="space-y-3">
          <h2 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Controle de Faturamento e Vendas do Dia
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                  Faturamento Hoje
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <span className="font-heading font-black text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(revenueToday)}
              </span>
            </div>

            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                  Pedidos Hoje
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#9306CF]/10 flex items-center justify-center text-[#9306CF]">
                  <PackageSearch className="w-4 h-4" />
                </div>
              </div>
              <span className="font-heading font-black text-2xl sm:text-3xl text-[#4C264F] dark:text-[#F9F5F9]">
                {todayOrders.length}
              </span>
            </div>

            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                  Pedidos Ativos
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <span className="font-heading font-black text-2xl sm:text-3xl text-blue-600 dark:text-blue-400">
                {activeOrdersCount}
              </span>
            </div>
          </div>
        </section>

        {/* Central Operacional da Cozinha e Despacho */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                <LayoutDashboard className="w-6 h-6 text-[#9306CF]" /> Central Operacional da Cozinha e Despacho
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Acompanhe o fluxo da cozinha e do delivery em tempo real
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/admin/pedidos"
                className="rounded-xl bg-[#9306CF]/10 hover:bg-[#9306CF]/20 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 px-3.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Painel Dedicado (/admin/pedidos)</span>
              </Link>

              <Button
                onClick={() => fetchOrders(true)}
                disabled={isRefreshingOrders}
                variant="outline"
                className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#9306CF] ${isRefreshingOrders ? "animate-spin" : ""}`} />
                <span>{isRefreshingOrders ? "Atualizando..." : "Atualizar Board"}</span>
              </Button>
            </div>
          </div>

          {/* Grid do Kanban */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
            {renderKanbanColumn("Novos", ["pending", "accepted"], "#9306CF")}
            {renderKanbanColumn("Em Preparo", ["preparing"], "#EAB308")}
            {renderKanbanColumn("A Caminho", ["ready", "delivering"], "#940068")}
            {renderKanbanColumn("Concluídos", ["completed"], "#10B981")}
          </div>
        </section>

        {/* Gestão de Cardápio & Destaques da Vitrine */}
        <section className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-[#512B54]/30 pb-4">
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                <Tag className="w-5 h-5 text-[#9306CF]" /> Gestão de Cardápio & Destaques da Vitrine
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cadastre e edite combos, banners e descontos exibidos na vitrine e na página dedicada de promoção.
              </p>
            </div>

            <Button
              onClick={() => {
                setPromoToEdit(null);
                setPromoDialogOpen(true);
              }}
              className="bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-4 shadow-md shadow-[#9306CF]/20"
            >
              <Plus className="w-4 h-4" /> Nova Promoção
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#9306CF]/50 transition-colors"
              >
                <div
                  className="h-2 w-full absolute top-0 left-0"
                  style={{
                    background: `linear-gradient(to right, ${promo.gradientStart}, ${promo.gradientEnd})`,
                  }}
                />

                <div>
                  <div className="flex justify-between items-start mt-2 mb-2">
                    <span className="bg-white dark:bg-white/10 text-[#4C264F] dark:text-[#F9F5F9] text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10">
                      {promo.badge}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {promo.discountType === "percentage" ? `${promo.discountValue}% OFF` : `R$ ${promo.discountValue.toFixed(2)} OFF`}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg leading-snug text-[#4C264F] dark:text-[#F9F5F9]">
                    {promo.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 font-sans">
                    {promo.description}
                  </p>

                  <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                    Itens vinculados: <strong className="text-[#4C264F] dark:text-[#F9F5F9]">{promo.items?.length || 0} produto(s)</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-[#512B54]/30">
                  <Link
                    href={`/promo/${promo.id}`}
                    className="text-xs font-semibold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1"
                  >
                    Ver Página <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setPromoToEdit(promo);
                        setPromoDialogOpen(true);
                      }}
                      className="p-1.5 text-[#9306CF] hover:bg-[#9306CF]/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePromo(promo.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modal Administrativo de Promoções */}
      <PromotionFormDialog
        open={promoDialogOpen}
        onOpenChange={setPromoDialogOpen}
        onSaved={fetchPromos}
        promoToEdit={promoToEdit}
      />

      {/* Modal de Confirmação de Cancelamento */}
      <OrderCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        order={orderToCancel}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
}
