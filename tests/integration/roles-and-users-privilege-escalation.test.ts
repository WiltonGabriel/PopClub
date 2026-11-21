import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { repairMojibake } from "@/lib/sanitize";
import { MAX_ACTIVE_ADMINS } from "@/domain/services/RbacDomainService";
import { authLimiter } from "@/lib/rateLimit";
import { GET as listUsers, POST as createUser } from "@/app/api/admin/users/route";
import { GET as listRoles, POST as createRole } from "@/app/api/admin/roles/route";
import { PATCH as updateRole, DELETE as deleteRole } from "@/app/api/admin/roles/[id]/route";
import { PATCH as updateUser, DELETE as deleteUser } from "@/app/api/admin/users/[id]/route";
import { GET as listOrders } from "@/app/api/orders/route";
import { POST as loginUser } from "@/app/api/auth/login/route";

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

    it("exige e-mail ou WhatsApp e preserva permissions: [] explícito ao criar EDITOR", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(fullAdmin as any);

      const missingContactRes = await createUser(
        new Request("http://localhost:3000/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "Sem Contato",
            password: "Password123!",
            role: "EDITOR",
          }),
        })
      );
      expect(missingContactRes.status).toBe(400);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const createSpy = vi.spyOn(prisma.user, "create").mockResolvedValue({
        id: "ed-empty",
        fullName: "Editor Restrito",
        email: "restrito@popclub.com",
        role: "EDITOR",
        permissions: [],
        customRoleId: null,
      } as any);

      const emptyPermsRes = await createUser(
        new Request("http://localhost:3000/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "Editor Restrito",
            email: "restrito@popclub.com",
            password: "Password123!",
            role: "EDITOR",
            permissions: [],
          }),
        })
      );
      expect(emptyPermsRes.status).toBe(201);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            permissions: [],
          }),
        })
      );
    });

    it("não incrementa tokenVersion (evita auto-logout) quando ADMIN edita o próprio perfil sem trocar cargo", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(fullAdmin as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "admin-root-1",
        role: "ADMIN",
        fullName: "Admin Original",
        email: "admin@popclub.com",
        permissions: [],
        customRoleId: null,
        customRole: null,
        isActive: true,
        isBlocked: false,
      } as any);
      const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
        id: "admin-root-1",
        role: "ADMIN",
        fullName: "Admin Atualizado",
        email: "admin@popclub.com",
      } as any);

      const res = await updateUser(
        new Request("http://localhost:3000/api/admin/users/admin-root-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "Admin Atualizado",
            role: "ADMIN",
            customRoleId: null,
          }),
        }),
        { params: Promise.resolve({ id: "admin-root-1" }) }
      );

      expect(res.status).toBe(200);
      const updateCall = updateSpy.mock.calls[0]?.[0];
      expect(updateCall?.data).not.toHaveProperty("tokenVersion");
    });

    it("filtra deletedAt: null em filter=blocked, retorna summary global para ADMIN e restringe EDITOR a CLIENT", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(fullAdmin as any);
      const countSpy = vi
        .spyOn(prisma.user, "count")
        .mockResolvedValueOnce(1) // activeAdminsCount
        .mockResolvedValueOnce(3) // teamCount
        .mockResolvedValueOnce(12) // clientsCount
        .mockResolvedValueOnce(2) // blockedCount
        .mockResolvedValueOnce(0); // list total
      vi.spyOn(prisma.customRole, "count").mockResolvedValue(2);
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([]);

      const blockedRes = await listUsers(
        new Request("http://localhost:3000/api/admin/users?filter=blocked&includeSummary=true")
      );
      expect(blockedRes.status).toBe(200);
      const blockedJson = await blockedRes.json();
      expect(blockedJson.summary).toEqual({
        activeAdminsCount: 1,
        maxAdmins: 6,
        teamCount: 3,
        clientsCount: 12,
        blockedCount: 2,
        customRolesCount: 2,
        maxCustomRoles: 4,
      });
      expect(MAX_ACTIVE_ADMINS).toBe(6);
      // O 5º call (list total) deve filtrar isBlocked: true e deletedAt: null
      expect(countSpy.mock.calls[4]?.[0]?.where).toEqual(
        expect.objectContaining({
          isBlocked: true,
          deletedAt: null,
        })
      );

      // Editor com users_manage é sempre restrito a Role.CLIENT
      vi.restoreAllMocks();
      vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({} as any);
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(editorWithUsersManage as any);
      const editorFindMany = vi.spyOn(prisma.user, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.user, "count").mockResolvedValue(0);

      const editorListRes = await listUsers(
        new Request("http://localhost:3000/api/admin/users?filter=admin")
      );
      expect(editorListRes.status).toBe(200);
      expect(editorFindMany.mock.calls[0]?.[0]?.where).toEqual(
        expect.objectContaining({
          role: "CLIENT",
          deletedAt: null,
        })
      );
    });

    it("exige verificação de senha do ADMIN (step-up auth) para promover CLIENT registrado a ADMIN e bloqueia EDITOR/CLIENT ou senha incorreta", async () => {
      const adminPasswordHash = await authLib.hashPassword("AdminMaster123!");
      const registeredClient = {
        id: "client-reg-1",
        role: "CLIENT",
        fullName: "Cliente Fiel",
        email: "cliente@popclub.com",
        isRegistered: true,
        isActive: true,
        isBlocked: false,
        deletedAt: null,
        permissions: [],
        customRoleId: null,
        customRole: null,
      };

      // 1. Tentativa por EDITOR com users_manage -> 403
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(editorWithUsersManage as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(registeredClient as any);

      const editorPromoteRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN", adminPassword: "AdminMaster123!" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(editorPromoteRes.status).toBe(403);

      // 2. Tentativa pelo próprio CLIENT -> 403
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "client-reg-1",
        role: "client",
        permissions: [],
      } as any);

      const selfPromoteRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN", adminPassword: "AdminMaster123!" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(selfPromoteRes.status).toBe(403);

      // 3. Tentativa por ADMIN sem informar adminPassword -> 400
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(fullAdmin as any);
      const noPassRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(noPassRes.status).toBe(400);

      // 4. Tentativa por ADMIN sem senha local definida (conta Google) -> 400 orientando ir em Meu Perfil
      vi.spyOn(prisma.user, "findUnique")
        .mockResolvedValueOnce(registeredClient as any)
        .mockResolvedValueOnce({ id: "admin-root-1", passwordHash: null } as any);

      const noHashRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN", adminPassword: "QualquerSenha123!" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(noHashRes.status).toBe(400);
      const noHashBody = await noHashRes.json();
      expect(noHashBody.error).toContain("Meu Perfil");

      // 5. Tentativa por ADMIN com adminPassword incorreta -> 401
      vi.spyOn(prisma.user, "findUnique")
        .mockResolvedValueOnce(registeredClient as any)
        .mockResolvedValueOnce({ id: "admin-root-1", passwordHash: adminPasswordHash } as any);

      const wrongPassRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN", adminPassword: "SenhaErrada999!" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(wrongPassRes.status).toBe(401);

      // 6. Tentativa por ADMIN em cliente de Acesso Rápido (isRegistered: false) -> 400
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        ...registeredClient,
        isRegistered: false,
      } as any);

      const fastAccessRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN", adminPassword: "AdminMaster123!" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(fastAccessRes.status).toBe(400);

      // 6. Promoção autorizada por ADMIN com adminPassword válida -> 200
      vi.spyOn(prisma.user, "findUnique")
        .mockResolvedValueOnce(registeredClient as any)
        .mockResolvedValueOnce({ id: "admin-root-1", passwordHash: adminPasswordHash } as any);
      vi.spyOn(prisma.user, "count").mockResolvedValueOnce(1);
      const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValueOnce({
        ...registeredClient,
        role: "ADMIN",
        tokenVersion: 2,
      } as any);

      const okPromoteRes = await updateUser(
        new Request("http://localhost:3000/api/admin/users/client-reg-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "ADMIN", adminPassword: "AdminMaster123!" }),
        }),
        { params: Promise.resolve({ id: "client-reg-1" }) }
      );
      expect(okPromoteRes.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "client-reg-1" },
          data: expect.objectContaining({
            role: "ADMIN",
            customRoleId: null,
            permissions: [],
            tokenVersion: { increment: 1 },
          }),
        })
      );
    });

    it("repara strings com mojibake UTF-8/Latin-1 mantendo acentuação legítima intacta", () => {
      expect(repairMojibake("Oi Wilton! JÃ¡ pediu seu aÃ§aÃ­ cremoso hoje?")).toBe(
        "Oi Wilton! Já pediu seu açaí cremoso hoje?"
      );
      expect(repairMojibake("Já pediu seu açaí cremoso hoje? 🍧")).toBe(
        "Já pediu seu açaí cremoso hoje? 🍧"
      );
    });
  });

  describe("Contratos Operacionais (metrics_view em /api/orders e Bloqueio no Login)", () => {
    it("permite que EDITOR apenas com metrics_view liste todos os pedidos via GET /api/orders?all=true", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "editor-metrics",
        role: "editor",
        permissions: ["metrics_view"],
      } as any);
      const findManySpy = vi.spyOn(prisma.order, "findMany").mockResolvedValue([]);

      const res = await listOrders(new Request("http://localhost:3000/api/orders?all=true"));
      expect(res.status).toBe(200);
      // Não pode restringir ao userId pessoal quando metrics_view está ativo
      expect(findManySpy.mock.calls[0]?.[0]?.where).toEqual({ isArchived: false });
    });

    it("bloqueia login (403) para contas bloqueadas ou desativadas e emite canManageUsers no JWT", async () => {
      vi.spyOn(authLimiter, "check").mockReturnValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
        retryAfter: 0,
      });

      const passwordHash = await authLib.hashPassword("SenhaForte123!");

      // Conta bloqueada -> 403 com motivo
      vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
        id: "cli-blocked",
        email: "bloqueado@popclub.com",
        passwordHash,
        role: "CLIENT",
        permissions: [],
        customRole: null,
        isActive: true,
        deletedAt: null,
        isBlocked: true,
        blockReason: "Fraude confirmada",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      const blockedRes = await loginUser(
        new Request("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: "bloqueado@popclub.com", password: "SenhaForte123!" }),
        })
      );
      expect(blockedRes.status).toBe(403);
      const blockedBody = await blockedRes.json();
      expect(blockedBody.error).toContain("Fraude confirmada");

      // Conta desativada -> 403
      vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
        id: "cli-inactive",
        email: "inativo@popclub.com",
        passwordHash,
        role: "CLIENT",
        permissions: [],
        customRole: null,
        isActive: false,
        deletedAt: new Date(),
        isBlocked: false,
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      const inactiveRes = await loginUser(
        new Request("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: "inativo@popclub.com", password: "SenhaForte123!" }),
        })
      );
      expect(inactiveRes.status).toBe(403);

      // Editor com users_manage via customRole recebe token com canManageUsers: true
      vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
        id: "ed-mod-custom",
        email: "mod@popclub.com",
        passwordHash,
        role: "EDITOR",
        permissions: [],
        customRole: { permissions: ["users_manage"] },
        isActive: true,
        deletedAt: null,
        isBlocked: false,
        isRegistered: true,
        tokenVersion: 2,
      } as any);

      const okRes = await loginUser(
        new Request("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: "mod@popclub.com", password: "SenhaForte123!" }),
        })
      );
      expect(okRes.status).toBe(200);
      const okBody = await okRes.json();
      const verified = authLib.verifyToken(okBody.token);
      expect(verified?.canManageUsers).toBe(true);
    });
  });
});
