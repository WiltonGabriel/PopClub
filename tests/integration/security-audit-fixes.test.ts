import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as fastAccessHandler } from "@/app/api/auth/fast-access/route";
import { POST as verifyDeviceHandler } from "@/app/api/auth/verify-device/route";
import { GET as getOrdersHandler } from "@/app/api/orders/route";
import { GET as checkPhoneHandler } from "@/app/api/auth/check-phone/route";
import { POST as checkoutHandler } from "@/app/api/checkout/route";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";
import { StoreScheduleDomainService } from "@/domain/services/StoreScheduleDomainService";
import jwt from "jsonwebtoken";

describe("Auditoria de Segurança — Validação das Correções Anti-Vulnerabilidade", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Blindagem Anti-Account Takeover no Acesso Rápido (/api/auth/fast-access)", () => {
    it("bloqueia com HTTP 403 tentativa de takeover em conta registrada/com senha via Fast Access", async () => {
      // Simula usuário registrado no banco de dados (ex: Administrador ou Cliente Cadastrado)
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "admin-victim-id",
        fullName: "Administrador da Loja",
        username: "admin",
        phone: "65999887766",
        email: "admin@popclub.com",
        passwordHash: "$2a$10$hashedAdminPassword",
        role: "ADMIN" as any,
        isRegistered: true,
        tokenVersion: 1,
        locations: [],
      } as any);

      // Atacante tenta invocar fast-access com o telefone do admin alegando retirada no balcão
      const req = new Request("http://localhost:3000/api/auth/fast-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "(65) 99988-7766",
          fullName: "Atacante Mallory",
          isPickup: true,
        }),
      });

      const res = await fastAccessHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.status).toBe("password_required");
      expect(data.requiresPassword).toBe(true);
      expect(data.error).toContain("faça login com sua senha");
    });

    it("permite acesso rápido legítimo para consumidor temporário (guest sem senha)", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "guest-legit-id",
        fullName: "Cliente Visitante",
        username: "user_12345678",
        phone: "65988881111",
        email: null,
        passwordHash: null,
        role: "CLIENT" as any,
        isRegistered: false,
        tokenVersion: 1,
        avatarUrl: "/avatars/avatar-guest-user.svg",
        locations: [],
      } as any);

      const req = new Request("http://localhost:3000/api/auth/fast-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "(65) 98888-1111",
          fullName: "Cliente Visitante",
          isPickup: true,
        }),
      });

      const res = await fastAccessHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("authenticated");
      expect(data.user.id).toBe("guest-legit-id");
      expect(Boolean(data.token)).toBe(true);
    });
  });

  describe("2. Blindagem Anti-Account Takeover no Reconhecimento de Aparelho (/api/auth/verify-device)", () => {
    it("bloqueia com HTTP 403 tentativa de validar aparelho para conta que possui senha", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "user-registered-1",
        fullName: "Cliente Cadastrado",
        phone: "65999882233",
        role: "CLIENT" as any,
        isRegistered: true,
        passwordHash: "$2a$10$validpasswordhash",
        tokenVersion: 1,
      } as any);

      const req = new Request("http://localhost:3000/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "(65) 99988-2233",
          newAddress: {
            street: "Rua Ficticia",
            number: "999",
            neighborhood: "Centro",
          },
        }),
      });

      const res = await verifyDeviceHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.requiresPassword).toBe(true);
    });

    it("bloqueia bypass de verificação por newAddress quando a conta já possui endereços cadastrados", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "guest-user-with-address",
        fullName: "Visitante Recorrente",
        phone: "65999883344",
        role: "CLIENT" as any,
        isRegistered: false,
        passwordHash: null,
        tokenVersion: 1,
      } as any);

      // Usuário tem 1 endereço salvo no banco
      vi.spyOn(prisma.userLocation, "count").mockResolvedValue(1);

      // Atacante envia apenas newAddress sem validar o número do endereço anterior
      const req = new Request("http://localhost:3000/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "(65) 99988-3344",
          newAddress: {
            street: "Nova Rua Invasora",
            number: "123",
            neighborhood: "Bairro Novo",
          },
        }),
      });

      const res = await verifyDeviceHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Informe o número da residência");
    });
  });

  describe("3. Proteção BOLA / IDOR na Listagem de Pedidos (/api/orders)", () => {
    it("impede que visitante anônimo consulte pedidos de usuários cadastrados via guestOrderIds", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const findManySpy = vi.spyOn(prisma.order, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.order, "count").mockResolvedValue(0);

      const req = new Request("http://localhost:3000/api/orders?guestOrderIds=order-reg-1,order-reg-2");
      const res = await getOrdersHandler(req);

      expect(res.status).toBe(200);
      const callArgs = findManySpy.mock.calls[0]?.[0] as any;
      const capturedWhere = callArgs?.where;
      expect(capturedWhere).toBeDefined();
      expect(capturedWhere.id).toEqual({ in: ["order-reg-1", "order-reg-2"] });
      // Garante que a clausula OR restringe a pedidos de usuários não cadastrados
      expect(capturedWhere.OR).toEqual([
        { user: { isRegistered: false } },
        { user: null },
        { userId: null },
      ]);
    });

    it("redige o order_pin em pedidos listados para visitantes anônimos", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const mockGuestOrder = {
        id: "guest-order-1",
        userId: "guest-user-1",
        status: "pending",
        orderPin: "4321",
        subtotal: 50.0,
        discountAmount: 0,
        deliveryFee: 5.0,
        totalAmount: 55.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        user: {
          fullName: "Cliente Anônimo",
          username: "anon_1",
          email: null,
          phone: "65999990000",
          isRegistered: false,
        },
      };

      vi.spyOn(prisma.order, "findMany").mockResolvedValue([mockGuestOrder as any]);

      const req = new Request("http://localhost:3000/api/orders?guestOrderIds=guest-order-1");
      const res = await getOrdersHandler(req);

      expect(res.status).toBe(200);
      const orders = await res.json();
      expect(orders.length).toBe(1);
      expect(orders[0].id).toBe("guest-order-1");
      // Proteção de Confidencialidade: o PIN de entrega não deve ser exposto ao listar
      expect(orders[0].order_pin).toBeNull();
    });
  });

  describe("4. Anonimização e Mascaramento de PII (/api/auth/check-phone)", () => {
    it("mascara o nome completo do cliente ao consultar telefone publicamente", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "user-1",
        fullName: "Wilton Gabriel Albuquerque Pereira",
        username: "wilton",
        email: "wilton@teste.com",
        isRegistered: true,
        passwordHash: "$2a$10$hash",
      } as any);

      const req = new Request("http://localhost:3000/api/auth/check-phone?phone=65999887766");
      const res = await checkPhoneHandler(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.exists).toBe(true);
      // O nome completo não deve ser retornado sem censura
      expect(data.fullName).not.toBe("Wilton Gabriel Albuquerque Pereira");
      expect(data.fullName).toContain("Wilton");
      expect(data.fullName).toContain("***");
    });
  });

  describe("5. Invalidação Imediata de Sessão via tokenVersion", () => {
    it("recusa autenticação quando tokenVersion do payload JWT for divergente do banco", async () => {
      const mockUserInDb = {
        id: "user-test-token-version",
        email: "test@tokenversion.com",
        username: "testtoken",
        role: "client",
        permissions: [],
        isActive: true,
        isBlocked: false,
        tokenVersion: 2, // No banco a versão foi incrementada para 2
        isRegistered: true,
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUserInDb as any);

      // Token assinado com tokenVersion 1 (versão revogada)
      const expiredVersionToken = auth.signToken({
        userId: "user-test-token-version",
        role: "client",
        tokenVersion: 1,
      });

      const req = new Request("http://localhost:3000/api/test", {
        headers: { cookie: `popshake_session=${expiredVersionToken}` },
      });

      const authUser = await auth.getAuthUser(req);
      expect(authUser).toBeNull();
    });

    it("recusa autenticação quando o token JWT omitir tokenVersion e o usuário no banco possuir versão", async () => {
      const mockUserInDb = {
        id: "user-test-token-version-2",
        email: "test2@tokenversion.com",
        username: "testtoken2",
        role: "client",
        permissions: [],
        isActive: true,
        isBlocked: false,
        tokenVersion: 1,
        isRegistered: true,
      };

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUserInDb as any);

      // Token assinado sem claim de tokenVersion
      const unversionedToken = auth.signToken({
        userId: "user-test-token-version-2",
        role: "client",
      });

      const req = new Request("http://localhost:3000/api/test", {
        headers: { cookie: `popshake_session=${unversionedToken}` },
      });

      const authUser = await auth.getAuthUser(req);
      expect(authUser).toBeNull();
    });
  });

  describe("6. Checkout Seguro: Anti-Takeover e Raio de Entrega (/api/checkout)", () => {
    beforeEach(() => {
      vi.spyOn(StoreScheduleDomainService, "assertCanAcceptOrders").mockReturnValue({
        canAccept: true,
        isOpenNow: true,
        isConveyorActive: true,
        reason: "Aberta",
      } as any);
      vi.spyOn(prisma.storeSettings, "findUnique").mockResolvedValue({
        id: "store_config",
        isOpen: true,
        businessHours: null,
        deliveryFee: 5.0,
        storeLatitude: -15.6536,
        storeLongitude: -56.1322,
        maxDeliveryRadiusKm: 12,
      } as any);
      vi.spyOn(prisma.shift, "findFirst").mockResolvedValue({ id: "shift-1" } as any);
      vi.spyOn(prisma.product, "findMany").mockResolvedValue([
        {
          id: "prod-1",
          name: "Açaí Tradicional",
          price: 25.0,
          stock: 50,
          isAvailable: true,
          isCombo: false,
          addonsConfig: null,
          comboItems: [],
          promotions: [],
        },
      ] as any);
      vi.spyOn(prisma.promotion, "findMany").mockResolvedValue([]);
    });

    it("rejeita checkout de entrega quando coordenadas (latitude e longitude) forem omitidas", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "guest-user-without-coords",
        fullName: "Cliente Sem Coords",
        phone: "65999881122",
        role: "CLIENT" as any,
        isRegistered: false,
        passwordHash: null,
        tokenVersion: 1,
      } as any);

      const req = new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType: "delivery",
          customerPhone: "65999881122",
          customerName: "Cliente Teste",
          items: [{ productId: "prod-1", quantity: 1 }],
          deliveryAddress: {
            street: "Rua das Flores",
            number: "123",
            neighborhood: "Centro",
            city: "Várzea Grande",
            // latitude e longitude omitidas
          },
          paymentMethod: { type: "pix_entrega" },
        }),
      });

      const res = await checkoutHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("COORDINATES_REQUIRED");
    });

    it("bloqueia checkout não-autenticado usando o WhatsApp de uma conta registrada", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "registered-victim-id",
        fullName: "Usuário Cadastrado Real",
        phone: "65999885544",
        role: "CLIENT" as any,
        isRegistered: true,
        passwordHash: "$2a$10$validpwdhash",
        tokenVersion: 1,
      } as any);

      const req = new Request("http://localhost:3000/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType: "retirada",
          customerPhone: "65999885544",
          customerName: "Impostor",
          items: [{ productId: "prod-1", quantity: 1 }],
          deliveryAddress: {
            street: "Retirada",
            number: "S/N",
            neighborhood: "Centro",
          },
          paymentMethod: { type: "pix_entrega" },
        }),
      });

      const res = await checkoutHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("REGISTERED_USER_LOGIN_REQUIRED");
    });
  });

  describe("7. Rotação Graciosa de Chave JWT (Zero Downtime)", () => {
    it("valida tokens assinados com a chave anterior durante a janela de transição (JWT_SECRET_PREVIOUS)", () => {
      const oldSecret = "previous_jwt_secret_key_that_was_rotated";
      const newSecret = "new_super_secure_32_bytes_random_jwt_secret";

      process.env.JWT_SECRET = newSecret;
      process.env.JWT_SECRET_PREVIOUS = oldSecret;

      // Token assinado com o secret anterior
      const legacyToken = jwt.sign(
        { userId: "user-legacy-session", role: "client", tokenVersion: 1 },
        oldSecret
      );

      // verifyToken deve aceitar o token legado graças ao fallback configurado
      const verified = auth.verifyToken(legacyToken);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("user-legacy-session");

      // Novo token assinado com a nova chave também deve ser aceito
      const newToken = auth.signToken({
        userId: "user-new-session",
        role: "client",
        tokenVersion: 1,
      });
      const verifiedNew = auth.verifyToken(newToken);
      expect(verifiedNew).not.toBeNull();
      expect(verifiedNew?.userId).toBe("user-new-session");

      // Token assinado com chave desconhecida deve falhar
      const forgedToken = jwt.sign(
        { userId: "attacker", role: "admin" },
        "attacker_unknown_key"
      );
      const verifiedForged = auth.verifyToken(forgedToken);
      expect(verifiedForged).toBeNull();
    });
  });
});
