import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RateLimiter,
  getIpFromRequest,
  getRateLimitKey,
  createRateLimitResponse,
  phoneCheckLimiter,
  geocodeLimiter,
  orderLookupLimiter,
} from "@/lib/rateLimit";
import { GET as getOrderById } from "@/app/api/orders/[id]/route";
import { GET as checkPhone } from "@/app/api/auth/check-phone/route";
import { GET as geocodeSearch } from "@/app/api/geocode/search/route";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

describe("Segurança Defensiva de Aplicação (AppSec) e Blindagem de Superfície de Ataque", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Eixo 1: Mecanismo de Rate Limiting e Conformidade RFC 6585", () => {
    it("bloqueia requisições excedentes via Janela Deslizante (Sliding Window) com cálculo preciso de retryAfter", () => {
      // Limitador de teste com janela de 10 segundos e limite de 2 requisições
      const limiter = new RateLimiter(10 * 1000, 2);

      const res1 = limiter.check("test-client-1");
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = limiter.check("test-client-1");
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(0);

      // 3ª requisição deve ser bloqueada
      const res3 = limiter.check("test-client-1");
      expect(res3.success).toBe(false);
      expect(res3.remaining).toBe(0);
      expect(res3.retryAfter).toBeGreaterThanOrEqual(1);
      expect(res3.retryAfter).toBeLessThanOrEqual(10);

      // Clientes distintos não devem interferir na cota um do outro
      const otherClient = limiter.check("test-client-2");
      expect(otherClient.success).toBe(true);

      limiter.destroy();
    });

    it("gera resposta HTTP 429 Too Many Requests com cabeçalhos normativos RFC 6585", () => {
      const mockResult = {
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 5000,
        retryAfter: 5,
      };

      const response = createRateLimitResponse(mockResult, "Limite excedido.");

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("5");
      expect(response.headers.get("RateLimit-Limit")).toBe("10");
      expect(response.headers.get("RateLimit-Remaining")).toBe("0");
      expect(response.headers.has("RateLimit-Reset")).toBe(true);
    });

    it("extrai o IP real respeitando precedência Cloudflare > Nginx/Proxy > X-Forwarded-For com remoção de porta", () => {
      // 1. Prioridade Cloudflare
      const reqCf = new Request("http://localhost", {
        headers: {
          "cf-connecting-ip": "203.0.113.195",
          "x-real-ip": "198.51.100.1",
          "x-forwarded-for": "192.0.2.1, 10.0.0.1",
        },
      });
      expect(getIpFromRequest(reqCf)).toBe("203.0.113.195");

      // 2. Prioridade X-Real-IP
      const reqReal = new Request("http://localhost", {
        headers: {
          "x-real-ip": "198.51.100.1:8080", // Com porta
          "x-forwarded-for": "192.0.2.1",
        },
      });
      expect(getIpFromRequest(reqReal)).toBe("198.51.100.1");

      // 3. X-Forwarded-For (primeiro da lista)
      const reqXff = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "192.0.2.55, 10.0.0.1",
        },
      });
      expect(getIpFromRequest(reqXff)).toBe("192.0.2.55");

      // 4. Fallback sem cabeçalhos
      const reqEmpty = new Request("http://localhost");
      expect(getIpFromRequest(reqEmpty)).toBe("127.0.0.1");
    });

    it("constrói chaves compostas de rate limiting para isolar contas sob o mesmo IP", () => {
      const req = new Request("http://localhost", {
        headers: { "x-real-ip": "192.168.1.100" },
      });

      const keyAlice = getRateLimitKey(req, "auth", "alice@popclub.com");
      const keyBob = getRateLimitKey(req, "auth", "bob@popclub.com");

      expect(keyAlice).toBe("auth:192.168.1.100:alice@popclub.com");
      expect(keyBob).toBe("auth:192.168.1.100:bob@popclub.com");
      expect(keyAlice).not.toBe(keyBob);
    });
  });

  describe("Eixo 2: Proteção contra BOLA / IDOR e Vazamento de Dados (/api/orders/[id])", () => {
    const testOrderId = "order-sec-1234";

    const registeredOrder = {
      id: testOrderId,
      userId: "user-registered-alice",
      status: "preparing",
      subtotal: 50.0,
      discountAmount: 0,
      deliveryFee: 5.0,
      totalAmount: 55.0,
      paymentMethodType: "pix_entrega",
      orderPin: "7890",
      trackingToken: "tracking-token-secret-xyz",
      deliveryStreet: "Av. Couto Magalhães",
      deliveryNumber: "100",
      deliveryNeighborhood: "Centro Sul",
      deliveryCity: "Várzea Grande",
      createdAt: new Date(),
      updatedAt: new Date(),
      shiftId: null,
      user: {
        fullName: "Alice Cadastrada",
        username: "alice",
        email: "alice@popclub.com",
        phone: "65991112222",
        isRegistered: true,
      },
      items: [],
    };

    it("bloqueia com HTTP 403 Forbidden um cliente autenticado tentando acessar o pedido de outro usuário (BOLA/IDOR)", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(registeredOrder as any);

      // Simula cliente autenticado como 'user-mallory' (atacante)
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "user-mallory",
        role: "client",
        permissions: [],
        fullName: "Mallory Atacante",
        username: "mallory",
        email: "mallory@test.com",
        phone: "65999998888",
        isRegistered: true,
        isActive: true,
        isBlocked: false,
        blockReason: null,
        tokenVersion: 1,
        cpf: null,
        avatarUrl: null,
        avatar: null,
        accessibilitySettings: {},
        notificationsEnabled: true,
      });

      const req = new Request(`http://localhost:3000/api/orders/${testOrderId}`);
      const res = await getOrderById(req, { params: Promise.resolve({ id: testOrderId }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN");
      expect(data.error).toContain("Acesso negado");
    });

    it("permite acesso ao pedido caso o requisitante seja o próprio proprietário (isOwner)", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(registeredOrder as any);

      // Simula cliente autenticado como 'user-registered-alice' (proprietária legítima)
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "user-registered-alice",
        role: "client",
        permissions: [],
        fullName: "Alice Cadastrada",
        username: "alice",
        email: "alice@popclub.com",
        phone: "65991112222",
        isRegistered: true,
        isActive: true,
        isBlocked: false,
        blockReason: null,
        tokenVersion: 1,
        cpf: null,
        avatarUrl: null,
        avatar: null,
        accessibilitySettings: {},
        notificationsEnabled: true,
      });

      const req = new Request(`http://localhost:3000/api/orders/${testOrderId}`);
      const res = await getOrderById(req, { params: Promise.resolve({ id: testOrderId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(testOrderId);
      expect(data.order_pin).toBe("7890"); // Proprietário legítimo pode ver o order_pin
    });

    it("permite acesso irrestrito para operador de esteira / Staff administrativo (isStaff)", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(registeredOrder as any);

      // Simula operador com permissão de esteira
      vi.spyOn(auth, "getAuthUser").mockResolvedValue({
        id: "staff-op-1",
        role: "editor",
        permissions: ["ORDERS_KANBAN"],
        fullName: "Operador de Cozinha",
        username: "operador1",
        email: "op@popclub.com",
        phone: null,
        isRegistered: true,
        isActive: true,
        isBlocked: false,
        blockReason: null,
        tokenVersion: 1,
        cpf: null,
        avatarUrl: null,
        avatar: null,
        accessibilitySettings: {},
        notificationsEnabled: true,
      });

      const req = new Request(`http://localhost:3000/api/orders/${testOrderId}`);
      const res = await getOrderById(req, { params: Promise.resolve({ id: testOrderId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(testOrderId);
    });

    it("bloqueia com HTTP 401 Unauthorized um anônimo tentando consultar pedido de usuário cadastrado sem token de rastreamento", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(registeredOrder as any);
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      // Requisitante sem sessão e sem ?token=
      const req = new Request(`http://localhost:3000/api/orders/${testOrderId}`);
      const res = await getOrderById(req, { params: Promise.resolve({ id: testOrderId }) });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("permite rastreamento anônimo com token criptográfico de entrega (?token=), mantendo a confidencialidade", async () => {
      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(registeredOrder as any);
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const req = new Request(
        `http://localhost:3000/api/orders/${testOrderId}?token=tracking-token-secret-xyz`
      );
      const res = await getOrderById(req, { params: Promise.resolve({ id: testOrderId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(testOrderId);
    });

    it("redige o order_pin (oculta com null) quando um visitante acessa pedido anônimo sem token dedicado", async () => {
      const guestOrder = {
        ...registeredOrder,
        userId: "guest-user-1",
        user: {
          fullName: "Cliente Visitante",
          username: "visitante65",
          email: null,
          phone: "65996543210",
          isRegistered: false,
        },
      };

      vi.spyOn(prisma.order, "findUnique").mockResolvedValue(guestOrder as any);
      vi.spyOn(auth, "getAuthUser").mockResolvedValue(null);

      const req = new Request(`http://localhost:3000/api/orders/${testOrderId}`);
      const res = await getOrderById(req, { params: Promise.resolve({ id: testOrderId }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(testOrderId);
      // Prevenção de Data Leakage: o PIN confidencial não deve ser exposto a anônimos
      expect(data.order_pin).toBeNull();
    });
  });

  describe("Eixo 3: Rate Limiting Granular em Rotas Críticas", () => {
    it("bloqueia tentativas excessivas de enumeração de telefones (/api/auth/check-phone)", async () => {
      vi.spyOn(phoneCheckLimiter, "check").mockReturnValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 45000,
        retryAfter: 45,
      });

      const req = new Request("http://localhost:3000/api/auth/check-phone?phone=65999990000");
      const res = await checkPhone(req);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(res.headers.get("Retry-After")).toBe("45");
    });

    it("bloqueia requisições excessivas de geocodificação externa (/api/geocode/search)", async () => {
      vi.spyOn(geocodeLimiter, "check").mockReturnValue({
        success: false,
        limit: 15,
        remaining: 0,
        reset: Date.now() + 30000,
        retryAfter: 30,
      });

      const req = new Request("http://localhost:3000/api/geocode/search?q=Av+Couto+Magalhaes");
      const res = await geocodeSearch(req as any);

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("bloqueia tentativas automatizadas de scraping e enumeração de pedidos (/api/orders/[id])", async () => {
      vi.spyOn(orderLookupLimiter, "check").mockReturnValue({
        success: false,
        limit: 30,
        remaining: 0,
        reset: Date.now() + 20000,
        retryAfter: 20,
      });

      const req = new Request("http://localhost:3000/api/orders/order-enumeration-probe");
      const res = await getOrderById(req, { params: Promise.resolve({ id: "order-enumeration-probe" }) });

      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(res.headers.get("Retry-After")).toBe("20");
    });
  });
});
