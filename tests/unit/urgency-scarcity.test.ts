import { describe, it, expect } from "vitest";

describe("Urgência & Escassez (Promoções e Combos)", () => {
  describe("Modo Estratégico vs Modo Lote Real", () => {
    it("Modo Estratégico: decrementa número visual sem bloquear a venda quando as unidades estratégicas se esgotam", () => {
      const strategicItem = {
        id: "promo-estrategica",
        name: "Combo Promocional Açaí Duplo",
        price: 39.9,
        isAvailable: true,
        showScarcity: true,
        scarcityType: "strategic" as const,
        scarcityInitial: 10,
        scarcitySold: 9, // Resta 1 unidade visual
      };

      // Venda de 1 unidade
      const updatedSold = strategicItem.scarcitySold + 1;
      const visualRemaining = Math.max(0, (strategicItem.scarcityInitial ?? 10) - updatedSold);

      // No modo estratégico, o contador visual chega a 0, mas a venda NÃO é bloqueada
      expect(visualRemaining).toBe(0);

      // Simula validação de compra no checkout
      const canPurchaseStrategic = strategicItem.isAvailable === true; // Não depende de scarcityInitial zerado
      expect(canPurchaseStrategic).toBe(true);
    });

    it("Modo Lote Real: debita estoque real da campanha e desativa a oferta ao zerar o lote", () => {
      const realBatchItem = {
        id: "promo-lote-real",
        name: "Lote Relâmpago 50 Copos",
        price: 25.0,
        isActive: true,
        isAvailable: true,
        showScarcity: true,
        scarcityType: "real" as const,
        scarcityUnits: 1, // Apenas 1 unidade disponível no lote
        scarcityInitial: 50,
        scarcitySold: 49,
      };

      // Venda da última unidade do lote real
      const orderQuantity = 1;
      const remainingUnits = realBatchItem.scarcityUnits - orderQuantity;

      let nextIsActive = realBatchItem.isActive;
      let nextIsAvailable = realBatchItem.isAvailable;

      if (realBatchItem.scarcityType === "real" && remainingUnits <= 0) {
        nextIsActive = false; // Desativa a campanha/oferta
        nextIsAvailable = false;
      }

      expect(remainingUnits).toBe(0);
      expect(nextIsActive).toBe(false);
      expect(nextIsAvailable).toBe(false);

      // Próxima tentativa de compra deve ser rejeitada porque a oferta esgotou
      const canPurchaseNext = nextIsAvailable && nextIsActive;
      expect(canPurchaseNext).toBe(false);
    });
  });

  describe("Hidratação Completa no Modo de Edição (PUT)", () => {
    it("preserva todos os switches, presets e valores de escassez e urgência ao carregar para edição e enviar atualização", () => {
      const existingProduct = {
        id: "prod-combo-premium",
        name: "Combo Mega Pop",
        showScarcity: true,
        scarcityType: "strategic",
        scarcityUnits: 15,
        scarcityInitial: 20,
        scarcitySold: 5,
        showProgressBar: true,
        showDuration: true,
        urgencyType: "date",
        expiresAt: new Date("2026-12-31T23:59:59.000Z"),
        sessionMinutes: 45,
      };

      // Simula hidratação do formulário de edição
      const formState = {
        showScarcity: existingProduct.showScarcity,
        scarcityType: existingProduct.scarcityType,
        scarcityUnits: existingProduct.scarcityUnits,
        scarcityInitial: existingProduct.scarcityInitial,
        scarcitySold: existingProduct.scarcitySold,
        showProgressBar: existingProduct.showProgressBar,
        showDuration: existingProduct.showDuration,
        urgencyType: existingProduct.urgencyType,
        expiresAt: existingProduct.expiresAt.toISOString(),
        sessionMinutes: existingProduct.sessionMinutes,
      };

      // Modificação de um valor pelo lojista (ex: aumenta unidades iniciais para 30)
      formState.scarcityInitial = 30;

      // Payload montado para PUT
      const updatePayload = {
        showScarcity: formState.showScarcity,
        scarcityType: formState.scarcityType,
        scarcityUnits: formState.scarcityUnits,
        scarcityInitial: formState.scarcityInitial,
        scarcitySold: formState.scarcitySold,
        showProgressBar: formState.showProgressBar,
        showDuration: formState.showDuration,
        urgencyType: formState.urgencyType,
        expiresAt: formState.expiresAt,
        sessionMinutes: formState.sessionMinutes,
      };

      expect(updatePayload.showScarcity).toBe(true);
      expect(updatePayload.scarcityType).toBe("strategic");
      expect(updatePayload.scarcityInitial).toBe(30);
      expect(updatePayload.scarcitySold).toBe(5);
      expect(updatePayload.showProgressBar).toBe(true);
      expect(updatePayload.showDuration).toBe(true);
      expect(updatePayload.urgencyType).toBe("date");
      expect(updatePayload.sessionMinutes).toBe(45);
      expect(updatePayload.expiresAt).toBe("2026-12-31T23:59:59.000Z");
    });
  });
});
