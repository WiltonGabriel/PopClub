import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { GET as listRoles, POST as createRole } from "@/app/api/admin/roles/route";
import { PATCH as updateRole, DELETE as deleteRole } from "@/app/api/admin/roles/[id]/route";
import { POST as createUser } from "@/app/api/admin/users/route";
import { PATCH as updateUser, DELETE as deleteUser } from "@/app/api/admin/users/[id]/route";

describe("Segurança de Cargos e Prevenção de Escalonamento de Privilégios", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({} as any);
  });

  const editorWithUsersManage = {
    id: "editor-mod-1",
    role: "editor",
    permissions: ["users_manage"],
  };

  const fullAdmin = {
    id: "admin-root-1",
    role: "admin",
    permissions: [],
  };

  describe("Soberania Administrativa sobre CustomRoles (/api/admin/roles)", () => {
    it("permite leitura GET para Editor com users_manage, mas bloqueia POST/PATCH/DELETE com 403", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(editorWithUsersManage as any);
      vi.spyOn(prisma.customRole, "findMany").mockResolvedValue([]);

      const getRes = await listRoles(new Request("http://localhost:3000/api/admin/roles"));
      expect(getRes.status).toBe(200);

      const postRes = await createRole(
        new Request("http://localhost:3000/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Supremo", permissions: ["settings_manage"] }),
        })
      );
      expect(postRes.status).toBe(403);

      const patchRes = await updateRole(
        new Request("http://localhost:3000/api/admin/roles/role-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Hack", permissions: ["users_manage"] }),
        }),
        { params: Promise.resolve({ id: "role-1" }) }
      );
      expect(patchRes.status).toBe(403);

      const delRes = await deleteRole(
        new Request("http://localhost:3000/api/admin/roles/role-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "role-1" }) }
      );
      expect(delRes.status).toBe(403);
    });

    it("permite ao ADMIN criar cargo personalizado válido e rejeita permissões inventadas com 400", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(fullAdmin as any);
      vi.spyOn(prisma.customRole, "count").mockResolvedValue(1);
      vi.spyOn(prisma.customRole, "findUnique").mockResolvedValue(null);

      const invalidPermRes = await createRole(
        new Request("http://localhost:3000/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Operador Inválido",
            permissions: ["ORDERS_KANBAN", "PERMISSAO_FAKE"],
          }),
        })
      );
      expect(invalidPermRes.status).toBe(400);

      vi.spyOn(prisma.customRole, "create").mockResolvedValue({
        id: "role-log",
        name: "Logística",
        color: "blue",
        permissions: ["logistics_manage", "ORDERS_KANBAN"],
      } as any);

      const okRes = await createRole(
        new Request("http://localhost:3000/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Logística",
            color: "blue",
            permissions: ["logistics_manage", "ORDERS_KANBAN"],
          }),
        })
      );
      expect(okRes.status).toBe(201);
    });
  });

  describe("Proteção de Equipe e Contas em /api/admin/users", () => {
    it("impede que EDITOR com users_manage crie novos membros de equipe (403)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(editorWithUsersManage as any);

      const res = await createUser(
        new Request("http://localhost:3000/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "Sub-Editor",
            email: "sub@popclub.com",
            password: "Password123!",
            role: "EDITOR",
            permissions: ["settings_manage", "coupons_manage"],
          }),
        })
      );
      expect(res.status).toBe(403);
    });

    it("impede que EDITOR com users_manage bloqueie, edite ou exclua conta de ADMIN ou outro EDITOR (403)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(editorWithUsersManage as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "admin-root-1",
        role: "ADMIN",
        isActive: true,
        customRole: null,
      } as any);

      const patchRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/admin-root-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBlocked: true }),
        }),
        { params: Promise.resolve({ id: "admin-root-1" }) }
      );
      expect(patchRes.status).toBe(403);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "editor-peer-2",
        role: "EDITOR",
        isActive: true,
      } as any);

      const delRes = await deleteUser(
        new Request("http://localhost:3000/api/admin/users/editor-peer-2", { method: "DELETE" }),
        { params: Promise.resolve({ id: "editor-peer-2" }) }
      );
      expect(delRes.status).toBe(403);
    });

    it("permite ao EDITOR com users_manage moderar conta CLIENT (bloqueio)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(editorWithUsersManage as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "client-1",
        role: "CLIENT",
        isActive: true,
        customRole: null,
      } as any);
      vi.spyOn(prisma.user, "update").mockResolvedValue({
        id: "client-1",
        role: "CLIENT",
        isBlocked: true,
      } as any);

      const res = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBlocked: true, blockReason: "Pedido fraudulento" }),
        }),
        { params: Promise.resolve({ id: "client-1" }) }
      );
      expect(res.status).toBe(200);
    });

    it("permite ao ADMIN alterar permissões válidas e rejeita permissões desconhecidas (400)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(fullAdmin as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "editor-peer-2",
        role: "EDITOR",
        isActive: true,
        customRole: null,
      } as any);

      const badRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/editor-peer-2", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: ["HACK_ALL"] }),
        }),
        { params: Promise.resolve({ id: "editor-peer-2" }) }
      );
      expect(badRes.status).toBe(400);

      vi.spyOn(prisma.user, "update").mockResolvedValue({
        id: "editor-peer-2",
        role: "EDITOR",
        permissions: ["logistics_manage"],
      } as any);

      const okRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/editor-peer-2", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: ["logistics_manage"] }),
        }),
        { params: Promise.resolve({ id: "editor-peer-2" }) }
      );
      expect(okRes.status).toBe(200);
    });
  });
});
