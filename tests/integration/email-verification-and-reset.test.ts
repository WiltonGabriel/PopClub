import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import {
  emailService,
  emailDeduplicationTracker,
  escapeHtml,
  isEmailProviderConfigured,
} from "@/lib/emailService";
import {
  authLimiter,
  forgotPasswordLimiter,
  passwordResetLimiter,
  emailVerificationSendLimiter,
  emailVerificationCheckLimiter,
} from "@/lib/rateLimit";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as verifyEmailHandler } from "@/app/api/auth/verify-email/route";
import { POST as resendVerificationHandler } from "@/app/api/auth/resend-verification/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { POST as completeProfileHandler } from "@/app/api/auth/complete-profile/route";
import { PUT as updateProfileHandler } from "@/app/api/users/profile/route";

describe("Verificação de E-mail, Hardening de Reset de Senha e Provedor Resend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    emailDeduplicationTracker.clear();
    authLimiter.reset("127.0.0.1");
    forgotPasswordLimiter.reset("127.0.0.1");
    passwordResetLimiter.reset("reset-password:127.0.0.1:cliente@popclub.com.br");
    emailVerificationCheckLimiter.reset("email-verify-check:127.0.0.1:cliente@popclub.com.br");
    emailVerificationSendLimiter.reset("email-verify-send:127.0.0.1:cliente@popclub.com.br");
    emailVerificationSendLimiter.reset("email-verify-send:127.0.0.1:user-verify-1");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("1. Provedor de E-mail Real (Resend) e Sanitização HTML", () => {
    it("seleciona ResendEmailProvider automaticamente quando RESEND_API_KEY está definido", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
      vi.stubEnv("EMAIL_PROVIDER", "");
      vi.stubEnv("EMAIL_FROM", "PopClub <contato@popclub.com.br>");

      expect(isEmailProviderConfigured()).toBe(true);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: "resend_msg_001" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await emailService.sendEmailVerificationCode({
        to: "maria@popclub.com.br",
        name: '<script>alert("xss")</script>',
        code: "654321",
        verifyUrl: "https://popclub.com.br/verificar-email?email=maria@popclub.com.br&code=654321",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("production");
      expect(result.messageId).toBe("resend_msg_001");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.resend.com/emails");
      const sentPayload = JSON.parse(String(options.body)) as {
        from: string;
        html: string;
        text: string;
      };
      expect(sentPayload.from).toBe("PopClub <contato@popclub.com.br>");
      expect(sentPayload.html).not.toContain("<script>");
      expect(sentPayload.html).toContain(escapeHtml('<script>alert("xss")</script>'));
      expect(sentPayload.html).toContain("654321");
      expect(sentPayload.text).toContain("https://popclub.com.br/verificar-email");
    });

    it("retorna erro descritivo em falhas HTTP ou de rede no Resend", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key_123");

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Domain not verified" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      );

      const httpFail = await emailService.send({
        to: "cliente@popclub.com.br",
        subject: "Teste",
        text: "Teste",
      });

      expect(httpFail.success).toBe(false);
      expect(httpFail.mode).toBe("production");
      expect(httpFail.error).toContain("403");
      expect(httpFail.error).toContain("Domain not verified");

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNRESET"));

      const netFail = await emailService.send({
        to: "cliente@popclub.com.br",
        subject: "Teste 2",
        text: "Teste 2",
      });

      expect(netFail.success).toBe(false);
      expect(netFail.mode).toBe("production");
      expect(netFail.error).toContain("ECONNRESET");
    });

    it("mantém modo simulação quando EMAIL_PROVIDER=console mesmo com RESEND_API_KEY definida", async () => {
      vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
      vi.stubEnv("EMAIL_PROVIDER", "console");

      expect(isEmailProviderConfigured()).toBe(false);
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await emailService.sendPasswordResetCode({
        to: "cliente@popclub.com.br",
        name: "Ana",
        code: "112233",
        resetUrl: "https://popclub.com.br/recuperar-senha?email=cliente%40popclub.com.br",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("simulation");
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("2. Cadastro, Completar Perfil e Alteração de E-mail disparam verificação", () => {
    it("register cria usuário com emailVerified=false e envia código de 6 dígitos por e-mail", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
      const sendEmailSpy = vi.spyOn(emailService, "sendEmailVerificationCode");

      let createdPayload: Record<string, unknown> = {};
      vi.spyOn(prisma.user, "create").mockImplementation((async (args: { data: Record<string, unknown> }) => {
        createdPayload = args.data;
        return {
          id: "user-new-1",
          email: "cliente@popclub.com.br",
          username: "cliente",
          fullName: "Cliente Novo",
          phone: "65999998888",
          cpf: null,
          role: "CLIENT",
          isRegistered: true,
          emailVerified: false,
          tokenVersion: 1,
        } as never;
      }) as never);

      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Cliente Novo",
          email: "cliente@popclub.com.br",
          phone: "65999998888",
          password: "Password123",
          acceptedTerms: true,
        }),
      });

      const res = await registerHandler(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.emailVerificationSent).toBe(true);
      expect(body.user.emailVerified).toBe(false);
      expect(createdPayload.emailVerified).toBe(false);
      expect(String(createdPayload.emailVerificationCode)).toMatch(/^\d{6}$/);
      expect(createdPayload.emailVerificationExpires).toBeInstanceOf(Date);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendEmailSpy.mock.calls[0][0].verifyUrl).toContain("/verificar-email?email=cliente%40popclub.com.br");
    });

    it("complete-profile salva emailVerificationCode e dispara verificação sem derrubar o fluxo", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "guest-1",
        username: null,
        role: "client",
        isRegistered: false,
      } as never);
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const sendEmailSpy = vi.spyOn(emailService, "sendEmailVerificationCode");

      let updatedData: Record<string, unknown> = {};
      vi.spyOn(prisma.user, "update").mockImplementation((async (args: { data: Record<string, unknown> }) => {
        updatedData = args.data;
        return {
          id: "guest-1",
          email: "guest@popclub.com.br",
          username: "guest",
          phone: "65999112233",
          fullName: "Guest User",
          role: "CLIENT",
          isRegistered: true,
          emailVerified: false,
          tokenVersion: 1,
        } as never;
      }) as never);

      const req = new Request("http://localhost:3000/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "guest@popclub.com.br",
          password: "Password123",
        }),
      });

      const res = await completeProfileHandler(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.emailVerificationSent).toBe(true);
      expect(body.user.emailVerified).toBe(false);
      expect(updatedData.emailVerified).toBe(false);
      expect(String(updatedData.emailVerificationCode)).toMatch(/^\d{6}$/);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    });

    it("alteração de e-mail em /api/users/profile reinicia emailVerified=false e envia novo código", async () => {
      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "user-profile-1",
        role: "client",
        isRegistered: true,
      } as never);

      const currentHash = await authLib.hashPassword("SenhaAtual123");
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-profile-1",
        fullName: "João Silva",
        email: "antigo@popclub.com.br",
        emailVerified: true,
        googleId: null,
        passwordHash: currentHash,
        isRegistered: true,
        createdAt: new Date("2025-01-01"),
        accessibilitySettings: {},
        lastNameChangedAt: null,
        lastEmailChangedAt: null,
      } as never);
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);

      const sendEmailSpy = vi.spyOn(emailService, "sendEmailVerificationCode");
      let updateArgsData: Record<string, unknown> = {};
      vi.spyOn(prisma.user, "update").mockImplementation((async (args: { data: Record<string, unknown> }) => {
        updateArgsData = args.data;
        return {
          id: "user-profile-1",
          username: "joao",
          email: "novo@popclub.com.br",
          emailVerified: false,
          googleId: null,
          passwordHash: currentHash,
          role: "CLIENT",
          fullName: "João Silva",
          avatarUrl: null,
          accessibilitySettings: {},
          phone: "65999887766",
          isRegistered: true,
          notificationsEnabled: true,
          createdAt: new Date("2025-01-01"),
        } as never;
      }) as never);

      const req = new Request("http://localhost:3000/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "novo@popclub.com.br",
          currentPassword: "SenhaAtual123",
        }),
      });

      const res = await updateProfileHandler(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.emailVerified).toBe(false);
      expect(body.hasPassword).toBe(true);
      expect(body.hasGoogleLinked).toBe(false);
      expect(body.emailVerificationSent).toBe(true);
      expect(updateArgsData.emailVerified).toBe(false);
      expect(String(updateArgsData.emailVerificationCode)).toMatch(/^\d{6}$/);
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Confirmação (/api/auth/verify-email) e Reenvio (/api/auth/resend-verification)", () => {
    it("confirma o e-mail com sucesso quando o código é válido e dentro do prazo", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
        id: "user-verify-1",
        emailVerified: false,
        emailVerificationCode: "482910",
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      } as never);

      const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as never);

      const req = new Request("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "cliente@popclub.com.br",
          code: "482910",
        }),
      });

      const res = await verifyEmailHandler(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.alreadyVerified).toBe(false);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: "user-verify-1" },
        data: {
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpires: null,
        },
      });
    });

    it("rejeita código errado ou expirado com HTTP 400", async () => {
      vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
        id: "user-verify-1",
        emailVerified: false,
        emailVerificationCode: "482910",
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
      } as never);

      const wrongRes = await verifyEmailHandler(
        new Request("http://localhost:3000/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "cliente@popclub.com.br", code: "000000" }),
        })
      );
      const wrongBody = await wrongRes.json();
      expect(wrongRes.status).toBe(400);
      expect(wrongBody.code).toBe("INVALID_CODE");

      vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
        id: "user-verify-1",
        emailVerified: false,
        emailVerificationCode: "482910",
        emailVerificationExpires: new Date(Date.now() - 60 * 1000),
      } as never);

      const expiredRes = await verifyEmailHandler(
        new Request("http://localhost:3000/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "cliente@popclub.com.br", code: "482910" }),
        })
      );
      const expiredBody = await expiredRes.json();
      expect(expiredRes.status).toBe(400);
      expect(expiredBody.code).toBe("EXPIRED_CODE");
    });

    it("resend-verification respeita rate limit, funciona autenticado e nunca expõe devCode em produção", async () => {
      vi.stubEnv("NODE_ENV", "production");

      vi.spyOn(authLib, "getAuthUser").mockResolvedValue({
        id: "user-verify-1",
        email: "cliente@popclub.com.br",
        role: "client",
      } as never);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-verify-1",
        email: "cliente@popclub.com.br",
        fullName: "Cliente Teste",
        username: "cliente",
        emailVerified: false,
      } as never);

      vi.spyOn(prisma.user, "update").mockResolvedValue({} as never);
      const sendSpy = vi.spyOn(emailService, "sendEmailVerificationCode");

      const okRes = await resendVerificationHandler(
        new Request("http://localhost:3000/api/auth/resend-verification", {
          method: "POST",
        })
      );
      const okBody = await okRes.json();

      expect(okRes.status).toBe(200);
      expect(okBody.success).toBe(true);
      expect(okBody.devCode).toBeUndefined();
      expect(sendSpy).toHaveBeenCalledTimes(1);

      // Esgota o limite (5 envios em 15 minutos) -> 6ª chamada retorna 429
      for (let i = 0; i < 4; i++) {
        const res = await resendVerificationHandler(
          new Request("http://localhost:3000/api/auth/resend-verification", {
            method: "POST",
          })
        );
        expect(res.status).toBe(200);
      }

      const blockedRes = await resendVerificationHandler(
        new Request("http://localhost:3000/api/auth/resend-verification", {
          method: "POST",
        })
      );
      const blockedBody = await blockedRes.json();
      expect(blockedRes.status).toBe(429);
      expect(blockedBody.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("4. Hardening de Recuperação e Redefinição de Senha", () => {
    it("forgot-password JAMAIS retorna devCode quando NODE_ENV=production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RESEND_API_KEY", "");

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-reset-1",
        email: "cliente@popclub.com.br",
        fullName: "Cliente Reset",
        username: "clientereset",
        recoveryRequestCount: 0,
        recoveryBlockedUntil: null,
      } as never);
      vi.spyOn(prisma.user, "update").mockResolvedValue({} as never);
      const sendResetSpy = vi.spyOn(emailService, "sendPasswordResetCode");

      const res = await forgotPasswordHandler(
        new Request("http://localhost:3000/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "cliente@popclub.com.br" }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.devCode).toBeUndefined();
      expect(sendResetSpy).toHaveBeenCalledTimes(1);
      expect(sendResetSpy.mock.calls[0][0].resetUrl).toContain(
        "/recuperar-senha?email=cliente%40popclub.com.br"
      );
    });

    it("reset-password incrementa tokenVersion e marca emailVerified=true ao concluir redefinição", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-reset-1",
        email: "cliente@popclub.com.br",
        resetCode: "778899",
        resetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      } as never);

      const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({} as never);

      const res = await resetPasswordHandler(
        new Request("http://localhost:3000/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "cliente@popclub.com.br",
            code: "778899",
            newPassword: "NovaSenha123",
          }),
        })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-reset-1" },
          data: expect.objectContaining({
            resetCode: null,
            resetCodeExpires: null,
            tokenVersion: { increment: 1 },
            emailVerified: true,
            emailVerificationCode: null,
            emailVerificationExpires: null,
          }),
        })
      );
    });
  });
});
