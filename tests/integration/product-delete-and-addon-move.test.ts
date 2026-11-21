import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { addonCrudLimiter } from "@/lib/rateLimit";
import { DELETE as deleteProduct } from "@/app/api/products/[id]/route";
import { PUT as updateAddonItem } from "@/app/api/addons/items/[id]/route";

describe("Integração: Exclusão Segura de Produtos e Movimentação de Complementos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(addonCrudLimiter, "check").mockReturnValue({
      success: true,
      limit: 240,
      remaining: 239,
      reset: Date.now() + 60000,
      retryAfter: 0,
    });
  });

  describe("DELETE /api/products/[id]", () => {
    it("retorna 403 quando usuário não possui permissão menu_manage (ex: apenas STOCK_CONTROL)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "stock-only-user",
        role: "editor",
        permissions: ["STOCK_CONTROL"],
      } as any);

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-1" }) }
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Permissão para gerenciar cardápio");
    });

    it("retorna 404 quando produto não existe", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: [],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue(null);

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/inexistente", { method: "DELETE" }),
        { params: Promise.resolve({ id: "inexistente" }) }
      );
      expect(res.status).toBe(404);
    });

    it("retorna 409 PRODUCT_HAS_ORDERS quando produto possui itens de pedidos vinculados", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "editor-menu",
        role: "editor",
        permissions: ["menu_manage", "STOCK_CONTROL"],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({ id: "prod-hist" } as any);
      vi.spyOn(prisma.orderItem, "count").mockResolvedValue(4);
      const deleteSpy = vi.spyOn(prisma.product, "delete");

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-hist", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-hist" }) }
      );
      expect(res.status).toBe(409);
      expect(deleteSpy).not.toHaveBeenCalled();
      const body = await res.json();
      expect(body.code).toBe("PRODUCT_HAS_ORDERS");
      expect(body.linkedOrdersCount).toBe(4);
    });

    it("retorna 409 FOREIGN_KEY_CONSTRAINT caso delete dispare erro Prisma P2003", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: [],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({ id: "prod-fk" } as any);
      vi.spyOn(prisma.orderItem, "count").mockResolvedValue(0);
      vi.spyOn(prisma.product, "delete").mockRejectedValue({ code: "P2003" });

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-fk", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-fk" }) }
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe("FOREIGN_KEY_CONSTRAINT");
    });

    it("retorna 200 ao excluir produto livre de vínculos em pedidos", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "editor-menu",
        role: "editor",
        permissions: ["menu_manage"],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({ id: "prod-ok" } as any);
      vi.spyOn(prisma.orderItem, "count").mockResolvedValue(0);
      vi.spyOn(prisma.product, "delete").mockResolvedValue({ id: "prod-ok" } as any);

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-ok", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-ok" }) }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("PUT /api/addons/items/[id]", () => {
    it("bloqueia com 403 usuário sem permissão menu_manage", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "client-1",
        role: "client",
        permissions: [],
      } as any);

      const res = await updateAddonItem(
        new Request("http://localhost:3000/api/addons/items/item-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: "grp-2" }),
        }),
        { params: Promise.resolve({ id: "item-1" }) }
      );
      expect(res.status).toBe(403);
    });

    it("retorna 400 se groupId for vazio e 404 se grupo de destino não existir", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: [],
      } as any);
      vi.spyOn(prisma.addonItem, "findUnique").mockResolvedValue({
        id: "item-1",
        groupId: "grp-1",
        name: "Banana",
        price: 1.5,
        imageUrl: null,
        isAvailable: true,
        sortOrder: 0,
      } as any);

      const badRes = await updateAddonItem(
        new Request("http://localhost:3000/api/addons/items/item-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: "   " }),
        }),
        { params: Promise.resolve({ id: "item-1" }) }
      );
      expect(badRes.status).toBe(400);

      vi.spyOn(prisma.addonGroup, "findUnique").mockResolvedValue(null);
      const notFoundRes = await updateAddonItem(
        new Request("http://localhost:3000/api/addons/items/item-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: "grp-inexistente" }),
        }),
        { params: Promise.resolve({ id: "item-1" }) }
      );
      expect(notFoundRes.status).toBe(404);
    });

    it("move item para outro groupId válido e atualiza sortOrder retornando 200", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "editor-1",
        role: "editor",
        permissions: ["menu_manage"],
      } as any);
      vi.spyOn(prisma.addonItem, "findUnique").mockResolvedValue({
        id: "item-1",
        groupId: "grp-1",
        name: "Banana",
        price: 1.5,
        imageUrl: null,
        isAvailable: true,
        sortOrder: 2,
      } as any);
      vi.spyOn(prisma.addonGroup, "findUnique").mockResolvedValue({ id: "grp-2" } as any);
      const updateSpy = vi.spyOn(prisma.addonItem, "update").mockResolvedValue({
        id: "item-1",
        groupId: "grp-2",
        name: "Banana",
        price: 1.5,
        imageUrl: null,
        isAvailable: true,
        sortOrder: 0,
      } as any);

      const res = await updateAddonItem(
        new Request("http://localhost:3000/api/addons/items/item-1", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: "grp-2", sortOrder: 0 }),
        }),
        { params: Promise.resolve({ id: "item-1" }) }
      );
      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: expect.objectContaining({
          groupId: "grp-2",
          sortOrder: 0,
        }),
      });
      const body = await res.json();
      expect(body.groupId).toBe("grp-2");
    });
  });
});
