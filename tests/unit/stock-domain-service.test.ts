import { describe, it, expect } from "vitest";
import { StockDomainService, ProductStockInfo, PromotionBatchInfo } from "@/domain/services/StockDomainService";
import { OutOfStockException, BatchDepletedException } from "@/domain/errors";

describe("StockDomainService (Regras Puras de Estoque e Lotes Promocionais)", () => {
  describe("Estoque de Produtos", () => {
    const validProduct: ProductStockInfo = {
      id: "prod-1",
      name: "Pastel Especial de Carne Seca",
      isAvailable: true,
      manageStock: true,
      stockQuantity: 10,
      isCombo: false,
    };

    it("aprova produto disponível com saldo suficiente em estoque", () => {
      expect(() => {
        StockDomainService.verifyProductStock(validProduct, 5);
      }).not.toThrow();
    });

    it("lança OutOfStockException quando o produto está indisponível na vitrine", () => {
      expect(() => {
        StockDomainService.verifyProductStock({ ...validProduct, isAvailable: false }, 1);
      }).toThrow(OutOfStockException);
    });

    it("lança OutOfStockException quando a quantidade solicitada excede o saldo físico", () => {
      expect(() => {
        StockDomainService.verifyProductStock(validProduct, 15);
      }).toThrowError(/Estoque insuficiente para o produto "Pastel Especial de Carne Seca"/);
    });

    it("não bloqueia produtos que não gerenciam estoque físico (manageStock = false ou null)", () => {
      expect(() => {
        StockDomainService.verifyProductStock({ ...validProduct, manageStock: false, stockQuantity: 0 }, 100);
      }).not.toThrow();

      expect(() => {
        StockDomainService.verifyProductStock({ ...validProduct, stockQuantity: null }, 100);
      }).not.toThrow();
    });
  });

  describe("Lotes de Promoção (Modo Lote Real)", () => {
    const validPromo: PromotionBatchInfo = {
      id: "promo-1",
      title: "Festival do Pastel 50% OFF",
      isActive: true,
      stockQuantity: 5,
    };

    it("aprova lote promocional com saldo restante", () => {
      expect(() => {
        StockDomainService.verifyPromotionBatch(validPromo, 3);
      }).not.toThrow();
    });

    it("lança BatchDepletedException quando a promoção está inativa", () => {
      expect(() => {
        StockDomainService.verifyPromotionBatch({ ...validPromo, isActive: false }, 1);
      }).toThrow(BatchDepletedException);
    });

    it("lança BatchDepletedException quando o lote promocional está esgotado ou insuficiente", () => {
      expect(() => {
        StockDomainService.verifyPromotionBatch(validPromo, 6);
      }).toThrowError(/Lote da promoção "Festival do Pastel 50% OFF" esgotado ou insuficiente/);
    });

    it("não bloqueia promoções que operam em Modo Estratégico (stockQuantity = null)", () => {
      expect(() => {
        StockDomainService.verifyPromotionBatch({ ...validPromo, stockQuantity: null }, 20);
      }).not.toThrow();
    });
  });

  describe("Isolamento de Domínio de Estoque", () => {
    it("identifica corretamente produtos que pertencem ao inventário comum", () => {
      expect(StockDomainService.isStandardInventoryProduct({ isCombo: false, hasActivePromotion: false })).toBe(true);
      expect(StockDomainService.isStandardInventoryProduct({ isCombo: true, hasActivePromotion: false })).toBe(false);
      expect(StockDomainService.isStandardInventoryProduct({ isCombo: false, hasActivePromotion: true })).toBe(false);
      expect(StockDomainService.isStandardInventoryProduct({ isCombo: true, hasActivePromotion: true })).toBe(false);
    });
  });
});
