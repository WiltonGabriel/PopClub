"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  Loader2,
  ShoppingBag,
  AlertTriangle,
  MessageCircle,
  Bike,
  Store,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { orderService, Order, OrderStatus } from "../../services/orderService";
import { subscribeToOrderEvents } from "../../lib/orderEvents";
import { useToast } from "../../components/ui/ToastNotification";
import { Footer } from "../../components/storefront/Footer";
import { playDingSound, initAudioUnlock } from "../../lib/sound";
import { sendWebNotification } from "../../lib/notifications";
import { NotificationPermissionBanner } from "../../components/storefront/NotificationPermissionBanner";

const STORE_WHATSAPP = process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5584999999999";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeClass: string; toastMsg: string; description: string }
> = {
  pending: {
    label: "Recebido",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/40",
    toastMsg: "recebido pela loja",
    description: "Recebemos seu pedido! A cozinha já vai iniciar o preparo.",
  },
  accepted: {
    label: "Confirmado",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-900/40",
    toastMsg: "confirmado pela cozinha",
    description: "Pedido confirmado! A equipe está separando seus acompanhamentos.",
  },
  preparing: {
    label: "Em Preparo",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/40",
    toastMsg: "está em preparo! 🥣",
    description: "Seu copo está sendo montado com todo o capricho.",
  },
  ready: {
    label: "Pronto p/ Saída",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/40",
    toastMsg: "está pronto para envio/retirada! 📦",
    description: "Seu pedido está embalado e pronto para viagem ou retirada no balcão.",
  },
  delivering: {
    label: "Saiu para Entrega",
    badgeClass: "bg-[#9306CF]/15 text-[#9306CF] dark:text-[#C7A9C9] border-[#9306CF]/30 animate-pulse",
    toastMsg: "saiu para entrega! 🛵",
    description: "Saiu para entrega! O motoboy está a caminho do seu endereço.",
  },
  completed: {
    label: "Entregue",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40",
    toastMsg: "foi entregue! Bom apetite! 🎉",
    description: "Pedido entregue. Bom apetite!",
  },
  cancelled: {
    label: "Pedido Cancelado",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/40",
    toastMsg: "foi cancelado pela loja.",
    description: "Este pedido precisou ser cancelado pela loja.",
  },
};

export default function PedidosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"ativos" | "historico">("ativos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const previousStatusMap = useRef<Record<string, OrderStatus>>({});

  const toggleOrderExpanded = (id: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setFetching(true);
    try {
      const data = await orderService.getOrdersByUser();
      
      // Notifica o cliente se houve transição de status em algum pedido ativo
      data.forEach((updated) => {
        const oldStatus = previousStatusMap.current[updated.id];
        const newStatus = updated.status;

        if (oldStatus && oldStatus !== newStatus) {
          const shortId = updated.id.substring(0, 6);
          const config = STATUS_CONFIG[newStatus];

          // 1. Feedback sonoro sutil (chime/ding)
          playDingSound();

          // 2. Disparo de Web Notification nativa (mesmo com a aba em segundo plano ou celular bloqueado)
          let notifBody = `Atualização no pedido #${shortId}: ${config?.label || newStatus}`;
          if (newStatus === "delivering") {
            notifBody = `Seu pedido #${shortId} saiu para entrega! 🛵💨`;
          } else if (newStatus === "preparing") {
            notifBody = `Seu pedido #${shortId} começou a ser preparado! 🍧`;
          } else if (newStatus === "ready") {
            notifBody = `Seu pedido #${shortId} está pronto para envio/retirada! 📦`;
          } else if (newStatus === "completed") {
            notifBody = `Pedido #${shortId} entregue! Bom apetite! 🎉`;
          } else if (newStatus === "cancelled") {
            notifBody = `Seu pedido #${shortId} foi cancelado pela loja.`;
          }

          sendWebNotification("Pop Shake Sorveteria", {
            body: notifBody,
            icon: "/icon.png",
          });

          // 3. Feedback visual em Toast imediato
          if (newStatus === "delivering") {
            showToast({
              title: `Seu pedido #${shortId} saiu para entrega! 🛵`,
              message: "O motoboy está a caminho do seu endereço.",
              type: "info",
              duration: 9000,
            });
          } else if (newStatus === "completed") {
            showToast({
              title: `Pedido #${shortId} Entregue! 🎉`,
              message: "Pedido entregue. Bom apetite!",
              type: "success",
              duration: 8000,
            });
          } else if (newStatus === "cancelled") {
            showToast({
              title: `Pedido #${shortId} Cancelado`,
              message: `Motivo: ${updated.cancellation_reason || "Informado pela loja"}`,
              type: "error",
              duration: 10000,
            });
          } else if (config) {
            showToast({
              title: `Atualização no Pedido #${shortId}`,
              message: config.description,
              type: "info",
              duration: 6000,
            });
          }
        }

        previousStatusMap.current[updated.id] = newStatus;
      });

      setOrders(data);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      if (!isSilent) setFetching(false);
    }
  }, [showToast]);

  // Desbloqueia áudio na primeira interação do usuário
  useEffect(() => {
    initAudioUnlock();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchOrders();
    }
  }, [user, loading, router, fetchOrders]);

  // Sincronização por polling inteligente e eventos locais entre abas
  useEffect(() => {
    if (!user) return;

    // Polling regular a cada 12 segundos
    const pollTimer = setInterval(() => {
      fetchOrders(true);
    }, 12000);

    // Eventos locais em tempo real entre abas do mesmo navegador
    const unsubscribe = subscribeToOrderEvents(() => {
      fetchOrders(true);
    });

    return () => {
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [user, fetchOrders]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9306CF]" />
      </div>
    );
  }

  const isOrderActive = (status: string) => !["completed", "cancelled"].includes(status);

  const activeOrders = orders.filter((o) => isOrderActive(o.status));
  const historyOrders = orders.filter((o) => !isOrderActive(o.status));

  const getStoreWhatsAppUrl = (orderId: string, reason?: string | null) => {
    const cleanNumber = STORE_WHATSAPP.replace(/\D/g, "");
    const shortId = orderId.substring(0, 6);
    const msg = encodeURIComponent(
      `Olá! Meu pedido #${shortId} foi cancelado na loja (Motivo informado: "${reason || "não informado"}"). Gostaria de suporte.`
    );
    return `https://wa.me/${cleanNumber}?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/85 dark:bg-[#1F0B22]/90 border-b border-gray-200 dark:border-[#512B54]/40 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-[#512B54]/40 transition-colors"
            title="Voltar para a Loja"
          >
            <ChevronLeft className="w-5 h-5 text-[#9306CF]" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-heading font-black tracking-tight text-[#4C264F] dark:text-[#F9F5F9]">
              Meus Pedidos
            </h1>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Acompanhamento ao vivo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(false)}
            className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#9306CF]" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Link
            href="/carrinho"
            className="flex items-center gap-1.5 border border-gray-200 dark:border-[#512B54]/40 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Carrinho</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Banner para Solicitação Amigável de Permissão de Notificação */}
        <NotificationPermissionBanner />

        {/* Seletor de Abas */}
        <div className="flex bg-gray-200/70 dark:bg-[#2A102E]/60 p-1 rounded-2xl border border-gray-200 dark:border-[#512B54]/40">
          <button
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
              activeTab === "ativos"
                ? "bg-white dark:bg-[#1F0B22] text-[#4C264F] dark:text-[#F9F5F9] shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-foreground"
            }`}
            onClick={() => setActiveTab("ativos")}
          >
            Em Andamento ({activeOrders.length})
          </button>
          <button
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
              activeTab === "historico"
                ? "bg-white dark:bg-[#1F0B22] text-[#4C264F] dark:text-[#F9F5F9] shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-foreground"
            }`}
            onClick={() => setActiveTab("historico")}
          >
            Histórico & Concluídos ({historyOrders.length})
          </button>
        </div>

        {/* Lista de Pedidos */}
        <div className="space-y-4">
          {activeTab === "ativos" && (
            activeOrders.length > 0 ? (
              activeOrders.map((order) => {
                const statusInfo = STATUS_CONFIG[order.status] || {
                  label: order.status,
                  badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
                };
                const isExpanded = !!expandedOrderIds[order.id];
                const firstItem = order.items?.[0];
                const otherItemsCount = (order.items?.length || 1) - 1;
                const itemsSummary = firstItem
                  ? `${firstItem.quantity}x ${firstItem.product?.name || "Item"}${
                      otherItemsCount > 0 ? ` + ${otherItemsCount} ${otherItemsCount === 1 ? "item" : "itens"}` : ""
                    }`
                  : "Pedido";

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-all"
                  >
                    {/* ── LINHA 1: Status com bolinha colorida + Horário / ID do Pedido ── */}
                    <div className="flex justify-between items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusInfo.badgeClass} inline-flex items-center gap-1.5`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {statusInfo.label}
                      </span>

                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(order.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="font-bold text-[#9306CF] dark:text-[#C7A9C9] bg-[#9306CF]/10 px-2 py-0.5 rounded border border-[#9306CF]/20">
                          #{order.id.substring(0, 6)}
                        </span>
                      </div>
                    </div>

                    {/* ── LINHA 2: Resumo Principal + Total ── */}
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm pt-1">
                      <p className="font-semibold text-foreground truncate flex-1">
                        {itemsSummary}
                      </p>
                      <span className="font-heading font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 shrink-0">
                        Total: {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(order.total_amount)}
                      </span>
                    </div>

                    {/* ── LINHA 3: Botão Ver Detalhes (Accordion) + Ações ── */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
                      <button
                        type="button"
                        onClick={() => toggleOrderExpanded(order.id)}
                        className="text-xs font-semibold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Ocultar detalhes" : "Ver detalhes do pedido"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <Link href={`/rastreamento?id=${order.id}`}>
                        <Button
                          size="sm"
                          className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider shadow-sm shadow-[#9306CF]/20"
                        >
                          Rastrear 🛵
                        </Button>
                      </Link>
                    </div>

                    {/* ── DETALHES DO PEDIDO EXPANDÍVEIS (ACCORDION) ── */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-gray-100 dark:border-[#512B54]/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Lista Completa de Itens */}
                        <div className="space-y-2 py-1">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs gap-2">
                              <span className="text-[#4C264F] dark:text-[#F9F5F9] font-medium flex items-center gap-2">
                                <span className="text-[#9306CF] font-black">{item.quantity}x</span>
                                <span>{item.product?.name || "Item"}</span>
                              </span>
                              <span className="font-mono text-gray-600 dark:text-gray-300 shrink-0">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(item.price_at_time * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Endereço */}
                        {order.delivery_address && (
                          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2 border border-gray-100 dark:border-[#512B54]/20">
                            <Bike className="w-4 h-4 text-[#9306CF] shrink-0 mt-0.5" />
                            <span>
                              Entrega: {order.delivery_address.street}, {order.delivery_address.number}
                              {order.delivery_address.neighborhood ? ` - ${order.delivery_address.neighborhood}` : ""}
                            </span>
                          </div>
                        )}

                        {/* Taxa de Entrega e Desconto */}
                        {(order.delivery_fee !== undefined || (order.discount_amount && Number(order.discount_amount) > 0)) && (
                          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                            {order.delivery_fee !== undefined && (
                              <span>
                                Frete:{" "}
                                {Number(order.delivery_fee) > 0 ? (
                                  <strong className="text-gray-700 dark:text-gray-300 font-mono">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.delivery_fee))}
                                  </strong>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">Grátis</span>
                                )}
                              </span>
                            )}
                            {order.discount_amount && Number(order.discount_amount) > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Desconto: - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.discount_amount))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-8 space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-[#9306CF]/40" />
                <h3 className="font-heading font-bold text-base text-[#4C264F] dark:text-[#F9F5F9]">
                  Nenhum pedido em andamento
                </h3>
                <p className="text-xs max-w-sm mx-auto">
                  Quando você fizer um pedido, poderá acompanhar cada etapa da esteira aqui em tempo real.
                </p>
                <Link
                  href="/"
                  className="inline-block mt-2 bg-gradient-to-r from-[#9306CF] to-[#940068] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-[#9306CF]/20 hover:opacity-95 transition-opacity"
                >
                  Ir para a Página Inicial
                </Link>
              </div>
            )
          )}

          {activeTab === "historico" && (
            historyOrders.length > 0 ? (
              historyOrders.map((order) => {
                const isCancelled = order.status === "cancelled";
                const isExpanded = !!expandedOrderIds[order.id];
                const firstItem = order.items?.[0];
                const otherItemsCount = (order.items?.length || 1) - 1;
                const itemsSummary = firstItem
                  ? `${firstItem.quantity}x ${firstItem.product?.name || "Item"}${
                      otherItemsCount > 0 ? ` + ${otherItemsCount} ${otherItemsCount === 1 ? "item" : "itens"}` : ""
                    }`
                  : "Pedido";

                return (
                  <div
                    key={order.id}
                    className={`bg-white dark:bg-[#230E26] border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-colors ${
                      isCancelled
                        ? "border-red-200 dark:border-red-900/50"
                        : "border-gray-200 dark:border-[#512B54]/40"
                    }`}
                  >
                    {/* ── LINHA 1: Status + Data/Hora e ID ── */}
                    <div className="flex justify-between items-center gap-2">
                      {isCancelled ? (
                        <span className="bg-red-500 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Cancelado
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Entregue
                        </span>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                        <span>
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded border ${
                            isCancelled
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/40"
                              : "bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border-[#9306CF]/20"
                          }`}
                        >
                          #{order.id.substring(0, 6)}
                        </span>
                      </div>
                    </div>

                    {/* ── LINHA 2: Resumo Principal + Total ── */}
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm pt-1">
                      <p className="font-semibold text-foreground truncate flex-1">
                        {itemsSummary}
                      </p>
                      <span className="font-mono font-bold text-base text-[#4C264F] dark:text-[#F9F5F9] shrink-0">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(order.total_amount)}
                      </span>
                    </div>

                    {/* ── LINHA 3: Botão Ver Detalhes (Accordion) + Pedir Novamente ── */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
                      <button
                        type="button"
                        onClick={() => toggleOrderExpanded(order.id)}
                        className="text-xs font-semibold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Ocultar detalhes" : "Ver detalhes do pedido"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <Link href="/">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold text-[#9306CF] hover:bg-[#9306CF]/10 gap-1.5 h-8 px-3"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pedir Novamente</span>
                        </Button>
                      </Link>
                    </div>

                    {/* ── DETALHES DO HISTÓRICO EXPANDÍVEIS (ACCORDION) ── */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-gray-100 dark:border-[#512B54]/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* ALERTA EM DESTAQUE SE O PEDIDO FOI CANCELADO */}
                        {isCancelled && (
                          <div className="bg-red-50/90 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 block">
                                  Motivo informado pela loja:
                                </span>
                                <p className="text-xs text-red-900 dark:text-red-200 font-semibold mt-0.5 leading-relaxed">
                                  {order.cancellation_reason || "Item indisponível no momento"}
                                </p>
                              </div>
                            </div>

                            <div className="pt-1 border-t border-red-200/60 dark:border-red-900/40 flex justify-end">
                              <a
                                href={getStoreWhatsAppUrl(order.id, order.cancellation_reason)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Falar com a loja no WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Itens do Pedido */}
                        <div className="space-y-2 py-1">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs gap-2">
                              <span className="text-[#4C264F] dark:text-[#F9F5F9] font-medium flex items-center gap-2">
                                <span className="text-[#9306CF] font-black">{item.quantity}x</span>
                                <span>{item.product?.name || "Item"}</span>
                              </span>
                              <span className="font-mono text-gray-600 dark:text-gray-300 shrink-0">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(item.price_at_time * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Endereço se houver */}
                        {order.delivery_address && (
                          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2 border border-gray-100 dark:border-[#512B54]/20">
                            <Bike className="w-4 h-4 text-[#9306CF] shrink-0 mt-0.5" />
                            <span>
                              Entrega: {order.delivery_address.street}, {order.delivery_address.number}
                              {order.delivery_address.neighborhood ? ` - ${order.delivery_address.neighborhood}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-400 font-medium bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-6">
                Nenhum pedido no histórico até o momento.
              </div>
            )
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
