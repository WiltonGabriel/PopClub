import { describe, it, expect } from "vitest";
import { ProductDependencyDomainService } from "@/domain/services/ProductDependencyDomainService";
import { PromotionDomainService } from "@/domain/services/PromotionDomainService";

describe("ProductDependencyDomainService & PromotionDomainService (Integridade de Dependências)", () => {
  describe("evaluateComboAvailability", () => {
    it("retorna effectiveIsAvailable=true e calcula limite máximo de combos pelo gargalo de estoque dos itens filhos", () => {
      const result = ProductDependencyDomainService.evaluateComboAvailability({
        isCombo: true,
        isAvailable: true,
        stock: null,
        comboItems: [
          {
            productId: "p1",
            quantity: 2,
            product: { id: "p1", name: "Copo 300ml", isAvailable: true, stock: 7, deletedAt: null },
          },
          {
            productId: "p2",
            quantity: 1,
            product: { id: "p2", name: "Água Mineral", isAvailable: true, stock: 5, deletedAt: null },
          },
        ],
      });

      expect(result.effectiveIsAvailable).toBe(true);
      expect(result.hasMissingItems).toBe(false);
      expect(result.unavailableComponents).toEqual([]);
      // floor(7 / 2) = 3 vs floor(5 / 1) = 5 -> gargalo = 3
      expect(result.maxBuildableUnits).toBe(3);
    });

    it("marca combo como indisponível na vitrine quando qualquer componente estiver pausado, sem estoque ou removido", () => {
      const result = ProductDependencyDomainService.evaluateComboAvailability({
        isCombo: true,
        isAvailable: true,
        stock: null,
        comboItems: [
          {
            productId: "p-paused",
            quantity: 1,
            product: { id: "p-paused", name: "Açaí 500ml", isAvailable: false, stock: null, deletedAt: null },
          },
          {
            productId: "p-stock",
            quantity: 2,
            product: { id: "p-stock", name: "Milk Shake", isAvailable: true, stock: 1, deletedAt: null },
          },
          {
            productId: "p-deleted",
            quantity: 1,
            product: {
              id: "p-deleted",
              name: "Casquinha Antiga",
              isAvailable: false,
              stock: 0,
              deletedAt: new Date("2026-10-01T00:00:00Z"),
            },
          },
        ],
      });

      expect(result.effectiveIsAvailable).toBe(false);
      expect(result.maxBuildableUnits).toBe(0);
      expect(result.unavailableComponents).toEqual([
        {
          productId: "p-paused",
          name: "Açaí 500ml",
          quantity: 1,
          reason: "paused",
          availableStock: null,
        },
        {
          productId: "p-stock",
          name: "Milk Shake",
          quantity: 2,
          reason: "out_of_stock",
          availableStock: 1,
        },
        {
          productId: "p-deleted",
          name: "Casquinha Antiga",
          quantity: 1,
          reason: "deleted",
          availableStock: 0,
        },
      ]);
    });

    it("bloqueia combo vazio (sem itens vinculados)", () => {
      const result = ProductDependencyDomainService.evaluateComboAvailability({
        isCombo: true,
        isAvailable: true,
        stock: null,
        comboItems: [],
      });

      expect(result.effectiveIsAvailable).toBe(false);
      expect(result.hasMissingItems).toBe(true);
      expect(result.maxBuildableUnits).toBeNull();
    });
  });

  describe("evaluatePriceEditImpacts", () => {
    it("identifica promoções fixas invalidadas (fixedPrice >= newPrice) e combos com preço invertido (soma <= comboPrice)", () => {
      const result = ProductDependencyDomainService.evaluatePriceEditImpacts({
        productName: "Copo 500ml",
        oldPrice: 30,
        newPrice: 18,
        activePromotions: [
          { id: "promo-fixed-20", title: "Oferta R$ 20", discountType: "fixed", discountValue: 20, isActive: true },
          { id: "promo-pct-10", title: "10% OFF", discountType: "percentage", discountValue: 10, isActive: true },
        ],
        parentCombos: [
          {
            id: "combo-casal",
            name: "Combo Casal",
            price: 40,
            isAvailable: true,
            targetProductId: "p-500",
            items: [
              { productId: "p-500", quantity: 2, unitPrice: 30 }, // passa a ser 2 * 18 = 36 <= 40
            ],
          },
        ],
      });

      expect(result.invalidatedFixedPromotions).toEqual([
        { id: "promo-fixed-20", title: "Oferta R$ 20", discountValue: 20 },
      ]);
      expect(result.invertedPriceCombos).toEqual([
        { id: "combo-casal", name: "Combo Casal", comboPrice: 40, newOriginalTotal: 36 },
      ]);
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe("evaluateCouponProductRemoval", () => {
    it("remove o produto e desativa o cupom caso fosse o único produto restrito (evitando virar cupom geral)", () => {
      const single = ProductDependencyDomainService.evaluateCouponProductRemoval(["prod-1"], "prod-1");
      expect(single).toEqual({
        changed: true,
        nextProductIds: [],
        shouldDeactivate: true,
      });

      const multi = ProductDependencyDomainService.evaluateCouponProductRemoval(
        ["prod-1", "prod-2"],
        "prod-1"
      );
      expect(multi).toEqual({
        changed: true,
        nextProductIds: ["prod-2"],
        shouldDeactivate: false,
      });
    });
  });

  describe("PromotionDomainService — Blindagem de produto esgotado ou removido", () => {
    it("oculta da vitrine promoções cujo produto vinculado foi removido (deletedAt) ou zerou estoque (stock <= 0)", () => {
      const now = new Date("2026-11-21T18:00:00Z");
      const candidates = [
        {
          id: "pr-ok",
          isActive: true,
          product: { isAvailable: true, stock: 5, deletedAt: null },
        },
        {
          id: "pr-zero-stock",
          isActive: true,
          product: { isAvailable: true, stock: 0, deletedAt: null },
        },
        {
          id: "pr-deleted",
          isActive: true,
          product: { isAvailable: true, stock: null, deletedAt: "2026-11-20T00:00:00Z" },
        },
      ];
      const visible = candidates.filter((p) =>
        PromotionDomainService.isPromotionPubliclyVisible(p, now)
      );

      expect(visible.map((p) => p.id)).toEqual(["pr-ok"]);

      const deletedStatus = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          product: { isAvailable: true, stock: null, deletedAt: "2026-11-20T00:00:00Z" },
        },
        now
      );
      expect(deletedStatus.label).toBe("Produto Removido");

      const zeroStockStatus = PromotionDomainService.getPromotionVisibilityStatus(
        {
          isActive: true,
          product: { isAvailable: true, stock: 0, deletedAt: null },
        },
        now
      );
      expect(zeroStockStatus.label).toBe("Produto Esgotado");
    });
  });

  describe("validateComboItemsComposition", () => {
    it("aceita combos com 2+ unidades do mesmo produto ou de produtos diferentes", () => {
      expect(
        ProductDependencyDomainService.validateComboItemsComposition([
          { productId: "shake-300", quantity: 2 },
        ])
      ).toEqual({
        valid: true,
        totalUnits: 2,
        distinctProducts: 1,
      });

      expect(
        ProductDependencyDomainService.validateComboItemsComposition([
          { productId: "shake-300", quantity: 1 },
          { productId: "copo-300", quantity: 1 },
        ])
      ).toEqual({
        valid: true,
        totalUnits: 2,
        distinctProducts: 2,
      });
    });

    it("rejeita combos com menos de 2 unidades totais", () => {
      const singleUnit = ProductDependencyDomainService.validateComboItemsComposition([
        { productId: "shake-300", quantity: 1 },
      ]);
      expect(singleUnit.valid).toBe(false);
      expect(singleUnit.totalUnits).toBe(1);
      expect(singleUnit.error).toContain("2 unidades");

      const empty = ProductDependencyDomainService.validateComboItemsComposition([]);
      expect(empty.valid).toBe(false);
      expect(empty.totalUnits).toBe(0);
    });
  });
});
