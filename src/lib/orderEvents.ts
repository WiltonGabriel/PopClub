/**
 * Sincronização e notificações locais entre abas para pedidos
 * com isolamento estrito por usuário/sessão.
 */
export type OrderEventType = "order_created" | "order_updated" | "order_cancelled" | "orders_reset";

export interface OrderEventPayload {
  type: OrderEventType;
  order?: any;
  targetUserId?: string | null;
  guestOrderId?: string | null;
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

export function dispatchOrderEvent(type: OrderEventType, order?: any, targetUserId?: string | null) {
  const resolvedUserId = targetUserId !== undefined ? targetUserId : (order?.user_id ?? order?.userId ?? null);
  const payload: OrderEventPayload = {
    type,
    order,
    targetUserId: resolvedUserId,
    guestOrderId: !resolvedUserId && order?.id ? order.id : null,
  };

  listeners.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.error(err);
    }
  });

  try {
    localChannel?.postMessage(payload);
  } catch {}
}

export function subscribeToOrderEvents(callback: OrderEventCallback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
