import { describe, it, expect, vi } from "vitest";
import { apiSuccess } from "@/lib/apiResponse";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";
import { GET as getOrderEvents } from "@/app/api/orders/events/route";

describe("Headers no-store e SSE de Pedidos (Integration)", () => {
  it("garante que apiSuccess injeta headers estritos de no-store contra respostas 304 em cache", () => {
    const res = apiSuccess({ test: true });
    expect(res.status).toBe(200);

    const cacheControl = res.headers.get("Cache-Control");
    const pragma = res.headers.get("Pragma");
    const expires = res.headers.get("Expires");

    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-cache");
    expect(cacheControl).toContain("must-revalidate");
    expect(pragma).toBe("no-cache");
    expect(expires).toBe("0");
  });

  it("permite emitir e assinar eventos de pedidos no serverOrderEventManager", () => {
    const listener = vi.fn();
    const unsubscribe = serverOrderEventManager.subscribe(listener);

    serverOrderEventManager.emit({
      type: "order_updated",
      orderId: "ord-test-1",
      userId: "user-1",
      status: "delivering",
      timestamp: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "order_updated",
        orderId: "ord-test-1",
        status: "delivering",
      })
    );

    unsubscribe();
  });

  it("rota /api/orders/events responde com text/event-stream e headers de desativação de cache", async () => {
    const req = new Request("http://localhost:3000/api/orders/events?orderId=ord-test-1");
    const response = await getOrderEvents(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("Cache-Control")).toContain("no-cache");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    expect(response.body).toBeDefined();
  });
});
