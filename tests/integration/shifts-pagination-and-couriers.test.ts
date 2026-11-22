import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { GET as getShifts } from "@/app/api/shifts/route";
import { PATCH as updateCourierStatus } from "@/app/api/couriers/[id]/status/route";
import { POST as startDelivery } from "@/app/api/delivery/[token]/start/route";
import { POST as completeDelivery } from "@/app/api/delivery/[token]/complete/route";
import { POST as dispatchOrder } from "@/app/api/orders/[id]/dispatch/route";
import {
  markCourierInTransitForOrder,
  releaseCourierIfNoActiveDeliveries,
} from "@/services/courierStatusAutomationService";
import { serverOrderEventManager } from "@/lib/serverOrderEvents";

describe("Integração: Paginação de Turnos e Automação de Entregadores", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(serverOrderEventManager, "emit").mockImplementation(() => {});
  });

  describe("GET /api/shifts (paginação 20 / 30)", () => {
    it("retorna metadados de paginação e aplica skip/take corretamente", async () => {
      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
        id: "default",
        isOpen: false,
        currentShiftId: null,
        estimatedDeliveryTime: "30-50 min",
      } as any);
      vi.spyOn(prisma.order, "findMany").mockResolvedValue([]);

      const findManySpy = vi.spyOn(prisma.shift, "findMany").mockResolvedValue([
        {
          id: "shift-31",
          code: "TURNO-20261001-0001",
          isOpen: false,
          openedAt: new Date("2026-10-01T13:30:00Z"),
          closedAt: new Date("2026-10-01T23:10:00Z"),
          notes: null,
          totalOrders: 5,
          totalRevenue: 210.5,
          completedOrders: 5,
          cancelledOrders: 0,
          cashTotal: 50,
          pixTotal: 100.5,
          cardTotal: 60,
        },
      ] as any);
      vi.spyOn(prisma.shift, "count").mockResolvedValue(65);

      const res = await getShifts(
        new Request("http://localhost:3000/api/shifts?page=2&limit=30")
      );
      expect(res.status).toBe(200);

      expect(findManySpy).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 30,
        take: 30,
      });

      const body = await res.json();
      expect(body.totalShifts).toBe(65);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(30);
      expect(body.totalPages).toBe(3);
      expect(body.shifts).toHaveLength(1);
    });

    it("limita page >= 1 e limit entre 1 e 50", async () => {
      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.order, "findMany").mockResolvedValue([]);
      const findManySpy = vi.spyOn(prisma.shift, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.shift, "count").mockResolvedValue(0);

      const res = await getShifts(
        new Request("http://localhost:3000/api/shifts?page=-4&limit=999")
      );
      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
      const body = await res.json();
      expect(body.page).toBe(1);
      expect(body.limit).toBe(50);
      expect(body.totalPages).toBe(1);
    });
  });

  describe("PATCH /api/couriers/[id]/status", () => {
    it("aceita status 'unavailable' e rejeita status inválido com 400", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: ["logistics_manage"],
      } as any);
      vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({} as any);
      const updateSpy = vi.spyOn(prisma.courier, "update").mockResolvedValue({
        id: "courier-1",
        name: "Carlos Moto",
        status: "unavailable",
      } as any);

      const okRes = await updateCourierStatus(
        new Request("http://localhost:3000/api/couriers/courier-1/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "unavailable" }),
        }),
        { params: Promise.resolve({ id: "courier-1" }) }
      );
      expect(okRes.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "courier-1" },
        data: { status: "unavailable" },
      });

      const badRes = await updateCourierStatus(
        new Request("http://localhost:3000/api/couriers/courier-1/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paused_forever" }),
        }),
        { params: Promise.resolve({ id: "courier-1" }) }
      );
      expect(badRes.status).toBe(400);
    });
  });

  describe("courierStatusAutomationService", () => {
    it("marca entregador como 'in_transit' por ID, telefone mascarado (DDI 55) ou nome", async () => {
      const updateSpy = vi.fn().mockResolvedValue({});
      const mockDb = {
        courier: {
          findUnique: vi.fn().mockResolvedValue({
            id: "c-1",
            name: "João",
            phone: "62999998888",
            status: "available",
            isActive: true,
          }),
          findMany: vi.fn().mockResolvedValue([
            {
              id: "c-2",
              name: "Marcos Silva",
              phone: "(62) 98888-7777",
              status: "available",
              isActive: true,
            },
          ]),
          update: updateSpy,
        },
        order: {
          findMany: vi.fn(),
        },
      };

      const resById = await markCourierInTransitForOrder({ courierId: "c-1" }, mockDb as any);
      expect(resById).toEqual({ updated: true, courierId: "c-1", status: "in_transit" });
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { status: "in_transit" },
      });

      const resByPhone = await markCourierInTransitForOrder(
        { courierPhone: "+55 (62) 98888-7777" },
        mockDb as any
      );
      expect(resByPhone).toEqual({ updated: true, courierId: "c-2", status: "in_transit" });

      const resByName = await markCourierInTransitForOrder(
        { courierName: " marcos silva " },
        mockDb as any
      );
      expect(resByName).toEqual({ updated: true, courierId: "c-2", status: "in_transit" });
    });

    it("retorna para 'available' quando não restam entregas ativas, mantém 'in_transit' se houver outra corrida e preserva 'off_duty'/'unavailable'", async () => {
      const updateSpy = vi.fn().mockResolvedValue({});
      const createDb = (status: string, activeOthers: any[]) => ({
        courier: {
          findUnique: vi.fn().mockResolvedValue({
            id: "c-1",
            name: "Pedro",
            phone: "62991234567",
            status,
            isActive: true,
          }),
          findMany: vi.fn(),
          update: updateSpy,
        },
        order: {
          findMany: vi.fn().mockResolvedValue(activeOthers),
        },
      });

      // Mantém em rota se ainda tem outro pedido em entrega para o mesmo motoboy
      const stillBusy = await releaseCourierIfNoActiveDeliveries(
        { courierId: "c-1" },
        "ord-1",
        createDb("in_transit", [
          { id: "ord-2", courierId: "c-1", courierPhone: null, courierName: "Pedro" },
        ]) as any
      );
      expect(stillBusy).toEqual({ updated: false, courierId: "c-1", status: "in_transit" });
      expect(updateSpy).not.toHaveBeenCalled();

      // Libera para available se não há mais pedidos em rota
      const released = await releaseCourierIfNoActiveDeliveries(
        { courierId: "c-1" },
        "ord-1",
        createDb("in_transit", []) as any
      );
      expect(released).toEqual({ updated: true, courierId: "c-1", status: "available" });
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "c-1" },
        data: { status: "available" },
      });

      // Não sobrescreve Folga nem Indisponível
      updateSpy.mockClear();
      const offDuty = await releaseCourierIfNoActiveDeliveries(
        { courierId: "c-1" },
        "ord-1",
        createDb("off_duty", []) as any
      );
      const unavailable = await releaseCourierIfNoActiveDeliveries(
        { courierId: "c-1" },
        "ord-1",
        createDb("unavailable", []) as any
      );
      expect(offDuty.updated).toBe(false);
      expect(unavailable.updated).toBe(false);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("Rotas de Entrega e Despacho -> Automação 'Em Rota'", () => {
    it("POST /api/delivery/[token]/start coloca entregador em rota e complete libera ao concluir", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "ord-100",
        status: "ready",
        dispatchedAt: null,
        userId: "user-1",
        courierId: "courier-10",
        courierName: "Lucas",
        courierPhone: "62999990000",
      } as any);
      vi.spyOn(prisma.order, "update").mockResolvedValue({ id: "ord-100" } as any);
      vi.spyOn(prisma.courier, "findUnique").mockResolvedValue({
        id: "courier-10",
        name: "Lucas",
        phone: "62999990000",
        status: "available",
        isActive: true,
      } as any);
      const courierUpdateSpy = vi
        .spyOn(prisma.courier, "update")
        .mockResolvedValue({ id: "courier-10", status: "in_transit" } as any);

      const startRes = await startDelivery(
        new Request("http://localhost:3000/api/delivery/tok-1/start", { method: "POST" }),
        { params: Promise.resolve({ token: "tok-1" }) }
      );
      expect(startRes.status).toBe(200);
      expect(courierUpdateSpy).toHaveBeenCalledWith({
        where: { id: "courier-10" },
        data: { status: "in_transit" },
      });

      // Agora simula finalização pelo motoboy
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "ord-100",
        status: "delivering",
        orderPin: null,
        userId: "user-1",
        paymentMethodType: "pix_entrega",
        courierId: "courier-10",
        courierName: "Lucas",
        courierPhone: "62999990000",
      } as any);
      vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 } as any);
      vi.spyOn(prisma.courier, "findUnique").mockResolvedValue({
        id: "courier-10",
        name: "Lucas",
        phone: "62999990000",
        status: "in_transit",
        isActive: true,
      } as any);
      vi.spyOn(prisma.order, "findMany").mockResolvedValue([]);

      const completeRes = await completeDelivery(
        new Request("http://localhost:3000/api/delivery/tok-1/complete", {
          method: "POST",
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ token: "tok-1" }) }
      );
      expect(completeRes.status).toBe(200);
      expect(courierUpdateSpy).toHaveBeenCalledWith({
        where: { id: "courier-10" },
        data: { status: "available" },
      });
    });

    it("POST /api/orders/[id]/dispatch persiste courierId e só marca 'in_transit' em despacho imediato", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: ["ORDERS_KANBAN"],
      } as any);
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "ord-dispatch-1",
        status: "ready",
        trackingToken: "tok-existing",
        orderPin: "1234",
      } as any);
      vi.spyOn(prisma.courier, "findUnique").mockResolvedValue({
        id: "courier-20",
        name: "Rafael",
        phone: "62998887777",
        status: "available",
        isActive: true,
      } as any);
      const orderUpdateSpy = vi.spyOn(prisma.order, "update").mockResolvedValue({
        id: "ord-dispatch-1",
        userId: "u-1",
        status: "ready",
        courierName: "Rafael",
        courierPhone: "62998887777",
        trackingToken: "tok-existing",
        isGpsTrackingActive: false,
      } as any);
      const courierUpdateSpy = vi
        .spyOn(prisma.courier, "update")
        .mockResolvedValue({ id: "courier-20", status: "in_transit" } as any);

      // Modo assign -> salva courierId mas não coloca em rota antes do aceite
      const assignRes = await dispatchOrder(
        new Request("http://localhost:3000/api/orders/ord-dispatch-1/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "assign",
            enableGps: true,
            courierId: "courier-20",
            courierName: "Rafael",
            courierPhone: "62998887777",
          }),
        }),
        { params: Promise.resolve({ id: "ord-dispatch-1" }) }
      );
      expect(assignRes.status).toBe(200);
      expect(orderUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courierId: "courier-20",
            status: "ready",
          }),
        })
      );
      expect(courierUpdateSpy).not.toHaveBeenCalled();

      // Modo dispatch -> muda pedido para delivering e já marca entregador como in_transit
      orderUpdateSpy.mockResolvedValue({
        id: "ord-dispatch-1",
        userId: "u-1",
        status: "delivering",
        courierName: "Rafael",
        courierPhone: "62998887777",
        trackingToken: "tok-existing",
        isGpsTrackingActive: true,
      } as any);

      const dispatchRes = await dispatchOrder(
        new Request("http://localhost:3000/api/orders/ord-dispatch-1/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "dispatch",
            enableGps: true,
            courierId: "courier-20",
            courierName: "Rafael",
            courierPhone: "62998887777",
          }),
        }),
        { params: Promise.resolve({ id: "ord-dispatch-1" }) }
      );
      expect(dispatchRes.status).toBe(200);
      expect(courierUpdateSpy).toHaveBeenCalledWith({
        where: { id: "courier-20" },
        data: { status: "in_transit" },
      });
    });
  });
});
