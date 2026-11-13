import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { GET as listPromotions, POST as createPromotion } from "@/app/api/promotions/route";
import {
  GET as getPromotionById,
  PUT as updatePromotion,
  DELETE as deletePromotion,
} from "@/app/api/promotions/[id]/route";

describe("Integração e Segurança: /api/promotions (Banners & Visibilidade)", () => {
  const futureDate = new Date(Date.now() + 7 * 86400000);
  const pastDate = new Date(Date.now() - 86400000);

  const mockProduct = {
    id: "prod-1",
    name: "Roleta Gourmet P",
    price: 50.0,
    imageUrl: "https://example.com/roleta.webp",
    isAvailable: true,
    isCombo: false,
    addonGroups: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.adminAuditLog, "create").mockResolvedValue({ id: "audit-1" } as any);
  });

  it("GET /api/promotions público filtra ofertas expiradas/esgotadas/indisponíveis e mantém ofertas contínuas ativas", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([
      {
        id: "promo-continua",
        title: "Banner Contínuo Ativo",
        badge: "OFERTA",
        description: "Visível sem modo edição",
        bannerImageUrl: null,
        gradientStart: "#9306CF",
        gradientEnd: "#881BAA",
        discountType: "fixed",
        discountValue: 35.5,
        isActive: true,
        startsAt: new Date(Date.now() - 3600000),
        expiresAt: null,
        showDuration: false,
        durationDisplay: [],
        autoBanner: true,
        showScarcity: false,
        scarcityUnits: null,
        scarcityType: "strategic",
        scarcityInitial: null,
        scarcitySold: 0,
        showProgressBar: false,
        urgencyType: "date",
        sessionMinutes: null,
        productId: "prod-1",
        product: mockProduct,
      },
      {
        id: "promo-expirada",
        title: "Banner Expirado",
        badge: "EXPIRADA",
        description: null,
        bannerImageUrl: null,
        gradientStart: "#9306CF",
        gradientEnd: "#881BAA",
        discountType: "percentage",
        discountValue: 20,
        isActive: true,
        startsAt: new Date(Date.now() - 2 * 86400000),
        expiresAt: pastDate,
        showDuration: true,
        durationDisplay: [],
        autoBanner: false,
        showScarcity: false,
        scarcityUnits: null,
        scarcityType: "strategic",
        scarcityInitial: null,
        scarcitySold: 0,
        showProgressBar: false,
        urgencyType: "date",
        sessionMinutes: null,
        productId: "prod-1",
        product: mockProduct,
      },
      {
        id: "promo-esgotada",
        title: "Lote Real Esgotado",
        badge: "ESGOTADA",
        description: null,
        bannerImageUrl: null,
        gradientStart: "#9306CF",
        gradientEnd: "#881BAA",
        discountType: "percentage",
        discountValue: 15,
        isActive: true,
        startsAt: new Date(Date.now() - 3600000),
        expiresAt: futureDate,
        showDuration: true,
        durationDisplay: [],
        autoBanner: false,
        showScarcity: true,
        scarcityUnits: 0,
        scarcityType: "real",
        scarcityInitial: 10,
        scarcitySold: 10,
        showProgressBar: true,
        urgencyType: "date",
        sessionMinutes: null,
        productId: "prod-1",
        product: mockProduct,
      },
    ] as any);

    const res = await listPromotions(new Request("http://localhost:3000/api/promotions"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("promo-continua");
    expect(body[0].promoPrice).toBe(35.5);
    expect(body[0].discountPercent).toBe(29);
    expect(body[0].isVisiblePublicly).toBe(true);
  });

  it("GET /api/promotions?all=true exige autenticação (401) e permissão promotions_manage (403)", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(null);
    const unauthRes = await listPromotions(new Request("http://localhost:3000/api/promotions?all=true"));
    expect(unauthRes.status).toBe(401);

    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "client-1",
      role: "client",
      permissions: [],
    } as any);
    const forbiddenRes = await listPromotions(
      new Request("http://localhost:3000/api/promotions?all=true")
    );
    expect(forbiddenRes.status).toBe(403);

    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);
    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([
      {
        id: "promo-pausada",
        title: "Pausada",
        badge: "PAUSADA",
        description: null,
        bannerImageUrl: null,
        gradientStart: "#9306CF",
        gradientEnd: "#881BAA",
        discountType: "percentage",
        discountValue: 10,
        isActive: false,
        startsAt: new Date(),
        expiresAt: null,
        showDuration: false,
        durationDisplay: [],
        autoBanner: false,
        showScarcity: false,
        scarcityUnits: null,
        scarcityType: "strategic",
        scarcityInitial: null,
        scarcitySold: 0,
        showProgressBar: false,
        urgencyType: "date",
        sessionMinutes: null,
        productId: "prod-1",
        product: mockProduct,
      },
    ] as any);

    const adminRes = await listPromotions(
      new Request("http://localhost:3000/api/promotions?all=true")
    );
    expect(adminRes.status).toBe(200);
    const adminBody = await adminRes.json();
    expect(adminBody).toHaveLength(1);
    expect(adminBody[0].visibilityStatus).toBe("paused");
    expect(adminBody[0].isVisiblePublicly).toBe(false);
  });

  it("POST /api/promotions bloqueia sem permissão, rejeita expiração passada e persiste com auditoria", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "editor-no-perm",
      role: "editor",
      permissions: ["metrics_view"],
    } as any);

    const forbiddenRes = await createPromotion(
      new Request("http://localhost:3000/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Teste", productId: "prod-1", discountValue: 10 }),
      })
    );
    expect(forbiddenRes.status).toBe(403);

    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);
    vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
      id: "prod-1",
      name: "Roleta Gourmet P",
    } as any);

    const expiredAttempt = await createPromotion(
      new Request("http://localhost:3000/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Banner Já Expirado",
          productId: "prod-1",
          discountType: "percentage",
          discountValue: 15,
          showDuration: true,
          urgencyType: "date",
          expiresAt: pastDate.toISOString(),
        }),
      })
    );
    expect(expiredAttempt.status).toBe(400);

    const createSpy = vi.spyOn(prisma.promotion, "create").mockResolvedValue({
      id: "promo-new",
      title: "Roleta com Banner",
      badge: "OFERTA",
      description: "De R$ 50 por R$ 35,50",
      bannerImageUrl: null,
      gradientStart: "#9306CF",
      gradientEnd: "#881BAA",
      discountType: "fixed",
      discountValue: 35.5,
      isActive: true,
      startsAt: new Date(),
      expiresAt: null,
      showDuration: false,
      durationDisplay: [],
      autoBanner: true,
      showScarcity: false,
      scarcityUnits: null,
      scarcityType: "strategic",
      scarcityInitial: null,
      scarcitySold: 0,
      showProgressBar: false,
      urgencyType: "date",
      sessionMinutes: null,
      productId: "prod-1",
      product: mockProduct,
    } as any);

    const validRes = await createPromotion(
      new Request("http://localhost:3000/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Roleta com Banner",
          badge: "OFERTA",
          description: "De R$ 50 por R$ 35,50",
          discountType: "fixed",
          discountValue: 35.5,
          isActive: true,
          showDuration: false,
          productId: "prod-1",
          autoBanner: true,
        }),
      })
    );
    expect(validRes.status).toBe(201);
    const created = await validRes.json();
    expect(created.promoPrice).toBe(35.5);
    expect(created.isVisiblePublicly).toBe(true);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("PUT e DELETE /api/promotions/[id] preservam estado em toggles parciais e validam RBAC", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      permissions: [],
    } as any);

    vi.spyOn(prisma.promotion, "findUnique").mockResolvedValue({
      id: "promo-1",
      title: "Banner X",
      productId: "prod-1",
      isActive: false,
      showDuration: false,
      urgencyType: "date",
      expiresAt: null,
      sessionMinutes: null,
      showScarcity: false,
      durationDisplay: [],
    } as any);

    vi.spyOn(prisma.promotion, "update").mockResolvedValue({
      id: "promo-1",
      title: "Banner X",
      badge: "PROMO",
      description: null,
      bannerImageUrl: null,
      gradientStart: "#9306CF",
      gradientEnd: "#881BAA",
      discountType: "percentage",
      discountValue: 20,
      isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: null,
      showDuration: false,
      durationDisplay: [],
      autoBanner: false,
      showScarcity: false,
      scarcityUnits: null,
      scarcityType: "strategic",
      scarcityInitial: null,
      scarcitySold: 0,
      showProgressBar: false,
      urgencyType: "date",
      sessionMinutes: null,
      productId: "prod-1",
      product: mockProduct,
    } as any);

    const toggleRes = await updatePromotion(
      new Request("http://localhost:3000/api/promotions/promo-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      }),
      { params: Promise.resolve({ id: "promo-1" }) }
    );
    expect(toggleRes.status).toBe(200);
    const updated = await toggleRes.json();
    expect(updated.isActive).toBe(true);
    expect(updated.isVisiblePublicly).toBe(true);

    vi.spyOn(prisma.promotion, "delete").mockResolvedValue({ id: "promo-1" } as any);
    const deleteRes = await deletePromotion(
      new Request("http://localhost:3000/api/promotions/promo-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "promo-1" }) }
    );
    expect(deleteRes.status).toBe(200);
    expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(2);
  });

  it("GET /api/promotions/[id] retorna 404 quando ausente e calcula preço promocional fixo corretamente", async () => {
    vi.spyOn(prisma.promotion, "findUnique").mockResolvedValueOnce(null);
    const missingRes = await getPromotionById(
      new Request("http://localhost:3000/api/promotions/nope"),
      { params: Promise.resolve({ id: "nope" }) }
    );
    expect(missingRes.status).toBe(404);

    vi.spyOn(prisma.promotion, "findUnique").mockResolvedValueOnce({
      id: "promo-fixed",
      title: "Milk Shake Festival",
      badge: "PROMO",
      description: "Preço promocional fixo",
      bannerImageUrl: null,
      gradientStart: "#9306CF",
      gradientEnd: "#881BAA",
      discountType: "fixed",
      discountValue: 24.9,
      isActive: true,
      startsAt: new Date(Date.now() - 1000),
      expiresAt: futureDate,
      showDuration: true,
      durationDisplay: ["Data e Hora Limite Claras"],
      autoBanner: true,
      showScarcity: false,
      scarcityUnits: null,
      scarcityType: "strategic",
      scarcityInitial: null,
      scarcitySold: 0,
      showProgressBar: false,
      urgencyType: "date",
      sessionMinutes: null,
      productId: "prod-shake",
      product: {
        id: "prod-shake",
        name: "Milk Shake Ninho & Nutella 500ml",
        price: 29.9,
        imageUrl: "https://example.com/shake.webp",
        isAvailable: true,
        isCombo: false,
        addonGroups: [],
      },
    } as any);

    const okRes = await getPromotionById(
      new Request("http://localhost:3000/api/promotions/promo-fixed"),
      { params: Promise.resolve({ id: "promo-fixed" }) }
    );
    expect(okRes.status).toBe(200);
    const promo = await okRes.json();
    expect(promo.promoPrice).toBe(24.9);
    expect(promo.discountAmount).toBe(5);
    expect(promo.isVisiblePublicly).toBe(true);
  });
});
