import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signToken, setSessionCookies, isRequestHttps } from "@/lib/auth";
import { hasPermission, isUserAdmin } from "@/lib/permissions";
import { sanitizeSafeInternalRoute } from "@/services/navigationHistoryService";
import { resolveAppBaseUrl, safeCompareCode } from "@/services/emailVerificationService";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  isGoogleOAuthConfigured,
  getGoogleOAuthConfig,
  verifyGoogleOAuthStateCookie,
  extractCookieFromRequest,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
} from "@/lib/googleOAuth";
import {
  resolveOrCreateGoogleUser,
  GoogleAuthError,
  type GoogleAuthErrorCode,
} from "@/services/googleAuthService";

const OAUTH_ERROR_MAP: Record<GoogleAuthErrorCode, string> = {
  EMAIL_NOT_VERIFIED: "email_not_verified",
  ACCOUNT_BLOCKED: "account_blocked",
  ACCOUNT_DEACTIVATED: "account_deactivated",
  STAFF_PASSWORD_REQUIRED: "staff_password_required",
  INVALID_PROFILE: "oauth_failed",
  INVALID_PHONE: "oauth_failed",
  PHONE_IN_USE: "oauth_failed",
};

function clearOAuthStateCookie(response: NextResponse, isHttps: boolean): void {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  });
}

function redirectWithLoginError(
  baseUrl: string,
  oauthError: string,
  isHttps: boolean
): NextResponse {
  const errorUrl = new URL("/login", baseUrl);
  errorUrl.searchParams.set("tab", "password");
  errorUrl.searchParams.set("oauth_error", oauthError);
  const response = NextResponse.redirect(errorUrl, { status: 302 });
  clearOAuthStateCookie(response, isHttps);
  return response;
}

export async function GET(request: Request) {
  const baseUrl = resolveAppBaseUrl(request);
  const isHttps = isRequestHttps(request);
  const url = new URL(request.url);

  const oauthErrorParam = url.searchParams.get("error");
  if (oauthErrorParam) {
    return redirectWithLoginError(baseUrl, "google_cancelled", isHttps);
  }

  const code = url.searchParams.get("code")?.trim() || "";
  const state = url.searchParams.get("state")?.trim() || "";

  let rawStateCookie = extractCookieFromRequest(request, GOOGLE_OAUTH_STATE_COOKIE);
  if (!rawStateCookie) {
    try {
      const cookieStore = await cookies();
      rawStateCookie = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value || null;
    } catch {
      rawStateCookie = null;
    }
  }

  const cookiePayload = verifyGoogleOAuthStateCookie(rawStateCookie);
  if (!code || !state || !cookiePayload || !safeCompareCode(cookiePayload.state, state)) {
    return redirectWithLoginError(baseUrl, "invalid_state", isHttps);
  }

  if (!isGoogleOAuthConfigured()) {
    return redirectWithLoginError(baseUrl, "google_not_configured", isHttps);
  }

  try {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(request);
    const tokens = await exchangeGoogleCodeForTokens({
      code,
      codeVerifier: cookiePayload.codeVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    const profile = await fetchGoogleUserInfo(tokens.access_token);
    const user = await resolveOrCreateGoogleUser(profile);

    const canManageUsers = isUserAdmin(user) || hasPermission(user, "users_manage");
    const sessionToken = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      name: user.fullName,
      role: user.role,
      isRegistered: true,
      canManageUsers,
      tokenVersion: user.tokenVersion ?? 1,
    });

    const redirectTarget = sanitizeSafeInternalRoute(cookiePayload.redirectTo) || "/";
    const response = NextResponse.redirect(new URL(redirectTarget, baseUrl), { status: 302 });
    setSessionCookies(response, sessionToken, isHttps);
    clearOAuthStateCookie(response, isHttps);

    return response;
  } catch (error: unknown) {
    if (error instanceof GoogleAuthError) {
      const mapped = OAUTH_ERROR_MAP[error.code] || "oauth_failed";
      return redirectWithLoginError(baseUrl, mapped, isHttps);
    }

    console.error(
      "[Google OAuth Callback] Falha inesperada:",
      error instanceof Error ? error.message : "Erro desconhecido"
    );
    return redirectWithLoginError(baseUrl, "oauth_failed", isHttps);
  }
}
