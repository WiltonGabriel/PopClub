"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { orderService, Order, OrderStatus } from "../services/orderService";
import {
  subscribeToOrderEvents,
  OrderEventPayload,
  setupTabVisibilityRevalidation,
  startOrderPollingHeartbeat,
  connectOrderEventsSSE,
} from "../lib/orderEvents";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/ui/ToastNotification";
import { notifyOrderStatusChange } from "../lib/notifications";

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

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id || null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>([]);

  // Refs mutáveis para evitar re-criação de timers e listeners
  const ordersRef = useRef<Order[]>(orders);
  const guestOrderIdsRef = useRef<string[]>(guestOrderIds);
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const activeOrdersRef = useRef<Order[]>(activeOrders);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    guestOrderIdsRef.current = guestOrderIds;
  }, [guestOrderIds]);

  useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);

  const historyOrders = orders.filter((o) => ["completed", "cancelled"].includes(o.status));

  // Rastreamento de status anterior para emitir notificações apenas na transição real
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

      const safeData = Array.isArray(data) ? data : [];

      // Notifica o cliente se houve transição de status em algum pedido
      safeData.forEach((updated) => {
        const oldStatus = previousStatusMap.current[updated.id];
        if (oldStatus && oldStatus !== updated.status) {
          notifyOrderStatusChange({
            order: updated,
            previousStatus: oldStatus,
            showToast,
          });
        }

        previousStatusMap.current[updated.id] = updated.status;
      });

      setOrders(safeData);
    } catch (err) {
      console.error("Erro ao sincronizar pedidos:", err);
      setOrders((prev) => (Array.isArray(prev) ? prev : []));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId, authLoading, guestOrderIds, showToast]);

  // 1. Revalidação instantânea ao ganhar foco ou visibilidade da aba (visibilitychange e window focus)
  useEffect(() => {
    const unsubscribe = setupTabVisibilityRevalidation(() => {
      refreshOrders(true);
    });
    return unsubscribe;
  }, [refreshOrders]);

  // 2. Polling inteligente resiliente (heartbeat a cada 4-6 segundos enquanto houver pedido ativo)
  useEffect(() => {
    const unsubscribe = startOrderPollingHeartbeat({
      getHasActiveOrders: () => {
        return (
          activeOrdersRef.current.length > 0 ||
          (guestOrderIdsRef.current.length > 0 && ordersRef.current.length === 0)
        );
      },
      onPoll: () => refreshOrders(true),
      intervalMs: 5000,
    });
    return unsubscribe;
  }, [refreshOrders]);

  // 3. Conexão SSE (Server-Sent Events) com reconexão resiliente e fallback automático
  useEffect(() => {
    if (authLoading) return;

    const unsubscribe = connectOrderEventsSSE({
      userId: user?.id,
      guestOrderIds,
      onEvent: () => {
        refreshOrders(true);
      },
    });

    return unsubscribe;
  }, [user?.id, guestOrderIds, authLoading, refreshOrders]);

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
