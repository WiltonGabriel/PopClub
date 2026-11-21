import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2a$10$hashedpasswordmock"),
  signToken: vi.fn().mockReturnValue("mock-jwt-token"),
  setSessionCookies: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  authLimiter: {
    check: vi.fn().mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 60000 }),
  },
  getIpFromRequest: vi.fn().mockReturnValue("127.0.0.1"),
  createRateLimitResponse: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
  }),
}));

describe("Cadastro de Conta e Aceite de Termos/Privacidade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita cadastro com HTTP 400 quando acceptedTerms está ausente ou false", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Maria Silva",
        email: "maria@example.com",
        phone: "65999998888",
        password: "Password123",
        acceptedTerms: false,
      }),
    });

    const res = await registerHandler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("TERMS_NOT_ACCEPTED");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("permite cadastro com HTTP 200 quando acceptedTerms é true e dados são válidos", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-123",
      email: "maria@example.com",
      username: "maria",
      fullName: "Maria Silva",
      phone: "65999998888",
      cpf: null,
      role: "CLIENT",
      isRegistered: true,
    } as never);

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Maria Silva",
        email: "maria@example.com",
        phone: "65999998888",
        password: "Password123",
        acceptedTerms: true,
      }),
    });

    const res = await registerHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user?.email).toBe("maria@example.com");
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it("garante que a tela de criação de conta exibe checkbox e links para /termos e /privacidade", () => {
    const loginPagePath = path.resolve(process.cwd(), "src/app/login/page.tsx");
    const content = fs.readFileSync(loginPagePath, "utf8");

    expect(content).toContain("registerAcceptTerms");
    expect(content).toContain("/termos?from=");
    expect(content).toContain("/privacidade?from=");
    expect(content).toContain("acceptedTerms: true");
  });
});
