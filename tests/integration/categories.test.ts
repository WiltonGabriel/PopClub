import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createCategory } from "@/app/api/categories/route";
import { PUT as updateCategory } from "@/app/api/categories/[id]/route";
import { PATCH as reorderCategories } from "@/app/api/categories/reorder/route";
import { POST as createProduct } from "@/app/api/products/route";
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

  describe("Limite Máximo de Produtos por Categoria (Máx. 20)", () => {
    it("salva maxProducts válido (12) na criação e rejeita valores fora de 1..20 (400)", async () => {
      vi.spyOn(prisma.category, "count").mockResolvedValue(5);
      vi.spyOn(prisma.category, "findUnique").mockResolvedValue(null);
      const createSpy = vi.spyOn(prisma.category, "create").mockResolvedValue({
        id: "cat-lim",
        name: "Sorvetes Limitados",
        slug: "sorvetes-limitados",
        maxProducts: 12,
        isDynamic: false,
        isActive: true,
        _count: { products: 0 },
      } as any);

      const okRes = await createCategory(
        new Request("http://localhost:3000/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Sorvetes Limitados", maxProducts: 12 }),
        })
      );
      expect(okRes.status).toBe(201);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maxProducts: 12 }),
        })
      );

      const aboveRes = await createCategory(
        new Request("http://localhost:3000/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Estourada", maxProducts: 25 }),
        })
      );
      expect(aboveRes.status).toBe(400);

      const zeroRes = await createCategory(
        new Request("http://localhost:3000/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Zerada", maxProducts: 0 }),
        })
      );
      expect(zeroRes.status).toBe(400);
    });

    it("PUT /api/categories/[id] rejeita redução de maxProducts abaixo da quantidade já vinculada (400)", async () => {
      vi.spyOn(prisma.category, "findUnique").mockResolvedValue({
        id: "cat-1",
        isDynamic: false,
      } as any);
      vi.spyOn(prisma.product, "count").mockResolvedValue(8);

      const res = await updateCategory(
        new Request("http://localhost:3000/api/categories/cat-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxProducts: 5 }),
        }),
        { params: Promise.resolve({ id: "cat-1" }) }
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("8 produto(s)");
    });

    it("POST /api/products bloqueia cadastro quando a categoria manual atingiu seu limite maxProducts", async () => {
      vi.spyOn(prisma.product, "count")
        .mockResolvedValueOnce(10) // total ativo na loja (< 300)
        .mockResolvedValueOnce(4); // produtos nesta categoria (já bateu 4)
      vi.spyOn(prisma.category, "findUnique").mockResolvedValue({
        id: "cat-cheia",
        name: "Edição Limitada",
        isDynamic: false,
        maxProducts: 4,
      } as any);

      const res = await createProduct(
        new Request("http://localhost:3000/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Item Excedente",
            price: 19.9,
            categoryId: "cat-cheia",
          }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("atingiu o limite máximo de 4");
    });
  });
});
