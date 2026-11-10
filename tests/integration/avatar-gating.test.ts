import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as getAvatarsHandler } from "@/app/api/avatars/route";
import { PATCH as updateProfileHandler } from "@/app/api/users/profile/route";
import { POST as createAdminAvatarHandler } from "@/app/api/admin/avatars/route";
import * as authLib from "@/lib/auth";
import * as permissionsLib from "@/lib/permissions";
import { avatarLimiter, adminOperationsLimiter } from "@/lib/rateLimit";

describe("Desbloqueio Progressivo de Avatares e Rate Limit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(avatarLimiter, "check").mockReturnValue({
      success: true,
      remaining: 29,
      reset: Date.now() + 60000,
    } as any);
    vi.spyOn(adminOperationsLimiter, "check").mockReturnValue({
      success: true,
      remaining: 49,
      reset: Date.now() + 60000,
    } as any);
  });

  describe("1. Listagem de Avatares e Cálculo de Desbloqueio (/api/avatars)", () => {
    const mockPresets = [
      {
        id: "avatar-free",
        name: "Iniciante",
        imageUrl: "/avatars/free.png",
        minMonths: 0,
        minOrders: 0,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: "avatar-3m",
        name: "Veterano 3 Meses",
        imageUrl: "/avatars/vet3m.png",
        minMonths: 3,
        minOrders: 0,
        isActive: true,
        sortOrder: 2,
      },
      {
        id: "avatar-5ord",
        name: "Comprador Fiel",
        imageUrl: "/avatars/fiel5.png",
        minMonths: 0,
        minOrders: 5,
        isActive: true,
        sortOrder: 3,
      },
      {
        id: "avatar-vip",
        name: "Membro VIP",
        imageUrl: "/avatars/vip.png",
        minMonths: 6,
        minOrders: 10,
        isActive: true,
        sortOrder: 4,
      },
    ];

    it("bloqueia avatares com requisitos para usuário não logado ou recém-criado sem compras", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
      vi.spyOn(prisma.avatarPreset, "findMany").mockResolvedValue(mockPresets as any);

      const req = new Request("http://localhost:3000/api/avatars");
      const res = await getAvatarsHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveLength(4);

      // Free deve estar liberado
      const free = data.find((a: any) => a.id === "avatar-free");
      expect(free.isUnlocked).toBe(true);

      // Requisitos maiores que zero devem estar bloqueados
      const m3 = data.find((a: any) => a.id === "avatar-3m");
      expect(m3.isUnlocked).toBe(false);

      const ord5 = data.find((a: any) => a.id === "avatar-5ord");
      expect(ord5.isUnlocked).toBe(false);
    });

    it("desbloqueia por compras quando o cliente atinge a quantidade de pedidos concluídos", async () => {
      const user = {
        id: "user-buyer-1",
        role: "client",
        createdAt: new Date(), // Conta nova (0 meses)
        isRegistered: true,
      };

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(user as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(user as any);
      vi.spyOn(prisma.avatarPreset, "findMany").mockResolvedValue(mockPresets as any);
      vi.spyOn(prisma.order, "count").mockResolvedValue(5); // 5 pedidos concluídos

      const req = new Request("http://localhost:3000/api/avatars");
      const res = await getAvatarsHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      const ord5 = data.find((a: any) => a.id === "avatar-5ord");
      expect(ord5.isUnlocked).toBe(true);

      const vip = data.find((a: any) => a.id === "avatar-vip");
      expect(vip.isUnlocked).toBe(false); // VIP precisa de 10 pedidos ou 6 meses
    });

    it("desbloqueia por tempo de cadastro quando a conta atinge a idade em meses", async () => {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setDate(fourMonthsAgo.getDate() - 120);

      const user = {
        id: "user-old-1",
        role: "client",
        createdAt: fourMonthsAgo,
        isRegistered: true,
      };

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(user as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(user as any);
      vi.spyOn(prisma.avatarPreset, "findMany").mockResolvedValue(mockPresets as any);
      vi.spyOn(prisma.order, "count").mockResolvedValue(1);

      const req = new Request("http://localhost:3000/api/avatars");
      const res = await getAvatarsHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      const m3 = data.find((a: any) => a.id === "avatar-3m");
      expect(m3.isUnlocked).toBe(true);
    });
  });

  describe("2. Bloqueio ao Selecionar Avatar Não Desbloqueado (/api/users/profile PATCH)", () => {
    it("retorna 403 AVATAR_LOCKED quando o usuário tenta salvar um avatar bloqueado", async () => {
      const user = {
        id: "user-client-new",
        fullName: "Cliente Novo",
        role: "client",
        isRegistered: true,
        createdAt: new Date(),
      };

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(user as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(user as any);

      // Simula que o preset escolhido requer 6 meses e 10 pedidos
      vi.spyOn(prisma.avatarPreset, "findFirst").mockResolvedValue({
        id: "preset-locked",
        imageUrl: "/avatars/locked.png",
        minMonths: 6,
        minOrders: 10,
        name: "Lenda Pop",
      } as any);

      // Usuário tem 0 pedidos
      vi.spyOn(prisma.order, "count").mockResolvedValue(0);

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: "/avatars/locked.png",
        }),
      });

      const res = await updateProfileHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("AVATAR_LOCKED");
      expect(data.error).toContain("bloqueado");
    });

    it("permite salvar com sucesso quando o avatar é público (minMonths=0 e minOrders=0)", async () => {
      const user = {
        id: "user-client-new",
        fullName: "Cliente Novo",
        username: "clientenovo",
        email: "novo@popclub.com.br",
        phone: "65999991111",
        role: "client",
        isRegistered: true,
        createdAt: new Date(),
        avatarUrl: "/avatars/free.png",
      };

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(user as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(user as any);

      vi.spyOn(prisma.avatarPreset, "findFirst").mockResolvedValue({
        id: "preset-free",
        imageUrl: "/avatars/free.png",
        minMonths: 0,
        minOrders: 0,
        name: "Avatar Inicial",
      } as any);

      vi.spyOn(prisma.order, "count").mockResolvedValue(0);
      vi.spyOn(prisma.user, "update").mockResolvedValue({
        ...user,
        avatarUrl: "/avatars/free.png",
      } as any);

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: "/avatars/free.png",
        }),
      });

      const res = await updateProfileHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.avatar_url).toBe("/avatars/free.png");
    });

    it("bloqueia com 429 quando atinge o rate limit do avatarLimiter", async () => {
      const user = {
        id: "user-client-new",
        fullName: "Cliente Novo",
        role: "client",
        isRegistered: true,
      };

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(user as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(user as any);

      vi.spyOn(avatarLimiter, "check").mockReturnValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
      } as any);

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "/avatars/test.png" }),
      });

      const res = await updateProfileHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("3. Configuração Administrativa com Validação de Critérios (/api/admin/avatars POST)", () => {
    it("cria preset com minMonths e minOrders definidos pelo admin", async () => {
      const adminUser = {
        id: "admin-1",
        role: "admin",
        permissions: ["theme_manage"],
      };

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(permissionsLib, "hasPermission").mockReturnValue(true);
      vi.spyOn(prisma.avatarPreset, "count").mockResolvedValue(5);

      const createdAvatar = {
        id: "avatar-new",
        name: "Avatar Especial",
        description: "Avatar exclusivo para clientes fiéis",
        imageUrl: "/avatars/special.png",
        minMonths: 4,
        minOrders: 8,
        order: 10,
        isActive: true,
      };

      vi.spyOn(prisma.avatarPreset, "create").mockResolvedValue(createdAvatar as any);

      const req = new Request("http://localhost:3000/api/admin/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Avatar Especial",
          description: "Avatar exclusivo para clientes fiéis",
          imageUrl: "/avatars/special.png",
          minMonths: 4,
          minOrders: 8,
          order: 10,
        }),
      });

      const res = await createAdminAvatarHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.minMonths).toBe(4);
      expect(data.minOrders).toBe(8);
    });
  });
});
