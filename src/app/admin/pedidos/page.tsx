"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  MessageCircle,
  MapPin,
  User,
  CheckCircle2,
  Phone,
  RefreshCw,
  Store,
  LogOut,
  ChevronRight,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  Bike,
  Activity,
  PackageSearch,
  DollarSign,
  Tag,
  Archive,
  BarChart3,
  ReceiptText,
  BookOpen,
} from "lucide-react";
import { orderService, Order, OrderStatus } from "../../../services/orderService";
import { authService } from "../../../services/authService";
import { playNewOrderChime } from "../../../lib/sound";
import { subscribeToOrderEvents } from "../../../lib/orderEvents";
import { Button } from "../../../components/ui/button";
import { OrderCancelDialog } from "../../../components/admin/OrderCancelDialog";
import { useToast } from "../../../components/ui/ToastNotification";
import { AnalyticsDashboard } from "../../../components/admin/AnalyticsDashboard";

export default function AdminPedidosPage() {
  const [activeTab, setActiveTab] = useState<"kanban" | "analytics">("kanban");
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();
  const previousCountRef = useRef(0);

  // Busca lista atualizada de pedidos
  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await orderService.getAllOrders();
      setOrders(data);
      previousCountRef.current = data.length;
      if (isManual) {
        showToast({
          title: "Painel Atualizado",
          message: "A esteira de pedidos foi sincronizada com sucesso.",
          type: "info",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      if (isManual) {
        showToast({
          title: "Erro ao atualizar",
          message: "Não foi possível carregar os pedidos.",
          type: "error",
        });
      }
    } finally {
      setFetching(false);
      if (isManual) setIsRefreshing(false);
    }
  }, [showToast]);

  // Carga inicial e sincronização contínua (polling inteligente + eventos locais)
  useEffect(() => {
    fetchOrders();

    // Polling inteligente a cada 10 segundos
    const pollInterval = setInterval(async () => {
      try {
        const data = await orderService.getAllOrders();
        setOrders((prev) => {
          if (previousCountRef.current > 0 && data.length > previousCountRef.current) {
            playNewOrderChime();
            showToast({
              title: "Novo pedido recebido! 🔔",
              message: "Um novo pedido acabou de entrar na esteira da cozinha.",
              type: "success",
              duration: 8000,
            });
          }
          previousCountRef.current = data.length;
          return data;
        });
      } catch (err) {
        console.error("Erro no polling de pedidos:", err);
      }
    }, 10000);

    // Eventos locais imediatos entre abas
    const unsubscribe = subscribeToOrderEvents((event) => {
      if (event.type === "order_created") {
        playNewOrderChime();
        showToast({
          title: "Novo pedido recebido! 🔔",
          message: "Um novo pedido entrou na esteira da cozinha.",
          type: "success",
          duration: 8000,
        });
      }
      fetchOrders();
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [fetchOrders, showToast]);

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

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
      showToast({
        title: "Status Atualizado",
        message: `Pedido #${orderId.substring(0, 6)} avançado com sucesso.`,
        type: "success",
      });
      fetchOrders();
    } catch (err: any) {
      showToast({
        title: "Erro ao atualizar",
        message: err.message || "Não foi possível avançar o pedido.",
        type: "error",
      });
    }
  };

  const handleConfirmCancel = async (orderId: string, reason: string) => {
    await orderService.cancelOrder(orderId, reason);
    showToast({
      title: `Pedido #${orderId.substring(0, 6)} Cancelado`,
      message: `Motivo registrado: ${reason}`,
      type: "warning",
    });
    fetchOrders();
  };

  const getWhatsAppLink = (phone?: string | null, clientName?: string, orderId?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (!clean || clean.length < 10) return null;
    const full = clean.startsWith("55") ? clean : `55${clean}`;
    const shortCode = orderId ? `#${orderId.substring(0, 6)}` : "";
    const msg = encodeURIComponent(`Olá ${clientName || ""}! Aqui é da PopClub referente ao seu pedido ${shortCode}.`);
    return `https://wa.me/${full}?text=${msg}`;
  };

  // Métricas
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const revenueToday = todayOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + Number(o.total_amount), 0);
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  const renderKanbanColumn = (title: string, statuses: OrderStatus[], color: string) => {
    const colOrders = orders.filter((o) => statuses.includes(o.status));

    return (
      <div className="bg-white/85 dark:bg-[#230E26]/80 rounded-2xl border border-gray-200 dark:border-[#512B54]/40 p-4 shadow-sm flex flex-col min-w-[280px]">
        {/* Cabeçalho da Coluna */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-[#512B54]/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <span className="bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
            {colOrders.length}
          </span>
        </div>

        {/* Lista de Cards */}
        <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          {colOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
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
                  className="bg-white dark:bg-[#1A0B1C] border border-gray-200/90 dark:border-[#512B54]/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative group"
                >
                  {/* 1. Cabeçalho do Card */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#9306CF] dark:text-[#C7A9C9] bg-[#9306CF]/10 px-2.5 py-0.5 rounded-md border border-[#9306CF]/20">
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
                          title="Telefone não cadastrado"
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

                  {/* 3. Lista de Itens */}
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

                  {/* 4. Rodapé do Card (Valor + Pagamento + Ações) */}
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

                    {/* Botão Visível de Cancelamento */}
                    {order.status !== "completed" && (
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

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-[#F8F9FA] dark:bg-[#190B1A] text-foreground transition-colors duration-200">
      {/* Header Dedicado de Gestão de Pedidos */}
      <header className="bg-white/85 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-[#512B54]/40 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
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
              Cozinha & Delivery
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Link para Meus Pedidos (Cliente) */}
          <Link
            href="/pedidos"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ReceiptText className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Meus Pedidos</span>
          </Link>

          {/* Link para Gerenciar Cardápio / Promoções */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Gerenciar Cardápio</span>
          </Link>

          {/* Link para Vitrine */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Vitrine</span>
          </Link>

          {/* Botão Sair */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Encerrar Sessão</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Navegação por Abas do Painel Administrativo */}
        <div className="flex bg-gray-200/70 dark:bg-[#2A102E]/60 p-1.5 rounded-2xl border border-gray-200 dark:border-[#512B54]/40 max-w-md w-full shadow-inner">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "kanban"
                ? "bg-white dark:bg-[#1F0B22] text-[#9306CF] dark:text-[#C7A9C9] shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Esteira Live</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "analytics"
                ? "bg-white dark:bg-[#1F0B22] text-[#9306CF] dark:text-[#C7A9C9] shadow-sm font-black"
                : "text-gray-600 dark:text-gray-400 hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas & Gráficos</span>
          </button>
        </div>

        {activeTab === "analytics" ? (
          <AnalyticsDashboard orders={orders} loading={fetching} />
        ) : (
          <>
            {/* Barra de Ações do Board */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                <LayoutDashboard className="w-6 h-6 text-[#9306CF]" /> Central Operacional da Cozinha e Despacho
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Operação ao Vivo
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Fluxo contínuo de montagem de copos, shakes e despacho ágil para a entrega.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Toggle de Cancelados/Histórico */}
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              className={`rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 transition-colors ${
                showArchived
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50"
                  : "hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? "Ocultar Cancelados" : `Cancelados (${cancelledOrders.length})`}</span>
            </Button>

            {/* Botão de Atualizar Board Manual com Loading Spinner */}
            <Button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 h-10 px-4 shadow-md shadow-[#9306CF]/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Atualizando..." : "Atualizar Board"}</span>
            </Button>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Faturamento Hoje
              </span>
              <span className="font-heading font-black text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(revenueToday)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Pedidos Ativos
              </span>
              <span className="font-heading font-black text-xl sm:text-2xl text-blue-600 dark:text-blue-400">
                {activeOrders.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Total Hoje
              </span>
              <span className="font-heading font-black text-xl sm:text-2xl text-[#4C264F] dark:text-[#F9F5F9]">
                {todayOrders.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#9306CF]/10 flex items-center justify-center text-[#9306CF]">
              <PackageSearch className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Visualização de Cancelados (Quando expandido) */}
        {showArchived && (
          <section className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-red-200/60 dark:border-red-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-heading font-bold text-sm sm:text-base text-red-800 dark:text-red-300 uppercase">
                  Pedidos Cancelados & Arquivados ({cancelledOrders.length})
                </h3>
              </div>
              <span className="text-xs text-red-600/80 dark:text-red-400/80">
                Motivos documentados para auditoria
              </span>
            </div>

            {cancelledOrders.length === 0 ? (
              <p className="text-xs text-center py-4 text-red-600/70 dark:text-red-400/70">
                Nenhum pedido cancelado até o momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cancelledOrders.map((order) => {
                  const clientName = order.user?.fullName || order.user?.username || "Cliente";
                  return (
                    <div
                      key={order.id}
                      className="bg-white dark:bg-[#1F0B22] border border-red-200 dark:border-red-900/40 rounded-xl p-3.5 shadow-sm flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40">
                          #{order.id.substring(0, 6)}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {new Date(order.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-[#4C264F] dark:text-[#F9F5F9]">
                          {clientName}
                        </p>
                        <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          R$ {order.total_amount?.toFixed(2).replace(".", ",")}
                        </p>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/30 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                          Motivo do Cancelamento:
                        </span>
                        <p className="text-xs text-red-800 dark:text-red-200 mt-0.5 leading-relaxed font-medium">
                          {order.cancellation_reason || "Cancelado pela administração da loja"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Grid Principal do Kanban */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4 items-start">
          {renderKanbanColumn("Novos", ["pending", "accepted"], "#9306CF")}
          {renderKanbanColumn("Em Preparo", ["preparing"], "#EAB308")}
          {renderKanbanColumn("A Caminho / Pronto", ["ready", "delivering"], "#940068")}
          {renderKanbanColumn("Concluídos", ["completed"], "#10B981")}
        </section>
        </>
        )}
      </main>

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
