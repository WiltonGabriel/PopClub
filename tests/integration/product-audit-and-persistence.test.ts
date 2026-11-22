import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { addonUploadLimiter } from "@/lib/rateLimit";
import { POST as createProduct } from "@/app/api/products/route";
import { PUT as updateProduct } from "@/app/api/products/[id]/route";
import { GET as listCategories } from "@/app/api/categories/route";
import { POST as uploadAsset } from "@/app/api/upload/route";

describe("Integração: Auditoria de Produtos, Anti-Cache de Categorias e Upload até 10MB", () => {
  const adminUser = {
    id: "admin-audit-1",
    role: "admin",
    permissions: [],
    username: "admin",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    addonUploadLimiter.reset("10.10.10.50");
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(adminUser as any);
  });

  it("POST /api/products cria produto (201), aplica Cache-Control no-store e grava CREATE_PRODUCT em adminAuditLog", async () => {
    vi.spyOn(prisma.product, "count")
      .mockResolvedValueOnce(14) // quota global (< 300)
      .mockResolvedValueOnce(3); // produtos na categoria (< maxProducts)

    vi.spyOn(prisma.category, "findUnique").mockResolvedValue({
      id: "cat-shakes",
      name: "Milk Shakes Cremosos",
      isDynamic: false,
      maxProducts: 20,
    } as any);

    vi.spyOn(prisma.product, "create").mockResolvedValue({
      id: "prod-shake-500",
      name: "Milk Shake 500ml",
      description: "Cremoso",
      price: 20,
      servesText: "Serve 1 pessoa",
      isHighlight: false,
      categoryId: "cat-shakes",
      category: "Milk Shakes Cremosos",
      categoryRel: { name: "Milk Shakes Cremosos", isActive: true },
      imageUrl: "/uploads/shake500.webp",
      stock: null,
      isAvailable: true,
      cardBadgeId: null,
      cardBadge: null,
      isCombo: false,
      promotions: [],
      comboItems: [],
      addonGroups: [],
      showScarcity: false,
      scarcityType: "strategic",
      scarcityUnits: null,
      scarcityInitial: null,
      scarcitySold: 0,
      showProgressBar: false,
      showDuration: false,
      urgencyType: "date",
      expiresAt: null,
      sessionMinutes: null,
    } as any);

    const auditCreateSpy = vi
      .spyOn(prisma.adminAuditLog, "create")
      .mockResolvedValue({ id: "audit-1" } as any);

    const req = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Milk Shake 500ml",
        description: "Cremoso",
        price: 20,
        categoryId: "cat-shakes",
        imageUrl: "/uploads/shake500.webp",
      }),
    });

    const res = await createProduct(req);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const body = await res.json();
    expect(body.id).toBe("prod-shake-500");

    expect(auditCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CREATE_PRODUCT",
          resourceType: "product",
          resourceId: "prod-shake-500",
          actorUserId: "admin-audit-1",
        }),
      })
    );
  });

  it("PUT /api/products/[id] atualiza produto (200), aplica Cache-Control no-store e grava UPDATE_PRODUCT com diffKeys", async () => {
    vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
      id: "prod-copo-300",
      name: "Copo 300ml Tradicional",
      price: 14,
      categoryId: "cat-copos",
      isCombo: false,
      isAvailable: true,
      stock: null,
      deletedAt: null,
      _count: { comboItems: 0 },
    } as any);

    vi.spyOn(prisma.product, "update").mockResolvedValue({
      id: "prod-copo-300",
      name: "Copo 300ml Especial",
      description: "Atualizado",
      price: 15,
      servesText: null,
      isHighlight: true,
      categoryId: "cat-copos",
      category: "Copos de Açaí Tradicionais",
      categoryRel: { name: "Copos de Açaí Tradicionais", isActive: true },
      imageUrl: "/uploads/copo300.webp",
      stock: null,
      isAvailable: true,
      cardBadgeId: null,
      cardBadge: null,
      isCombo: false,
      promotions: [],
      comboItems: [],
      addonGroups: [],
      showScarcity: false,
      scarcityType: "strategic",
      scarcityUnits: null,
      scarcityInitial: null,
      scarcitySold: 0,
      showProgressBar: false,
      showDuration: false,
      urgencyType: "date",
      expiresAt: null,
      sessionMinutes: null,
    } as any);

    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.comboItem, "findMany").mockResolvedValue([]);

    const auditCreateSpy = vi
      .spyOn(prisma.adminAuditLog, "create")
      .mockResolvedValue({ id: "audit-2" } as any);

    const res = await updateProduct(
      new Request("http://localhost:3000/api/products/prod-copo-300", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Copo 300ml Especial",
          price: 15,
          isHighlight: true,
        }),
      }),
      { params: Promise.resolve({ id: "prod-copo-300" }) }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    expect(auditCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "UPDATE_PRODUCT",
          resourceType: "product",
          resourceId: "prod-copo-300",
          diffKeys: expect.arrayContaining(["name", "price", "isHighlight"]),
        }),
      })
    );
  });

  it("GET /api/categories devolve Cache-Control no-store e respeita includeInactive=true", async () => {
    const findManySpy = vi.spyOn(prisma.category, "findMany").mockResolvedValue([
      { id: "c1", name: "Ativa", isActive: true, _count: { products: 3 } },
      { id: "c2", name: "Pausada", isActive: false, _count: { products: 2 } },
    ] as any);

    const activeOnlyRes = await listCategories(new Request("http://localhost:3000/api/categories"));
    expect(activeOnlyRes.status).toBe(200);
    expect(activeOnlyRes.headers.get("cache-control")).toContain("no-store");
    expect(findManySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );

    const allRes = await listCategories(
      new Request("http://localhost:3000/api/categories?includeInactive=true")
    );
    expect(allRes.status).toBe(200);
    expect(allRes.headers.get("cache-control")).toContain("no-store");
    expect(findManySpy).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
  });

  it("POST /api/upload aceita imagem entre 5MB e 10MB convertendo para WebP e rejeita acima de 10MB", async () => {
    // Gera PNG válido acima de 5MB e abaixo de 10MB usando Sharp (ruído RGBA)
    const noisyPngBuffer = await sharp({
      create: {
        width: 1400,
        height: 1400,
        channels: 4,
        background: { r: 128, g: 128, b: 128, alpha: 1 },
        noise: { type: "gaussian", mean: 128, sigma: 45 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(noisyPngBuffer.length).toBeGreaterThan(5 * 1024 * 1024);
    expect(noisyPngBuffer.length).toBeLessThan(10 * 1024 * 1024);

    const validForm = new FormData();
    validForm.append("type", "product");
    validForm.append(
      "file",
      new File([new Uint8Array(noisyPngBuffer)], "produto-6mb.png", { type: "image/png" })
    );

    let savedUploadUrl: string | null = null;
    try {
      const okRes = await uploadAsset(
        new Request("http://localhost:3000/api/upload", {
          method: "POST",
          headers: { "x-forwarded-for": "10.10.10.50" },
          body: validForm,
        })
      );
      expect(okRes.status).toBe(200);
      const okBody = await okRes.json();
      expect(okBody.format).toBe("webp");
      expect(okBody.url).toMatch(/^\/uploads\/.+\.webp$/);
      savedUploadUrl = okBody.url;
    } finally {
      if (savedUploadUrl) {
        const diskPath = path.join(process.cwd(), "public", savedUploadUrl.replace(/^\/+/, ""));
        await fs.unlink(diskPath).catch(() => {});
      }
    }

    // Rejeita arquivo > 10MB com HTTP 400 e mensagem mencionando 10MB
    const oversizedBytes = new Uint8Array(10 * 1024 * 1024 + 1024);
    const oversizedForm = new FormData();
    oversizedForm.append("type", "product");
    oversizedForm.append("file", new File([oversizedBytes], "gigante.png", { type: "image/png" }));

    const tooLargeRes = await uploadAsset(
      new Request("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { "x-forwarded-for": "10.10.10.50" },
        body: oversizedForm,
      })
    );
    expect(tooLargeRes.status).toBe(400);
    const errBody = await tooLargeRes.json();
    expect(errBody.error).toContain("10MB");
  });
});
