import { describe, it, expect } from "vitest";
import { PromotionDomainService } from "@/domain/services/PromotionDomainService";
import { calculateProductPrice } from "@/lib/pricing";

describe("PromotionDomainService", () => {
  describe("calculatePromotionPricing", () => {
    it("calcula desconto percentual corretamente com arredondamento para 2 casas", () => {
      const result = PromotionDomainService.calculatePromotionPricing(39.99, "percentage", 25);

      expect(result.originalPrice).toBe(39.99);
      expect(result.finalPrice).toBe(29.99);
      expect(result.discountAmount).toBe(10);
      expect(result.discountPercent).toBe(25);
      expect(result.isPromotional).toBe(true);
    });

    it("aplica a regra canônica de preço fixo promocional (novo preço menor que o preço base)", () => {
      const result = PromotionDomainService.calculatePromotionPricing(50.0, "fixed", 35.5);

      expect(result.originalPrice).toBe(50.0);
      expect(result.finalPrice).toBe(35.5);
      expect(result.discountAmount).toBe(14.5);
      expect(result.discountPercent).toBe(29);
      expect(result.isPromotional).toBe(true);
    });

    it("não reduz o preço quando valor fixo for maior ou igual ao preço base", () => {
      const result = PromotionDomainService.calculatePromotionPricing(29.9, "fixed", 29.9);

      expect(result.finalPrice).toBe(29.9);
      expect(result.discountAmount).toBe(0);
      expect(result.discountPercent).toBe(0);
      expect(result.isPromotional).toBe(false);
    });

    it("integra corretamente com calculateProductPrice em src/lib/pricing.ts", () => {
      const now = new Date("2026-11-13T12:00:00Z");
      const pricing = calculateProductPrice(
        {
          price: 29.9,
          promotions: [
            {
              isActive: true,
              discountType: "fixed",
              discountValue: 24.9,
              startsAt: "2026-11-01T00:00:00Z",
              expiresAt: "2026-11-30T23:59:59Z",
            },
          ],
        },
        now
      );

      expect(pricing.isPromotional).toBe(true);
      expect(pricing.currentPrice).toBe(24.9);
      expect(pricing.originalPrice).toBe(29.9);
      expect(pricing.discountPercent).toBe(17);
    });
  });

  describe("getPromotionVisibilityStatus e isPromotionPubliclyVisible", () => {
    const now = new Date("2026-11-13T15:00:00Z");

    it("considera ativa e visível uma promoção contínua publicada (isActive=true, expiresAt=null)", () => {
      const status = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          startsAt: "2026-11-10T00:00:00Z",
          expiresAt: null,
          product: { isAvailable: true },
        },
        now
      );

      expect(status.status).toBe("active");
      expect(status.isVisiblePublicly).toBe(true);
    });

    it("marca como paused quando isActive=false", () => {
      const status = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: false,
          expiresAt: "2026-11-20T00:00:00Z",
        },
        now
      );

      expect(status.status).toBe("paused");
      expect(status.isVisiblePublicly).toBe(false);
    });

    it("marca como expired quando expiresAt está no passado", () => {
      const status = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          expiresAt: "2026-11-13T14:59:59Z",
        },
        now
      );

      expect(status.status).toBe("expired");
      expect(status.isVisiblePublicly).toBe(false);
    });

    it("marca como scheduled quando startsAt é futuro", () => {
      const status = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          startsAt: "2026-11-14T00:00:00Z",
        },
        now
      );

      expect(status.status).toBe("scheduled");
      expect(status.isVisiblePublicly).toBe(false);
    });

    it("marca como sold_out quando escassez real atinge zero unidades", () => {
      const status = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          scarcityType: "real",
          scarcityUnits: 0,
        },
        now
      );

      expect(status.status).toBe("sold_out");
      expect(status.isVisiblePublicly).toBe(false);
    });

    it("marca como product_unavailable quando produto vinculado está pausado", () => {
      const status = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          product: { isAvailable: false },
        },
        now
      );

      expect(status.status).toBe("product_unavailable");
      expect(status.isVisiblePublicly).toBe(false);
    });
  });

  describe("normalizePromotionExpiration e buildDurationDisplay", () => {
    const now = new Date("2026-11-13T15:00:00.000Z");

    it("retorna null quando showDuration está desativado (oferta contínua)", () => {
      const normalized = PromotionDomainService.normalizePromotionExpiration(
        {
          showDuration: false,
          urgencyType: "date",
          expiresAt: "2026-12-01T12:00:00Z",
        },
        now
      );

      expect(normalized).toBeNull();
    });

    it("calcula fim do dia quando urgencyType='day'", () => {
      const normalized = PromotionDomainService.normalizePromotionExpiration(
        {
          showDuration: true,
          urgencyType: "day",
        },
        now
      );

      expect(normalized).not.toBeNull();
      expect(normalized?.getHours()).toBe(23);
      expect(normalized?.getMinutes()).toBe(59);
    });

    it("soma minutos quando urgencyType='session'", () => {
      const normalized = PromotionDomainService.normalizePromotionExpiration(
        {
          showDuration: true,
          urgencyType: "session",
          sessionMinutes: 45,
        },
        now
      );

      expect(normalized?.getTime()).toBe(now.getTime() + 45 * 60 * 1000);
    });

    it("constrói tags legíveis em buildDurationDisplay", () => {
      expect(
        PromotionDomainService.buildDurationDisplay({
          showDuration: true,
          showScarcity: true,
          urgencyType: "session",
        })
      ).toEqual(["Cronômetro Regressivo", "Contador de Estoque Limitado"]);

      expect(
        PromotionDomainService.buildDurationDisplay({
          showDuration: true,
          showScarcity: false,
          urgencyType: "date",
        })
      ).toEqual(["Data e Hora Limite Claras"]);
    });
  });
});
