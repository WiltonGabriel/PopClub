import { EventEmitter } from "events";

export type ServerOrderEventType =
  | "order_created"
  | "order_updated"
  | "order_cancelled"
  | "courier_location";

export interface ServerOrderEvent {
  type: ServerOrderEventType;
  orderId: string;
  userId?: string | null;
  status?: string;
  order?: any;
  courierLocation?: { lat: number; lng: number };
  timestamp: number;
}

class ServerOrderEventManager {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(500);
  }

  emit(event: ServerOrderEvent): void {
    try {
      this.emitter.emit("order_event", event);
    } catch (err) {
      console.error("[ServerOrderEvents] Falha ao emitir evento:", err);
    }
  }

  subscribe(listener: (event: ServerOrderEvent) => void): () => void {
    this.emitter.on("order_event", listener);
    return () => {
      this.emitter.off("order_event", listener);
    };
  }
}

// Singleton global persistente entre invocações e recarregamentos no Node.js
const globalForEvents = globalThis as unknown as {
  serverOrderEventManager?: ServerOrderEventManager;
};

export const serverOrderEventManager =
  globalForEvents.serverOrderEventManager || new ServerOrderEventManager();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.serverOrderEventManager = serverOrderEventManager;
}
