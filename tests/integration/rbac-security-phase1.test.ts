import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { deliveryPinLimiter, routeCalculateLimiter } from "@/lib/rateLimit";
import { GET as getCouriers, POST as createCourier } from "@/app/api/couriers/route";
import { PATCH as patchCourierStatus } from "@/app/api/couriers/[id]/status/route";
import { GET as getAudience, POST as createAudience } from "@/app/api/audience/route";
import { DELETE as deleteAudience } from "@/app/api/audience/[id]/route";
import { POST as sendNotification } from "@/app/api/notifications/route";
import { GET as getAudienceCount } from "@/app/api/notifications/audience-count/route";
import { GET as getTemplates } from "@/app/api/notifications/templates/route";
import { getTargetClients } from "@/app/api/notifications/helpers";
import { PUT as updateBanner } from "@/app/api/banner/route";
import { POST as createBadge } from "@/app/api/badges/route";
import { POST as createTag } from "@/app/api/tags/route";
import { PUT as updateLoyaltyBadges } from "@/app/api/settings/loyalty-badges/route";
import { PUT as updateLoadingSettings } from "@/app/api/settings/loading/route";
import { POST as createAvatar } from "@/app/api/admin/avatars/route";
import { POST as uploadAsset } from "@/app/api/upload/route";
import { POST as purgeInactive } from "@/app/api/admin/maintenance/purge-inactive/route";
import { POST as calculateRoute } from "@/app/api/routes/route";
import { GET as reverseGeocode } from "@/app/api/geocode/reverse/route";
import { POST as completeDelivery } from "@/app/api/delivery/[token]/complete/route";

describe("Hardening de Segurança Fase 1 — Entregadores, CRM, Visual, Fidelidade e Geo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({} as any);
    vi.spyOn(prisma.loyaltyBadgeConfig, "findMany").mockResolvedValue([]);
  });

  const adminUser = { id: "admin-1", role: "admin", permissions: [] };
  const kanbanOnlyEditor = { id: "ed-kanban", role: "editor", permissions: ["ORDERS_KANBAN"] };
  const logisticsEditor = { id: "ed-log", role: "editor", permissions: ["logistics_manage"] };
  const notifEditor = { id: "ed-notif", role: "editor", permissions: ["notifications_manage"] };
  const loyaltyEditor = { id: "ed-loyalty", role: "editor", permissions: ["loyalty_manage"] };

  describe("1. Logística & Entregadores (/api/couriers)", () => {
    it("bloqueia GET /api/couriers não autenticado (401) e oculta pixKey para ORDERS_KANBAN", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
      const unauthRes = await getCouriers(new Request("http://localhost:3000/api/couriers"));
      expect(unauthRes.status).toBe(401);

      const sampleCouriers = [
        {
          id: "c-1",
          name: "Carlos",
          phone: "65999990000",
          vehicle: "Moto",
          plate: "ABC-1234",
          pixKey: "pix-secreto@banco.com",
          status: "available",
          isActive: true,
        },
      ];
      vi.spyOn(prisma.courier, "findMany").mockResolvedValue(sampleCouriers as any);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(kanbanOnlyEditor as any);
      const kanbanRes = await getCouriers(new Request("http://localhost:3000/api/couriers"));
      expect(kanbanRes.status).toBe(200);
      const kanbanData = await kanbanRes.json();
      expect(kanbanData[0].pixKey).toBeUndefined();
      expect(kanbanData[0].phone).toBe("65999990000");

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(logisticsEditor as any);
      const logRes = await getCouriers(new Request("http://localhost:3000/api/couriers"));
      expect(logRes.status).toBe(200);
      const logData = await logRes.json();
      expect(logData[0].pixKey).toBe("pix-secreto@banco.com");
    });

    it("bloqueia criação e troca de status com apenas ORDERS_KANBAN (403) e permite logistics_manage", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(kanbanOnlyEditor as any);
      const deniedCreate = await createCourier(
        new Request("http://localhost:3000/api/couriers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Lucas", phone: "65999991111" }),
        })
      );
      expect(deniedCreate.status).toBe(403);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(logisticsEditor as any);
      vi.spyOn(prisma.courier, "update").mockResolvedValue({ id: "c-1", status: "in_transit" } as any);

      const okStatus = await patchCourierStatus(
        new Request("http://localhost:3000/api/couriers/c-1/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_transit" }),
        }),
        { params: Promise.resolve({ id: "c-1" }) }
      );
      expect(okStatus.status).toBe(200);
    });
  });

  describe("2. CRM, Audiência e Disparos (/api/audience & /api/notifications)", () => {
    it("exige autenticação e notifications_manage em /api/audience e /api/audience/[id]", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
      expect((await getAudience(new Request("http://localhost:3000/api/audience"))).status).toBe(401);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(kanbanOnlyEditor as any);
      expect(
        (
          await createAudience(
            new Request("http://localhost:3000/api/audience", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "VIPs", userIds: ["u-1"] }),
            })
          )
        ).status
      ).toBe(403);

      expect(
        (
          await deleteAudience(
            new Request("http://localhost:3000/api/audience/list-1", { method: "DELETE" }),
            { params: Promise.resolve({ id: "list-1" }) }
          )
        ).status
      ).toBe(403);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(notifEditor as any);
      vi.spyOn(prisma.customAudienceList, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([]);
      expect((await getAudience(new Request("http://localhost:3000/api/audience"))).status).toBe(200);
    });

    it("nunca envia notificações de marketing para ADMIN/EDITOR nem aplica fallback em audiência desconhecida", async () => {
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        { id: "adm-1", role: "ADMIN", isActive: true, deletedAt: null, orders: [] },
        { id: "cli-1", role: "CLIENT", isActive: true, deletedAt: null, orders: [] },
        { id: "cli-2", role: "CLIENT", isActive: true, deletedAt: null, orders: [] },
      ] as any);

      const unknownAudience = await getTargetClients("DESCONHECIDO");
      expect(unknownAudience).toEqual([]);

      const customOnly = await getTargetClients("CUSTOM", undefined, ["cli-2"]);
      expect(customOnly.map((u) => u.id)).toEqual(["cli-2"]);

      const allClients = await getTargetClients("ALL");
      expect(allClients.map((u) => u.id)).toEqual(["cli-1", "cli-2"]);
    });

    it("permite disparos e templates para notifications_manage e oculta loyalty_badges dos templates", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(notifEditor as any);
      const findManySpy = vi.spyOn(prisma.notificationTemplate, "findMany").mockResolvedValue([
        { id: "tpl-1", title: "Boas vindas", message: "Oi", category: "welcome" },
      ] as any);

      const tplRes = await getTemplates(new Request("http://localhost:3000/api/notifications/templates"));
      expect(tplRes.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: { not: "loyalty_badges" } },
        })
      );

      const badCountRes = await getAudienceCount(
        new Request("http://localhost:3000/api/notifications/audience-count?audience=INVALID")
      );
      expect(badCountRes.status).toBe(400);

      vi.spyOn(prisma.notification, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.user, "findMany").mockResolvedValue([
        { id: "cli-1", role: "CLIENT", isActive: true, deletedAt: null, createdAt: new Date(), orders: [] },
      ] as any);
      vi.spyOn(prisma.notification, "create").mockResolvedValue({ id: "notif-1" } as any);
      vi.spyOn(prisma.userNotification, "createMany").mockResolvedValue({ count: 1 });

      const sendRes = await sendNotification(
        new Request("http://localhost:3000/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Promo Especial",
            message: "Desconto hoje!",
            targetAudience: "CUSTOM",
            customUserIds: ["cli-1"],
          }),
        })
      );
      expect(sendRes.status).toBe(201);
    });
  });

  describe("3. Visual, Selos, Avatares, Uploads e Expurgo", () => {
    it("permite editor com permissões corretas em banner, badges/tags, loyalty-badges e avatares, preservando ADMIN", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(kanbanOnlyEditor as any);
      expect(
        (
          await updateBanner(
            new Request("http://localhost:3000/api/banner", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Teste" }),
            })
          )
        ).status
      ).toBe(403);
      expect(
        (
          await createTag(
            new Request("http://localhost:3000/api/tags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: "Novo" }),
            })
          )
        ).status
      ).toBe(403);
      expect((await purgeInactive(new Request("http://localhost:3000/api/admin/maintenance/purge-inactive", { method: "POST" }))).status).toBe(403);

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(loyaltyEditor as any);
      vi.spyOn(prisma.avatarPreset, "count").mockResolvedValue(1);
      expect(
        (
          await createAvatar(
            new Request("http://localhost:3000/api/admin/avatars", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "XSS",
                description: "Tentativa XSS",
                imageUrl: "javascript:alert(1)",
              }),
            })
          )
        ).status
      ).toBe(400);

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        const tx = {
          loyaltyBadgeConfig: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockImplementation(async ({ data }: any) => data),
          },
          notificationTemplate: {
            findFirst: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
        };
        return callback(tx);
      });
      const lbRes = await updateLoyaltyBadges(
        new Request("http://localhost:3000/api/settings/loyalty-badges", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            badges: [{ level: 1, name: "Bronze", minMonths: 0, minOrders: 0, criteriaMode: "either" }],
          }),
        })
      );
      expect(lbRes.status).toBe(200);

      // ADMIN mantém controle total sobre /api/banner, /api/badges e /api/settings/loading
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
      vi.spyOn(prisma.highlightBanner, "upsert").mockResolvedValue({
        id: "home_highlight",
        icon: "🥣",
        title: "Banner Admin",
        subtitle: "Sub",
        badge: "Destaque",
      } as any);
      expect(
        (
          await updateBanner(
            new Request("http://localhost:3000/api/banner", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Banner Admin" }),
            })
          )
        ).status
      ).toBe(200);

      vi.spyOn(prisma.cardBadge, "create").mockResolvedValue({ id: "b-1", text: "Top" } as any);
      expect(
        (
          await createBadge(
            new Request("http://localhost:3000/api/badges", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: "Top" }),
            })
          )
        ).status
      ).toBe(200);

      // faviconUrl inseguro bloqueado com 400
      expect(
        (
          await updateLoadingSettings(
            new Request("http://localhost:3000/api/settings/loading", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phrases: ["Carregando..."],
                faviconUrl: "javascript:alert(1)",
              }),
            })
          )
        ).status
      ).toBe(400);

      // Editor sem permissões de mídia recebe 403 em /api/upload
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(kanbanOnlyEditor as any);
      expect(
        (await uploadAsset(new Request("http://localhost:3000/api/upload", { method: "POST" }))).status
      ).toBe(403);
    });
  });

  describe("4. Rotas, Geocode e Proteção Anti Brute-Force de PIN", () => {
    it("valida faixa geográfica em /api/routes e /api/geocode/reverse e aplica rate limit", async () => {
      routeCalculateLimiter.reset("10.0.0.99");

      const badRouteRes = await calculateRoute(
        new Request("http://localhost:3000/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.99" },
          body: JSON.stringify({
            origin: { lat: 999, lng: -56.1 },
            destination: { lat: -15.6, lng: -56.1 },
          }),
        })
      );
      expect(badRouteRes.status).toBe(400);

      const badGeoRes = await reverseGeocode(
        new NextRequest("http://localhost:3000/api/geocode/reverse?lat=120&lon=-56.1")
      );
      expect(badGeoRes.status).toBe(400);
    });

    it("bloqueia força bruta no PIN de entrega após 5 tentativas incorretas (/api/delivery/[token]/complete)", async () => {
      deliveryPinLimiter.reset("delivery_pin:10.0.0.77:token-bruteforce-1");
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "ord-pin-1",
        status: "delivering",
        orderPin: "4321",
        userId: "cli-1",
        paymentMethodType: "pix_entrega",
      } as any);

      for (let i = 0; i < 5; i++) {
        const res = await completeDelivery(
          new Request("http://localhost:3000/api/delivery/token-bruteforce-1/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.77" },
            body: JSON.stringify({ pin: "0000" }),
          }),
          { params: Promise.resolve({ token: "token-bruteforce-1" }) }
        );
        expect(res.status).toBe(400);
      }

      const sixthRes = await completeDelivery(
        new Request("http://localhost:3000/api/delivery/token-bruteforce-1/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.77" },
          body: JSON.stringify({ pin: "0000" }),
        }),
        { params: Promise.resolve({ token: "token-bruteforce-1" }) }
      );
      expect(sixthRes.status).toBe(429);
    });
  });
});
