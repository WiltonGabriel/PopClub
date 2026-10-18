import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StoreScheduleDomainService } from "@/domain/services/StoreScheduleDomainService";
import { StoreClosedException, ConveyorPausedException } from "@/domain/errors";
import { DEFAULT_STORE_SCHEDULE } from "@/lib/storeSchedule";

describe("StoreScheduleDomainService (Asserções de Horário e Fuso America/Cuiaba)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("12:59 Cuiabá: Lança StoreClosedException (HTTP 422) informando que a loja abrirá às 13:00", () => {
    // 16:59:00 UTC = 12:59 em Cuiabá (Segunda-feira)
    vi.setSystemTime(new Date("2026-10-19T16:59:00Z"));

    try {
      StoreScheduleDomainService.assertCanAcceptOrders(DEFAULT_STORE_SCHEDULE, false);
      expect.fail("Deveria ter lançado StoreClosedException");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(StoreClosedException);
      const ex = err as StoreClosedException;
      expect(ex.statusCode).toBe(422);
      expect(ex.code).toBe("STORE_CLOSED");
      expect(ex.openingTime).toBe("13:00");
      expect(ex.closingTime).toBe("23:30");
      expect(ex.message).toContain("13:00");
      expect(ex.message).toContain("23:30");
    }
  });

  it("13:00 Cuiabá (com esteira fechada): Lança ConveyorPausedException (HTTP 422)", () => {
    // 17:00:00 UTC = 13:00 em Cuiabá (Segunda-feira)
    vi.setSystemTime(new Date("2026-10-19T17:00:00Z"));

    try {
      StoreScheduleDomainService.assertCanAcceptOrders(DEFAULT_STORE_SCHEDULE, false);
      expect.fail("Deveria ter lançado ConveyorPausedException");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConveyorPausedException);
      const ex = err as ConveyorPausedException;
      expect(ex.statusCode).toBe(422);
      expect(ex.code).toBe("CONVEYOR_PAUSED");
      expect(ex.message).toContain("Finalizando os preparativos da cozinha");
    }
  });

  it("13:05 Cuiabá (com esteira aberta): Aprova pedido e retorna avaliação operacional válida", () => {
    // 17:05:00 UTC = 13:05 em Cuiabá (Segunda-feira)
    vi.setSystemTime(new Date("2026-10-19T17:05:00Z"));

    const evaluation = StoreScheduleDomainService.assertCanAcceptOrders(DEFAULT_STORE_SCHEDULE, true);
    expect(evaluation.canAcceptOrders).toBe(true);
    expect(evaluation.status).toBe("OPERATIONAL_READY");
    expect(evaluation.isConveyorOpen).toBe(true);
    expect(evaluation.isWithinSchedule).toBe(true);
  });

  it("23:30 Cuiabá (fechamento exato): Lança StoreClosedException (HTTP 422)", () => {
    // 2026-10-20T03:30:00Z = 23:30 em Cuiabá (Segunda-feira)
    vi.setSystemTime(new Date("2026-10-20T03:30:00Z"));

    try {
      StoreScheduleDomainService.assertCanAcceptOrders(DEFAULT_STORE_SCHEDULE, true);
      expect.fail("Deveria ter lançado StoreClosedException");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(StoreClosedException);
      const ex = err as StoreClosedException;
      expect(ex.statusCode).toBe(422);
      expect(ex.code).toBe("STORE_CLOSED");
    }
  });
});
