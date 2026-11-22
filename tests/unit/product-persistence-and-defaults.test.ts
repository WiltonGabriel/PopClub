import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryDomainService } from "@/domain/services/CategoryDomainService";
import { productService } from "@/services/productService";
import { categoryService } from "@/services/categoryService";

describe("Persistência, Padrões de Categoria e Serviços de Produto/Categoria", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("CategoryDomainService.resolveInitialProductCategoryId", () => {
    const sampleCategories = [
      { id: "cat-destaques", name: "Destaques", isDynamic: true, dynamicType: "HIGHLIGHTS" },
      { id: "cat-combos-dyn", name: "Combos Auto", isDynamic: true, dynamicType: "COMBOS" },
      { id: "cat-copos", name: "Copos de Açaí", isDynamic: false, dynamicType: null },
      { id: "cat-shakes", name: "Milk Shakes", isDynamic: false, dynamicType: null },
      { id: "cat-turno", name: "Tarde Pop", isDynamic: true, dynamicType: "TIME_BASED" },
    ];

    it("pré-seleciona categoria manual ou TIME_BASED no modo criação quando preferredCategoryId é informado", () => {
      expect(
        CategoryDomainService.resolveInitialProductCategoryId({
          categories: sampleCategories,
          preferredCategoryId: "cat-shakes",
        })
      ).toBe("cat-shakes");

      expect(
        CategoryDomainService.resolveInitialProductCategoryId({
          categories: sampleCategories,
          preferredCategoryId: "cat-turno",
        })
      ).toBe("cat-turno");
    });

    it("ignora categorias dinâmicas automáticas (HIGHLIGHTS/COMBOS) no modo criação e cai na primeira manual", () => {
      expect(
        CategoryDomainService.resolveInitialProductCategoryId({
          categories: sampleCategories,
          preferredCategoryId: "cat-destaques",
        })
      ).toBe("cat-copos");

      expect(
        CategoryDomainService.resolveInitialProductCategoryId({
          categories: sampleCategories,
          preferredCategoryId: "cat-combos-dyn",
        })
      ).toBe("cat-copos");
    });

    it("preserva a categoria vinculada no modo edição (por ID, inclusive pausada, ou por nome case-insensitive)", () => {
      expect(
        CategoryDomainService.resolveInitialProductCategoryId({
          categories: sampleCategories,
          existingCategoryId: "cat-paused-hidden",
          preferredCategoryId: "cat-copos",
        })
      ).toBe("cat-paused-hidden");

      expect(
        CategoryDomainService.resolveInitialProductCategoryId({
          categories: sampleCategories,
          existingCategoryName: "  milk shakes  ",
          preferredCategoryId: "cat-copos",
        })
      ).toBe("cat-shakes");
    });
  });

  describe("productService — normalização completa e erro HTTP não-JSON", () => {
    it("createProduct e updateProduct preservam categoryId, categoryIsActive, effectiveIsAvailable e promotions", async () => {
      const apiPayload = {
        id: "prod-1",
        name: "Milk Shake 500ml",
        description: "Super cremoso",
        price: 20,
        categoryId: "cat-shakes",
        category: "Milk Shakes",
        categoryIsActive: true,
        imageUrl: "/uploads/shake.webp",
        isAvailable: true,
        effectiveIsAvailable: true,
        promotions: [
          {
            id: "promo-1",
            title: "Dia do Shake",
            badge: "PROMO",
            discountType: "percentage",
            discountValue: 10,
            isActive: true,
          },
        ],
        promotion: {
          id: "promo-1",
          title: "Dia do Shake",
          badge: "PROMO",
          discountType: "percentage",
          discountValue: 10,
          isActive: true,
        },
      };

      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify(apiPayload), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ...apiPayload, impactWarnings: ["Aviso teste"] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

      const created = await productService.createProduct({
        name: "Milk Shake 500ml",
        description: "Super cremoso",
        price: 20,
        category_id: "cat-shakes",
        category: "Milk Shakes",
        imageUrl: "/uploads/shake.webp",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(created.categoryId).toBe("cat-shakes");
      expect(created.category_id).toBe("cat-shakes");
      expect(created.categoryIsActive).toBe(true);
      expect(created.effectiveIsAvailable).toBe(true);
      expect(created.promotions).toHaveLength(1);
      expect(created.promotion?.id).toBe("promo-1");

      const updated = await productService.updateProduct("prod-1", { price: 21 });
      expect(updated.categoryId).toBe("cat-shakes");
      expect(updated.categoryIsActive).toBe(true);
      expect(updated.effectiveIsAvailable).toBe(true);
      expect(updated.promotions).toHaveLength(1);
      expect(updated.promotion?.id).toBe("promo-1");
      expect(updated.impactWarnings).toEqual(["Aviso teste"]);
    });

    it("createProduct e updateProduct tratam resposta HTTP 502 não-JSON sem lançar SyntaxError", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response("<html><body>502 Bad Gateway</body></html>", {
            status: 502,
            headers: { "Content-Type": "text/html" },
          })
        )
        .mockResolvedValueOnce(
          new Response("Gateway Timeout", {
            status: 504,
            headers: { "Content-Type": "text/plain" },
          })
        );

      await expect(
        productService.createProduct({
          name: "Copo 300ml",
          description: "Tradicional",
          price: 14,
          imageUrl: "/uploads/copo.webp",
        })
      ).rejects.toThrow("Erro ao cadastrar produto.");

      await expect(productService.updateProduct("prod-1", { price: 15 })).rejects.toThrow(
        "Erro ao atualizar produto."
      );
    });
  });

  describe("categoryService.getCategories", () => {
    it("solicita categorias com cache: no-store para evitar listagem defasada no navegador", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
        async () =>
          new Response(
            JSON.stringify([{ id: "c1", name: "Copos", isActive: true, _count: { products: 4 } }]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
      );

      await categoryService.getCategories();
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/categories",
        expect.objectContaining({ cache: "no-store" })
      );

      await categoryService.getCategories(true);
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/categories?includeInactive=true",
        expect.objectContaining({ cache: "no-store" })
      );
    });
  });
});
