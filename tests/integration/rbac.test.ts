import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasPermission, isUserAdmin, isUserEditor } from "@/lib/permissions";
import { PATCH as toggleConveyor } from "@/app/api/admin/conveyor/toggle/route";
import { PATCH as reorderCategories } from "@/app/api/categories/reorder/route";
import { PUT as updateSettings } from "@/app/api/settings/route";
import * as auth from "@/lib/auth";

describe("Controle de Acesso Baseado em Papéis (RBAC)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Matriz de Permissões hasPermission", () => {
    it("concede acesso irrestrito para Administrador (ADMIN)", () => {
      const admin = { id: "admin-1", role: "ADMIN", permissions: [] };
      expect(isUserAdmin(admin)).toBe(true);
      expect(hasPermission(admin, "ORDERS_KANBAN")).toBe(true);
      expect(hasPermission(admin, "settings_manage")).toBe(true);
      expect(hasPermission(admin, "menu_manage")).toBe(true);
    });

    it("concede apenas as permissões configuradas para Editor (EDITOR)", () => {
      const editorWithKanban = {
        id: "editor-1",
        role: "EDITOR",
        permissions: ["ORDERS_KANBAN", "STOCK_CONTROL"],
      };

      expect(isUserEditor(editorWithKanban)).toBe(true);
      expect(hasPermission(editorWithKanban, "ORDERS_KANBAN")).toBe(true);
      expect(hasPermission(editorWithKanban, "STOCK_CONTROL")).toBe(true);
      // Não possui settings_manage nem menu_manage
      expect(hasPermission(editorWithKanban, "settings_manage")).toBe(false);
      expect(hasPermission(editorWithKanban, "menu_manage")).toBe(false);
    });

    it("bloqueia todas as permissões administrativas para Cliente (CLIENT)", () => {
      const clientUser = { id: "client-1", role: "CLIENT", permissions: ["ADMIN_ALL"] };
      expect(hasPermission(clientUser, "ORDERS_KANBAN")).toBe(false);
      expect(hasPermission(clientUser, "settings_manage")).toBe(false);
      expect(hasPermission(clientUser, "menu_manage")).toBe(false);
    });

    it("bloqueia chamadas de usuários nulos ou anônimos", () => {
      expect(hasPermission(null, "ORDERS_KANBAN")).toBe(false);
      expect(hasPermission(undefined, "settings_manage")).toBe(false);
    });
  });

  describe("Proteção de Rotas de API Administrativas (403 Forbidden)", () => {
    it("bloqueia com 401 Unauthorized chamadas sem sessão para toggle da esteira", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/admin/conveyor/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true }),
      });

      const response = await toggleConveyor(req);
      expect(response.status).toBe(401);
    });

    it("bloqueia com 403 Forbidden para CLIENT que tenta alternar a esteira", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "client-id",
        role: "CLIENT",
        permissions: [],
      } as any);

      const req = new Request("http://localhost:3000/api/admin/conveyor/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true }),
      });

      const response = await toggleConveyor(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("Acesso negado");
    });

    it("bloqueia com 403 Forbidden para EDITOR sem permissão menu_manage tentando reordenar categorias", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "editor-without-menu",
        role: "EDITOR",
        permissions: ["ORDERS_KANBAN"], // Apenas Kanban, sem menu_manage
      } as any);

      const req = new Request("http://localhost:3000/api/categories/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: "cat-1", order: 1 }] }),
      });

      const response = await reorderCategories(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("Acesso negado");
    });

    it("bloqueia com 403 Forbidden para EDITOR sem permissão settings_manage tentando alterar horários/configurações", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "editor-without-settings",
        role: "EDITOR",
        permissions: ["ORDERS_KANBAN"], // Apenas Kanban, sem settings_manage
      } as any);

      const req = new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryFee: 7.5 }),
      });

      const response = await updateSettings(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("Acesso negado");
    });
  });
});
