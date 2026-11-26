import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { GET as getSettings, PUT as updateSettings } from "@/app/api/settings/route";
import { DEFAULT_STORE_SCHEDULE, formatBusinessHoursSummary } from "@/lib/storeSchedule";

describe("Sincronização de Horários, Localização, Raio e Rodapé (/api/settings & Painel Admin)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("PUT /api/settings sincroniza openingHoursText automaticamente a partir de businessHours e GET retorna o resumo atualizado", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);

    const customHours = DEFAULT_STORE_SCHEDULE.map((d) => ({
      ...d,
      isOpen: d.day !== "monday",
      openTime: "14:00",
      closeTime: "22:00",
    }));
    const expectedSummary = formatBusinessHoursSummary(customHours);
    expect(expectedSummary).toBe("Terça a Domingo das 14h às 22h");

    const persistedRow = {
      id: "store_config",
      deliveryFee: 5,
      freeDeliveryThreshold: 60,
      whatsappNumber: "5565999999999",
      whatsappMessage: "Olá!",
      isOpen: true,
      currentShiftId: null,
      estimatedDeliveryTime: "30-50 min",
      estimatedTimePresets: ["30-50 min"],
      rejectionReasonPresets: [],
      storeLatitude: -15.6536,
      storeLongitude: -56.1322,
      storeAddress: "Av. Teste, 100",
      maxDeliveryRadiusKm: 12,
      businessHours: customHours,
      openingHoursText: "texto antigo obsoleto",
      footerSlogan: "Slogan",
      footerBadgeText: "Artesanal",
      showPaymentMethods: true,
      acceptedPayments: ["pix"],
      googleMapsUrl: "https://maps.google.com",
      storeCnpj: null,
      orderNotificationTemplates: {},
      instagramUrl: "@popshake",
      facebookUrl: "",
      supportPhone: "5565999999999",
      postSaleMessage: "Obrigado",
      supportMessage: "Ajuda",
      openedAt: null,
      closedAt: null,
      updatedAt: new Date(),
    };

    const upsertSpy = vi.spyOn(prisma.storeSettings, "upsert").mockResolvedValue({
      ...persistedRow,
      openingHoursText: expectedSummary,
    } as any);
    vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({ id: "audit-1" } as any);

    const putRes = await updateSettings(
      new Request("http://localhost:3000/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessHours: customHours,
          maxDeliveryRadiusKm: 12,
          storeLatitude: -15.6536,
          storeLongitude: -56.1322,
        }),
      })
    );

    expect(putRes.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          businessHours: customHours,
          openingHoursText: expectedSummary,
          maxDeliveryRadiusKm: 12,
        }),
      })
    );

    const putJson = await putRes.json();
    expect(putJson.settings.openingHoursText).toBe(expectedSummary);

    vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue(persistedRow as any);
    const getRes = await getSettings();
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.openingHoursText).toBe(expectedSummary);
  });

  it("garante que Painel de Loja/Horários/Mapa abre visível por padrão, Rodapé usa status em tempo real e CONTRIBUTING.md foi removido", () => {
    const logisticsPath = path.resolve(
      process.cwd(),
      "src/components/admin/LogisticsAndCouriersSection.tsx"
    );
    const logisticsSrc = fs.readFileSync(logisticsPath, "utf8");
    expect(logisticsSrc).toContain("useState(true)");
    expect(logisticsSrc).not.toContain("useState(false);\n  const [courierToDelete");
    expect(logisticsSrc).toContain('id="horarios-funcionamento"');
    expect(logisticsSrc).toContain('id="sede-localizacao"');
    expect(logisticsSrc).toContain("maxDeliveryRadiusKm");
    expect(logisticsSrc).not.toContain('section className="order-2');

    const footerPath = path.resolve(process.cwd(), "src/components/storefront/Footer.tsx");
    const footerSrc = fs.readFileSync(footerPath, "utf8");
    expect(footerSrc).toContain("useStoreStatus");
    expect(footerSrc).toContain("formatBusinessHoursSummary");
    expect(footerSrc).not.toContain("const isOpen = settings?.isOpen");

    const channelsPath = path.resolve(
      process.cwd(),
      "src/components/admin/ChannelsAndSupportSection.tsx"
    );
    const channelsSrc = fs.readFileSync(channelsPath, "utf8");
    expect(channelsSrc).toContain("/admin?tab=logistica_entregadores#horarios-funcionamento");
    expect(channelsSrc).toContain("/admin?tab=logistica_entregadores#sede-localizacao");
    expect(channelsSrc).not.toMatch(/openingHoursText\s*,/);

    const contributingPath = path.resolve(process.cwd(), "docs/CONTRIBUTING.md");
    expect(fs.existsSync(contributingPath)).toBe(false);
  });
});
