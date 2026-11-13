import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { couponLimiter, couponFailedAttemptsLimiter } from "@/lib/rateLimit";
import { POST as validateCoupon } from "@/app/api/coupons/validate/route";
import { GET as getCouriers } from "@/app/api/couriers/route";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { GET as getSettings, PUT as putSettings } from "@/app/api/settings/route";
import { GET as getProducts } from "@/app/api/products/route";
import { GET as getPromotions } from "@/app/api/promotions/route";
import { GET as getBanner } from "@/app/api/banner/route";
import { GET as getBadges } from "@/app/api/badges/route";
import { POST as createRole } from "@/app/api/admin/roles/route";
import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route";

describe("Suíte de Regressão Pré-Lançamento (Fases 1–3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({ id: "audit-1" } as any);
    vi.spyOn(prisma.loyaltyBadgeConfig, "findMany").mockResolvedValue([]);
    couponLimiter.reset("10.10.0.1");
    couponFailedAttemptsLimiter.reset("failed_coupon:10.10.0.1");
  });

  it("1. Checkout visitante + validação de cupom público funciona sem autenticação e sem IDOR", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
    vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue({
      id: "cp-1",
      code: "BEMVINDO10",
      isActive: true,
      discountType: "fixed",
      discountValue: 10,
      minOrderValue: 20,
      maxUses: 50,
      uses: 0,
      oncePerUser: false,
      firstOrderOnly: false,
      minLoyaltyLevel: null,
      loyaltyBadgeId: null,
      expiresAt: null,
      productIds: [],
    } as any);

    const req = new Request("http://localhost:3000/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.10.0.1" },
      body: JSON.stringify({ code: "BEMVINDO10", subtotal: 50, userId: "someone-else" }),
    });
    const res = await validateCoupon(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.coupon.discountAmount).toBe(10);
  });

  it("2. Despacho de pedidos via ORDERS_KANBAN recebe lista operacional sem vazar pixKey", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "editor-kanban",
      role: "editor",
      permissions: ["ORDERS_KANBAN"],
    } as any);
    vi.spyOn(prisma.courier, "findMany").mockResolvedValue([
      {
        id: "cour-1",
        name: "Carlos Motoboy",
        phone: "65999990000",
        vehicle: "Moto",
        plate: "ABC-1234",
        pixKey: "carlos@pix.com",
        status: "available",
        isActive: true,
      },
    ] as any);

    const res = await getCouriers(new Request("http://localhost:3000/api/couriers"));
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Carlos Motoboy");
    expect(list[0].pixKey).toBeUndefined();
    expect(list[0].vehicle).toBe("Moto");
  });

  it("3. Notificações autenticadas para cliente não quebram e filtram por usuário", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "client-1",
      role: "client",
      permissions: [],
    } as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      notificationsEnabled: true,
      fullName: "Cliente Teste",
      username: "cliente",
    } as any);
    vi.spyOn(prisma.notification, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.userNotification, "findMany").mockResolvedValue([]);

    const res = await getNotifications(new Request("http://localhost:3000/api/notifications"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("notifications");
    expect(data).toHaveProperty("unreadCount");
  });

  it("4. Configurações de Canais, WhatsApp, templates e storeCnpj persistem sem regressão", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);
    vi.spyOn(prisma.storeSettings, "upsert").mockResolvedValue({
      id: "store_config",
      storeName: "Pop Shake",
      deliveryFee: 5,
      freeDeliveryThreshold: 60,
      isOpen: true,
      currentShiftId: null,
      estimatedDeliveryTime: "30-45 min",
      estimatedTimePresets: ["20-30 min"],
      rejectionReasonPresets: ["Fechado"],
      storeCnpj: "12.345.678/0001-90",
      whatsappNumber: "5565999998888",
      whatsappMessage: "Olá PopShake!",
      orderNotificationTemplates: { pending: "Recebido #{codigo_pedido}" },
      openedAt: null,
      closedAt: null,
      updatedAt: new Date(),
    } as any);

    const putRes = await putSettings(
      new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeCnpj: "12.345.678/0001-90",
          whatsappNumber: "5565999998888",
          whatsappMessage: "Olá PopShake!",
          orderNotificationTemplates: { pending: "Recebido #{codigo_pedido}" },
        }),
      })
    );
    expect(putRes.status).toBe(200);
    const saved = await putRes.json();
    expect(saved.settings.storeCnpj).toBe("12.345.678/0001-90");
    expect(saved.settings.whatsappNumber).toBe("5565999998888");
  });

  it("5. Vitrine pública (produtos, promoções, banner, selos e settings) permanece acessível sem login", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
    vi.spyOn(prisma.product, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.highlightBanner, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.cardBadge, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
      id: "store_config",
      storeName: "Pop Shake",
      storeCnpj: "12.345.678/0001-90",
      isOpen: true,
      deliveryFee: 5,
    } as any);

    expect((await getProducts()).status).toBe(200);
    expect((await getPromotions(new Request("http://localhost:3000/api/promotions"))).status).toBe(200);
    expect((await getBanner()).status).toBe(200);
    expect((await getBadges()).status).toBe(200);
    const settingsRes = await getSettings();
    expect(settingsRes.status).toBe(200);
  });

  it("6. Administrador mantém controle total enquanto Editor não consegue criar cargos ou acessar Auditoria", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "editor-1",
      role: "editor",
      permissions: ["users_manage", "settings_manage", "metrics_view"],
    } as any);

    const roleAttempt = await createRole(
      new Request("http://localhost:3000/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "SubAdmin", permissions: ["users_manage"] }),
      })
    );
    expect(roleAttempt.status).toBe(403);

    const auditAttempt = await getAuditLogs(
      new Request("http://localhost:3000/api/admin/audit-logs")
    );
    expect(auditAttempt.status).toBe(403);

    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);
    vi.spyOn(prisma.adminAuditLog, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.adminAuditLog, "count").mockResolvedValue(0);

    const adminAuditRes = await getAuditLogs(
      new Request("http://localhost:3000/api/admin/audit-logs")
    );
    expect(adminAuditRes.status).toBe(200);
  });
});
