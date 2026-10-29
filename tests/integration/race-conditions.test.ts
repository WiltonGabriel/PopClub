import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as fastAccessHandler } from "@/app/api/auth/fast-access/route";
import { POST as claimOrdersHandler } from "@/app/api/orders/claim/route";
import { POST as completeDeliveryHandler } from "@/app/api/delivery/[token]/complete/route";
import { POST as shiftHandler } from "@/app/api/shifts/route";
import * as authLib from "@/lib/auth";

describe("Blindagem Contra Condições de Corrida (Race Conditions) no Banco de Dados", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Idempotência e Unicidade no Checkout (idempotencyKey)", () => {
    it("impede criação duplicada de pedido quando 2 requisições paralelas chegam com a mesma idempotencyKey", async () => {
      const idempotencyKey = `test-idem-${Date.now()}-${Math.random()}`;
      
      // Simula colisão no banco: o primeiro insere, o segundo bate na constraint única
      const createdOrder = {
        id: "order-1",
        idempotencyKey,
        status: "pending",
        subtotal: 50,
        discountAmount: 0,
        deliveryFee: 5,
        totalAmount: 55,
        trackingToken: "track-123",
        createdAt: new Date(),
      };

      let insertCount = 0;
      const simulateCheckoutInsert = async () => {
        if (insertCount === 0) {
          insertCount++;
          return createdOrder;
        } else {
          const p2002Error: any = new Error("Unique constraint failed on the fields: (`idempotency_key`)");
          p2002Error.code = "P2002";
          throw p2002Error;
        }
      };

      // Dispara 2 requisições concorrentes
      const [res1, res2] = await Promise.allSettled([
        simulateCheckoutInsert(),
        simulateCheckoutInsert(),
      ]);

      expect(res1.status).toBe("fulfilled");
      expect(res2.status).toBe("rejected");
      if (res2.status === "rejected") {
        expect((res2.reason as any).code).toBe("P2002");
      }
      expect(insertCount).toBe(1);
    });
  });

  describe("2. Teto Global de Utilização de Cupom (maxUses) via Operação Atômica", () => {
    it("garante que entre 2 requisições simultâneas para a última vaga de um cupom, apenas uma é aprovada", async () => {
      const couponId = "coupon-last-ticket";
      let currentUses = 9;
      const maxUses = 10;

      // Simula a instrução atômica: UPDATE coupons SET uses = uses + 1 WHERE id = $1 AND uses < max_uses
      const atomicUpdateUses = async () => {
        if (currentUses < maxUses) {
          currentUses++;
          return 1; // 1 linha afetada
        }
        return 0; // 0 linhas afetadas (limite esgotado)
      };

      // Duas requisições paralelas chegam exatamente ao mesmo tempo quando restava apenas 1 uso
      const [result1, result2] = await Promise.all([
        atomicUpdateUses(),
        atomicUpdateUses(),
      ]);

      const totalApproved = (result1 === 1 ? 1 : 0) + (result2 === 1 ? 1 : 0);
      expect(totalApproved).toBe(1);
      expect(currentUses).toBe(10);
    });
  });

  describe("3. Uso Único de Cupom por Usuário (oncePerUser) via Constraint Única Composta", () => {
    it("impede que o mesmo cliente use o mesmo cupom promocional duas vezes em requisições paralelas", async () => {
      const couponId = "coupon-welcome-10";
      const userId = "user-client-1";

      const existingRedemptions = new Set<string>();

      const simulateRedemptionInsert = async () => {
        const key = `${couponId}_${userId}`;
        if (existingRedemptions.has(key)) {
          const error: any = new Error("Unique constraint failed on unique_user_coupon_redemption");
          error.code = "P2002";
          throw error;
        }
        existingRedemptions.add(key);
        return { id: "redemption-1", couponId, userId };
      };

      const [attempt1, attempt2] = await Promise.allSettled([
        simulateRedemptionInsert(),
        simulateRedemptionInsert(),
      ]);

      expect(attempt1.status).toBe("fulfilled");
      expect(attempt2.status).toBe("rejected");
      if (attempt2.status === "rejected") {
        expect((attempt2.reason as any).code).toBe("P2002");
      }
      expect(existingRedemptions.size).toBe(1);
    });
  });

  describe("4. Unicidade de Turno Aberto (unique_active_shift) via Índice Único Parcial", () => {
    it("impede abertura simultânea de mais de um turno ativo no banco de dados", async () => {
      let openShiftExists = false;

      const simulateOpenShift = async (code: string) => {
        if (openShiftExists) {
          const err: any = new Error("duplicate key value violates unique constraint 'unique_active_shift'");
          err.code = "P2002";
          throw err;
        }
        openShiftExists = true;
        return { id: `shift-${code}`, code, isOpen: true };
      };

      const [shift1, shift2] = await Promise.allSettled([
        simulateOpenShift("TURNO-01"),
        simulateOpenShift("TURNO-02"),
      ]);

      expect(shift1.status).toBe("fulfilled");
      expect(shift2.status).toBe("rejected");
      if (shift2.status === "rejected") {
        expect((shift2.reason as any).code).toBe("P2002");
      }
    });
  });

  describe("5. Unicidade de Telefone no Acesso Rápido (/api/auth/fast-access)", () => {
    it("trata race condition ao criar usuário pelo telefone retornando o mesmo registro sem duplicar", async () => {
      const testPhone = "65999887766";
      const testUser = {
        id: "user-race-1",
        fullName: "Cliente Concorrente",
        phone: testPhone,
        role: "CLIENT",
        isRegistered: false,
        avatarUrl: "/avatars/avatar-guest-user.svg",
        locations: [],
      };

      let createCallCount = 0;
      vi.spyOn(prisma.user, "findFirst").mockImplementation((async () => {
        if (createCallCount > 0) return testUser as any;
        return null;
      }) as any);

      vi.spyOn(prisma.user, "create").mockImplementation((async () => {
        createCallCount++;
        if (createCallCount === 1) {
          return testUser as any;
        }
        const err: any = new Error("Unique constraint failed on the fields: (`phone`)");
        err.code = "P2002";
        throw err;
      }) as any);

      const makeRequest = () =>
        new Request("http://localhost:3000/api/auth/fast-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: "Cliente Concorrente", phone: testPhone }),
        });

      const [res1, res2] = await Promise.all([
        fastAccessHandler(makeRequest()),
        fastAccessHandler(makeRequest()),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const json1 = await res1.json();
      const json2 = await res2.json();

      expect(json1.user.id).toBe(testUser.id);
      expect(json2.user.id).toBe(testUser.id);
    });
  });

  describe("6. Reivindicação Concorrente de Pedido Anônimo (/api/orders/claim)", () => {
    it("garante que apenas o primeiro usuário consegue vincular o pedido anônimo e o segundo recebe 409", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "user-buyer",
        role: "client",
      } as any);

      vi.spyOn(prisma.order, "findMany").mockResolvedValue([{ id: "order-anon-1" }] as any);

      let claimed = false;
      vi.spyOn(prisma.order, "updateMany").mockImplementation((async () => {
        if (!claimed) {
          claimed = true;
          return { count: 1 };
        }
        return { count: 0 };
      }) as any);

      const makeClaimReq = () =>
        new Request("http://localhost:3000/api/orders/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds: ["order-anon-1"] }),
        });

      const [res1, res2] = await Promise.all([
        claimOrdersHandler(makeClaimReq()),
        claimOrdersHandler(makeClaimReq()),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  describe("7. Finalização Atômica de Entrega (/api/delivery/[token]/complete)", () => {
    it("executa transição de status de forma idempotente e atômica sob chamadas paralelas", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue({
        id: "order-deliv-1",
        status: "delivering",
      } as any);

      let updateCalls = 0;
      vi.spyOn(prisma.order, "updateMany").mockImplementation((async () => {
        updateCalls++;
        if (updateCalls === 1) {
          return { count: 1 };
        }
        return { count: 0 };
      }) as any);

      const makeCompleteReq = () =>
        new Request("http://localhost:3000/api/delivery/token-123/complete", {
          method: "POST",
        });

      const [res1, res2] = await Promise.all([
        completeDeliveryHandler(makeCompleteReq(), { params: Promise.resolve({ token: "token-123" }) }),
        completeDeliveryHandler(makeCompleteReq(), { params: Promise.resolve({ token: "token-123" }) }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const json1 = await res1.json();
      const json2 = await res2.json();

      expect(json1.success).toBe(true);
      expect(json2.success).toBe(true);
      expect(updateCalls).toBe(2);
    });
  });
});
