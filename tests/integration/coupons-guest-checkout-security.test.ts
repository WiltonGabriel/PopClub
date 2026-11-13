import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { couponLimiter, couponFailedAttemptsLimiter } from "@/lib/rateLimit";
import { POST as validateCoupon } from "@/app/api/coupons/validate/route";

describe("Segurança em Cupons e Preservação do Checkout Visitante", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.loyaltyBadgeConfig, "findMany").mockResolvedValue([]);
    couponLimiter.reset("10.0.0.55");
    couponFailedAttemptsLimiter.reset("failed_coupon:10.0.0.55");
  });

  it("aprova cupom público válido para visitante não autenticado e ignora userId/phone arbitrários (anti-IDOR)", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);

    vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue({
      id: "cp-public-1",
      code: "POP10",
      isActive: true,
      discountType: "percentage",
      discountValue: 10,
      minOrderValue: 15,
      maxUses: 100,
      uses: 5,
      oncePerUser: true,
      firstOrderOnly: false,
      minLoyaltyLevel: null,
      loyaltyBadgeId: null,
      expiresAt: null,
      productIds: [],
    } as any);

    const userLookupSpy = vi.spyOn(prisma.user, "findUnique");
    const priorOrderSpy = vi.spyOn(prisma.order, "findFirst");

    const req = new Request("http://localhost:3000/api/coupons/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.55",
      },
      body: JSON.stringify({
        code: "POP10",
        subtotal: 40,
        userId: "victim-user-id-999",
        phone: "65999998888",
        customerPhone: "65999997777",
      }),
    });

    const res = await validateCoupon(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.coupon.discountAmount).toBe(4);

    // Garantir que nenhum dado de terceiro foi consultado no banco
    expect(userLookupSpy).not.toHaveBeenCalled();
    expect(priorOrderSpy).not.toHaveBeenCalled();
  });

  it("bloqueia cupom exclusivo VIP para visitante anônimo tentando spoofing de userId VIP", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);

    vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue({
      id: "cp-vip-1",
      code: "VIP20",
      isActive: true,
      discountType: "percentage",
      discountValue: 20,
      minOrderValue: 0,
      maxUses: 100,
      uses: 0,
      oncePerUser: false,
      firstOrderOnly: false,
      minLoyaltyLevel: 3,
      loyaltyBadgeId: "badge_ouro",
      expiresAt: null,
      productIds: [],
    } as any);

    vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue(null);
    const userLookupSpy = vi.spyOn(prisma.user, "findUnique");

    const req = new Request("http://localhost:3000/api/coupons/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.55",
      },
      body: JSON.stringify({
        code: "VIP20",
        subtotal: 50,
        userId: "vip-real-user-123",
      }),
    });

    const res = await validateCoupon(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(userLookupSpy).not.toHaveBeenCalled();
  });

  it("verifica uso prévio real quando o cliente está autenticado", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "client-auth-1",
      role: "client",
      isRegistered: true,
      phone: "65999990001",
    } as any);

    vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue({
      id: "cp-once-1",
      code: "UNICO10",
      isActive: true,
      discountType: "fixed",
      discountValue: 10,
      minOrderValue: 20,
      maxUses: 100,
      uses: 1,
      oncePerUser: true,
      firstOrderOnly: false,
      minLoyaltyLevel: null,
      loyaltyBadgeId: null,
      expiresAt: null,
      productIds: [],
    } as any);

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      createdAt: new Date(),
      isRegistered: true,
    } as any);
    vi.spyOn(prisma.order, "count").mockResolvedValue(1);
    const priorOrderSpy = vi.spyOn(prisma.order, "findFirst").mockResolvedValue({
      id: "ord-prev-1",
    } as any);

    const req = new Request("http://localhost:3000/api/coupons/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.55",
      },
      body: JSON.stringify({
        code: "UNICO10",
        subtotal: 50,
      }),
    });

    const res = await validateCoupon(req);
    expect(res.status).toBe(400);
    expect(priorOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ userId: "client-auth-1" }, { user: { phone: "65999990001" } }],
        }),
      })
    );
  });
});
