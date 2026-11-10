import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  dispatchOrderEvent,
  subscribeToOrderEvents,
  setupTabVisibilityRevalidation,
  startOrderPollingHeartbeat,
} from "@/lib/orderEvents";
import { notifyOrderStatusChange } from "@/lib/notifications";

// Mock do sistema de som
vi.mock("@/lib/sound", () => ({
  playDingSound: vi.fn(),
  initAudioUnlock: vi.fn(),
}));

describe("Sincronização em Tempo Real e Eventos de Pedidos (Unit)", () => {
  let originalWindow: any;
  let originalDocument: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;

    const mockWindow = new EventTarget();
    const mockDocument = Object.assign(new EventTarget(), {
      visibilityState: "visible",
    });

    (globalThis as any).window = mockWindow;
    (globalThis as any).document = mockDocument;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
  });

  it("permite inscrição e despacho local de eventos de pedidos", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToOrderEvents(callback);

    dispatchOrderEvent("order_updated", { id: "order-123", status: "preparing" });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "order_updated",
        orderId: "order-123",
        status: "preparing",
      })
    );

    unsubscribe();
    dispatchOrderEvent("order_updated", { id: "order-123", status: "ready" });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("revalida imediatamente ao ganhar foco ou visibilidade da aba com throttling", () => {
    const onRevalidate = vi.fn();
    const cleanup = setupTabVisibilityRevalidation(onRevalidate, 1500);

    // Simula ganho de foco da janela
    window.dispatchEvent(new Event("focus"));
    expect(onRevalidate).toHaveBeenCalledTimes(1);

    // Simula evento imediato subsequente dentro do throttle (deve ser ignorado)
    window.dispatchEvent(new Event("focus"));
    expect(onRevalidate).toHaveBeenCalledTimes(1);

    // Avança além do tempo de throttling (1500ms)
    vi.advanceTimersByTime(1600);

    // Simula retorno de visibilidade (ex: cliente volta do WhatsApp para o app)
    (document as any).visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onRevalidate).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it("executa polling heartbeat a cada 5 segundos se houver pedidos ativos", async () => {
    let hasActive = true;
    const onPoll = vi.fn();

    const stopHeartbeat = startOrderPollingHeartbeat({
      getHasActiveOrders: () => hasActive,
      onPoll,
      intervalMs: 5000,
    });

    expect(onPoll).toHaveBeenCalledTimes(0);

    // Avança 5 segundos
    await vi.advanceTimersByTimeAsync(5000);
    expect(onPoll).toHaveBeenCalledTimes(1);

    // Avança mais 5 segundos
    await vi.advanceTimersByTimeAsync(5000);
    expect(onPoll).toHaveBeenCalledTimes(2);

    // Pedidos finalizados -> para de consultar no heartbeat
    hasActive = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(onPoll).toHaveBeenCalledTimes(2);

    stopHeartbeat();
  });

  it("notifica transição de status para delivering incluindo o nome do entregador e som", async () => {
    const showToast = vi.fn();
    const { playDingSound } = await import("@/lib/sound");

    const notified = notifyOrderStatusChange({
      order: {
        id: "order-9999",
        status: "delivering",
        courier_name: "Marcos Silva",
      },
      previousStatus: "ready",
      showToast,
    });

    expect(notified).toBe(true);
    expect(playDingSound).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Saiu para Entrega"),
        message: expect.stringContaining("Marcos Silva"),
        type: "info",
      })
    );
  });

  it("deduplica transições para não disparar notificações e sons repetidos para o mesmo status", () => {
    const showToast = vi.fn();

    const first = notifyOrderStatusChange({
      order: { id: "order-dup-1", status: "completed" },
      previousStatus: "delivering",
      showToast,
    });
    expect(first).toBe(true);

    const second = notifyOrderStatusChange({
      order: { id: "order-dup-1", status: "completed" },
      previousStatus: "completed",
      showToast,
    });
    expect(second).toBe(false);
    expect(showToast).toHaveBeenCalledTimes(1);
  });
});
