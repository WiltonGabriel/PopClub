import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import * as authLib from "@/lib/auth";
import { checkoutLimiter } from "@/lib/rateLimit";

describe("Observação de Itens e Regras de Cupom no Checkout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(checkoutLimiter, "check").mockReturnValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    } as any);

    vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
      id: "store_config",
      isOpen: true,
      businessHours: null,
      deliveryFee: 5.0,
    } as any);

    vi.spyOn(prisma.shift, "findFirst").mockResolvedValue({ id: "shift-1" } as any);
    vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.notificationTemplate, "findFirst").mockResolvedValue(null);
  });

  const mockUserFastAccess = {
    id: "user-quick-1",
    fullName: "Cliente Acesso Rápido",
    phone: "65999997777",
    email: "rapido@popclub.com.br",
    isRegistered: false, // Usuário de acesso rápido (sem senha completa)
    role: "client",
    createdAt: new Date(),
  };

  const mockNormalProduct = {
    id: "prod-sorvete",
    name: "Sorvete Artesanal",
    price: 20.0,
    stock: 50,
    isAvailable: true,
    isCombo: false,
    addonsConfig: null,
    category: { id: "cat-1", name: "Sobremesas" },
    comboItems: [],
    promotions: [],
  };

  const mockComboProduct = {
    id: "prod-combo-duplo",
    name: "Combo Casal Pop",
    price: 45.0,
    stock: 50,
    isAvailable: true,
    isCombo: true,
    addonsConfig: null,
    category: { id: "cat-combos", name: "Combos" },
    comboItems: [
      { product: { id: "prod-a", name: "A", price: 25 }, quantity: 1 },
      { product: { id: "prod-b", name: "B", price: 25 }, quantity: 1 },
    ],
    promotions: [],
  };

  const mockValidCoupon = {
    id: "coup-10off",
    code: "POP10",
    discountType: "percentage",
    discountValue: 10,
    isActive: true,
    uses: 5,
    maxUses: 100,
    minOrderValue: 10,
    requiresRegistration: false,
    oncePerUser: false,
    productIds: [],
    minLoyaltyLevel: null,
    loyaltyBadgeId: null,
    expiresAt: null,
    createdAt: new Date(),
  };

  it("persiste as observações (notes) dos itens individualmente no checkout", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUserFastAccess as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUserFastAccess as any);
    vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockNormalProduct] as any);
    vi.spyOn(prisma.order, "count").mockResolvedValue(0);

    let createdOrderItems: any[] = [];
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        order: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            createdOrderItems = data.items.create;
            return {
              id: "order-notes-1",
              shortCode: "501",
              totalAmount: 20.0,
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
              items: [],
              ...data,
            };
          }),
        },
        product: {
          findMany: vi.fn().mockResolvedValue([mockNormalProduct]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
        deliverySettings: { findFirst: vi.fn().mockResolvedValue(null) },
        address: { upsert: vi.fn().mockResolvedValue({ id: "addr-1" }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        $executeRaw: vi.fn().mockResolvedValue(1),
      });
    });

    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryType: "retirada",
        items: [
          {
            productId: "prod-sorvete",
            quantity: 1,
            notes: "Sem calda e com colher descartável, por favor.",
          },
        ],
        deliveryAddress: {
          street: "Balcão",
          number: "S/N",
          neighborhood: "Centro",
          city: "Várzea Grande",
        },
        paymentMethod: { type: "dinheiro" },
      }),
    });

    const res = await checkoutHandler(req);
    expect(res.status).toBe(201);
    expect(createdOrderItems).toHaveLength(1);
    expect(createdOrderItems[0].notes).toBe("Sem calda e com colher descartável, por favor.");
  });

  it("permite que cliente de acesso rápido use cupom padrão (quando requiresRegistration não for exigido)", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUserFastAccess as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUserFastAccess as any);
    vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockNormalProduct] as any);
    vi.spyOn(prisma.order, "count").mockResolvedValue(0);

    vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue(mockValidCoupon as any);
    vi.spyOn(prisma.couponRedemption, "findFirst").mockResolvedValue(null);

    let createdOrder: any = null;
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        order: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            createdOrder = data;
            return {
              id: "order-coupon-1",
              shortCode: "502",
              totalAmount: 18.0,
              discountAmount: 2.0,
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
              items: [],
              ...data,
            };
          }),
        },
        product: {
          findMany: vi.fn().mockResolvedValue([mockNormalProduct]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
        coupon: {
          findUnique: vi.fn().mockResolvedValue(mockValidCoupon),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
        couponRedemption: {
          create: vi.fn().mockResolvedValue({}),
        },
        deliverySettings: { findFirst: vi.fn().mockResolvedValue(null) },
        address: { upsert: vi.fn().mockResolvedValue({ id: "addr-1" }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        $executeRaw: vi.fn().mockResolvedValue(1),
      });
    });

    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryType: "retirada",
        couponCode: "POP10",
        items: [{ productId: "prod-sorvete", quantity: 1 }],
        deliveryAddress: {
          street: "Balcão",
          number: "S/N",
          neighborhood: "Centro",
          city: "Várzea Grande",
        },
        paymentMethod: { type: "dinheiro" },
      }),
    });

    const res = await checkoutHandler(req);
    expect(res.status).toBe(201);
    expect(createdOrder.discountAmount).toBe(2.0); // 10% de R$ 20 = R$ 2 de desconto
  });

  it("calcula desconto apenas nos itens elegíveis sem rejeitar o carrinho quando há combo misturado", async () => {
    vi.spyOn(authLib, "getAuthUser").mockResolvedValue(mockUserFastAccess as any);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUserFastAccess as any);
    vi.spyOn(prisma.product, "findMany").mockResolvedValue([mockNormalProduct, mockComboProduct] as any);
    vi.spyOn(prisma.order, "count").mockResolvedValue(0);

    vi.spyOn(prisma.coupon, "findUnique").mockResolvedValue(mockValidCoupon as any);
    vi.spyOn(prisma.couponRedemption, "findFirst").mockResolvedValue(null);

    let createdOrder: any = null;
    vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => {
      return cb({
        order: {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            createdOrder = data;
            return {
              id: "order-coupon-combo",
              shortCode: "503",
              totalAmount: 63.0,
              discountAmount: 2.0,
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
              items: [],
              ...data,
            };
          }),
        },
        product: {
          findMany: vi.fn().mockResolvedValue([mockNormalProduct, mockComboProduct]),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
        coupon: {
          findUnique: vi.fn().mockResolvedValue(mockValidCoupon),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({}),
        },
        couponRedemption: {
          create: vi.fn().mockResolvedValue({}),
        },
        deliverySettings: { findFirst: vi.fn().mockResolvedValue(null) },
        address: { upsert: vi.fn().mockResolvedValue({ id: "addr-1" }) },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
        $executeRaw: vi.fn().mockResolvedValue(1),
      });
    });

    // Carrinho tem 1 Sorvete (R$ 20) + 1 Combo (R$ 45). Subtotal total = R$ 65.
    // Desconto de 10% deve ser calculado sobre os R$ 20 dos itens normais = R$ 2 de desconto.
    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryType: "retirada",
        couponCode: "POP10",
        items: [
          { productId: "prod-sorvete", quantity: 1 },
          { productId: "prod-combo-duplo", quantity: 1 },
        ],
        deliveryAddress: {
          street: "Balcão",
          number: "S/N",
          neighborhood: "Centro",
          city: "Várzea Grande",
        },
        paymentMethod: { type: "dinheiro" },
      }),
    });

    const res = await checkoutHandler(req);
    expect(res.status).toBe(201);
    // Desconto de R$ 2 aplicado apenas sobre o item comum, sem rejeitar o carrinho
    expect(createdOrder.discountAmount).toBe(2.0);
    expect(createdOrder.totalAmount).toBe(63.0);
  });
});
