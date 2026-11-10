import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import { PATCH as updateOrderStatusHandler } from "@/app/api/orders/route";
import { POST as completeDeliveryHandler } from "@/app/api/delivery/[token]/complete/route";
import { emailService, emailDeduplicationTracker } from "@/lib/emailService";
import * as authLib from "@/lib/auth";
import * as permissionsLib from "@/lib/permissions";
import { checkoutLimiter } from "@/lib/rateLimit";
import { StoreScheduleDomainService } from "@/domain/services/StoreScheduleDomainService";

describe("Idempotência de Checkout, Máquina de Estados (FSM) e Deduplicação", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    emailDeduplicationTracker.clear();
    vi.spyOn(StoreScheduleDomainService, "assertCanAcceptOrders").mockReturnValue({
      canAcceptOrders: true,
      status: "OPEN",
      isOpen: true,
      openingTime: "13:00",
      closingTime: "23:30",
    } as any);
    // Reset rate limiter so tests don't get throttled
    vi.spyOn(checkoutLimiter, "check").mockReturnValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any);
  });

  describe("1. Idempotência no Checkout (/api/checkout)", () => {
    const mockUser = {
      id: "user-checkout-1",
      fullName: "Cliente Idempotente",
      phone: "65999998888",
      email: "cliente@popclub.com.br",
      isRegistered: true,
      role: "client",
    };

    const mockProduct = {
      id: "prod-1",
      name: "Açaí Tradicional 500ml",
      price: 25.0,
      stock: 50,
      isAvailable: true,
      isCombo: false,
      addonsConfig: null,
      category: { id: "cat-1", name: "Açaí" },
      comboItems: [],
    };

    const mockPayload = {
      deliveryType: "retirada",
      items: [{ productId: "prod-1", quantity: 2 }],
      deliveryAddress: {
        street: "Retirada no Balcão",
        number: "S/N",
        neighborhood: "Centro Sul",
        city: "Várzea Grande",
      },
      paymentMethod: { type: "dinheiro" },
    };

    it("retorna o pedido existente de forma idempotente quando enviado header Idempotency-Key repetido", async () => {
      const idempotencyKey = "key-test-seq-123";

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
        id: "store_config",
        isOpen: true,
        businessHours: null,
        deliveryFee: 5.0,
      } as any);
      vi.spyOn(prisma.shift, "findFirst").mockResolvedValue({ id: "shift-1" } as any);
      vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockProduct] as any);
      vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);

      const mockOrder = {
        id: "order-idem-1",
        userId: "user-checkout-1",
        idempotencyKey,
        trackingToken: "token-idem-1",
        status: "pending",
        subtotal: 50.0,
        discountAmount: 0,
        deliveryFee: 0,
        totalAmount: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [{ product: mockProduct, quantity: 2, priceAtTime: 25.0 }],
        user: { fullName: mockUser.fullName, phone: mockUser.phone, email: mockUser.email },
      };

      // Simula que a chave já existe no banco
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(mockOrder as any);

      const req = new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(mockPayload),
      });

      const res = await checkoutHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.idempotent).toBe(true);
      expect(data.order.id).toBe("order-idem-1");
      expect(data.order.totalAmount).toBe(50.0);
    });

    it("rejeita com HTTP 409 Conflict se a mesma chave de idempotência for usada com payload divergente", async () => {
      const idempotencyKey = "key-conflict-mismatch";

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
        id: "store_config",
        isOpen: true,
        businessHours: null,
        deliveryFee: 5.0,
      } as any);
      vi.spyOn(prisma.shift, "findFirst").mockResolvedValue({ id: "shift-1" } as any);
      vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockProduct] as any);
      vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);

      // Pedido prévio registrado com total R$ 100.00
      const existingDifferentOrder = {
        id: "order-previous",
        userId: "different-user", // Outro usuário
        idempotencyKey,
        trackingToken: "token-prev",
        status: "pending",
        totalAmount: 100.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        user: { fullName: "Outro Cliente", phone: "65900000000", email: "outro@popclub.com.br" },
      };

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(existingDifferentOrder as any);

      const req = new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(mockPayload),
      });

      const res = await checkoutHandler(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.code).toBe("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH");
    });

    it("garante proteção de concorrência com chave de idempotência sob colisão P2002", async () => {
      const idempotencyKey = "key-p2002-collision";

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
        id: "store_config",
        isOpen: true,
        businessHours: null,
        deliveryFee: 5.0,
      } as any);
      vi.spyOn(prisma.shift, "findFirst").mockResolvedValue({ id: "shift-1" } as any);
      vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockProduct] as any);
      vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);

      const mockOrder = {
        id: "order-col-1",
        userId: "user-checkout-1",
        idempotencyKey,
        trackingToken: "token-col-1",
        status: "pending",
        subtotal: 50.0,
        discountAmount: 0,
        deliveryFee: 0,
        totalAmount: 50.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [{ product: mockProduct, quantity: 2, priceAtTime: 25.0 }],
        user: { fullName: mockUser.fullName, phone: mockUser.phone, email: mockUser.email },
      };

      // 1ª checagem (fast-path): nulo (simula chegada simultânea antes de gravar)
      // 2ª checagem (no catch P2002): encontra o pedido gravado pelo outro thread
      let lookupCount = 0;
      vi.spyOn(prisma.order, "findUnique").mockImplementation((async () => {
        lookupCount++;
        if (lookupCount === 1) return null;
        return mockOrder;
      }) as any);

      // Simula colisão no $transaction
      vi.spyOn(prisma, "$transaction").mockImplementation((async () => {
        const err: any = new Error("Unique constraint failed on the fields: (`idempotency_key`)");
        err.code = "P2002";
        throw err;
      }) as any);

      const req = new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(mockPayload),
      });

      const res = await checkoutHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.idempotent).toBe(true);
      expect(data.order.id).toBe("order-col-1");
    });
  });

  describe("2. Máquina de Estados Operacional (FSM) em /api/orders (PATCH)", () => {
    const adminUser = {
      id: "admin-1",
      role: "admin",
      fullName: "Gerente Operacional",
    };

    it("retorna 200 idempotente sem reprocessar se o pedido já estiver no status solicitado", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      const orderInDb = {
        id: "order-fsm-1",
        userId: "user-1",
        status: "preparing",
        items: [],
        user: { fullName: "Cliente" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(orderInDb as any);
      const updateManySpy = vi.spyOn(prisma.order, "updateMany");

      const req = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-fsm-1", status: "preparing" }),
      });

      const res = await updateOrderStatusHandler(req);
      expect(res.status).toBe(200);
      expect(updateManySpy).not.toHaveBeenCalled();
    });

    it("impede transição a partir de pedido cancelado (estado terminal absoluto)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      const cancelledOrder = {
        id: "order-fsm-cancelled",
        userId: "user-1",
        status: "cancelled",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(cancelledOrder as any);

      const req = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-fsm-cancelled", status: "accepted" }),
      });

      const res = await updateOrderStatusHandler(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.error).toBe("Pedidos cancelados não podem ter seu status alterado.");
      expect(data.code).toBe("ORDER_ALREADY_CANCELLED");
    });

    it("rejeita transição operacional inválida (ex: pending direto para delivering)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      const pendingOrder = {
        id: "order-fsm-skip",
        userId: "user-1",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(pendingOrder as any);

      const req = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-fsm-skip", status: "delivering" }),
      });

      const res = await updateOrderStatusHandler(req);
      expect(res.status).toBe(422);

      const data = await res.json();
      expect(data.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("permite avanço válido da esteira e recuo de recuperação operacional", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      // 1. Avanço: pending -> accepted
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-ok",
        userId: "user-1",
        status: "pending",
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });

      const reqAdvance = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-ok", status: "accepted" }),
      });

      const resAdvance = await updateOrderStatusHandler(reqAdvance);
      expect(resAdvance.status).toBe(200);

      // 2. Recuperação: completed -> delivering ("Reabrir Entrega")
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-reopen",
        userId: "user-1",
        status: "completed",
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const reqReopen = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-reopen", status: "delivering" }),
      });

      const resReopen = await updateOrderStatusHandler(reqReopen);
      expect(resReopen.status).toBe(200);
    });

    it("proíbe cliente de cancelar pedido que já entrou em preparo", async () => {
      const clientUser = { id: "client-owner", role: "client" };
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(clientUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(false); // Sem permissão de staff

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-kitchen",
        userId: "client-owner",
        status: "preparing", // Já está na cozinha
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "order-kitchen", status: "cancelled" }),
      });

      const res = await updateOrderStatusHandler(req);
      expect(res.status).toBe(403);
    });
  });

  describe("3. Finalização de Entrega (/api/delivery/[token]/complete)", () => {
    it("impede finalização se o pedido estiver cancelado", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-cancelled",
        status: "cancelled",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/delivery/token-cancelled/complete", {
        method: "POST",
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-cancelled" }),
      });

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.code).toBe("ORDER_ALREADY_CANCELLED");
    });

    it("responde 200 de forma idempotente se o pedido já foi finalizado", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-already-done",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/delivery/token-done/complete", {
        method: "POST",
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-done" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("já foi finalizado");
    });
  });

  describe("4. Deduplicação e Idempotência de E-mails (emailService)", () => {
    it("deduplica envios que repetem a mesma chave de idempotência dentro do TTL", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const key = "email-idem-reset-123456";

      // Primeiro envio
      const res1 = await emailService.send({
        to: "cliente@exemplo.com",
        subject: "Seu código de recuperação",
        text: "Código: 123456",
        idempotencyKey: key,
      });

      expect(res1.success).toBe(true);
      expect(res1.cached).toBeFalsy();

      // Segundo envio com a mesma chave (ex: retry de rede)
      const res2 = await emailService.send({
        to: "cliente@exemplo.com",
        subject: "Seu código de recuperação",
        text: "Código: 123456",
        idempotencyKey: key,
      });

      expect(res2.success).toBe(true);
      expect(res2.cached).toBe(true); // Retornou do rastreador de deduplicação sem disparar novo e-mail
      expect(res2.messageId).toBe(res1.messageId);

      // Terceiro envio com chave diferente dispara novo e-mail normalmente
      const res3 = await emailService.send({
        to: "cliente@exemplo.com",
        subject: "Outro assunto",
        text: "Outro conteúdo",
        idempotencyKey: "email-idem-reset-999999",
      });

      expect(res3.success).toBe(true);
      expect(res3.cached).toBeFalsy();
      expect(res3.messageId).not.toBe(res1.messageId);

      consoleSpy.mockRestore();
    });
  });
});
