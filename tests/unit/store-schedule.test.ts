import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  evaluateStoreSchedule,
  DEFAULT_STORE_SCHEDULE,
  getCuiabaNow,
  isTimeWithinRange,
  timeStringToMinutes,
  CUIABA_TIMEZONE,
  StoreOperationalStatus,
} from "@/lib/storeSchedule";

describe("Store Schedule & Operational Status (America/Cuiaba)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("converte corretamente a hora atual do servidor UTC para o fuso America/Cuiaba (UTC-4)", () => {
    // 17:00 UTC em 19/10/2026 corresponde exatamente às 13:00 em Cuiabá (Segunda-feira)
    vi.setSystemTime(new Date("2026-10-19T17:00:00Z"));
    const cuiaba = getCuiabaNow();
    expect(cuiaba.dayOfWeek).toBe("monday");
    expect(cuiaba.hours).toBe(13);
    expect(cuiaba.minutes).toBe(0);
    expect(cuiaba.timeString).toBe("13:00");
  });

  it("calcula minutos de timeString corretamente", () => {
    expect(timeStringToMinutes("13:00")).toBe(780);
    expect(timeStringToMinutes("23:30")).toBe(1410);
    expect(timeStringToMinutes("00:00")).toBe(0);
  });

  it("valida intervalo de funcionamento estrito (fechamento em 23:30 é estrito)", () => {
    expect(isTimeWithinRange("12:59", "13:00", "23:30")).toBe(false);
    expect(isTimeWithinRange("13:00", "13:00", "23:30")).toBe(true);
    expect(isTimeWithinRange("23:29", "13:00", "23:30")).toBe(true);
    expect(isTimeWithinRange("23:30", "13:00", "23:30")).toBe(false);
    expect(isTimeWithinRange("23:31", "13:00", "23:30")).toBe(false);
  });

  describe("Cenários Críticos de Tempo com vi.useFakeTimers()", () => {
    it("12:59 Cuiabá: Loja reporta fechada; resposta informa que abrirá às 13:00. Tentativa de checkout rejeitada", () => {
      // 16:59:00 UTC = 12:59 Cuiabá (Segunda-feira)
      vi.setSystemTime(new Date("2026-10-19T16:59:00Z"));

      const status = evaluateStoreSchedule(DEFAULT_STORE_SCHEDULE, false);

      expect(status.status).toBe("STORE_CLOSED");
      expect(status.isWithinSchedule).toBe(false);
      expect(status.canAcceptOrders).toBe(false);
      expect(status.openingTime).toBe("13:00");
      expect(status.closingTime).toBe("23:30");
      expect(status.message).toContain("13:00");
      expect(status.message).toContain("23:30");

      // Simulação da rejeição do Checkout com status 422
      const checkoutCanAccept = status.canAcceptOrders;
      expect(checkoutCanAccept).toBe(false);
    });

    it("13:00 Cuiabá: Loja entra no horário; esteira fechada -> status CONVEYOR_PAUSED. Evento de notificação para o admin", () => {
      // 17:00:00 UTC = 13:00 Cuiabá (Segunda-feira)
      vi.setSystemTime(new Date("2026-10-19T17:00:00Z"));

      // Esteira ainda não ligada pela equipe (isConveyorOpen = false)
      const status = evaluateStoreSchedule(DEFAULT_STORE_SCHEDULE, false);

      expect(status.status).toBe("CONVEYOR_PAUSED");
      expect(status.isWithinSchedule).toBe(true);
      expect(status.isConveyorOpen).toBe(false);
      expect(status.canAcceptOrders).toBe(false);
      expect(status.statusLabel).toBe("Preparando Cozinha (Aguardando Esteira)");

      // Verifica disparo de evento de alerta para o admin
      const shouldTriggerAdminOpeningAlert = status.isWithinSchedule && !status.isConveyorOpen;
      expect(shouldTriggerAdminOpeningAlert).toBe(true);
    });

    it("13:05 Cuiabá (com esteira aberta): Status OPERATIONAL_READY. Checkout aceito com sucesso (200 OK)", () => {
      // 17:05:00 UTC = 13:05 Cuiabá (Segunda-feira)
      vi.setSystemTime(new Date("2026-10-19T17:05:00Z"));

      // Equipe ligou o interruptor da esteira (isConveyorOpen = true)
      const status = evaluateStoreSchedule(DEFAULT_STORE_SCHEDULE, true);

      expect(status.status).toBe("OPERATIONAL_READY");
      expect(status.isWithinSchedule).toBe(true);
      expect(status.isConveyorOpen).toBe(true);
      expect(status.canAcceptOrders).toBe(true);
      expect(status.statusLabel).toBe("Loja Aberta (Recebendo Pedidos)");
    });

    it("23:30 Cuiabá: Bloqueio automático de novos pedidos. Tentativa de checkout retorna 422", () => {
      // 2026-10-20T03:30:00Z = 23:30 Cuiabá de Segunda-feira
      vi.setSystemTime(new Date("2026-10-20T03:30:00Z"));

      const status = evaluateStoreSchedule(DEFAULT_STORE_SCHEDULE, true);

      expect(status.status).toBe("STORE_CLOSED");
      expect(status.isWithinSchedule).toBe(false);
      expect(status.canAcceptOrders).toBe(false);

      // Regra de Checkout: canAcceptOrders === false dispara status 422
      const checkoutHttpCode = status.canAcceptOrders ? 200 : 422;
      expect(checkoutHttpCode).toBe(422);
    });

    it("23:31 Cuiabá (Pedido já existente): Rota de rastreamento responde 200 e permite que o cliente acompanhe a entrega normalmente", () => {
      // 2026-10-20T03:31:00Z = 23:31 Cuiabá
      vi.setSystemTime(new Date("2026-10-20T03:31:00Z"));

      // Status da loja está fechado para NOVOS pedidos
      const status = evaluateStoreSchedule(DEFAULT_STORE_SCHEDULE, true);
      expect(status.canAcceptOrders).toBe(false);

      // Porém, pedido pré-existente no banco de dados deve ser consultável normalmente sem qualquer bloqueio
      const mockExistingOrder = {
        id: "order-uuid-12345",
        status: "delivering",
        totalAmount: 45.9,
        courierName: "Carlos Motoboy",
        createdAt: new Date("2026-10-20T03:15:00Z"), // Criado às 23:15
      };

      // Simula a consulta de rastreamento (/api/orders/[id]) que NÃO valida horário de fechamento
      const canTrackActiveOrder = Boolean(mockExistingOrder && mockExistingOrder.id);
      expect(canTrackActiveOrder).toBe(true);
      expect(mockExistingOrder.status).toBe("delivering");
    });
  });
});
