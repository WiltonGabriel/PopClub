import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { GET as getProductImpact } from "@/app/api/products/[id]/impact/route";
import { POST as createProduct } from "@/app/api/products/route";
import { PUT as updateProduct, DELETE as deleteProduct } from "@/app/api/products/[id]/route";
import { PATCH as patchProductStock } from "@/app/api/products/[id]/stock/route";
import { PUT as updateCategory, DELETE as deleteCategory } from "@/app/api/categories/[id]/route";
import { formatProduct } from "@/lib/productHelper";
import { restoreOrderInventoryAndCoupons } from "@/services/orderRefundService";

describe("Integração: Cascata Inteligente de Dependências de Produtos (Combos, Promoções, Cupons, Complementos e Pedidos)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/products/[id]/impact retorna diagnóstico completo de dependências para usuários com menu_manage ou STOCK_CONTROL", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "staff-stock",
      role: "editor",
      permissions: ["STOCK_CONTROL"],
    } as any);

    vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
      id: "prod-acai",
      name: "Açaí 500ml",
      price: 25,
      isCombo: false,
      isAvailable: true,
      stock: 10,
      deletedAt: null,
    } as any);

    vi.spyOn(prisma.comboItem, "findMany").mockResolvedValue([
      {
        quantity: 2,
        combo: {
          id: "combo-familia",
          name: "Combo Família",
          price: 45,
          isAvailable: true,
          deletedAt: null,
          _count: { comboItems: 2 },
        },
      },
    ] as any);

    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([
      {
        id: "promo-1",
        title: "Terça do Açaí",
        discountType: "percentage",
        discountValue: 15,
        isActive: true,
        expiresAt: null,
      },
    ] as any);

    vi.spyOn(prisma.coupon, "findMany").mockResolvedValue([
      {
        id: "cup-unico",
        code: "ACAI500",
        isActive: true,
        productIds: ["prod-acai"],
      },
      {
        id: "cup-multi",
        code: "VERAO10",
        isActive: true,
        productIds: ["prod-acai", "prod-shake"],
      },
    ] as any);

    vi.spyOn(prisma.productAddonGroup, "findMany").mockResolvedValue([
      {
        group: {
          id: "grp-frutas",
          name: "Frutas Frescas",
          _count: { items: 5 },
        },
      },
    ] as any);

    vi.spyOn(prisma.orderItem, "count")
      .mockResolvedValueOnce(1) // activeOrdersCount
      .mockResolvedValueOnce(3); // historicalOrdersCount

    const res = await getProductImpact(
      new Request("http://localhost:3000/api/products/prod-acai/impact"),
      { params: Promise.resolve({ id: "prod-acai" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.parentCombos).toHaveLength(1);
    expect(body.parentCombos[0].name).toBe("Combo Família");
    expect(body.promotions).toHaveLength(1);
    expect(body.coupons).toEqual([
      {
        id: "cup-unico",
        code: "ACAI500",
        isActive: true,
        productCount: 1,
        willDeactivateIfRemoved: true,
      },
      {
        id: "cup-multi",
        code: "VERAO10",
        isActive: true,
        productCount: 2,
        willDeactivateIfRemoved: false,
      },
    ]);
    expect(body.addonGroups).toEqual([{ id: "grp-frutas", name: "Frutas Frescas", itemsCount: 5 }]);
    expect(body.activeOrdersCount).toBe(1);
    expect(body.historicalOrdersCount).toBe(3);
    expect(body.totalOrdersCount).toBe(4);
    expect(body.willSoftDelete).toBe(true);
  });

  it("DELETE /api/products/[id] pausa combos pais ativos, desativa promoções, limpa cupons (desativando cupom órfão) e preserva grupos globais", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
      email: "admin@popclub.com",
    } as any);

    vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
      id: "prod-base-1",
      name: "Copo 300ml",
      deletedAt: null,
    } as any);

    vi.spyOn(prisma.orderItem, "count").mockResolvedValue(2); // tem histórico -> soft delete

    const couponUpdateMock = vi.fn().mockResolvedValue({});
    const comboPauseMock = vi.fn().mockResolvedValue({ count: 1 });
    const promoUpdateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const addonUnlinkMock = vi.fn().mockResolvedValue({ count: 2 });
    const comboItemDeleteManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const productSoftDeleteMock = vi.fn().mockResolvedValue({ id: "prod-base-1" });

    const txMock = {
      comboItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            comboId: "combo-1",
            combo: { id: "combo-1", name: "Combo Duplo", isAvailable: true, deletedAt: null },
          },
        ]),
        deleteMany: comboItemDeleteManyMock,
      },
      product: {
        updateMany: comboPauseMock,
        update: productSoftDeleteMock,
      },
      promotion: {
        findMany: vi.fn().mockResolvedValue([{ id: "promo-1", title: "Oferta Copo 300ml" }]),
        updateMany: promoUpdateManyMock,
      },
      coupon: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cup-1", code: "SO300", isActive: true, productIds: ["prod-base-1"] },
          { id: "cup-2", code: "MIX", isActive: true, productIds: ["prod-base-1", "prod-base-2"] },
        ]),
        update: couponUpdateMock,
      },
      productAddonGroup: {
        deleteMany: addonUnlinkMock,
      },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

    const res = await deleteProduct(
      new Request("http://localhost:3000/api/products/prod-base-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "prod-base-1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.softDeleted).toBe(true);
    expect(comboPauseMock).toHaveBeenCalledWith({
      where: { id: { in: ["combo-1"] } },
      data: { isAvailable: false },
    });
    expect(promoUpdateManyMock).toHaveBeenCalledWith({
      where: { productId: "prod-base-1" },
      data: { isActive: false },
    });
    // Cupom SO300 ficou sem produtos -> desativado automaticamente!
    expect(couponUpdateMock).toHaveBeenCalledWith({
      where: { id: "cup-1" },
      data: { productIds: [], isActive: false },
    });
    // Cupom MIX ainda possui prod-base-2 -> permanece ativo
    expect(couponUpdateMock).toHaveBeenCalledWith({
      where: { id: "cup-2" },
      data: { productIds: ["prod-base-2"] },
    });
    expect(addonUnlinkMock).toHaveBeenCalledWith({ where: { productId: "prod-base-1" } });
    expect(body.impacts.pausedCombos).toEqual([
      { id: "combo-1", name: "Combo Duplo", remainingItemsCount: 0 },
    ]);
    expect(body.impacts.updatedCoupons).toEqual([
      { id: "cup-1", code: "SO300", deactivated: true },
      { id: "cup-2", code: "MIX", deactivated: false },
    ]);
  });

  it("PUT /api/products/[id] bloqueia ativação de combo sem itens (400) e pausa promoção fixa invalidada quando preço cai", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as any);

    // 1. Tentativa de ativar combo sem itens
    vi.spyOn(prisma.product, "findUnique").mockResolvedValueOnce({
      id: "combo-empty",
      name: "Combo Vazio",
      price: 35,
      isCombo: true,
      isAvailable: false,
      stock: null,
      deletedAt: null,
      _count: { comboItems: 0 },
    } as any);

    const badComboRes = await updateProduct(
      new Request("http://localhost:3000/api/products/combo-empty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCombo: true, isAvailable: true, comboItems: [] }),
      }),
      { params: Promise.resolve({ id: "combo-empty" }) }
    );
    expect(badComboRes.status).toBe(400);

    // 2. Redução de preço de produto base invalidando promoção de preço fixo
    vi.spyOn(prisma.product, "findUnique").mockResolvedValueOnce({
      id: "prod-500",
      name: "Copo 500ml",
      price: 30,
      isCombo: false,
      isAvailable: true,
      stock: null,
      deletedAt: null,
      _count: { comboItems: 0 },
    } as any);

    vi.spyOn(prisma.product, "update").mockResolvedValue({
      id: "prod-500",
      name: "Copo 500ml",
      description: "",
      price: 19,
      isCombo: false,
      isAvailable: true,
      stock: null,
      imageUrl: "/img.webp",
      categoryRel: { name: "Açaí" },
      promotions: [],
      comboItems: [],
      addonGroups: [],
    } as any);

    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([
      {
        id: "promo-fixa-22",
        title: "Promo R$ 22",
        discountType: "fixed",
        discountValue: 22,
        isActive: true,
      },
    ] as any);
    const promoPauseSpy = vi.spyOn(prisma.promotion, "updateMany").mockResolvedValue({ count: 1 } as any);
    vi.spyOn(prisma.comboItem, "findMany").mockResolvedValue([]);

    const okRes = await updateProduct(
      new Request("http://localhost:3000/api/products/prod-500", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Copo 500ml", price: 19 }),
      }),
      { params: Promise.resolve({ id: "prod-500" }) }
    );

    expect(okRes.status).toBe(200);
    const data = await okRes.json();
    expect(promoPauseSpy).toHaveBeenCalledWith({
      where: { id: { in: ["promo-fixa-22"] } },
      data: { isActive: false },
    });
    expect(data.impactWarnings?.length).toBeGreaterThan(0);
  });

  it("PATCH /api/products/[id]/stock emite impactWarnings ao pausar produto base presente em combo ativo", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "staff-1",
      role: "editor",
      permissions: ["STOCK_CONTROL"],
    } as any);

    vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
      id: "prod-base",
      name: "Shake Morango",
      price: 20,
      isCombo: false,
      isAvailable: true,
      stock: null,
      deletedAt: null,
    } as any);

    vi.spyOn(prisma.product, "update").mockResolvedValue({
      id: "prod-base",
      name: "Shake Morango",
      description: "",
      price: 20,
      isCombo: false,
      isAvailable: false,
      stock: null,
      imageUrl: "/shake.webp",
      categoryRel: { name: "Shakes" },
      promotions: [],
      comboItems: [],
      addonGroups: [],
    } as any);

    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.comboItem, "findMany").mockResolvedValue([
      {
        combo: {
          id: "combo-shake",
          name: "Combo Duplo Shake",
          price: 35,
          isAvailable: true,
          deletedAt: null,
          comboItems: [],
        },
      },
    ] as any);

    const res = await patchProductStock(
      new Request("http://localhost:3000/api/products/prod-base/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: false }),
      }),
      { params: Promise.resolve({ id: "prod-base" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.impactWarnings).toBeDefined();
    expect(body.impactWarnings[0]).toContain("Combo Duplo Shake");
  });

  it("restoreOrderInventoryAndCoupons restaura estoque físico dos produtos filhos quando um pedido com combo é cancelado", async () => {
    const productUpdateMock = vi.fn().mockResolvedValue({});
    const txMock = {
      product: { update: productUpdateMock },
      $executeRaw: vi.fn().mockResolvedValue(0),
      coupon: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      couponRedemption: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as any;

    await restoreOrderInventoryAndCoupons(txMock, {
      id: "ord-combo-1",
      items: [
        {
          productId: "combo-1",
          quantity: 2,
          product: {
            stock: null,
            isCombo: true,
            comboItems: [
              {
                productId: "child-finite",
                quantity: 3,
                product: { stock: 4 },
              },
              {
                productId: "child-infinite",
                quantity: 1,
                product: { stock: null },
              },
            ],
          },
        },
      ],
    });

    // 2 combos * 3 unidades do filho = 6 unidades restauradas
    expect(productUpdateMock).toHaveBeenCalledTimes(1);
    expect(productUpdateMock).toHaveBeenCalledWith({
      where: { id: "child-finite" },
      data: { stock: { increment: 6 } },
    });
  });

  it("POST /api/products bloqueia combo vazio ou combo contendo outro combo (400)", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as any);
    vi.spyOn(prisma.product, "count").mockResolvedValue(5);

    const emptyComboRes = await createProduct(
      new Request("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Combo Sem Itens",
          price: 49.9,
          isCombo: true,
          comboItems: [],
        }),
      })
    );
    expect(emptyComboRes.status).toBe(400);

    vi.spyOn(prisma.product, "findMany").mockResolvedValue([
      { id: "other-combo", name: "Outro Combo", isCombo: true },
    ] as any);

    const nestedComboRes = await createProduct(
      new Request("http://localhost:3000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Combo Aninhado",
          price: 89.9,
          isCombo: true,
          comboItems: [{ productId: "other-combo", quantity: 1 }],
        }),
      })
    );
    expect(nestedComboRes.status).toBe(400);
  });

  it("PUT e DELETE /api/categories/[id] sincronizam e limpam nome legado dos produtos vinculados", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as any);

    const productUpdateManyMock = vi.fn().mockResolvedValue({ count: 2 });
    const categoryUpdateMock = vi.fn().mockResolvedValue({
      id: "cat-1",
      name: "Picolés Premium",
      _count: { products: 2 },
    });
    const categoryDeleteMock = vi.fn().mockResolvedValue({ id: "cat-1" });

    vi.spyOn(prisma.category, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) =>
      cb({
        category: { update: categoryUpdateMock, delete: categoryDeleteMock },
        product: { updateMany: productUpdateManyMock },
      })
    );

    const putRes = await updateCategory(
      new Request("http://localhost:3000/api/categories/cat-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Picolés Premium" }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) }
    );
    expect(putRes.status).toBe(200);
    expect(productUpdateManyMock).toHaveBeenCalledWith({
      where: { categoryId: "cat-1" },
      data: { category: "Picolés Premium" },
    });

    const delRes = await deleteCategory(
      new Request("http://localhost:3000/api/categories/cat-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "cat-1" }) }
    );
    expect(delRes.status).toBe(200);
    expect(productUpdateManyMock).toHaveBeenCalledWith({
      where: { categoryId: "cat-1" },
      data: { categoryId: null, category: null },
    });
  });

  it("DELETE /api/products/[id] exclui combo de item único (e seus banners/promoções), pausa combo multi-item e limpa cupons", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as any);

    vi.spyOn(prisma.product, "findUnique").mockResolvedValue({
      id: "prod-unico",
      name: "Sorvete Exclusivo",
      deletedAt: null,
    } as any);

    vi.spyOn(prisma.orderItem, "count").mockResolvedValue(0);

    const comboDeleteMock = vi.fn().mockResolvedValue({ id: "combo-solo" });
    const comboPauseMock = vi.fn().mockResolvedValue({ count: 1 });
    const promoDeleteManyMock = vi.fn().mockResolvedValue({ count: 2 });
    const prodDeleteMock = vi.fn().mockResolvedValue({ id: "prod-unico" });

    const txMock = {
      comboItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            comboId: "combo-solo",
            combo: {
              id: "combo-solo",
              name: "Combo Só Sorvete",
              isAvailable: true,
              deletedAt: null,
              _count: { comboItems: 1 }, // Único produto do combo -> combo morre junto!
            },
          },
          {
            comboId: "combo-multi",
            combo: {
              id: "combo-multi",
              name: "Combo Completo",
              isAvailable: true,
              deletedAt: null,
              _count: { comboItems: 3 }, // Sobram 2 itens -> apenas pausa
            },
          },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      orderItem: {
        count: vi.fn().mockResolvedValue(0),
      },
      product: {
        updateMany: comboPauseMock,
        delete: vi.fn().mockImplementation(async (args: any) => {
          if (args.where.id === "combo-solo") return comboDeleteMock(args);
          return prodDeleteMock(args);
        }),
      },
      promotion: {
        findMany: vi.fn().mockResolvedValue([
          { id: "pr-prod", title: "Promo Sorvete" },
          { id: "pr-combo-banner", title: "Banner Combo Só Sorvete" },
        ]),
        deleteMany: promoDeleteManyMock,
      },
      coupon: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      productAddonGroup: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

    const res = await deleteProduct(
      new Request("http://localhost:3000/api/products/prod-unico", { method: "DELETE" }),
      { params: Promise.resolve({ id: "prod-unico" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(comboDeleteMock).toHaveBeenCalledWith({ where: { id: "combo-solo" } });
    expect(comboPauseMock).toHaveBeenCalledWith({
      where: { id: { in: ["combo-multi"] } },
      data: { isAvailable: false },
    });
    expect(promoDeleteManyMock).toHaveBeenCalledWith({
      where: { productId: { in: ["prod-unico", "combo-solo"] } },
    });
    expect(body.impacts.deletedCombos).toEqual([
      { id: "combo-solo", name: "Combo Só Sorvete", softDeleted: false },
    ]);
    expect(body.impacts.pausedCombos).toEqual([
      { id: "combo-multi", name: "Combo Completo", remainingItemsCount: 2 },
    ]);
  });

  it("formatProduct expõe categoryIsActive=false quando a categoria pai está pausada", () => {
    const formatted = formatProduct({
      id: "p-1",
      name: "Picolé Limão",
      price: 5,
      isAvailable: true,
      categoryId: "cat-paused",
      categoryRel: { name: "Picolés", isActive: false },
      addonGroups: [],
      comboItems: [],
      promotions: [],
    });

    expect(formatted.category).toBe("Picolés");
    expect(formatted.categoryIsActive).toBe(false);
  });
});
