"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { orderService, Order, OrderStatus } from "../services/orderService";
import { subscribeToOrderEvents, OrderEventPayload } from "../lib/orderEvents";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/ui/ToastNotification";
import { playDingSound, initAudioUnlock } from "../lib/sound";
import { sendWebNotification } from "../lib/notifications";

const GUEST_ORDERS_STORAGE_KEY = "popshake_guest_order_ids";
const getUserOrdersKey = (userId: string) => `popshake_orders_${userId}`;

interface OrderContextType {
  orders: Order[];
  activeOrders: Order[];
  historyOrders: Order[];
  loading: boolean;
  refreshOrders: (silent?: boolean) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  trackGuestOrder: (orderId: string) => void;
  guestOrderIds: string[];
}

const OrderContext = createContext<OrderContextType | null>(null);

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
    description: "Este pedido precisou ser cancelado.",
  },
};

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id || null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>([]);

  // Rastreamento de status anterior para emitir notificações sonoras e visuais apenas na transição
  const previousStatusMap = useRef<Record<string, OrderStatus>>({});
  const activeUserIdRef = useRef<string | null>(null);

  // Carrega IDs de pedidos de visitante salvos no dispositivo
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(GUEST_ORDERS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setGuestOrderIds(parsed);
          }
        }
      } catch (e) {
        console.warn("Falha ao recuperar IDs de pedidos de visitante:", e);
      }
    }
  }, []);

  // Adiciona um novo pedido de visitante
  const trackGuestOrder = useCallback((orderId: string) => {
    setGuestOrderIds((prev) => {
      const updated = Array.from(new Set([...prev, orderId])).slice(0, 20);
      try {
        localStorage.setItem(GUEST_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Falha ao salvar pedido de visitante:", e);
      }
      return updated;
    });
  }, []);

  // Busca pedidos estritamente isolados para o usuário ou para os pedidos anônimos locais
  const refreshOrders = useCallback(async (silent = false) => {
    if (authLoading) return;
    if (!silent) setLoading(true);

    try {
      let data: Order[] = [];
      const currentUserId = userId;

      if (currentUserId) {
        // Usuário logado: busca exclusivamente os pedidos atrelados ao seu userId
        data = await orderService.getOrdersByUser();
        // Salva cache isolado deste usuário (0ms na próxima visualização)
        try {
          localStorage.setItem(getUserOrdersKey(currentUserId), JSON.stringify(data));
        } catch {}
      } else if (guestOrderIds.length > 0) {
        // Visitante não autenticado: busca estritamente os pedidos da sua lista de tracking anônima
        data = await orderService.getOrdersByUser(guestOrderIds);
      } else {
        // Visitante sem pedidos: lista vazia
        data = [];
      }

      // Notifica o cliente se houve transição de status em algum pedido
      data.forEach((updated) => {
        const oldStatus = previousStatusMap.current[updated.id];
        const newStatus = updated.status;

        if (oldStatus && oldStatus !== newStatus) {
          const shortId = updated.id.substring(0, 6);
          const config = STATUS_CONFIG[newStatus];

          playDingSound();

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
            notifBody = `Seu pedido #${shortId} foi cancelado. Motivo: ${updated.cancellation_reason || "Informado pela loja"}`;
          }

          sendWebNotification("Pop Shake Sorveteria", {
            body: notifBody,
            icon: "/icon.png",
          });

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
      console.error("Erro ao sincronizar pedidos:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId, authLoading, guestOrderIds, showToast]);

  // Reconciliação intencional: quando um usuário loga e possui pedidos de visitante pendentes
  useEffect(() => {
    const claimPendingGuestOrders = async () => {
      if (user?.id && guestOrderIds.length > 0) {
        try {
          const res = await orderService.claimGuestOrders(guestOrderIds);
          if (res.claimedCount > 0) {
            showToast({
              title: "Pedidos Vinculados! 🎉",
              message: `${res.claimedCount} pedido(s) anterior(es) foram associados à sua conta com sucesso.`,
              type: "success",
              duration: 8000,
            });
          }
          // Limpa a lista local de tracking de visitante após vinculação
          localStorage.removeItem(GUEST_ORDERS_STORAGE_KEY);
          setGuestOrderIds([]);
          refreshOrders(false);
        } catch (err) {
          console.warn("Aviso ao vincular pedidos de visitante:", err);
        }
      }
    };

    claimPendingGuestOrders();
  }, [user?.id, guestOrderIds, refreshOrders, showToast]);

  // ISOLAMENTO DE SESSÃO: Limpeza imediata no logout ou na troca de usuário
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id || null;

    if (activeUserIdRef.current !== currentUserId) {
      // Usuário mudou (login, logout ou troca de conta) -> RESET COMPLETO
      activeUserIdRef.current = currentUserId;
      previousStatusMap.current = {};

      if (currentUserId) {
        // Tenta carregar o cache isolado deste usuário imediatamente (0ms)
        try {
          const cached = localStorage.getItem(getUserOrdersKey(currentUserId));
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setOrders(parsed);
            }
          } else {
            setOrders([]);
          }
        } catch {
          setOrders([]);
        }
      } else {
        // Deslogou -> Limpa estritamente em memória
        setOrders([]);
      }

      refreshOrders(false);
    }
  }, [user?.id, authLoading, refreshOrders]);

  // Resposta ao evento global de logout sanitizando qualquer resquício em memória
  useEffect(() => {
    const handleSignOutEvent = () => {
      setOrders([]);
      previousStatusMap.current = {};
      activeUserIdRef.current = null;
      try {
        localStorage.removeItem(GUEST_ORDERS_STORAGE_KEY);
        setGuestOrderIds([]);
      } catch {}
    };

    window.addEventListener("popshake:signout", handleSignOutEvent);
    return () => {
      window.removeEventListener("popshake:signout", handleSignOutEvent);
    };
  }, []);

  // Escuta eventos locais entre abas com verificação estrita de targetUserId
  useEffect(() => {
    const unsubscribe = subscribeToOrderEvents((payload: OrderEventPayload) => {
      const currentUserId = user?.id || null;

      if (payload.type === "orders_reset") {
        setOrders([]);
        previousStatusMap.current = {};
        return;
      }

      // Se o evento tem destinatário específico, só atualiza se for o mesmo usuário ou se for admin
      if (payload.targetUserId && currentUserId && payload.targetUserId !== currentUserId && user?.role !== "admin") {
        return;
      }

      // Se for um pedido de guest, só atualiza se estiver na lista de tracking local
      if (payload.guestOrderId && !currentUserId && !guestOrderIds.includes(payload.guestOrderId)) {
        return;
      }

      refreshOrders(true);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, user?.role, guestOrderIds, refreshOrders]);

  // Cancela pedido com validação segura
  const cancelOrder = useCallback(
    async (orderId: string, reason = "Cancelado pelo cliente") => {
      await orderService.cancelOrder(orderId, reason);
      await refreshOrders(true);
    },
    [refreshOrders]
  );

  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const historyOrders = orders.filter((o) => ["completed", "cancelled"].includes(o.status));

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeOrders,
        historyOrders,
        loading,
        refreshOrders,
        cancelOrder,
        trackGuestOrder,
        guestOrderIds,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders deve ser usado dentro de um OrderProvider");
  }
  return context;
}
