/**
 * Sincronização e notificações locais e remotas para pedidos.
 * Gerencia:
 * 1. Eventos locais entre abas via BroadcastChannel (popclub-order-sync).
 * 2. Revalidação instantânea ao ganhar foco ou visibilidade da aba (visibilitychange e window focus).
 * 3. Polling inteligente resiliente (heartbeat a cada 4-6 segundos enquanto houver pedido ativo).
 * 4. Conexão SSE (Server-Sent Events) via /api/orders/events com reconexão resiliente.
 */

export type OrderEventType =
  | "order_created"
  | "order_updated"
  | "order_cancelled"
  | "orders_reset"
  | "courier_location";

export interface OrderEventPayload {
  type: OrderEventType;
  order?: any;
  orderId?: string;
  targetUserId?: string | null;
  userId?: string | null;
  guestOrderId?: string | null;
  status?: string;
  courierLocation?: { lat: number; lng: number };
  timestamp?: number;
}

type OrderEventCallback = (payload: OrderEventPayload) => void;

const listeners = new Set<OrderEventCallback>();

const localChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("popclub-order-sync")
    : null;

if (localChannel) {
  localChannel.onmessage = (e) => {
    if (e.data && typeof e.data === "object" && "type" in e.data) {
      listeners.forEach((cb) => {
        try {
          cb(e.data);
        } catch (err) {
          console.error("Erro no listener de pedidos:", err);
        }
      });
    }
  };
}

export function dispatchOrderEvent(
  type: OrderEventType,
  order?: any,
  targetUserId?: string | null
): void {
  const resolvedUserId = targetUserId !== undefined ? targetUserId : (order?.user_id ?? order?.userId ?? null);
  const payload: OrderEventPayload = {
    type,
    order,
    orderId: order?.id,
    targetUserId: resolvedUserId,
    userId: resolvedUserId,
    guestOrderId: !resolvedUserId && order?.id ? order.id : null,
    status: order?.status,
    timestamp: Date.now(),
  };

  listeners.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.error("Erro ao despachar evento local de pedido:", err);
    }
  });

  try {
    localChannel?.postMessage(payload);
  } catch {}
}

export function subscribeToOrderEvents(callback: OrderEventCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * 1. Revalidação instantânea ao ganhar foco ou visibilidade da aba.
 * Dispara imediatamente quando o cliente volta à aba ou desbloqueia o celular.
 * Aplica throttling para evitar execuções duplicadas se focus e visibilitychange dispararem juntos.
 */
export function setupTabVisibilityRevalidation(
  onRevalidate: () => void | Promise<void>,
  throttleMs = 1500
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  let lastRun = 0;

  const trigger = () => {
    const now = Date.now();
    if (now - lastRun < throttleMs) return;
    lastRun = now;

    try {
      void onRevalidate();
    } catch (err) {
      console.warn("Aviso na revalidação por foco:", err);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      trigger();
    }
  };

  const handleFocus = () => {
    trigger();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleFocus);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleFocus);
  };
}

/**
 * 2. Polling inteligente resiliente (heartbeat a cada 4-6 segundos enquanto houver pedido ativo).
 * Funciona como garantia infalível caso o SSE falhe ou seja bloqueado por proxy móvel.
 */
export interface PollingHeartbeatOptions {
  getHasActiveOrders: () => boolean;
  onPoll: () => void | Promise<void>;
  intervalMs?: number; // Padrão: 5000ms (5 segundos)
}

export function startOrderPollingHeartbeat({
  getHasActiveOrders,
  onPoll,
  intervalMs = 5000,
}: PollingHeartbeatOptions): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let timerId: NodeJS.Timeout | null = null;
  let isRunning = true;

  const tick = async () => {
    if (!isRunning) return;

    if (getHasActiveOrders()) {
      // Se a aba estiver visível, executa a verificação
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        try {
          await onPoll();
        } catch (err) {
          // Falha transitória de rede não cancela o heartbeat
          console.warn("Aviso no heartbeat de pedidos:", err);
        }
      }
    }

    if (isRunning) {
      timerId = setTimeout(tick, intervalMs);
    }
  };

  timerId = setTimeout(tick, intervalMs);

  return () => {
    isRunning = false;
    if (timerId) clearTimeout(timerId);
  };
}

/**
 * 3. Conexão SSE (Server-Sent Events) com reconexão automática e fallback gracioso.
 */
export interface SseConnectionOptions {
  userId?: string | null;
  guestOrderIds?: string[];
  orderId?: string | null;
  onEvent?: (payload: OrderEventPayload) => void;
  onError?: (err: unknown) => void;
}

export function connectOrderEventsSSE({
  userId,
  guestOrderIds,
  orderId,
  onEvent,
  onError,
}: SseConnectionOptions): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let isClosed = false;
  let retryCount = 0;

  const connect = () => {
    if (isClosed) return;

    try {
      const params = new URLSearchParams();
      if (orderId) params.set("orderId", orderId);
      if (guestOrderIds && guestOrderIds.length > 0) {
        params.set("guestOrderIds", guestOrderIds.join(","));
      }

      const queryString = params.toString();
      const sseUrl = `/api/orders/events${queryString ? `?${queryString}` : ""}`;

      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("order", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && typeof data === "object") {
            const payload: OrderEventPayload = {
              type: data.type || "order_updated",
              order: data.order,
              orderId: data.orderId,
              targetUserId: data.userId,
              userId: data.userId,
              status: data.status,
              courierLocation: data.courierLocation,
              timestamp: data.timestamp || Date.now(),
            };

            // Notifica listeners locais e inter-abas
            dispatchOrderEvent(payload.type, payload.order, payload.targetUserId);

            if (onEvent) {
              onEvent(payload);
            }
          }
        } catch (err) {
          console.error("Erro ao processar mensagem SSE:", err);
        }
      });

      eventSource.onopen = () => {
        retryCount = 0;
      };

      eventSource.onerror = (err) => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        if (onError) onError(err);

        if (!isClosed) {
          // Backoff exponencial limitado a 15 segundos
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 15000);
          retryCount++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      if (onError) onError(err);
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 5000);
      }
    }
  };

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
