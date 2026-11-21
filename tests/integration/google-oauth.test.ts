import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import * as authLib from "@/lib/auth";
import { authLimiter } from "@/lib/rateLimit";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  signGoogleOAuthStateCookie,
} from "@/lib/googleOAuth";
import { GET as providersHandler } from "@/app/api/auth/providers/route";
import { GET as googleInitHandler } from "@/app/api/auth/google/route";
import { GET as googleCallbackHandler } from "@/app/api/auth/google/callback/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";

function extractCookieValue(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const regex = new RegExp(`${name}=([^;]+)`);
  const match = setCookieHeader.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

describe("Google OAuth 2.0 (PKCE), Provedores e Proteção Anti-Takeover", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    authLimiter.reset("127.0.0.1");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("GET /api/auth/providers reflete configuração de Google OAuth e provedor de e-mail", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");

    const offRes = await providersHandler();
    expect(offRes.status).toBe(200);
    expect(await offRes.json()).toEqual({
      googleEnabled: false,
      emailConfigured: false,
    });

    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubEnv("RESEND_API_KEY", "re_live_123");
    vi.stubEnv("EMAIL_PROVIDER", "");

    const onRes = await providersHandler();
    expect(onRes.status).toBe(200);
    expect(await onRes.json()).toEqual({
      googleEnabled: true,
      emailConfigured: true,
    });
  });

  it("GET /api/auth/google redireciona para erro quando Google não está configurado", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    const res = await googleInitHandler(new Request("http://localhost:3000/api/auth/google"));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?tab=password&oauth_error=google_not_configured"
    );
  });

  it("GET /api/auth/google redireciona para Google com PKCE S256 e grava cookie state HttpOnly", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");

    const res = await googleInitHandler(
      new Request("http://localhost:3000/api/auth/google?redirect=//evil.com")
    );

    expect(res.status).toBe(302);
    const location = res.headers.get("location") || "";
    const authUrl = new URL(location);
    expect(authUrl.origin).toBe("https://accounts.google.com");
    expect(authUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(authUrl.searchParams.get("client_id")).toBe("google-client-id");
    expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authUrl.searchParams.get("code_challenge")).toBeTruthy();
    expect(authUrl.searchParams.get("state")).toBeTruthy();

    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(`${GOOGLE_OAUTH_STATE_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    const cookieVal = extractCookieValue(setCookie, GOOGLE_OAUTH_STATE_COOKIE);
    expect(cookieVal).toBeTruthy();
  });

  it("GET /api/auth/google/callback rejeita state inválido ou ausente e limpa o cookie", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");

    const signedCookie = signGoogleOAuthStateCookie({
      state: "expected-state-123",
      codeVerifier: "verifier-abc",
      redirectTo: "/conta",
    });

    const res = await googleCallbackHandler(
      new Request("http://localhost:3000/api/auth/google/callback?code=auth-code&state=wrong-state", {
        headers: {
          cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(signedCookie)}`,
        },
      })
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("oauth_error=invalid_state");
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(`${GOOGLE_OAUTH_STATE_COOKIE}=;`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("GET /api/auth/google/callback cria novo CLIENT quando e-mail é verificado e autentica sessão", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");

    const signedCookie = signGoogleOAuthStateCookie({
      state: "valid-state-123",
      codeVerifier: "verifier-xyz",
      redirectTo: "/conta",
    });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "google-access-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "google-sub-001",
            email: "novo.cliente@gmail.com",
            email_verified: true,
            name: "Novo Cliente",
            picture: "https://lh3.googleusercontent.com/a/avatar.png",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    vi.spyOn(prisma.user, "findFirst").mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.user, "create").mockResolvedValue({
      id: "user-google-1",
      email: "novo.cliente@gmail.com",
      username: "novocliente",
      phone: null,
      fullName: "Novo Cliente",
      role: Role.CLIENT,
      permissions: [],
      customRole: null,
      isRegistered: true,
      emailVerified: true,
      googleId: "google-sub-001",
      tokenVersion: 1,
    } as never);

    const res = await googleCallbackHandler(
      new Request("http://localhost:3000/api/auth/google/callback?code=code-1&state=valid-state-123", {
        headers: {
          cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(signedCookie)}`,
        },
      })
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/conta");
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleId: "google-sub-001",
          email: "novo.cliente@gmail.com",
          emailVerified: true,
          isRegistered: true,
          role: Role.CLIENT,
        }),
      })
    );

    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith("popshake_session="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE}=;`) && c.includes("Max-Age=0"))).toBe(true);
  });

  it("GET /api/auth/google/callback vincula CLIENT existente por e-mail verificado", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");

    const signedCookie = signGoogleOAuthStateCookie({
      state: "link-state-1",
      codeVerifier: "verifier-1",
      redirectTo: "/",
    });

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-link" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "google-sub-link",
            email: "existente@gmail.com",
            email_verified: true,
            name: "Cliente Existente",
            picture: "https://lh3.googleusercontent.com/a/photo.png",
          }),
          { status: 200 }
        )
      );

    vi.spyOn(prisma.user, "findFirst")
      .mockResolvedValueOnce(null) // por googleId
      .mockResolvedValueOnce({
        id: "existing-client-1",
        email: "existente@gmail.com",
        username: "existente",
        phone: "65999001122",
        fullName: null,
        avatarUrl: "/avatars/avatar-sorvete.svg",
        googleId: null,
        role: Role.CLIENT,
        permissions: [],
        customRole: null,
        isActive: true,
        deletedAt: null,
        isBlocked: false,
        isRegistered: true,
        tokenVersion: 1,
      } as never);

    const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
      id: "existing-client-1",
      email: "existente@gmail.com",
      username: "existente",
      phone: "65999001122",
      fullName: "Cliente Existente",
      role: Role.CLIENT,
      permissions: [],
      customRole: null,
      isRegistered: true,
      emailVerified: true,
      googleId: "google-sub-link",
      tokenVersion: 1,
    } as never);

    const res = await googleCallbackHandler(
      new Request("http://localhost:3000/api/auth/google/callback?code=code-2&state=link-state-1", {
        headers: {
          cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(signedCookie)}`,
        },
      })
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "existing-client-1" },
        data: expect.objectContaining({
          googleId: "google-sub-link",
          emailVerified: true,
          fullName: "Cliente Existente",
          avatarUrl: "https://lh3.googleusercontent.com/a/photo.png",
        }),
      })
    );
  });

  it("bloqueia conta bloqueada, desativada e impede takeover de ADMIN/EDITOR não vinculado", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");

    const buildCallbackReq = (state: string) => {
      const signed = signGoogleOAuthStateCookie({
        state,
        codeVerifier: "verifier",
        redirectTo: "/",
      });
      return new Request(`http://localhost:3000/api/auth/google/callback?code=c&state=${state}`, {
        headers: { cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(signed)}` },
      });
    };

    // 1. Conta bloqueada
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t1" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ sub: "g-blk", email: "blk@gmail.com", email_verified: true }),
          { status: 200 }
        )
      );
    vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
      id: "u-blk",
      role: Role.CLIENT,
      isActive: true,
      deletedAt: null,
      isBlocked: true,
    } as never);

    const blkRes = await googleCallbackHandler(buildCallbackReq("s-blk"));
    expect(blkRes.status).toBe(302);
    expect(blkRes.headers.get("location")).toContain("oauth_error=account_blocked");

    // 2. Conta desativada
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t2" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ sub: "g-del", email: "del@gmail.com", email_verified: true }),
          { status: 200 }
        )
      );
    vi.spyOn(prisma.user, "findFirst").mockResolvedValueOnce({
      id: "u-del",
      role: Role.CLIENT,
      isActive: false,
      deletedAt: new Date(),
      isBlocked: false,
    } as never);

    const delRes = await googleCallbackHandler(buildCallbackReq("s-del"));
    expect(delRes.status).toBe(302);
    expect(delRes.headers.get("location")).toContain("oauth_error=account_deactivated");

    // 3. Anti-takeover de ADMIN não vinculado
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t3" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ sub: "g-attacker", email: "admin@popclub.com.br", email_verified: true }),
          { status: 200 }
        )
      );
    vi.spyOn(prisma.user, "findFirst")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@popclub.com.br",
        googleId: null,
        role: Role.ADMIN,
        isActive: true,
        deletedAt: null,
        isBlocked: false,
      } as never);

    const adminRes = await googleCallbackHandler(buildCallbackReq("s-admin"));
    expect(adminRes.status).toBe(302);
    expect(adminRes.headers.get("location")).toContain("oauth_error=staff_password_required");
  });

  it("POST /api/auth/login orienta usuário Google sem senha a usar Continuar com Google", async () => {
    vi.spyOn(prisma.user, "findFirst").mockResolvedValue({
      id: "google-only-user",
      email: "google@gmail.com",
      googleId: "google-sub-1",
      passwordHash: null,
      role: Role.CLIENT,
      isActive: true,
      isBlocked: false,
      deletedAt: null,
    } as never);

    const res = await loginHandler(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "google@gmail.com",
          password: "QualquerSenha123",
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain("Continuar com Google");
    expect(authLib.verifyToken("invalid")).toBeNull();
  });
});
