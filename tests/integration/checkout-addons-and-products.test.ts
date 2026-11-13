import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import { PUT as updateProductHandler } from "@/app/api/products/[id]/route";
import * as authLib from "@/lib/auth";
import { checkoutLimiter } from "@/lib/rateLimit";
import { StoreScheduleDomainService } from "@/domain/services/StoreScheduleDomainService";

describe("Integração de Complementos em Combos, Checkout e Ordenação de Produtos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(StoreScheduleDomainService, "assertCanAcceptOrders").mockReturnValue({
      canAcceptOrders: true,
      status: "OPEN",
      isOpen: true,
      openingTime: "13:00",
      closingTime: "23:30",
    } as any);
    vi.spyOn(checkoutLimiter, "check").mockReturnValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any);
    vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
      id: "store_config",
      isOpen: true,
      businessHours: null,
      deliveryFee: 0,
    } as any);
    vi.spyOn(prisma.shift, "findFirst").mockResolvedValue({ id: "shift-1" } as any);
    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue(null);
  });

  const mockUser = {
    id: "user-1",
    fullName: "Cliente Teste",
    phone: "65999998888",
    email: "cliente@popclub.com.br",
    isRegistered: true,
    role: "client",
  };

  it("valida cotas gratuitas por unidade de combo sem somar cotas entre marmita e copos e mantém talheres ao final", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.order, "count").mockResolvedValue(0);

    const mockCombo = {
      id: "combo-fam",
      name: "Combo Família",
      price: 79.9,
      stock: 10,
      isAvailable: true,
      isCombo: true,
      promotions: [],
      addonGroups: [{ groupId: "grp-talheres" }],
      comboItems: [
        {
          productId: "marmita-750",
          quantity: 1,
          product: { id: "marmita-750", name: "Marmita 750ml", addonGroups: [{ groupId: "grp-trad6" }] },
        },
        {
          productId: "copo-300",
          quantity: 2,
          product: { id: "copo-300", name: "Copo 300ml", addonGroups: [{ groupId: "grp-trad4" }] },
        },
      ],
    };

    const groupTrad4 = { id: "grp-trad4", name: "Tradicionais (4 Grátis)", minQuantity: 0, maxQuantity: 10, freeQuantity: 4, allowItemQuantity: true, isActive: true };
    const groupTalheres = { id: "grp-talheres", name: "Talheres / Descartáveis", minQuantity: 1, maxQuantity: 1, freeQuantity: 0, allowItemQuantity: false, isActive: true };

    vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockCombo] as any);
    vi.spyOn(prisma.addonItem, "findMany").mockResolvedValue([
      { id: "add-morango", groupId: "grp-trad4", name: "Morango", price: 1.5, isAvailable: true, group: groupTrad4 },
      { id: "add-granola", groupId: "grp-trad4", name: "Granola", price: 1.5, isAvailable: true, group: groupTrad4 },
      { id: "add-leite", groupId: "grp-trad4", name: "Leite em Pó", price: 1.5, isAvailable: true, group: groupTrad4 },
      { id: "add-kiwi", groupId: "grp-trad4", name: "Kiwi", price: 1.5, isAvailable: true, group: groupTrad4 },
      { id: "add-banana", groupId: "grp-trad4", name: "Banana", price: 1.5, isAvailable: true, group: groupTrad4 },
      { id: "add-colher", groupId: "grp-talheres", name: "Quero colher descartável", price: 0.98, isAvailable: true, group: groupTalheres },
    ] as any);

    let savedOrderItems: any[] = [];
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      const tx = {
        product: {
          findMany: vi.fn().mockResolvedValue([mockCombo]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
        deliverySettings: { findFirst: vi.fn().mockResolvedValue(null) },
        address: { upsert: vi.fn().mockResolvedValue({ id: "addr-1" }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        $executeRaw: vi.fn().mockResolvedValue(1),
        order: {
          create: vi.fn().mockImplementation(async (args: any) => {
            savedOrderItems = args.data.items.create;
            return {
              id: "order-1",
              userId: mockUser.id,
              status: "pending",
              subtotal: args.data.subtotal,
              discountAmount: args.data.discountAmount,
              deliveryFee: args.data.deliveryFee,
              totalAmount: args.data.totalAmount,
              paymentMethodType: "pix_entrega",
              createdAt: new Date(),
              updatedAt: new Date(),
              items: savedOrderItems.map((it: any) => ({ ...it, id: "oi-1", orderId: "order-1", product: mockCombo })),
            };
          }),
        },
      };
      return cb(tx);
    });

    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            productId: "combo-fam",
            quantity: 1,
            selectedAddons: [
              // Talheres enviado intencionalmente fora de ordem (no início) para testar reordenação
              { id: "add-colher", name: "Quero colher descartável", groupName: "Talheres / Descartáveis", price: 0.98, quantity: 1 },
              // Copo 300ml #1 selecionou 5 tradicionais (4 grátis + 1 pago de R$ 1,50)
              { id: "add-morango", name: "Morango", groupName: "Copo 300ml #1 • Tradicionais (4 Grátis)", price: 0, quantity: 1 },
              { id: "add-granola", name: "Granola", groupName: "Copo 300ml #1 • Tradicionais (4 Grátis)", price: 0, quantity: 1 },
              { id: "add-leite", name: "Leite em Pó", groupName: "Copo 300ml #1 • Tradicionais (4 Grátis)", price: 0, quantity: 1 },
              { id: "add-kiwi", name: "Kiwi", groupName: "Copo 300ml #1 • Tradicionais (4 Grátis)", price: 0, quantity: 1 },
              { id: "add-banana", name: "Banana (1x)", groupName: "Copo 300ml #1 • Tradicionais (4 Grátis)", price: 1.5, quantity: 1 },
            ],
          },
        ],
        deliveryType: "retirada",
        deliveryAddress: { street: "Retirada", number: "0", neighborhood: "Centro", city: "Sorriso", cep: "78890000" },
        paymentMethod: { type: "pix_entrega" },
      }),
    });

    const res = await checkoutHandler(req);
    expect(res.status).toBe(201);

    // Preço esperado: 79.90 combo + 1.50 (5º adicional do Copo #1) + 0.98 (colher) = 82.38
    expect(savedOrderItems).toHaveLength(1);
    expect(savedOrderItems[0].priceAtTime).toBeCloseTo(82.38, 2);

    const persistedAddons = savedOrderItems[0].selectedAddons;
    // Talheres deve ter sido reordenado para o final
    expect(persistedAddons[persistedAddons.length - 1].groupName).toBe("Talheres / Descartáveis");
    // Nome limpo sem sufixo redundante "(1x)"
    expect(persistedAddons.find((a: any) => a.id === "add-banana").name).toBe("Banana");
  });

  it("PUT /api/products/[id] ordena addonGroupIds garantindo Talheres/Descartáveis ao final e retorna addonGroupIds", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
      id: "admin-1",
      role: "admin",
    } as any);

    vi.spyOn(prisma.addonGroup, "findMany").mockResolvedValue([
      { id: "grp-talheres", name: "Talheres / Descartáveis", sortOrder: 1 },
      { id: "grp-trad", name: "Acompanhamentos Tradicionais", sortOrder: 1 },
    ] as any);

    const updateSpy = vi.spyOn(prisma.product, "update").mockImplementation((async (args: any) => {
      const createdLinks = args.data.addonGroups.create;
      return {
        id: "prod-copo-400",
        name: "Copo 400ml",
        price: 25,
        isAvailable: true,
        isCombo: false,
        categoryRel: { name: "Copos" },
        promotions: [],
        comboItems: [],
        addonGroups: createdLinks.map((c: any) => ({
          groupId: c.groupId,
          sortOrder: c.sortOrder,
          group: {
            id: c.groupId,
            name: c.groupId === "grp-talheres" ? "Talheres / Descartáveis" : "Acompanhamentos Tradicionais",
            sortOrder: c.sortOrder,
            items: [],
          },
        })),
      } as any;
    }) as any);

    const req = new Request("http://localhost/api/products/prod-copo-400", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Copo 400ml",
        price: 25,
        addonGroupIds: ["grp-talheres", "grp-trad"], // Admin marcou Talheres primeiro
      }),
    });

    const res = await updateProductHandler(req, { params: Promise.resolve({ id: "prod-copo-400" }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    // Deve gravar e retornar com grp-trad primeiro e grp-talheres por último
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(json.addonGroupIds).toEqual(["grp-trad", "grp-talheres"]);
    expect(json.addonGroups.map((g: any) => g.groupId)).toEqual(["grp-trad", "grp-talheres"]);
  });
});
