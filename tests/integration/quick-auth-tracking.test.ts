import { describe, it, expect, vi } from "vitest";
import { fullNameSchema, phoneSchema, sanitizeAndNormalizePhone } from "@/lib/validations/auth";
import { formatOrder } from "@/lib/orderFormat";
import { GET as getOrderById } from "@/app/api/orders/[id]/route";
import { prisma } from "@/lib/prisma";

describe("Identificação Rápida e Rastreamento Anônimo", () => {
  describe("Validação de Identificação Rápida (Acesso Rápido)", () => {
    it("valida com sucesso nome completo e telefone celular com DDD 65 (Mato Grosso)", () => {
      const validName = "Wilton Gabriel da Silva";
      const validPhone = "(65) 99654-3210";

      const parsedName = fullNameSchema.safeParse(validName);
      expect(parsedName.success).toBe(true);
      if (parsedName.success) {
        expect(parsedName.data).toBe("Wilton Gabriel da Silva");
      }

      const normalizedPhone = sanitizeAndNormalizePhone(validPhone);
      expect(normalizedPhone).toBe("65996543210");
      expect(normalizedPhone.startsWith("65")).toBe(true);
      expect(normalizedPhone.length).toBe(11);

      const parsedPhone = phoneSchema.safeParse(validPhone);
      expect(parsedPhone.success).toBe(true);
    });

    it("rejeita nomes inválidos ou com menos de 3 caracteres", () => {
      expect(fullNameSchema.safeParse("Jo").success).toBe(false);
      expect(fullNameSchema.safeParse("").success).toBe(false);
      expect(fullNameSchema.safeParse("   ").success).toBe(false);
      expect(fullNameSchema.safeParse("Carlos123").success).toBe(false);
    });

    it("rejeita telefones com DDD inválido ou quantidade incorreta de dígitos", () => {
      // DDD 00 é inválido
      expect(phoneSchema.safeParse("(00) 99999-9999").success).toBe(false);
      // Faltando dígitos (menos de 10)
      expect(phoneSchema.safeParse("99654321").success).toBe(false);
    });
  });

  describe("Acesso Anônimo/Visitante ao Rastreamento (/api/orders/[id])", () => {
    it("permite acesso público ao pedido via UUID sem exigir autenticação prévia (sem 403 Forbidden)", async () => {
      const testOrderId = "550e8400-e29b-41d4-a716-446655440000";

      const mockDbOrder = {
        id: testOrderId,
        status: "preparing",
        subtotal: 35.0,
        discountAmount: 0,
        deliveryFee: 5.0,
        totalAmount: 40.0,
        paymentMethodType: "pix_entrega",
        deliveryStreet: "Av. Filinto Müller",
        deliveryNumber: "850",
        deliveryNeighborhood: "Centro Sul",
        deliveryCity: "Várzea Grande",
        deliveryComplement: null,
        deliveryReference: "Próximo à praça",
        deliveryZip: "78110-000",
        createdAt: new Date(),
        updatedAt: new Date(),
        shiftId: null,
        user: {
          fullName: "Cliente Visitante",
          username: "visitante65",
          email: null,
          phone: "65996543210",
          isRegistered: false,
        },
        items: [
          {
            id: "item-1",
            productId: "prod-1",
            quantity: 1,
            priceAtTime: 35.0,
            product: {
              id: "prod-1",
              name: "Copo da Felicidade 500ml",
              price: 35.0,
              imageUrl: "/images/copo.webp",
            },
          },
        ],
      };

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(mockDbOrder as any);

      // Simula requisição anônima (sem cookies de sessão ou token de auth)
      const req = new Request(`http://localhost:3000/api/orders/${testOrderId}`, {
        method: "GET",
      });

      const response = await getOrderById(req, {
        params: Promise.resolve({ id: testOrderId }),
      });

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe(testOrderId);
      expect(body.status).toBe("preparing");
      expect(body.user.phone).toBe("65996543210");
      expect(body.user.isRegistered).toBe(false);
    });
  });
});
