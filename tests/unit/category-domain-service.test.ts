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

  describe("isTimeWindowActive", () => {
    it("valida janelas no mesmo dia (14:00-18:00) e janelas que viram a meia-noite (22:00-02:00)", () => {
      const afternoonCat = {
        isDynamic: true,
        dynamicType: "TIME_BASED",
        timeStart: "14:00",
        timeEnd: "18:00",
      };
      expect(
        CategoryDomainService.isTimeWindowActive(afternoonCat, new Date(2026, 10, 22, 15, 30))
      ).toBe(true);
      expect(
        CategoryDomainService.isTimeWindowActive(afternoonCat, new Date(2026, 10, 22, 19, 0))
      ).toBe(false);

      const overnightCat = {
        isDynamic: true,
        dynamicType: "TIME_BASED",
        timeStart: "22:00",
        timeEnd: "02:00",
      };
      expect(
        CategoryDomainService.isTimeWindowActive(overnightCat, new Date(2026, 10, 22, 23, 30))
      ).toBe(true);
      expect(
        CategoryDomainService.isTimeWindowActive(overnightCat, new Date(2026, 10, 22, 1, 0))
      ).toBe(true);
      expect(
        CategoryDomainService.isTimeWindowActive(overnightCat, new Date(2026, 10, 22, 10, 0))
      ).toBe(false);
    });
  });

  describe("isProductShareable", () => {
    it("rejeita copos e sorvetes individuais (250ml, 350ml, 400ml, 500ml) e aceita itens realmente compartilháveis", () => {
      expect(
        CategoryDomainService.isProductShareable({
          name: "Copo 250ml Tradicional",
          description: "Açaí batido na hora",
          servesText: "Serve 1 pessoa",
        })
      ).toBe(false);

      expect(
        CategoryDomainService.isProductShareable({
          name: "Sorvete no Copo 400ml",
          description: "Sorvete gelado",
          servesText: "Serve 1 pessoa",
        })
      ).toBe(false);

      expect(
        CategoryDomainService.isProductShareable({
          name: "Copo 500ml Tradicional",
          description: "Açaí tradicional 500ml",
          servesText: null,
        })
      ).toBe(false);

      expect(
        CategoryDomainService.isProductShareable({
          name: "Copo 350ml",
          description: "Ideal para dividir",
          servesText: "Serve 2 a 3 pessoas",
        })
      ).toBe(true);

      expect(
        CategoryDomainService.isProductShareable({
          name: "Roleta Gourmet P",
          description: "Sabores variados",
          servesText: "Serve 1 a 2 pessoas",
        })
      ).toBe(true);

      expect(
        CategoryDomainService.isProductShareable({
          name: "Pote 1 Litro Puro",
          description: "Açaí artesanal",
          servesText: null,
        })
      ).toBe(true);

      expect(
        CategoryDomainService.isProductShareable({
          name: "Combo Família Especial",
          description: "Para aproveitar juntos",
          servesText: null,
        })
      ).toBe(true);
    });
  });

  describe("filterProductsForCategory (5 Regras Dinâmicas + Manual)", () => {
    const now = new Date("2026-11-22T18:00:00Z");
    const catalog = [
      {
        id: "p-highlight",
        name: "Copo 500ml Especial",
        categoryId: "cat-copos",
        isHighlight: true,
        isAvailable: true,
        categoryIsActive: true,
      },
      {
        id: "p-promo-ok",
        name: "Milk Shake 400ml",
        price: 18,
        categoryId: "cat-shakes",
        isAvailable: true,
        categoryIsActive: true,
        promotions: [
          {
            isActive: true,
            discountType: "percentage",
            discountValue: 20,
            startsAt: "2026-11-21T00:00:00Z",
            expiresAt: "2026-11-25T00:00:00Z",
          },
        ],
      },
      {
        id: "p-promo-expired",
        name: "Sorvete Expirado",
        price: 15,
        categoryId: "cat-sorvetes",
        isAvailable: true,
        categoryIsActive: true,
        promotions: [
          {
            isActive: true,
            discountType: "percentage",
            discountValue: 15,
            expiresAt: "2026-11-20T00:00:00Z",
          },
        ],
      },
      {
        id: "p-promo-future",
        name: "Sorvete Futuro",
        price: 15,
        categoryId: "cat-sorvetes",
        isAvailable: true,
        categoryIsActive: true,
        promotions: [
          {
            isActive: true,
            discountType: "percentage",
            discountValue: 15,
            startsAt: "2026-11-28T00:00:00Z",
          },
        ],
      },
      {
        id: "p-promo-soldout",
        name: "Lote Esgotado",
        price: 20,
        categoryId: "cat-sorvetes",
        isAvailable: true,
        categoryIsActive: true,
        promotions: [
          {
            isActive: true,
            discountType: "percentage",
            discountValue: 10,
            scarcityType: "real",
            scarcityUnits: 0,
          },
        ],
      },
      {
        id: "p-combo",
        name: "Combo Família",
        price: 55,
        isCombo: true,
        isAvailable: true,
        categoryIsActive: true,
        servesText: "Serve 3 a 4 pessoas",
      },
      {
        id: "p-turn",
        name: "Lanche da Tarde",
        price: 12,
        categoryId: "cat-turno",
        isAvailable: true,
        categoryIsActive: true,
      },
    ];

    it("aplica corretamente HIGHLIGHTS, ACTIVE_PROMOTIONS, COMBOS, SHAREABLE, TIME_BASED e Manual", () => {
      const highlights = CategoryDomainService.filterProductsForCategory(
        { id: "cat-destaques", name: "Destaques", isDynamic: true, dynamicType: "HIGHLIGHTS" },
        catalog,
        now
      );
      expect(highlights.map((p) => p.id)).toEqual(["p-highlight", "p-promo-ok"]);

      const activePromos = CategoryDomainService.filterProductsForCategory(
        { id: "cat-promos", name: "Ofertas", isDynamic: true, dynamicType: "ACTIVE_PROMOTIONS" },
        catalog,
        now
      );
      expect(activePromos.map((p) => p.id)).toEqual(["p-promo-ok"]);

      const combos = CategoryDomainService.filterProductsForCategory(
        { id: "cat-combos", name: "Combos", isDynamic: true, dynamicType: "COMBOS" },
        catalog,
        now
      );
      expect(combos.map((p) => p.id)).toEqual(["p-combo"]);

      const shareable = CategoryDomainService.filterProductsForCategory(
        { id: "cat-share", name: "Para Compartilhar", isDynamic: true, dynamicType: "SHAREABLE" },
        catalog,
        now
      );
      expect(shareable.map((p) => p.id)).toEqual(["p-combo"]);

      const timeBased = CategoryDomainService.filterProductsForCategory(
        { id: "cat-turno", name: "Menu da Tarde", isDynamic: true, dynamicType: "TIME_BASED" },
        catalog,
        now
      );
      expect(timeBased.map((p) => p.id)).toEqual(["p-turn"]);

      const manual = CategoryDomainService.filterProductsForCategory(
        { id: "cat-copos", name: "Copos", isDynamic: false },
        catalog,
        now
      );
      expect(manual.map((p) => p.id)).toEqual(["p-highlight"]);
    });
  });
});
