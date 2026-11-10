import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiSuccess } from "@/lib/apiResponse";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";
import { GET as getOrderEvents } from "@/app/api/orders/events/route";
import * as authLib from "@/lib/auth";

describe("Headers no-store e SSE de Pedidos (Integration)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
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
    await response.body?.cancel();
  });

  it("permite stream global para operador EDITOR com ORDERS_KANBAN e bloqueia CLIENT de eventos alheios", async () => {
    // 1. Editor autorizado recebe evento global de pedido
    vi.spyOn(authLib, "getAuthUser").mockResolvedValueOnce({
      id: "editor-1",
      role: "editor",
      permissions: ["ORDERS_KANBAN"],
    } as any);

    const editorRes = await getOrderEvents(new Request("http://localhost:3000/api/orders/events"));
    const editorReader = editorRes.body!.getReader();
    const decoder = new TextDecoder();

    // Lê handshake inicial
    const firstChunk = await editorReader.read();
    expect(decoder.decode(firstChunk.value)).toContain("event: connected");

    serverOrderEventManager.emit({
      type: "order_created",
      orderId: "ord-editor-visible",
      userId: "other-client",
      status: "pending",
      timestamp: Date.now(),
    });

    const eventChunk = await editorReader.read();
    expect(decoder.decode(eventChunk.value)).toContain("ord-editor-visible");
    await editorReader.cancel();

    // 2. Cliente comum NÃO recebe eventos de pedidos de outro usuário
    vi.spyOn(authLib, "getAuthUser").mockResolvedValueOnce({
      id: "client-1",
      role: "client",
      permissions: [],
    } as any);

    const clientRes = await getOrderEvents(new Request("http://localhost:3000/api/orders/events"));
    const clientReader = clientRes.body!.getReader();
    await clientReader.read(); // connected

    serverOrderEventManager.emit({
      type: "order_created",
      orderId: "ord-secret-other",
      userId: "client-2",
      status: "pending",
      timestamp: Date.now(),
    });

    // Evento do próprio client-1 deve passar em seguida, provando que ord-secret-other foi filtrado
    serverOrderEventManager.emit({
      type: "order_updated",
      orderId: "ord-own-1",
      userId: "client-1",
      status: "accepted",
      timestamp: Date.now(),
    });

    const receivedForClient = decoder.decode((await clientReader.read()).value);
    expect(receivedForClient).not.toContain("ord-secret-other");
    expect(receivedForClient).toContain("ord-own-1");
    await clientReader.cancel();
  });
});
