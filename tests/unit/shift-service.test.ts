import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shiftService } from "@/services/shiftService";

describe("shiftService (Gestão de Turnos e Expediente Operacional)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getShiftData", () => {
    it("retorna dados consolidados do turno atual quando a API responde 200", async () => {
      const mockResponse = {
        isOpen: true,
        currentShiftId: "shift-123",
        estimatedDeliveryTime: "30-50 min",
        currentShift: {
          id: "shift-123",
          code: "T-20261022-01",
          openedAt: "2026-10-22T13:00:00Z",
          closedAt: null,
          isOpen: true,
          estimatedDeliveryTime: "30-50 min",
          totalRevenue: 450.0,
          totalOrders: 12,
          completedOrders: 10,
          cancelledOrders: 0,
          cashTotal: 100,
          pixTotal: 250,
          cardTotal: 100,
          notes: null,
        },
        currentShiftSummary: null,
        shifts: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const data = await shiftService.getShiftData();
      expect(data.isOpen).toBe(true);
      expect(data.currentShiftId).toBe("shift-123");
      expect(data.currentShift?.totalRevenue).toBe(450.0);
    });

    it("lança erro amigável se a requisição /api/shifts falhar", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(shiftService.getShiftData()).rejects.toThrow("Falha ao consultar informações de turnos.");
    });
  });

  describe("openShift", () => {
    it("abre novo turno com tempo estimado e observações opcionais", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, shiftId: "shift-new" }),
      } as Response);

      const result = await shiftService.openShift("25-40 min", "Iniciando turno da noite");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/shifts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "open",
            estimatedDeliveryTime: "25-40 min",
            notes: "Iniciando turno da noite",
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it("lança exceção com a mensagem de erro retornada pela API", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Já existe um turno aberto no momento." }),
      } as Response);

      await expect(shiftService.openShift()).rejects.toThrow("Já existe um turno aberto no momento.");
    });
  });

  describe("closeShift", () => {
    it("encerra o turno com sucesso quando não há pedidos pendentes na esteira", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, closedAt: "2026-10-22T23:30:00Z" }),
      } as Response);

      const result = await shiftService.closeShift("Turno finalizado sem ocorrências");
      expect(result.success).toBe(true);
    });

    it("bloqueia fechamento com metadados de pedidos ativos quando pendingCount > 0", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "Não é possível fechar o turno com pedidos pendentes.",
          code: "PENDING_ORDERS_ACTIVE",
          pendingCount: 2,
          pendingOrders: ["PED-01", "PED-02"],
          breakdown: { prep: 1, route: 1 },
        }),
      } as Response);

      try {
        await shiftService.closeShift();
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("pedidos pendentes");
        expect(err.code).toBe("PENDING_ORDERS_ACTIVE");
        expect(err.pendingCount).toBe(2);
        expect(err.pendingOrders).toEqual(["PED-01", "PED-02"]);
      }
    });
  });
});
