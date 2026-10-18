import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getPrivacyData, DELETE as deletePrivacyData } from "@/app/api/users/privacy/route";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";
import {
  DEFAULT_COOKIE_PREFERENCES,
  privacyService,
  COOKIE_CONSENT_KEY,
} from "@/services/privacyService";

describe("Conformidade Integral à LGPD (Lei nº 13.709/2018) e Diretrizes da ANPD", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Eixo 1: Portabilidade de Dados do Titular (Art. 18, V)", () => {
    it("recusa requisição não autenticada com HTTP 401 Unauthorized", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/users/privacy", {
        method: "GET",
      });

      const res = await getPrivacyData(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Acesso negado");
    });

    it("gera relatório estruturado legível por máquina com DPO e bases legais aplicadas", async () => {
      const mockUser = {
        id: "user-uuid-123",
        fullName: "Maria dos Santos",
        username: "maria65",
        email: "maria@example.com",
        phone: "65999998888",
        role: "CLIENT",
        isRegistered: true,
        createdAt: new Date("2026-01-10T10:00:00Z"),
        accessibilitySettings: {},
      };

      const mockLocations = [
        {
          id: "loc-1",
          street: "Rua das Amoras",
          number: "120",
          neighborhood: "Centro Sul",
          city: "Várzea Grande",
          complement: "Apto 3",
          reference: "Perto do mercado",
          zip: "78110-000",
          createdAt: new Date("2026-02-01T15:00:00Z"),
        },
      ];

      const mockOrders = [
        {
          id: "order-1",
          createdAt: new Date("2026-03-01T18:00:00Z"),
          status: "delivered",
          totalAmount: 45.0,
          subtotal: 40.0,
          deliveryFee: 5.0,
          paymentMethodType: "pix_entrega",
          items: [{ quantity: 2 }],
        },
      ];

      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "user-uuid-123",
        username: "maria65",
        role: "CLIENT",
        isRegistered: true,
        phone: "65999998888",
        tokenVersion: 1,
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser as any);
      vi.spyOn(prisma.userLocation, "findMany").mockResolvedValue(mockLocations as any);
      vi.spyOn(prisma.order, "findMany").mockResolvedValue(mockOrders as any);

      const req = new Request("http://localhost:3000/api/users/privacy", {
        method: "GET",
      });

      const res = await getPrivacyData(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.format).toBe("LGPD_DATA_PORTABILITY_JSON");
      expect(data.controller.businessName).toBe("Pop Shake Sorveteria e Delivery");
      expect(data.controller.dpoContactEmail).toBe("privacidade@popshake.com.br");
      expect(data.legalBasesApplied).toHaveLength(3);
      expect(data.subject.fullName).toBe("Maria dos Santos");
      expect(data.subject.email).toBe("maria@example.com");
      expect(data.locations).toHaveLength(1);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].totalAmount).toBe(45);
      expect(data.orders[0].itemCount).toBe(2);
    });
  });

  describe("Eixo 2: Anonimização e Exclusão Irreversível (Art. 18, VI e Art. 16, I)", () => {
    it("exige senha para usuários cadastrados antes de autorizar a anonimização", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "user-uuid-123",
        username: "maria65",
        role: "CLIENT",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-uuid-123",
        passwordHash: "$argon2id$mockedhash",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      // Chamada sem senha
      const reqNoPassword = new Request("http://localhost:3000/api/users/privacy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await deletePrivacyData(reqNoPassword);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("PASSWORD_REQUIRED");
    });

    it("rejeita a anonimização se a senha informada estiver incorreta", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "user-uuid-123",
        username: "maria65",
        role: "CLIENT",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-uuid-123",
        passwordHash: "$argon2id$mockedhash",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      vi.spyOn(auth, "verifyPassword").mockResolvedValue(false);

      const reqWrongPass = new Request("http://localhost:3000/api/users/privacy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "senhaErrada123" }),
      });

      const res = await deletePrivacyData(reqWrongPass);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("INVALID_PASSWORD");
    });

    it("executa anonimização de PII no User e preserva integridade financeira dos pedidos sob Art. 16, I", async () => {
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "user-uuid-123",
        username: "maria65",
        role: "CLIENT",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-uuid-123",
        passwordHash: "$argon2id$validhash",
        isRegistered: true,
        tokenVersion: 1,
      } as any);

      vi.spyOn(auth, "verifyPassword").mockResolvedValue(true);

      let capturedUserUpdate: any = null;
      let capturedOrderUpdate: any = null;

      vi.spyOn(prisma, "$transaction").mockImplementation(async (queries: any) => {
        return queries;
      });

      vi.spyOn(prisma.user, "update").mockImplementation((args: any) => {
        capturedUserUpdate = args;
        return Promise.resolve(args.data) as any;
      });

      vi.spyOn(prisma.userLocation, "deleteMany").mockResolvedValue({ count: 2 });
      vi.spyOn(prisma.userNotification, "deleteMany").mockResolvedValue({ count: 5 });

      vi.spyOn(prisma.order, "updateMany").mockImplementation((args: any) => {
        capturedOrderUpdate = args;
        return Promise.resolve({ count: 3 }) as any;
      });

      const req = new Request("http://localhost:3000/api/users/privacy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "senhaCorreta123" }),
      });

      const res = await deletePrivacyData(req);
      expect(res.status).toBe(200);

      // Validações estritas de expurgo de PII no usuário
      expect(capturedUserUpdate).toBeDefined();
      expect(capturedUserUpdate.data.fullName).toBe("Cliente Anonimizado");
      expect(capturedUserUpdate.data.email).toBeNull();
      expect(capturedUserUpdate.data.phone).toBeNull();
      expect(capturedUserUpdate.data.cpf).toBeNull();
      expect(capturedUserUpdate.data.passwordHash).toBeNull();
      expect(capturedUserUpdate.data.isBlocked).toBe(true);
      expect(capturedUserUpdate.data.isActive).toBe(false);
      expect(capturedUserUpdate.data.tokenVersion).toBe(2);

      // Validações de desidentificação de entrega no pedido preservando registros contábeis
      expect(capturedOrderUpdate).toBeDefined();
      expect(capturedOrderUpdate.data.deliveryStreet).toBe("Endereço Anonimizado (LGPD)");
      expect(capturedOrderUpdate.data.deliveryLatitude).toBeNull();
      expect(capturedOrderUpdate.data.deliveryLongitude).toBeNull();
      expect(capturedOrderUpdate.data.orderPin).toBeNull();
    });
  });

  describe("Eixo 3: Governança de Cookies e Privacy by Default (Guia ANPD)", () => {
    it("mantém cookies necessários sempre ativos e analíticos desativados por padrão (Privacy by Default)", () => {
      expect(DEFAULT_COOKIE_PREFERENCES.necessary).toBe(true);
      expect(DEFAULT_COOKIE_PREFERENCES.analytics).toBe(false);
      expect(DEFAULT_COOKIE_PREFERENCES.preferences).toBe(false);
      expect(COOKIE_CONSENT_KEY).toBe("popclub_lgpd_consent");
    });

    it("salva e normaliza consentimento sem desativar a categoria necessária", () => {
      const mockStorage: Record<string, string> = {};
      const fakeWindow = {
        dispatchEvent: vi.fn(),
      };
      vi.stubGlobal("window", fakeWindow);
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
      });

      // Usuário rejeita opcionais
      const essentialOnly = privacyService.saveConsent({ analytics: false, preferences: false });
      expect(essentialOnly.necessary).toBe(true);
      expect(essentialOnly.analytics).toBe(false);
      expect(essentialOnly.preferences).toBe(false);
      expect(JSON.parse(mockStorage[COOKIE_CONSENT_KEY]).necessary).toBe(true);

      // Usuário autoriza analíticos
      const custom = privacyService.saveConsent({ analytics: true, preferences: false });
      expect(custom.necessary).toBe(true);
      expect(custom.analytics).toBe(true);
      expect(custom.preferences).toBe(false);
      expect(JSON.parse(mockStorage[COOKIE_CONSENT_KEY]).analytics).toBe(true);

      vi.unstubAllGlobals();
    });
  });
});
