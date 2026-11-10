import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH as updateOrderStatusHandler } from "@/app/api/orders/route";
import { POST as completeDeliveryHandler } from "@/app/api/delivery/[token]/complete/route";
import { POST as startDeliveryHandler } from "@/app/api/delivery/[token]/start/route";
import { POST as shiftsHandler } from "@/app/api/shifts/route";
import * as authLib from "@/lib/auth";
import * as permissionsLib from "@/lib/permissions";

describe("Cancelamento com Estorno, PIN de Entrega e Fechamento de Turno", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Estorno no Cancelamento de Pedido (/api/orders PATCH)", () => {
    const adminUser = {
      id: "admin-1",
      fullName: "Admin Responsável",
      role: "admin",
      permissions: ["ORDERS_KANBAN"],
    };

    it("estorna atomicamente o estoque do produto, escassez promocional e uso do cupom ao cancelar", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      const mockOrder = {
        id: "order-cancel-100",
        userId: "user-client-1",
        status: "pending",
        couponId: "coupon-promo-10",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "item-1",
            productId: "prod-acai",
            quantity: 2,
            unitPrice: 25.0,
            product: {
              id: "prod-acai",
              name: "Açaí Especial",
              stock: 10,
              promotionActive: true,
              scarcityUnits: 3,
              scarcitySold: 2,
            },
          },
        ],
      };

      vi.spyOn(prisma.order, "findUnique")
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce({
          ...mockOrder,
          status: "cancelled",
          cancellationReason: "Cliente solicitou cancelamento",
          items: [],
          user: null,
        } as any);

      const txProductUpdate = vi.fn().mockResolvedValue({});
      const txCouponUpdate = vi.fn().mockResolvedValue({});
      const txCouponRedemptionDelete = vi.fn().mockResolvedValue({});

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
        return cb({
          order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          product: { update: txProductUpdate },
          coupon: { updateMany: txCouponUpdate },
          couponRedemption: { deleteMany: txCouponRedemptionDelete },
          $executeRaw: vi.fn().mockResolvedValue(1),
        });
      });

      const req = new Request("http://localhost:3000/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "order-cancel-100",
          status: "cancelled",
          cancellationReason: "Cliente solicitou cancelamento",
        }),
      });

      const res = await updateOrderStatusHandler(req);
      expect(res.status).toBe(200);

      // Validação do estorno de estoque
      expect(txProductUpdate).toHaveBeenCalledWith({
        where: { id: "prod-acai" },
        data: {
          stock: { increment: 2 },
        },
      });

      // Validação do estorno de uso de cupom e remoção de redenção
      expect(txCouponUpdate).toHaveBeenCalledWith({
        where: { id: "coupon-promo-10", uses: { gt: 0 } },
        data: { uses: { decrement: 1 } },
      });

      expect(txCouponRedemptionDelete).toHaveBeenCalledWith({
        where: {
          couponId: "coupon-promo-10",
          OR: [
            { orderId: "order-cancel-100" },
            { userId: "user-client-1" },
          ],
        },
      });
    });
  });

  describe("2. Validação Real do PIN de Confirmação de Entrega (/api/delivery/[token]/complete)", () => {
    it("exige PIN e retorna 400 quando o pedido possui PIN configurado e nenhum foi informado", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-pin-1",
        status: "delivering",
        orderPin: "8492",
        deliveryToken: "token-valid-1",
      } as any);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/delivery/token-valid-1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-valid-1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_DELIVERY_PIN");
    });

    it("rejeita com 400 quando o PIN digitado estiver incorreto", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-pin-1",
        status: "delivering",
        orderPin: "8492",
        deliveryToken: "token-valid-1",
      } as any);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/delivery/token-valid-1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1234" }),
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-valid-1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_DELIVERY_PIN");
    });

    it("conclui com sucesso quando o PIN correto é fornecido", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-pin-1",
        status: "delivering",
        orderPin: "8492",
        deliveryToken: "token-valid-1",
        customerName: "Maria da Silva",
        contactPhone: "65999990000",
      } as any);

      vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });

      const req = new Request("http://localhost:3000/api/delivery/token-valid-1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "8492" }),
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-valid-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("sucesso");
    });

    it("permite bypass para operadores staff autorizados quando informado bypassPin", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-pin-1",
        status: "delivering",
        orderPin: "8492",
        deliveryToken: "token-valid-1",
      } as any);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "staff-1",
        role: "admin",
        permissions: ["ORDERS_KANBAN"],
      } as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });

      const req = new Request("http://localhost:3000/api/delivery/token-valid-1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bypassPin: true }),
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-valid-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("inicia rota de entrega e transiciona pedido de ready para delivering (/api/delivery/[token]/start)", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-ready-1",
        status: "ready",
        trackingToken: "token-start-1",
        userId: "user-1",
        courierName: "Carlos Motoboy",
      } as any);

      vi.spyOn(prisma.order, "update").mockResolvedValue({
        id: "order-ready-1",
        status: "delivering",
      } as any);

      const req = new Request("http://localhost:3000/api/delivery/token-start-1/start", {
        method: "POST",
      });

      const res = await startDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-start-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("delivering");
    });

    it("mantém em delivering aguardando conferência quando requiresReconciliation=true para dinheiro", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-cash-1",
        status: "delivering",
        orderPin: "9988",
        trackingToken: "token-cash-1",
        paymentMethodType: "dinheiro",
        userId: "user-cash-1",
      } as any);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(false);
      vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });

      const req = new Request("http://localhost:3000/api/delivery/token-cash-1/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "9988", requiresReconciliation: true }),
      });

      const res = await completeDeliveryHandler(req, {
        params: Promise.resolve({ token: "token-cash-1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe("delivering");
      expect(data.requiresReconciliation).toBe(true);
    });
  });

  describe("3. Fechamento de Caixa/Turno com Trava e Contingência (/api/shifts POST action=close)", () => {
    const cashierUser = {
      id: "operator-1",
      fullName: "Operador de Caixa",
      role: "cashier",
      permissions: ["ORDERS_KANBAN"],
    };

    it("bloqueia fechamento com 400 quando houver pedidos ativos sem forceClose", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(cashierUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      // Simula 2 pedidos ativos
      vi.spyOn(prisma.order, "findMany").mockResolvedValue([
        { id: "ord-1", status: "preparing", totalAmount: 45, createdAt: new Date() },
        { id: "ord-2", status: "delivering", totalAmount: 30, createdAt: new Date() },
      ] as any);

      const req = new Request("http://localhost:3000/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
        }),
      });

      const res = await shiftsHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("PENDING_ORDERS_ACTIVE");
      expect(data.pendingCount).toBe(2);
      expect(data.canForceClose).toBe(true);
    });

    it("permite fechamento forçado com justificativa quando forceClose=true", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(cashierUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      vi.spyOn(prisma.order, "findMany")
        .mockResolvedValueOnce([
          { id: "ord-1", status: "delivering", totalAmount: 45, createdAt: new Date() },
        ] as any)
        .mockResolvedValueOnce([
          { id: "ord-1", status: "delivering", totalAmount: 45, createdAt: new Date() },
        ] as any);

      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
        id: "store_config",
        currentShiftId: "shift-open-1",
        isOpen: true,
      } as any);

      vi.spyOn(prisma.shift, "update").mockResolvedValue({
        id: "shift-open-1",
        code: "TURNO-2026-001",
        openedAt: new Date(),
      } as any);

      vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
      vi.spyOn(prisma.storeSettings, "update").mockResolvedValue({ id: "store_config", isOpen: false } as any);

      const req = new Request("http://localhost:3000/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          forceClose: true,
          forceReason: "Queda de energia no bairro e pedidos finalizados off-line.",
        }),
      });

      const res = await shiftsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("Turno encerrado");
    });

    it("rejeita forceClose com 400 se a justificativa tiver menos de 5 caracteres", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(cashierUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);

      vi.spyOn(prisma.order, "findMany").mockResolvedValue([
        { id: "ord-1", status: "delivering", totalAmount: 45, createdAt: new Date() },
      ] as any);

      const req = new Request("http://localhost:3000/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          forceClose: true,
          forceReason: "erro", // Menos de 5 caracteres
        }),
      });

      const res = await shiftsHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("FORCE_REASON_REQUIRED");
    });
  });
});
