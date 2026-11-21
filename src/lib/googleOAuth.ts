import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/auth";
import { resolveAppBaseUrl } from "@/services/emailVerificationService";

export const GOOGLE_OAUTH_STATE_COOKIE = "popshake_google_oauth_state";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 600;

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_COOKIE_PURPOSE = "google_oauth_state";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleOAuthStatePayload {
  state: string;
  codeVerifier: string;
  redirectTo: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface GoogleUserInfoProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Verifica se as credenciais obrigatórias do Google OAuth 2.0 estão configuradas.
 */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

/**
 * Retorna as credenciais e a URI de callback dinâmica para o Google OAuth.
 */
export function getGoogleOAuthConfig(request: Request): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do Google OAuth não configuradas.");
  }

  const baseUrl = resolveAppBaseUrl(request);
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/api/auth/google/callback`,
  };
}

/**
 * Gera um par PKCE (Proof Key for Code Exchange) com método S256.
 */
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

/**
 * Gera um token de estado aleatório para proteção contra CSRF no fluxo OAuth.
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Assina em JWT de curta duração (10 min) o estado PKCE armazenado em cookie HttpOnly.
 */
export function signGoogleOAuthStateCookie(payload: GoogleOAuthStatePayload): string {
  return jwt.sign(
    {
      ...payload,
      purpose: STATE_COOKIE_PURPOSE,
    },
    getJwtSecret(),
    { expiresIn: "10m" }
  );
}

/**
 * Valida e decodifica o cookie de estado PKCE do Google OAuth.
 */
export function verifyGoogleOAuthStateCookie(token: string | null | undefined): GoogleOAuthStatePayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as Partial<GoogleOAuthStatePayload> & {
      purpose?: string;
    };

    if (
      !decoded ||
      decoded.purpose !== STATE_COOKIE_PURPOSE ||
      typeof decoded.state !== "string" ||
      typeof decoded.codeVerifier !== "string" ||
      typeof decoded.redirectTo !== "string"
    ) {
      return null;
    }

    return {
      state: decoded.state,
      codeVerifier: decoded.codeVerifier,
      redirectTo: decoded.redirectTo,
    };
  } catch {
    return null;
  }
}

/**
 * Extrai um cookie específico do cabeçalho Cookie da requisição HTTP.
 */
export function extractCookieFromRequest(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key === cookieName) {
      try {
        return decodeURIComponent(part.slice(separatorIndex + 1).trim());
      } catch {
        return part.slice(separatorIndex + 1).trim();
      }
    }
  }
  return null;
}

/**
 * Constrói a URL de autorização OAuth 2.0 do Google com PKCE S256.
 */
export function buildGoogleAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  codeChallenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/**
 * Troca o authorization code e code_verifier por tokens OAuth no endpoint do Google.
 */
export async function exchangeGoogleCodeForTokens({
  code,
  codeVerifier,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  let data: Partial<GoogleTokenResponse> & { error?: string; error_description?: string } = {};
  try {
    data = (await response.json()) as Partial<GoogleTokenResponse> & {
      error?: string;
      error_description?: string;
    };
  } catch {
    data = {};
  }

  if (!response.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP ${response.status}`;
    throw new Error(`Falha ao trocar código OAuth do Google: ${detail}`);
  }

  return {
    access_token: data.access_token,
    id_token: data.id_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  };
}

/**
 * Consulta o perfil OIDC autenticado do usuário no Google.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfoProfile> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let data: Partial<GoogleUserInfoProfile> & { error?: string; error_description?: string } = {};
  try {
    data = (await response.json()) as Partial<GoogleUserInfoProfile> & {
      error?: string;
      error_description?: string;
    };
  } catch {
    data = {};
  }

  if (!response.ok || !data.sub || !data.email) {
    const detail = data.error_description || data.error || `HTTP ${response.status}`;
    throw new Error(`Falha ao obter perfil do usuário no Google: ${detail}`);
  }

  return {
    sub: data.sub,
    email: data.email,
    email_verified: data.email_verified,
    name: data.name,
    picture: data.picture,
  };
}
