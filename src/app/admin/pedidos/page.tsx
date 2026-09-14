"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  MessageCircle,
  MapPin,
  User,
  CheckCircle2,
  RefreshCw,
  Store,
  LogOut,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  Activity,
  PackageSearch,
  DollarSign,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  FileText,
  BarChart3,
  Bell,
  BellOff,
} from "lucide-react";
import { orderService, Order, OrderStatus } from "../../../services/orderService";
import { authService } from "../../../services/authService";
import { playKitchenBellSound, initAudioUnlock } from "../../../lib/sound";
import {
  sendWebNotification,
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
} from "../../../lib/notifications";
import { subscribeToOrderEvents } from "../../../lib/orderEvents";
import { Button } from "../../../components/ui/button";
import { OrderCancelDialog } from "../../../components/admin/OrderCancelDialog";
import { OrderDetailDrawer } from "../../../components/admin/OrderDetailDrawer";
import { StockControlSection } from "../../../components/admin/StockControlSection";
import { useToast } from "../../../components/ui/ToastNotification";

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Controle de Som Operacional & Notificações Nativas
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const isSoundMutedRef = useRef(isSoundMuted);
  const [notifPermission, setNotifPermission] = useState<string>("default");

  const router = useRouter();
  const { showToast } = useToast();
  const previousCountRef = useRef(0);

  // Inicializa desbloqueio de áudio e restaura preferência de mudo
  useEffect(() => {
    initAudioUnlock();
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("popshake_admin_sound_muted");
      if (savedMute !== null) {
        const muted = savedMute === "true";
        setIsSoundMuted(muted);
        isSoundMutedRef.current = muted;
      }
      if (isNotificationSupported()) {
        setNotifPermission(getNotificationPermission());
      }
    }
  }, []);

  // Alterna som do alerta de novo pedido
  const toggleSoundMute = () => {
    setIsSoundMuted((prev) => {
      const next = !prev;
      isSoundMutedRef.current = next;
      if (typeof window !== "undefined") {
        localStorage.setItem("popshake_admin_sound_muted", String(next));
      }
      if (!next) {
        // Toca o sino de teste ao ativar o áudio
        playKitchenBellSound();
        showToast({
          title: "Som Operacional Ativado 🔔",
          message: "O sino de cozinha tocará a cada novo pedido recebido.",
          type: "info",
        });
      } else {
        showToast({
          title: "Som Silenciado 🔕",
          message: "Alertas sonoros operacionais desativados.",
          type: "warning",
        });
      }
      return next;
    });
  };

  // Solicita permissão para notificações na área de trabalho do operador
  const handleEnableDesktopNotifs = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      if (!isSoundMutedRef.current) playKitchenBellSound();
      showToast({
        title: "Notificações no Navegador Ativadas! 🔔",
        message: "Você será avisado mesmo quando esta aba estiver em segundo plano.",
        type: "success",
      });
      await sendWebNotification("Pop Shake - Central Operacional 🍧", {
        body: "Notificações da esteira ativadas com sucesso!",
        icon: "/icon.png",
      });
    }
  };

  // Busca lista atualizada de pedidos
  const fetchOrders = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const data = await orderService.getAllOrders();
        setOrders(data);
        previousCountRef.current = data.length;
        if (isManual) {
          showToast({
            title: "Esteira Sincronizada",
            message: "A esteira de pedidos foi atualizada com sucesso.",
            type: "info",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        if (isManual) {
          showToast({
            title: "Erro ao sincronizar",
            message: "Não foi possível carregar os pedidos.",
            type: "error",
          });
        }
      } finally {
        setFetching(false);
        if (isManual) setIsRefreshing(false);
      }
    },
    [showToast]
  );

  // Carga inicial e sincronização contínua (polling inteligente + eventos locais)
  useEffect(() => {
    fetchOrders();

    // Polling inteligente a cada 10 segundos
    const pollInterval = setInterval(async () => {
      try {
        const data = await orderService.getAllOrders();
        setOrders((prev) => {
          if (previousCountRef.current > 0 && data.length > previousCountRef.current) {
            // Identifica o novo pedido
            const newOrders = data.filter((d) => !prev.some((p) => p.id === d.id));
            const targetOrder = newOrders[0] || data[0];
            const shortId = targetOrder ? targetOrder.id.substring(0, 6) : "Novo";
            const formattedTotal = targetOrder?.total_amount
              ? `R$ ${targetOrder.total_amount.toFixed(2).replace(".", ",")}`
              : "";
            const clientName = targetOrder?.user?.fullName || targetOrder?.user?.username || "Cliente";

            // Alerta sonoro de sino de cozinha/balcão se não estiver silenciado
            if (!isSoundMutedRef.current) {
              playKitchenBellSound();
            }

            // Notificação nativa no navegador do operador: "Novo pedido recebido! (#12345 - R$ XX,XX)"
            sendWebNotification("Novo pedido recebido! 🔔", {
              body: `#${shortId} - ${formattedTotal} • ${clientName}`,
              icon: "/icon.png",
            });

            showToast({
              title: `Novo pedido recebido! 🔔 (#${shortId})`,
              message: `${clientName} • ${formattedTotal} entrou na esteira da cozinha.`,
              type: "success",
              duration: 9000,
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
        if (!isSoundMutedRef.current) {
          playKitchenBellSound();
        }
        const shortId = event.order?.id ? String(event.order.id).substring(0, 6) : "Novo";
        sendWebNotification("Novo pedido recebido! 🔔", {
          body: `Pedido #${shortId} acabou de entrar na esteira da cozinha!`,
          icon: "/icon.png",
        });
        showToast({
          title: "Novo pedido recebido! 🔔",
          message: "Um novo pedido entrou na esteira da cozinha.",
          type: "success",
          duration: 9000,
        });
      }
      fetchOrders();
    });

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
    };
  }, [fetchOrders, showToast]);

  // Abertura automática de pedido via Query Param (?orderId=...)
  useEffect(() => {
    if (typeof window !== "undefined" && orders.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("orderId");
      if (targetId) {
        const found = orders.find((o) => o.id === targetId || o.id.startsWith(targetId));
        if (found) {
          setSelectedOrderForDrawer(found);
        }
      }
    }
  }, [orders]);

  // Atualiza a ficha aberta no drawer se o pedido for alterado na lista
  useEffect(() => {
    if (selectedOrderForDrawer) {
      const updated = orders.find((o) => o.id === selectedOrderForDrawer.id);
      if (updated && updated !== selectedOrderForDrawer) {
        setSelectedOrderForDrawer(updated);
      }
    }
  }, [orders, selectedOrderForDrawer]);

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  // Cálculo da recorrência de clientes
  const clientRecurrenceMap = useMemo(() => {
    const history: Record<string, Order[]> = {};
    const sorted = [...orders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    for (const o of sorted) {
      const key = (o.user_id || o.user?.phone || o.user?.email || o.user?.username || "").trim();
      if (!key) continue;
      if (!history[key]) history[key] = [];
      history[key].push(o);
    }
    return history;
  }, [orders]);

  const getClientRecurrence = useCallback(
    (order: Order) => {
      const key = (order.user_id || order.user?.phone || order.user?.email || order.user?.username || "").trim();
      if (!key || !clientRecurrenceMap[key]) {
        return { isRecurrent: false, count: 1, label: "⭐ 1º Pedido (Novo)", shortLabel: "⭐ 1º Pedido" };
      }
      const userOrders = clientRecurrenceMap[key];
      const orderIndex = userOrders.findIndex((o) => o.id === order.id) + 1;
      const total = userOrders.length;
      if (total > 1) {
        const pos = orderIndex > 0 ? orderIndex : total;
        return {
          isRecurrent: true,
          count: total,
          label: `👑 Cliente Recorrente (${pos}º pedido)`,
          shortLabel: `👑 ${pos}º pedido`,
        };
      }
      return { isRecurrent: false, count: 1, label: "⭐ 1º Pedido (Novo)", shortLabel: "⭐ 1º Pedido" };
    },
    [clientRecurrenceMap]
  );

  // Próxima etapa operacional
  const getNextStage = (currentStatus: OrderStatus): { nextStatus: OrderStatus; label: string } | null => {
    switch (currentStatus) {
      case "pending":
      case "accepted":
        return { nextStatus: "preparing", label: "Avançar p/ Preparo ➔" };
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

  // Etapa anterior operacional (Recuo de estágio)
  const getPrevStage = (currentStatus: OrderStatus): { prevStatus: OrderStatus; label: string } | null => {
    switch (currentStatus) {
      case "preparing":
        return { prevStatus: "pending", label: "Voltar p/ Novos" };
      case "ready":
        return { prevStatus: "preparing", label: "Voltar p/ Preparo" };
      case "delivering":
        return { prevStatus: "ready", label: "Voltar p/ Pronto" };
      case "completed":
        return { prevStatus: "delivering", label: "Reabrir Entrega" };
      case "cancelled":
        return { prevStatus: "pending", label: "Reativar Pedido" };
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
        message: `Pedido #${orderId.substring(0, 6)} avançado para ${stage.nextStatus}.`,
        type: "success",
      });
      fetchOrders();
    } catch (err: any) {
      showToast({
        title: "Erro ao avançar",
        message: err.message || "Não foi possível avançar o pedido.",
        type: "error",
      });
    }
  };

  const handleRevertStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const stage = getPrevStage(currentStatus);
    if (!stage) return;
    try {
      await orderService.updateOrderStatus(orderId, stage.prevStatus);
      showToast({
        title: "Etapa Revertida",
        message: `Pedido #${orderId.substring(0, 6)} retornado com sucesso.`,
        type: "info",
      });
      fetchOrders();
    } catch (err: any) {
      showToast({
        title: "Erro ao reverter",
        message: err.message || "Não foi possível retornar o pedido.",
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
    const msg = encodeURIComponent(`Olá ${clientName || ""}! Aqui é da Pop Shake Sorveteria referente ao seu pedido ${shortCode}.`);
    return `https://wa.me/${full}?text=${msg}`;
  };

  // Métricas do Topo
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const revenueToday = todayOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + Number(o.total_amount), 0);
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));

  // Contagem de saídas recentes / itens em preparo ativo no quadro
  const activeDemandMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const pid = item.product_id || item.product?.id;
        if (pid) {
          map[pid] = (map[pid] || 0) + (item.quantity || 1);
        }
      });
    });
    return map;
  }, [activeOrders]);
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  // Badge inteligente de tempo decorrido
  const renderOrderTimeBadge = (order: Order) => {
    const createdDate = new Date(order.created_at);

    if (order.status === "completed") {
      const updatedDate = order.updated_at ? new Date(order.updated_at) : null;
      if (updatedDate) {
        const durationMins = Math.max(0, Math.floor((updatedDate.getTime() - createdDate.getTime()) / 60000));
        if (durationMins > 0 && durationMins < 720) {
          const formatted =
            durationMins >= 60
              ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 > 0 ? `${durationMins % 60}m` : ""}`
              : `${durationMins} min`;
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Pronto em {formatted}</span>
            </span>
          );
        }
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Concluído</span>
        </span>
      );
    }

    if (order.status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40">
          <XCircle className="w-2.5 h-2.5" />
          <span>Cancelado</span>
        </span>
      );
    }

    const diffMins = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60000));
    const isUrgent = diffMins >= 40;
    const isWarning = diffMins >= 20 && diffMins < 40;

    const timeLabel =
      diffMins < 1
        ? "Agora"
        : diffMins < 60
        ? `${diffMins} min`
        : `${Math.floor(diffMins / 60)}h ${diffMins % 60 > 0 ? `${diffMins % 60}min` : ""}`;

    return (
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
        <span>{timeLabel}</span>
      </span>
    );
  };

  // Renderização de cada coluna do Kanban
  const renderKanbanColumn = (
    title: string,
    statuses: OrderStatus[],
    accentColor: string,
    isCancelColumn = false
  ) => {
    const colOrders = orders.filter((o) => statuses.includes(o.status));

    return (
      <div
        className={`rounded-2xl border p-3.5 shadow-sm flex flex-col min-w-[270px] xl:min-w-[250px] transition-colors ${
          isCancelColumn
            ? "bg-red-50/40 dark:bg-[#1E0911]/60 border-red-200/80 dark:border-red-900/40"
            : "bg-white/85 dark:bg-[#230E26]/80 border-gray-200 dark:border-[#512B54]/40"
        }`}
      >
        {/* Cabeçalho da Coluna */}
        <div
          className={`flex items-center justify-between pb-3 mb-3 border-b ${
            isCancelColumn
              ? "border-red-200/60 dark:border-red-900/30"
              : "border-gray-100 dark:border-[#512B54]/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <h3 className="font-heading font-bold text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9] uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
              isCancelColumn
                ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300"
            }`}
          >
            {colOrders.length}
          </span>
        </div>

        {/* Lista de Cards da Coluna */}
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pr-1 scrollbar-thin">
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

              const createdDate = new Date(order.created_at);
              const nextStage = getNextStage(order.status);
              const prevStage = getPrevStage(order.status);
              const recurrence = getClientRecurrence(order);
              const whatsAppLink = getWhatsAppLink(order.user?.phone, clientName, order.id);

              // -------------------------------------------------------------
              // MODO 1: Coluna de Pedidos Cancelados
              // -------------------------------------------------------------
              if (isCancelColumn) {
                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-[#1A0B1C] border border-red-200 dark:border-red-900/40 rounded-xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900/40">
                        #{order.id.substring(0, 6)}
                      </span>
                      <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                        {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-[#4C264F] dark:text-[#F9F5F9] truncate">
                        {clientName}
                      </h4>
                      <p className="font-mono font-bold text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        R$ {order.total_amount?.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    {/* Motivo do Cancelamento */}
                    <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/30 text-[11px] text-red-800 dark:text-red-300">
                      <span className="font-bold uppercase text-[9px] text-red-600 dark:text-red-400 block">
                        Motivo do Cancelamento:
                      </span>
                      <p className="mt-0.5 line-clamp-2 italic">
                        {order.cancellation_reason || "Cancelado pela administração"}
                      </p>
                    </div>

                    {/* Ações da Coluna de Cancelados */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-red-100 dark:border-red-900/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrderForDrawer(order)}
                        className="flex-1 text-[11px] font-bold h-8 rounded-lg border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        <FileText className="w-3 h-3 text-[#9306CF] mr-1" />
                        <span>Ver Ficha</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleRevertStatus(order.id, "cancelled")}
                        className="flex-1 text-[11px] font-bold h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                        title="Reabrir este pedido como Novo"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        <span>Reativar</span>
                      </Button>
                    </div>
                  </div>
                );
              }

              // -------------------------------------------------------------
              // MODO 2: Card em Modo Compacto
              // -------------------------------------------------------------
              if (isCompact) {
                const totalItems = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
                const firstItemName = order.items?.[0]?.product?.name || "Produto";

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-[#1A0B1C] border border-gray-200/90 dark:border-[#512B54]/50 rounded-xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col gap-2 relative group hover:border-[#9306CF]/40"
                  >
                    {/* Linha 1: ID, Horário e Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#9306CF] dark:text-[#C7A9C9] bg-[#9306CF]/10 px-2 py-0.5 rounded-md border border-[#9306CF]/20">
                          #{order.id.substring(0, 6)}
                        </span>
                        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                          {createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {renderOrderTimeBadge(order)}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                          {isPickup ? "🛍️" : "🛵"}
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: Cliente + Recorrência */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#4C264F] dark:text-[#F9F5F9] truncate">
                          {clientName}
                        </p>
                        <span className="text-[10px] text-[#9306CF] dark:text-[#C7A9C9] font-medium block">
                          {recurrence.shortLabel}
                        </span>
                      </div>

                      {whatsAppLink && (
                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 transition-colors shrink-0"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Linha 3: Resumo dos Itens e Valor */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
                      <span className="text-gray-500 dark:text-gray-400 truncate text-[11px] max-w-[140px]">
                        {totalItems} item(ns) • {firstItemName}
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        R$ {order.total_amount?.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    {/* Linha 4: Ações Rápidas */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {prevStage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevertStatus(order.id, order.status)}
                          className="h-7 px-2 text-[10px] font-bold rounded-lg border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5"
                          title={prevStage.label}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}

                      {nextStage ? (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, order.status)}
                          className="flex-1 h-7 rounded-lg bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading font-bold text-[10px] uppercase tracking-wider shadow-xs"
                        >
                          <span>{nextStage.label}</span>
                        </Button>
                      ) : (
                        <span className="flex-1 text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                          ✓ Entregue
                        </span>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrderForDrawer(order)}
                        className="h-7 px-2 text-[10px] font-bold rounded-lg border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5"
                        title="Ver Ficha Completa"
                      >
                        <FileText className="w-3 h-3 text-[#9306CF]" />
                      </Button>
                    </div>
                  </div>
                );
              }

              // -------------------------------------------------------------
              // MODO 3: Card em Modo Detalhado (Padrão Completo)
              // -------------------------------------------------------------
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
                      {renderOrderTimeBadge(order)}

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

                  {/* 2. Dados do Cliente & Recorrência */}
                  <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-[#512B54]/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-[#9306CF] shrink-0" />
                        <span className="font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] truncate">
                          {clientName}
                        </span>
                      </div>

                      {whatsAppLink && (
                        <a
                          href={whatsAppLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 transition-colors shrink-0"
                          title={`Abrir WhatsApp de ${clientName}`}
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Tag de Recorrência */}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#9306CF] dark:text-[#C7A9C9]">
                      <Sparkles className="w-3 h-3" />
                      <span>{recurrence.label}</span>
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
                        <div className="leading-relaxed">
                          <span>
                            {order.delivery_address?.street}, {order.delivery_address?.number}
                            {order.delivery_address?.neighborhood ? ` - ${order.delivery_address.neighborhood}` : ""}
                            {order.delivery_address?.complement ? ` (${order.delivery_address.complement})` : ""}
                          </span>
                          {order.delivery_address?.reference && (
                            <span className="block text-[11px] text-[#9306CF] dark:text-[#C7A9C9] font-medium mt-0.5">
                              Ref: {order.delivery_address.reference}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Lista de Itens do Pedido */}
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

                  {/* 4. Rodapé do Card (Valor + Pagamento + Ações de Avanço/Recuo) */}
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
                          {order.payment_method_type === "pix_entrega" && "⚡ Pix"}
                          {order.payment_method_type === "cartao_maquininha" && "💳 Cartão"}
                          {order.payment_method_type === "dinheiro" && "💵 Dinheiro"}
                          {!order.payment_method_type && "⚡ Pix"}
                        </span>
                        {order.payment_method_type === "dinheiro" && order.payment_change_for && (
                          <span className="block text-[10px] font-mono text-muted-foreground mt-0.5">
                            Troco p/ R$ {order.payment_change_for.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botões Operacionais: Avanço + Recuo de Estágio */}
                    <div className="flex items-center gap-1.5">
                      {prevStage && (
                        <Button
                          variant="outline"
                          onClick={() => handleRevertStatus(order.id, order.status)}
                          className="h-9 px-2.5 rounded-xl border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold"
                          title={prevStage.label}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                        </Button>
                      )}

                      {nextStage && (
                        <Button
                          onClick={() => handleUpdateStatus(order.id, order.status)}
                          className="flex-1 h-9 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-md shadow-[#9306CF]/20 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span>{nextStage.label}</span>
                        </Button>
                      )}

                      {order.status === "completed" && (
                        <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pedido Entregue</span>
                        </div>
                      )}
                    </div>

                    {/* Ações Secundárias: Ver Ficha Completa + Cancelar */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDrawer(order)}
                        className="text-[11px] font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Ver Ficha Completa ➔</span>
                      </button>

                      {order.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderToCancel(order);
                            setCancelDialogOpen(true);
                          }}
                          className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancelar</span>
                        </button>
                      )}
                    </div>
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
          <Link href="/" className="font-heading font-black text-xl tracking-tight flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt="Logo Pop Shake"
              className="w-7 h-7 rounded-full object-contain border border-[#9306CF]/30 shadow-xs shrink-0"
            />
            <div className="flex items-center gap-1">
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
                Gestão de Pedidos
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Link para Painel Operacional (Métricas & Gráficos) */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Painel Operacional</span>
          </Link>

          {/* Link para Página Inicial */}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-[#9306CF]" />
            <span className="hidden sm:inline">Página Inicial</span>
          </Link>

          {/* Botão Sair */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-red-200 dark:border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Barra de Ações do Board */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide flex items-center gap-2 text-[#4C264F] dark:text-[#F9F5F9]">
                <LayoutDashboard className="w-6 h-6 text-[#9306CF]" /> Central Operacional da Cozinha e Despacho
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Esteira Live
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Controle de montagem de copos, shakes e despacho ágil em 5 etapas integradas.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Botão de Alternância de Som Operacional (🔔 Som Ativado / 🔕 Mudo) */}
            <Button
              variant="outline"
              onClick={toggleSoundMute}
              className={`rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 transition-colors cursor-pointer ${
                isSoundMuted
                  ? "border-red-300 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100"
                  : "border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
              title={isSoundMuted ? "Clique para ativar som da cozinha" : "Clique para silenciar avisos sonoros"}
            >
              {isSoundMuted ? (
                <>
                  <BellOff className="w-3.5 h-3.5 text-red-500" />
                  <span>🔕 Mudo</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>🔔 Som Ativado</span>
                </>
              )}
            </Button>

            {/* Ativador de Notificações Desktop/Navegador para Operador */}
            {notifPermission === "default" && (
              <Button
                variant="outline"
                onClick={handleEnableDesktopNotifs}
                className="rounded-xl border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 transition-colors cursor-pointer"
                title="Habilitar avisos pop-up do navegador para novos pedidos"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Ativar Notificações</span>
              </Button>
            )}

            {/* Toggle de Modo Compacto vs Detalhado */}
            <Button
              variant="outline"
              onClick={() => setIsCompact(!isCompact)}
              className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isCompact ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#9306CF]" />
                  <span>⊞ Expandir Detalhes</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#9306CF]" />
                  <span>⊟ Modo Compacto</span>
                </>
              )}
            </Button>

            {/* Botão de Atualizar Board Manual com Loading Spinner */}
            <Button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              className="rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 h-10 px-4 shadow-md shadow-[#9306CF]/20 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Sincronizando..." : "Atualizar Board"}</span>
            </Button>
          </div>
        </div>

        {/* Métricas Rápidas Operacionais */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Cancelados
              </span>
              <span className="font-heading font-black text-xl sm:text-2xl text-red-600 dark:text-red-400">
                {cancelledOrders.length}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Grid Principal do Kanban em 5 Colunas */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 overflow-x-auto pb-4 items-start">
          {renderKanbanColumn("Novos", ["pending", "accepted"], "#9306CF")}
          {renderKanbanColumn("Em Preparo", ["preparing"], "#EAB308")}
          {renderKanbanColumn("A Caminho / Pronto", ["ready", "delivering"], "#940068")}
          {renderKanbanColumn("Concluídos", ["completed"], "#10B981")}
          {renderKanbanColumn("Cancelados", ["cancelled"], "#EF4444", true)}
        </section>

        {/* Seção Dedicada: Controle Rápido de Estoque & Itens à Venda */}
        <StockControlSection activeDemandMap={activeDemandMap} />
      </main>

      {/* Gaveta / Drawer Lateral com a Ficha Completa do Pedido */}
      <OrderDetailDrawer
        order={selectedOrderForDrawer}
        isOpen={!!selectedOrderForDrawer}
        onClose={() => setSelectedOrderForDrawer(null)}
        onAdvance={handleUpdateStatus}
        onRevert={handleRevertStatus}
        onRequestCancel={(order) => {
          setOrderToCancel(order);
          setCancelDialogOpen(true);
        }}
        clientRecurrenceText={
          selectedOrderForDrawer ? getClientRecurrence(selectedOrderForDrawer).label : undefined
        }
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
