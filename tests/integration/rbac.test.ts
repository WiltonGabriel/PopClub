import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { hasPermission, isUserAdmin, isUserEditor } from "@/lib/permissions";
import { PATCH as toggleConveyor } from "@/app/api/admin/conveyor/toggle/route";
import { PATCH as reorderCategories } from "@/app/api/categories/reorder/route";
import { PUT as updateSettings } from "@/app/api/settings/route";
import { POST as createProduct } from "@/app/api/products/route";
import { PUT as updateProduct, DELETE as deleteProduct } from "@/app/api/products/[id]/route";
import { POST as createCategory } from "@/app/api/categories/route";
import { DELETE as deleteCategory } from "@/app/api/categories/[id]/route";
import { POST as uploadFile } from "@/app/api/upload/route";
import { prisma } from "@/lib/prisma";
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

  describe("Proteção de Borda e Middleware Nativo (src/proxy.ts)", () => {
    it("redireciona requisição anônima em /admin para /login com parâmetro de redirect", async () => {
      const req = new NextRequest("http://localhost:3000/admin");
      const res = await proxy(req);
      expect(res.status).toBe(307); // NextResponse.redirect default é 307
      expect(res.headers.get("location")).toContain("/login?redirect=%2Fadmin");
    });

    it("redireciona requisição anônima em /admin/pedidos para /login com parâmetro de redirect", async () => {
      const req = new NextRequest("http://localhost:3000/admin/pedidos");
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?redirect=%2Fadmin%2Fpedidos");
    });

    it("redireciona cliente comum (role: client) tentando acessar /admin para tela de login", async () => {
      const clientToken = auth.signToken({
        userId: "client-id-1",
        role: "client",
        isRegistered: true,
      });

      const req = new NextRequest("http://localhost:3000/admin", {
        headers: { cookie: `popshake_session=${clientToken}` },
      });

      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/login?redirect=%2Fadmin");
    });

    it("bloqueia EDITOR em /admin/usuarios e redireciona para /admin/pedidos com flag de não-autorizado", async () => {
      const editorToken = auth.signToken({
        userId: "editor-id-1",
        role: "editor",
        isRegistered: true,
      });

      const req = new NextRequest("http://localhost:3000/admin/usuarios", {
        headers: { cookie: `popshake_session=${editorToken}` },
      });

      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/admin/pedidos?unauthorized=true");
    });

    it("concede acesso a ADMIN em /admin/usuarios sem redirecionamento", async () => {
      const adminToken = auth.signToken({
        userId: "admin-id-1",
        role: "admin",
        isRegistered: true,
      });

      const req = new NextRequest("http://localhost:3000/admin/usuarios", {
        headers: { cookie: `popshake_session=${adminToken}` },
      });

      const res = await proxy(req);
      // NextResponse.next() não possui cabeçalho de redirecionamento location
      expect(res.headers.get("location")).toBeNull();
    });

    it("permite tráfego livre e direto em rotas públicas sem qualquer exigência de autenticação de borda", async () => {
      const publicUrls = [
        "http://localhost:3000/",
        "http://localhost:3000/busca",
        "http://localhost:3000/rastreamento",
        "http://localhost:3000/privacidade",
        "http://localhost:3000/termos",
      ];

      for (const url of publicUrls) {
        const req = new NextRequest(url);
        const res = await proxy(req);
        expect(res.headers.get("location")).toBeNull();
      }
    });
  });

  describe("Proteção de Endpoints de Mutação de Catálogo e Mídia", () => {
    it("bloqueia POST /api/products sem sessão válida com HTTP 403 Forbidden", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Produto Inválido", price: 10 }),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Acesso negado");
    });

    it("bloqueia PUT /api/products/[id] para CLIENT com HTTP 403 Forbidden", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "client-id",
        role: "CLIENT",
        permissions: [],
      } as any);

      const req = new Request("http://localhost:3000/api/products/prod-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Tentativa de Alteração" }),
      });

      const res = await updateProduct(req, { params: Promise.resolve({ id: "prod-1" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Acesso negado");
    });

    it("bloqueia DELETE /api/products/[id] para CLIENT com HTTP 403 Forbidden", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "client-id",
        role: "CLIENT",
        permissions: [],
      } as any);

      const req = new Request("http://localhost:3000/api/products/prod-1", {
        method: "DELETE",
      });

      const res = await deleteProduct(req, { params: Promise.resolve({ id: "prod-1" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Acesso negado");
    });

    it("bloqueia POST /api/categories para usuário sem permissão menu_manage com HTTP 403 Forbidden", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "editor-id",
        role: "EDITOR",
        permissions: ["ORDERS_KANBAN"],
      } as any);

      const req = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nova Categoria Maliciosa" }),
      });

      const res = await createCategory(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Acesso negado");
    });

    it("bloqueia DELETE /api/categories/[id] para usuário anônimo com HTTP 403 Forbidden", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/categories/cat-1", {
        method: "DELETE",
      });

      const res = await deleteCategory(req, { params: Promise.resolve({ id: "cat-1" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Acesso negado");
    });

    it("bloqueia POST /api/upload para usuários não-administradores com HTTP 403 Forbidden", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "editor-id",
        role: "EDITOR",
      } as any);

      const req = new Request("http://localhost:3000/api/upload", {
        method: "POST",
      });

      const res = await uploadFile(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Acesso negado");
    });
  });

  describe("Integridade de Sessão e Revogação Dinâmica via tokenVersion", () => {
    it("recusa autenticação quando tokenVersion no banco for divergente do payload JWT", async () => {
      const token = auth.signToken({
        userId: "user-revoked-1",
        role: "client",
        tokenVersion: 1, // Token emitido na versão 1
      });

      // No banco, a versão foi incrementada para 2 (ex: troca de senha ou logout remoto)
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-revoked-1",
        role: "CLIENT",
        isActive: true,
        isBlocked: false,
        tokenVersion: 2,
        permissions: [],
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/test", {
        headers: { cookie: `popshake_session=${token}` },
      });

      const user = await auth.getAuthUser(req);
      expect(user).toBeNull();
    });

    it("recusa autenticação de usuário inativo (isActive: false)", async () => {
      const token = auth.signToken({
        userId: "user-inactive-1",
        role: "client",
        tokenVersion: 1,
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-inactive-1",
        role: "CLIENT",
        isActive: false, // Usuário desativado logicamente
        isBlocked: false,
        tokenVersion: 1,
        permissions: [],
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/test", {
        headers: { cookie: `popshake_session=${token}` },
      });

      const user = await auth.getAuthUser(req);
      expect(user).toBeNull();
    });

    it("recusa autenticação de usuário bloqueado administrativamente (isBlocked: true)", async () => {
      const token = auth.signToken({
        userId: "user-blocked-1",
        role: "client",
        tokenVersion: 1,
      });

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-blocked-1",
        role: "CLIENT",
        isActive: true,
        isBlocked: true, // Bloqueado
        tokenVersion: 1,
        permissions: [],
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/test", {
        headers: { cookie: `popshake_session=${token}` },
      });

      const user = await auth.getAuthUser(req);
      expect(user).toBeNull();
    });

    it("rejeita tokens com assinatura inválida ou adulterados", () => {
      const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmb3JnZWQiLCJyb2xlIjoiYWRtaW4ifQ.tampered_signature";
      const payload = auth.verifyToken(forgedToken);
      expect(payload).toBeNull();
    });
  });
});
