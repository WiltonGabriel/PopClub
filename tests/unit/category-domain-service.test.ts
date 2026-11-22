import { describe, it, expect } from "vitest";
import {
  CATEGORY_DEFAULT_PRODUCTS_LIMIT,
  CATEGORY_MAX_PRODUCTS_LIMIT,
  CategoryDomainService,
} from "@/domain/services/CategoryDomainService";

describe("CategoryDomainService — Limites de Categoria e Prévia da Vitrine", () => {
  describe("parseAndValidateMaxProducts", () => {
    it("usa padrão 20 quando omitido e aceita valores inteiros entre 1 e 20", () => {
      expect(CategoryDomainService.parseAndValidateMaxProducts(undefined)).toEqual({
        valid: true,
        value: CATEGORY_DEFAULT_PRODUCTS_LIMIT,
      });
      expect(CategoryDomainService.parseAndValidateMaxProducts("")).toEqual({
        valid: true,
        value: CATEGORY_DEFAULT_PRODUCTS_LIMIT,
      });
      expect(CategoryDomainService.parseAndValidateMaxProducts(1)).toEqual({
        valid: true,
        value: 1,
      });
      expect(CategoryDomainService.parseAndValidateMaxProducts("12")).toEqual({
        valid: true,
        value: 12,
      });
      expect(CategoryDomainService.parseAndValidateMaxProducts(CATEGORY_MAX_PRODUCTS_LIMIT)).toEqual({
        valid: true,
        value: 20,
      });
    });

    it("rejeita valores abaixo de 1, acima de 20, decimais ou inválidos", () => {
      expect(CategoryDomainService.parseAndValidateMaxProducts(0).valid).toBe(false);
      expect(CategoryDomainService.parseAndValidateMaxProducts(-3).valid).toBe(false);
      expect(CategoryDomainService.parseAndValidateMaxProducts(21).valid).toBe(false);
      expect(CategoryDomainService.parseAndValidateMaxProducts(8.5).valid).toBe(false);
      expect(CategoryDomainService.parseAndValidateMaxProducts("abc").valid).toBe(false);
    });
  });

  describe("canAssignProductToCategory", () => {
    it("permite atribuir enquanto abaixo do limite ou mantendo o produto na mesma categoria", () => {
      expect(
        CategoryDomainService.canAssignProductToCategory({
          currentActiveCount: 7,
          maxProducts: 8,
        })
      ).toBe(true);

      expect(
        CategoryDomainService.canAssignProductToCategory({
          currentActiveCount: 8,
          maxProducts: 8,
          isSameCategory: true,
        })
      ).toBe(true);
    });

    it("bloqueia quando outra categoria atingiu o limite máximo configurado", () => {
      expect(
        CategoryDomainService.canAssignProductToCategory({
          currentActiveCount: 8,
          maxProducts: 8,
        })
      ).toBe(false);
    });
  });

  describe("resolveStorefrontCategoryDisplay", () => {
    const elevenItems = Array.from({ length: 11 }, (_, idx) => ({ id: `p-${idx + 1}` }));

    it("separa 7 itens visíveis + 4 ocultos para o card Ver Mais quando houver 11 itens na prévia", () => {
      const display = CategoryDomainService.resolveStorefrontCategoryDisplay({
        items: elevenItems,
        maxProducts: 20,
        isDynamic: true,
        isPreview: true,
      });

      expect(display.totalItems).toBe(11);
      expect(display.visibleItems).toHaveLength(7);
      expect(display.hiddenItems).toHaveLength(4);
      expect(display.hasMore).toBe(true);
    });

    it("exibe todos os itens sem card Ver Mais quando estiver no modo completo ou total <= 7", () => {
      const fullMode = CategoryDomainService.resolveStorefrontCategoryDisplay({
        items: elevenItems,
        maxProducts: 20,
        isDynamic: true,
        isPreview: false,
      });
      expect(fullMode.hasMore).toBe(false);
      expect(fullMode.visibleItems).toHaveLength(11);
      expect(fullMode.hiddenItems).toHaveLength(0);

      const sevenOnly = CategoryDomainService.resolveStorefrontCategoryDisplay({
        items: elevenItems.slice(0, 7),
        maxProducts: 20,
        isDynamic: false,
        isPreview: true,
      });
      expect(sevenOnly.hasMore).toBe(false);
      expect(sevenOnly.visibleItems).toHaveLength(7);
    });

    it("aplica o teto maxProducts configurado em categorias dinâmicas", () => {
      const capped = CategoryDomainService.resolveStorefrontCategoryDisplay({
        items: elevenItems,
        maxProducts: 9,
        isDynamic: true,
        isPreview: true,
      });

      expect(capped.totalItems).toBe(9);
      expect(capped.visibleItems).toHaveLength(7);
      expect(capped.hiddenItems).toHaveLength(2);
      expect(capped.hasMore).toBe(true);
    });
  });
});
