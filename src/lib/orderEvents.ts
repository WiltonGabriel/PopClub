/**
 * Sincronização e notificações locais entre abas para pedidos
 */
export type OrderEventType = "order_created" | "order_updated";

interface OrderEventPayload {
  type: OrderEventType;
  order?: any;
}

type OrderEventCallback = (payload: OrderEventPayload) => void;

const listeners = new Set<OrderEventCallback>();

const localChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("popclub-order-sync")
    : null;

if (localChannel) {
  localChannel.onmessage = (e) => {
    if (e.data && (e.data.type === "order_created" || e.data.type === "order_updated")) {
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

export function dispatchOrderEvent(type: OrderEventType, order?: any) {
  const payload: OrderEventPayload = { type, order };
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
