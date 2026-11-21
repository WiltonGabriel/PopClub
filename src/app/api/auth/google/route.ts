import { NextResponse } from "next/server";
import { isRequestHttps } from "@/lib/auth";
import { authLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { sanitizeSafeInternalRoute } from "@/services/navigationHistoryService";
import { resolveAppBaseUrl } from "@/services/emailVerificationService";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
  isGoogleOAuthConfigured,
  getGoogleOAuthConfig,
  generateOAuthState,
  generatePkcePair,
  signGoogleOAuthStateCookie,
  buildGoogleAuthorizationUrl,
} from "@/lib/googleOAuth";

export async function GET(request: Request) {
  const ip = getIpFromRequest(request);
  const limitCheck = authLimiter.check(ip);
  if (!limitCheck.success) {
    return createRateLimitResponse(
      limitCheck,
      "Muitas tentativas de login com Google. Por favor, aguarde antes de tentar novamente."
    );
  }

  const url = new URL(request.url);
  const redirectTo = sanitizeSafeInternalRoute(url.searchParams.get("redirect")) || "/";
  const baseUrl = resolveAppBaseUrl(request);

  if (!isGoogleOAuthConfigured()) {
    const errorUrl = new URL("/login", baseUrl);
    errorUrl.searchParams.set("tab", "password");
    errorUrl.searchParams.set("oauth_error", "google_not_configured");
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  const { clientId, redirectUri } = getGoogleOAuthConfig(request);
  const state = generateOAuthState();
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const signedState = signGoogleOAuthStateCookie({
    state,
    codeVerifier,
    redirectTo,
  });

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  const isHttps = isRequestHttps(request);
  const response = NextResponse.redirect(authorizationUrl, { status: 302 });
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, signedState, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
