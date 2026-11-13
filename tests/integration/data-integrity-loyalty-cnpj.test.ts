import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { GET as getSettings, PUT as updateSettings } from "@/app/api/settings/route";
import {
  GET as getLoyaltyBadges,
  PUT as updateLoyaltyBadges,
} from "@/app/api/settings/loyalty-badges/route";

describe("Integridade de Dados Fase 2 — StoreSettings.storeCnpj & LoyaltyBadgeConfig Backfill", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("PUT /api/settings persiste storeCnpj, registra AdminAuditLog e GET retorna o valor persistido", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);

    const savedSettingsRow = {
      id: "store_config",
      deliveryFee: 5,
      freeDeliveryThreshold: 60,
      whatsappNumber: "5565999990000",
      whatsappMessage: "Olá!",
      isOpen: true,
      currentShiftId: null,
      estimatedDeliveryTime: "30-50 min",
      estimatedTimePresets: ["30-50 min"],
      rejectionReasonPresets: [],
      storeLatitude: -15.6536,
      storeLongitude: -56.1322,
      storeAddress: "Rua Teste, 10",
      maxDeliveryRadiusKm: 10,
      businessHours: [],
      openingHoursText: "14h às 22h",
      footerSlogan: "Slogan",
      footerBadgeText: "Artesanal",
      showPaymentMethods: true,
      acceptedPayments: ["pix"],
      googleMapsUrl: "https://maps.google.com",
      storeCnpj: "12.345.678/0001-90",
      orderNotificationTemplates: {},
      instagramUrl: "@popshake",
      facebookUrl: "",
      supportPhone: "65999990000",
      postSaleMessage: "Obrigado",
      supportMessage: "Ajuda",
      openedAt: null,
      closedAt: null,
      updatedAt: new Date(),
    };

    const upsertSpy = vi.spyOn(prisma.storeSettings, "upsert").mockResolvedValue(savedSettingsRow as any);

    const auditSpy = vi
      .spyOn(prisma.adminAuditLog, "create")
      .mockResolvedValue({ id: "audit-cnpj" } as any);

    const putRes = await updateSettings(
      new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeCnpj: "12.345.678/0001-90" }),
      })
    );

    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.settings.storeCnpj).toBe("12.345.678/0001-90");
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ storeCnpj: "12.345.678/0001-90" }),
      })
    );
    expect(auditSpy).toHaveBeenCalledTimes(1);

    vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue(savedSettingsRow as any);

    const getRes = await getSettings();
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.storeCnpj).toBe("12.345.678/0001-90");
  });

  it("GET /api/settings/loyalty-badges executa backfill idempotente do registro legado sem excluí-lo", async () => {
    const legacyBadges = [
      {
        id: "badge_custom_1",
        level: 1,
        name: "Iniciante",
        icon: "🍧",
        minMonths: 0,
        minOrders: 0,
        criteriaMode: "either",
      },
      {
        id: "badge_custom_2",
        level: 2,
        name: "Fã de Carteirinha",
        icon: "💜",
        minMonths: 2,
        minOrders: 4,
        criteriaMode: "either",
      },
    ];

    vi.spyOn(prisma.loyaltyBadgeConfig, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue({
      id: "legacy-1",
      category: "loyalty_badges",
      title: "loyalty_badges_config",
      message: JSON.stringify(legacyBadges),
    } as any);

    const deleteTemplateSpy = vi.spyOn(prisma.notificationTemplate, "deleteMany");
    const createdBadges: any[] = [];

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const tx = {
        loyaltyBadgeConfig: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            createdBadges.push(data);
            return data;
          }),
        },
        notificationTemplate: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      };
      return callback(tx);
    });

    const res = await getLoyaltyBadges();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[1].name).toBe("Fã de Carteirinha");
    expect(createdBadges).toHaveLength(2);
    expect(deleteTemplateSpy).not.toHaveBeenCalled();
  });

  it("PUT /api/settings/loyalty-badges salva na tabela dedicada e registra auditoria", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "ed-loyalty",
      role: "editor",
      permissions: ["loyalty_manage"],
    } as any);

    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
      const tx = {
        loyaltyBadgeConfig: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockImplementation(async ({ data }: any) => data),
        },
        notificationTemplate: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      };
      return callback(tx);
    });

    const auditSpy = vi
      .spyOn(prisma.adminAuditLog, "create")
      .mockResolvedValue({ id: "audit-badge" } as any);

    const res = await updateLoyaltyBadges(
      new Request("http://localhost:3000/api/settings/loyalty-badges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badges: [
            { id: "lvl_1", level: 1, name: "Novo", icon: "🌟", minMonths: 0, minOrders: 0 },
          ],
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(auditSpy).toHaveBeenCalledTimes(1);
  });
});
