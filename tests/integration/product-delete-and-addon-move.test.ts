import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { addonCrudLimiter } from "@/lib/rateLimit";
import { deleteAddonImageIfUnused } from "@/lib/addonStorage";
import { GET as getProduct, DELETE as deleteProduct } from "@/app/api/products/[id]/route";
import {
  PUT as updateAddonItem,
  DELETE as deleteAddonItem,
} from "@/app/api/addons/items/[id]/route";

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

    it("retorna 404 quando produto não existe ou já foi arquivado via soft-delete", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: [],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValueOnce(null);

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/inexistente", { method: "DELETE" }),
        { params: Promise.resolve({ id: "inexistente" }) }
      );
      expect(res.status).toBe(404);

      vi.spyOn(prisma.product, "findUnique").mockResolvedValueOnce({
        id: "prod-archived",
        deletedAt: new Date("2026-10-01T00:00:00Z"),
      } as any);
      const archivedRes = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-archived", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-archived" }) }
      );
      expect(archivedRes.status).toBe(404);
    });

    it("aplica soft-delete transacional (200) quando produto possui pedidos vinculados, preservando histórico", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "editor-menu",
        role: "editor",
        permissions: ["menu_manage", "STOCK_CONTROL"],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
        id: "prod-hist",
        deletedAt: null,
      } as any);
      vi.spyOn(prisma.orderItem, "count").mockResolvedValue(4);
      const hardDeleteSpy = vi.spyOn(prisma.product, "delete");

      const txMock = {
        promotion: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        productAddonGroup: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
        comboItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
        product: { update: vi.fn().mockResolvedValue({ id: "prod-hist" }) },
      };
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-hist", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-hist" }) }
      );
      expect(res.status).toBe(200);
      expect(hardDeleteSpy).not.toHaveBeenCalled();

      expect(txMock.promotion.updateMany).toHaveBeenCalledWith({
        where: { productId: "prod-hist" },
        data: { isActive: false },
      });
      expect(txMock.productAddonGroup.deleteMany).toHaveBeenCalledWith({
        where: { productId: "prod-hist" },
      });
      expect(txMock.comboItem.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ comboId: "prod-hist" }, { productId: "prod-hist" }] },
      });
      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: "prod-hist" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          isAvailable: false,
          isHighlight: false,
          categoryId: null,
          cardBadgeId: null,
        }),
      });

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.softDeleted).toBe(true);
      expect(body.linkedOrdersCount).toBe(4);
    });

    it("faz fallback para soft-delete caso delete físico dispare P2003 concorrente", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: [],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
        id: "prod-fk",
        deletedAt: null,
      } as any);
      vi.spyOn(prisma.orderItem, "count").mockResolvedValue(0);
      vi.spyOn(prisma.product, "delete").mockRejectedValue({ code: "P2003" });

      const txMock = {
        promotion: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        productAddonGroup: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        comboItem: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        product: { update: vi.fn().mockResolvedValue({ id: "prod-fk" }) },
      };
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-fk", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-fk" }) }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.softDeleted).toBe(true);
      expect(txMock.product.update).toHaveBeenCalled();
    });

    it("exclui fisicamente (softDeleted: false) produto livre de vínculos em pedidos", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "editor-menu",
        role: "editor",
        permissions: ["menu_manage"],
      } as any);
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
        id: "prod-ok",
        deletedAt: null,
      } as any);
      vi.spyOn(prisma.orderItem, "count").mockResolvedValue(0);
      vi.spyOn(prisma.product, "delete").mockResolvedValue({ id: "prod-ok" } as any);

      const res = await deleteProduct(
        new Request("http://localhost:3000/api/products/prod-ok", { method: "DELETE" }),
        { params: Promise.resolve({ id: "prod-ok" }) }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.softDeleted).toBe(false);
      expect(body.linkedOrdersCount).toBe(0);
    });

    it("GET /api/products/[id] retorna 404 para produto removido via soft-delete", async () => {
      vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
        id: "prod-archived",
        deletedAt: new Date("2026-10-01T00:00:00Z"),
      } as any);

      const res = await getProduct(
        new Request("http://localhost:3000/api/products/prod-archived"),
        { params: Promise.resolve({ id: "prod-archived" }) }
      );
      expect(res.status).toBe(404);
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

  describe("Proteção de Imagem Compartilhada (deleteAddonImageIfUnused & DELETE /api/addons/items/[id])", () => {
    it("não remove o arquivo do disco enquanto outro item referenciar o mesmo imageUrl", async () => {
      const unlinkSpy = vi.spyOn(fs, "unlink").mockResolvedValue(undefined);

      const dbStillShared = {
        addonItem: {
          count: vi.fn().mockResolvedValue(1),
        },
      };
      const deletedShared = await deleteAddonImageIfUnused(
        dbStillShared as any,
        "/uploads/addons/morango.webp"
      );
      expect(deletedShared).toBe(false);
      expect(unlinkSpy).not.toHaveBeenCalled();

      const dbOrphan = {
        addonItem: {
          count: vi.fn().mockResolvedValue(0),
        },
      };
      const deletedOrphan = await deleteAddonImageIfUnused(
        dbOrphan as any,
        "/uploads/addons/morango.webp"
      );
      expect(deletedOrphan).toBe(true);
      expect(unlinkSpy).toHaveBeenCalledTimes(1);
    });

    it("DELETE /api/addons/items/[id] exclui registro antes de checar referências e preserva arquivo compartilhado", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "admin",
        permissions: ["menu_manage"],
      } as any);
      vi.spyOn(prisma.addonItem, "findUnique").mockResolvedValue({
        id: "item-shared-1",
        groupId: "grp-1",
        imageUrl: "/uploads/addons/kiwi.webp",
      } as any);
      vi.spyOn(prisma.addonItem, "delete").mockResolvedValue({
        id: "item-shared-1",
      } as any);
      const countSpy = vi.spyOn(prisma.addonItem, "count").mockResolvedValue(1);
      const unlinkSpy = vi.spyOn(fs, "unlink").mockResolvedValue(undefined);

      const res = await deleteAddonItem(
        new Request("http://localhost:3000/api/addons/items/item-shared-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "item-shared-1" }) }
      );
      expect(res.status).toBe(200);
      expect(countSpy).toHaveBeenCalledWith({
        where: { imageUrl: "/uploads/addons/kiwi.webp" },
      });
      expect(unlinkSpy).not.toHaveBeenCalled();
    });
  });
});
