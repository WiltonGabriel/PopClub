import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as validateCouponHandler } from "@/app/api/coupons/validate/route";
import { GET as getAdminUsersHandler } from "@/app/api/admin/users/route";
import { getTargetClients } from "@/app/api/notifications/helpers";
import { DEFAULT_LOYALTY_BADGES } from "@/services/loyaltyBadgeService";
import * as authLib from "@/lib/auth";

describe("Unificação dos Critérios de Fidelidade (Meses + Pedidos + Selo Real)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Validação de Cupom (/api/coupons/validate)", () => {
    const goldCoupon = {
      id: "coupon-gold",
      code: "OUROVIP",
      discountType: "percentage",
      discountValue: 15,
      minOrderValue: 20,
      maxUses: null,
      uses: 0,
      isActive: true,
      expiresAt: null,
      productIds: [],
      oncePerUser: false,
      requiresRegistration: true,
      minLoyaltyLevel: 4, // Cliente Ouro VIP: 12 meses ou 25 pedidos concluídos
      loyaltyBadgeId: "badge_ouro",
    };

    it("rejeita cliente com apenas 4 compras concluídas em cupom Ouro (nível 4)", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "user-bronze-4",
        role: "client",
        isRegistered: true,
      } as any);

      vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue(goldCoupon as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        createdAt: new Date(), // 0 meses
        isRegistered: true,
      } as any);
      vi.spyOn(prisma.order, "count").mockResolvedValue(4);
      vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue({
        category: "loyalty_badges",
        message: JSON.stringify(DEFAULT_LOYALTY_BADGES),
      } as any);

      const req = new Request("http://localhost:3000/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "OUROVIP", subtotal: 50 }),
      });

      const res = await validateCouponHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data.code).toBe("COUPON_REQUIRES_LOYALTY_BADGE");
    });

    it("aprova cliente novo na base que atingiu 25 compras concluídas no selo Ouro", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "user-gold-25",
        role: "client",
        isRegistered: true,
      } as any);

      vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue(goldCoupon as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        createdAt: new Date(), // 0 meses, mas 25 compras!
        isRegistered: true,
      } as any);
      vi.spyOn(prisma.order, "count").mockResolvedValue(25);
      vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue({
        category: "loyalty_badges",
        message: JSON.stringify(DEFAULT_LOYALTY_BADGES),
      } as any);

      const req = new Request("http://localhost:3000/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "OUROVIP", subtotal: 50 }),
      });

      const res = await validateCouponHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.coupon.discountAmount).toBe(7.5);
    });
  });

  describe("2. Filtro de Selo Real e Pedidos no Painel de Usuários (/api/admin/users GET)", () => {
    it("filtra usuários por loyaltyBadgeLevel considerando pedidos concluídos além de meses", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "admin-1",
        role: "ADMIN",
      } as any);

      vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue({
        category: "loyalty_badges",
        message: JSON.stringify(DEFAULT_LOYALTY_BADGES),
      } as any);

      const now = new Date();
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        {
          id: "u-novo",
          createdAt: now,
          orders: [],
          _count: { orders: 0 },
        },
        {
          id: "u-bronze-by-orders",
          createdAt: now, // 0 meses, mas 3 pedidos concluídos -> Cliente Bronze (nível 2)
          orders: [
            { status: "completed" },
            { status: "completed" },
            { status: "completed" },
          ],
          _count: { orders: 3 },
        },
      ] as any);

      const req = new Request("http://localhost:3000/api/admin/users?loyaltyBadgeLevel=2");
      const res = await getAdminUsersHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].id).toBe("u-bronze-by-orders");
      expect(data.users[0].orders).toBeUndefined();
    });
  });

  describe("3. Segmentação de Disparo por Selo de Fidelidade (getTargetClients)", () => {
    it("seleciona cliente com selo Ouro desbloqueado por 25 pedidos concluídos mesmo sem 12 meses de conta", async () => {
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        {
          id: "client-novo",
          role: "CLIENT",
          createdAt: new Date(),
          orders: [{ id: "o1", createdAt: new Date(), status: "completed" }],
        },
        {
          id: "client-ouro-orders",
          role: "CLIENT",
          createdAt: new Date(),
          orders: Array.from({ length: 25 }, (_, i) => ({
            id: `o-${i}`,
            createdAt: new Date(),
            status: "completed",
          })),
        },
      ] as any);

      vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue({
        category: "loyalty_badges",
        message: JSON.stringify(DEFAULT_LOYALTY_BADGES),
      } as any);

      const selected = await getTargetClients("LOYALTY", ["badge_ouro"]);
      expect(selected.map((u) => u.id)).toEqual(["client-ouro-orders"]);
    });
  });
});
