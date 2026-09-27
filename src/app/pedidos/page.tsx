"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle,
  ChevronLeft,
  Home,
  ChevronDown,
  RotateCcw,
  Loader2,
  ShoppingBag,
  AlertTriangle,
  MessageCircle,
  Bike,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useOrders } from "../../contexts/OrderContext";
import { Order, OrderStatus } from "../../services/orderService";
import { useToast } from "../../components/ui/ToastNotification";
import { Footer } from "../../components/storefront/Footer";
import { BottomNav } from "../../components/storefront/BottomNav";
import { initAudioUnlock } from "../../lib/sound";
import { NotificationPermissionBanner } from "../../components/storefront/NotificationPermissionBanner";
import { CompleteRegistrationModal } from "@/components/auth/CompleteRegistrationModal";

const STORE_WHATSAPP = process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5584999999999";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badgeClass: string; toastMsg: string; description: string }
> = {
  pending: {
    label: "Recebido",
    badgeClass: "bg-primary/10 text-primary dark:bg-primary/95/40 dark:text-primary/30 border-primary/20 dark:border-primary/90/40",
    toastMsg: "recebido pela loja",
    description: "Recebemos seu pedido! A cozinha já vai iniciar o preparo.",
  },
  accepted: {
    label: "Confirmado",
    badgeClass: "bg-primary/10 text-primary dark:bg-primary/95/40 dark:text-primary/30 border-primary/20 dark:border-primary/90/40",
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
    badgeClass: "bg-primary/15 text-primary dark:text-muted-foreground border-primary/30 animate-pulse",
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  const { showToast } = useToast();
  const { addItem } = useCart();
  const {
    orders,
    activeOrders,
    historyOrders,
    loading: ordersLoading,
    refreshOrders,
    cancelOrder,
    guestOrderIds,
  } = useOrders();

  const [activeTab, setActiveTab] = useState<"ativos" | "historico">("ativos");
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [isCompleteRegModalOpen, setIsCompleteRegModalOpen] = useState(false);

  const toggleOrderExpanded = (id: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.")) return;
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId, "Cancelado pelo cliente");
      showToast({
        type: "info",
        title: "Pedido cancelado",
        message: "Seu pedido foi cancelado com sucesso.",
        duration: 6000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível cancelar o pedido.";
      showToast({
        type: "error",
        title: "Erro ao cancelar",
        message: msg,
        duration: 7000,
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Desbloqueia áudio na primeira interação do usuário
  useEffect(() => {
    initAudioUnlock();
  }, []);

  // Redireciona caso não haja sessão nem pedidos anônimos
  useEffect(() => {
    if (!authLoading && !user && guestOrderIds.length === 0) {
      router.push("/login?redirect=/pedidos");
    }
  }, [user, authLoading, guestOrderIds, router]);

  if (authLoading || (ordersLoading && orders.length === 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStoreWhatsAppUrl = (orderId: string, reason?: string | null) => {
    const cleanNumber = STORE_WHATSAPP.replace(/\D/g, "");
    const shortId = orderId.substring(0, 6);
    const msg = encodeURIComponent(
      `Olá! Meu pedido #${shortId} foi cancelado na loja (Motivo informado: "${reason || "não informado"}"). Gostaria de suporte.`
    );
    return `https://wa.me/${cleanNumber}?text=${msg}`;
  };

  const handleReorder = (order: Order) => {
    if (reorderingOrderId) return;
    setReorderingOrderId(order.id);

    const isCancelled = order.status === "cancelled";
    const hasItems = order.items && order.items.length > 0;
    const canReorder = !isCancelled && hasItems && order.items!.every((i) => i.product_id);

    if (!canReorder) {
      showToast({
        title: "Ops!",
        message:
          "Não foi possível repetir este pedido automaticamente. Vamos te redirecionar para a página inicial para você poder escolher novamente!",
        type: "warning",
        duration: 4000,
      });

      setTimeout(() => {
        router.push("/");
      }, 1800);
      return;
    }

    try {
      order.items!.forEach((item) => {
        addItem({
          productId: item.product_id,
          name: item.product?.name || "Item do Pedido",
          price: item.product?.price || item.price_at_time,
          originalPrice: item.product?.price || item.price_at_time,
          quantity: item.quantity || 1,
          imageUrl: item.product?.imageUrl,
        });
      });

      showToast({
        title: "Itens Adicionados!",
        message: "Os produtos deste pedido foram adicionados ao seu carrinho.",
        type: "success",
      });

      setTimeout(() => {
        router.push("/carrinho");
      }, 500);
    } catch {
      showToast({
        title: "Ops!",
        message:
          "Não foi possível repetir este pedido automaticamente. Vamos te redirecionar para a página inicial para você poder escolher novamente!",
        type: "warning",
        duration: 4000,
      });
      setTimeout(() => {
        router.push("/");
      }, 1800);
    } finally {
      setTimeout(() => {
        setReorderingOrderId(null);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden backdrop-blur-md bg-background/80 border-b border-border/40 px-4 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-border/40 transition-colors cursor-pointer active:scale-95"
            title="Voltar à tela anterior"
            aria-label="Voltar à tela anterior"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>

          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-border/40 transition-colors cursor-pointer active:scale-95"
            title="Ir para a Página Inicial"
            aria-label="Página Inicial"
          >
            <Home className="w-5 h-5 text-primary" />
          </Link>

          <div>
            <Link href="/" className="hover:opacity-85 transition-opacity block">
              <h1 className="text-lg sm:text-xl font-heading font-black tracking-tight text-foreground dark:text-foreground">
                Meus Pedidos
              </h1>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Acompanhamento ao vivo
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshOrders(false)}
            className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Link
            href="/carrinho"
            className="hidden sm:flex items-center gap-1.5 border border-gray-200 dark:border-border/40 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Carrinho</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-6 pb-32 sm:pb-36 space-y-6">
        {/* Banner para Solicitação Amigável de Permissão de Notificação */}
        <NotificationPermissionBanner />

        {/* Aviso Discreto para quem está em Acesso Rápido */}
        {user && !user.isRegistered && (
          <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/95/25 border border-primary/20/60 dark:border-primary/90/40 text-xs text-primary/80 dark:text-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                <strong>Dica:</strong> Complete seu cadastro com e-mail e senha para consultar seus pedidos em qualquer aparelho ou computador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCompleteRegModalOpen(true)}
              className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline shrink-0 text-left sm:text-right cursor-pointer"
            >
              Completar Cadastro &rarr;
            </button>
          </div>
        )}

        {/* Seletor de Abas */}
        <div className="flex bg-gray-200/70 dark:bg-[#2A102E]/60 p-1 rounded-2xl border border-gray-200 dark:border-border/40">
          <button
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
              activeTab === "ativos"
                ? "bg-white dark:bg-[#1F0B22] text-foreground dark:text-foreground shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-foreground"
            }`}
            onClick={() => setActiveTab("ativos")}
          >
            Em Andamento ({activeOrders.length})
          </button>
          <button
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
              activeTab === "historico"
                ? "bg-white dark:bg-[#1F0B22] text-foreground dark:text-foreground shadow-sm"
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
                    className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition-all"
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
                        <span className="font-bold text-primary dark:text-muted-foreground bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
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
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-border/30">
                      <button
                        type="button"
                        onClick={() => toggleOrderExpanded(order.id)}
                        className="text-xs font-semibold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Ocultar detalhes" : "Ver detalhes do pedido"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {order.status === "delivering" ? (
                        <Link href={`/rastreamento?id=${order.id}`}>
                          <Button
                            size="sm"
                            className="h-8 px-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider shadow-sm shadow-primary/20 flex items-center gap-1.5 animate-pulse cursor-pointer"
                          >
                            <span>Rastrear Entrega</span>
                            <span>🛵</span>
                          </Button>
                        </Link>
                      ) : !["completed", "cancelled"].includes(order.status) ? (
                        <Link href={`/rastreamento?id=${order.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 rounded-xl border-primary/30 text-primary dark:text-muted-foreground hover:bg-primary/10 font-heading text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            <span>
                              {order.status === "pending"
                                ? "Aguardando Loja"
                                : order.status === "ready"
                                ? "Pronto p/ Saída"
                                : "Em Preparo"}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      ) : null}
                    </div>

                    {/* ── CANCELAMENTO CONDICIONAL ── */}
                    {order.status === "pending" && (
                      <div className="pt-2 border-t border-gray-100 dark:border-border/30 flex items-center justify-between gap-3">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Ainda não confirmado pela loja. Você ainda pode cancelar.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingId === order.id}
                          className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-900/50 px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          Cancelar Pedido
                        </button>
                      </div>
                    )}

                    {/* Aviso de contato via WhatsApp quando não é mais possível cancelar */}
                    {["accepted", "preparing", "ready", "delivering"].includes(order.status) && (
                      <div className="pt-2 border-t border-gray-100 dark:border-border/30 flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          Pedido já em preparo. Para cancelar, entre em contato diretamente com a loja:
                          {" "}
                          <a
                            href={`https://wa.me/${STORE_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Preciso cancelar meu pedido #${order.id.substring(0, 6)}.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-emerald-600 hover:underline"
                          >
                            Falar no WhatsApp
                          </a>
                        </p>
                      </div>
                    )}

                    {/* ── DETALHES DO PEDIDO EXPANDÍVEIS (ACCORDION) ── */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-gray-100 dark:border-border/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Lista Completa de Itens */}
                        <div className="space-y-2 py-1">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs gap-2">
                              <span className="text-foreground dark:text-foreground font-medium flex items-center gap-2">
                                <span className="text-primary font-black">{item.quantity}x</span>
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
                          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2 border border-gray-100 dark:border-border/20">
                            <Bike className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-8 space-y-3">
                <ShoppingBag className="w-12 h-12 mx-auto text-primary/40" />
                <h3 className="font-heading font-bold text-base text-foreground dark:text-foreground">
                  Nenhum pedido em andamento
                </h3>
                <p className="text-xs max-w-sm mx-auto">
                  Quando você fizer um pedido, poderá acompanhar cada etapa da esteira aqui em tempo real.
                </p>
                <Link
                  href="/"
                  className="inline-block mt-2 bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 hover:opacity-95 transition-opacity"
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
                        : "border-gray-200 dark:border-border/40"
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
                              : "bg-primary/10 text-primary dark:text-muted-foreground border-primary/20"
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
                      <span className="font-mono font-bold text-base text-foreground dark:text-foreground shrink-0">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(order.total_amount)}
                      </span>
                    </div>

                    {/* ── LINHA 3: Botão Ver Detalhes (Accordion) + Pedir Novamente ── */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-border/30">
                      <button
                        type="button"
                        onClick={() => toggleOrderExpanded(order.id)}
                        className="text-xs font-semibold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1 py-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Ocultar detalhes" : "Ver detalhes do pedido"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReorder(order)}
                        disabled={reorderingOrderId === order.id}
                        className="rounded-xl border-gray-200 dark:border-border/40 text-xs font-bold text-primary hover:bg-primary/10 gap-1.5 h-8 px-3 cursor-pointer"
                      >
                        {reorderingOrderId === order.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verificando...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Pedir Novamente</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* ── DETALHES DO HISTÓRICO EXPANDÍVEIS (ACCORDION) ── */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-gray-100 dark:border-border/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
                              <span className="text-foreground dark:text-foreground font-medium flex items-center gap-2">
                                <span className="text-primary font-black">{item.quantity}x</span>
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
                          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2 border border-gray-100 dark:border-border/20">
                            <Bike className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
              <div className="text-center py-12 text-gray-400 font-medium bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-6">
                Nenhum pedido no histórico até o momento.
              </div>
            )
          )}
        </div>
      </main>

      <Footer />

      <CompleteRegistrationModal
        isOpen={isCompleteRegModalOpen}
        onClose={() => setIsCompleteRegModalOpen(false)}
      />

      {/* ─────────────────────────────────────────
          BOTTOM NAV (mobile only - Padrão iFood)
      ───────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
