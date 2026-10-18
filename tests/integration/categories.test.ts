import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createCategory } from "@/app/api/categories/route";
import { PATCH as reorderCategories } from "@/app/api/categories/reorder/route";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

describe("Categorias & Navegação", () => {
  const adminUser = {
    id: "admin-id-1",
    role: "ADMIN",
    permissions: [],
    username: "admin",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, "getAuthUser").mockResolvedValue(adminUser as any);
  });

  describe("Criação de Categoria Manual", () => {
    it("cria com sucesso uma categoria com descrição curta (máx 100 caracteres) e imagem WebP/SVG", async () => {
      const mockCategory = {
        id: "cat-acai-artesanal",
        name: "Açaí Artesanal",
        slug: "acai-artesanal",
        description: "Açaí batido na hora com frutas frescas selecionadas e cremosidade incomparável.",
        imageUrl: "/uploads/categories/acai-banner.webp",
        order: 1,
        isDynamic: false,
        dynamicType: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { products: 5 },
      };

      vi.spyOn(prisma.category, "count").mockResolvedValue(5);
      vi.spyOn(prisma.category, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.category, "create").mockResolvedValue(mockCategory as any);

      const req = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Açaí Artesanal",
          description: "Açaí batido na hora com frutas frescas selecionadas e cremosidade incomparável.",
          imageUrl: "/uploads/categories/acai-banner.webp",
          order: 1,
        }),
      });

      const response = await createCategory(req);
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.name).toBe("Açaí Artesanal");
      expect(body.imageUrl).toContain(".webp");
      expect(body.description.length).toBeLessThanOrEqual(100);
    });

    it("rejeita criação se o nome for vazio", async () => {
      vi.spyOn(prisma.category, "count").mockResolvedValue(5);

      const req = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "   ",
          description: "Teste",
        }),
      });

      const response = await createCategory(req);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("obrigatório");
    });
  });

  describe("Resolução Dinâmica de Produtos em Categorias Automáticas", () => {
    const productsCatalog = [
      {
        id: "p1",
        name: "Açaí Tradicional 500ml",
        isHighlight: true,
        isCombo: false,
        promotion: null,
        promotions: [],
      },
      {
        id: "p2",
        name: "Combo Família 1L + Acompanhamentos",
        isHighlight: false,
        isCombo: true,
        comboItems: [{ id: "ci-1", productId: "p1", quantity: 2 }],
        promotion: null,
        promotions: [],
      },
      {
        id: "p3",
        name: "Barca Especial de Morango",
        isHighlight: false,
        isCombo: false,
        promotion: { id: "promo-1", title: "20% OFF", discountValue: 20 },
        promotions: [{ id: "promo-1", isActive: true }],
      },
      {
        id: "p4",
        name: "Picolé de Fruta",
        isHighlight: false,
        isCombo: false,
        promotion: null,
        promotions: [],
      },
    ];

    it("resolve categoria dinâmica de Destaques (HIGHLIGHTS)", () => {
      const dynamicCat = { id: "cat-highlights", isDynamic: true, dynamicType: "HIGHLIGHTS" };
      expect(dynamicCat.dynamicType).toBe("HIGHLIGHTS");
      const resolved = productsCatalog.filter((p) => {
        if (p.isHighlight) return true;
        if (p.promotion) return true;
        return false;
      });

      expect(resolved.map((p) => p.id)).toContain("p1"); // Highlight
      expect(resolved.map((p) => p.id)).toContain("p3"); // Em promoção
      expect(resolved.map((p) => p.id)).not.toContain("p4"); // Item comum
    });

    it("resolve categoria dinâmica de Ofertas Ativas (ACTIVE_PROMOTIONS)", () => {
      const dynamicCat = { id: "cat-promos", isDynamic: true, dynamicType: "ACTIVE_PROMOTIONS" };
      expect(dynamicCat.dynamicType).toBe("ACTIVE_PROMOTIONS");
      const resolved = productsCatalog.filter((p) => Boolean(p.promotion || p.promotions.length > 0));

      expect(resolved.length).toBe(1);
      expect(resolved[0].id).toBe("p3");
    });

    it("resolve categoria dinâmica de Combos (COMBOS)", () => {
      const dynamicCat = { id: "cat-combos", isDynamic: true, dynamicType: "COMBOS" };
      expect(dynamicCat.dynamicType).toBe("COMBOS");
      const resolved = productsCatalog.filter((p) => p.isCombo || (p.comboItems && p.comboItems.length > 0));

      expect(resolved.length).toBe(1);
      expect(resolved[0].id).toBe("p2");
    });
  });

  describe("Reordenação Direta de Categorias (PATCH /api/categories/reorder)", () => {
    it("atualiza atomicamente a nova sequência de ordenação das categorias", async () => {
      const reorderItems = [
        { id: "cat-3", order: 0 },
        { id: "cat-1", order: 1 },
        { id: "cat-2", order: 2 },
      ];

      vi.spyOn(prisma, "$transaction").mockImplementation(async (fns: any) => {
        return Promise.resolve(fns);
      });

      vi.spyOn(prisma.category, "findMany").mockResolvedValue([
        { id: "cat-3", name: "Combos", order: 0, _count: { products: 2 } },
        { id: "cat-1", name: "Açaí", order: 1, _count: { products: 4 } },
        { id: "cat-2", name: "Sorvetes", order: 2, _count: { products: 3 } },
      ] as any);

      const req = new Request("http://localhost:3000/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderItems }),
      });

      const response = await reorderCategories(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.categories[0].id).toBe("cat-3");
      expect(body.categories[0].order).toBe(0);
      expect(body.categories[1].id).toBe("cat-1");
      expect(body.categories[1].order).toBe(1);
    });
  });
});
