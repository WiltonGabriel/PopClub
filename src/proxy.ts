import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "popclub_secret_jwt_key_2026_super_secure";

/**
 * Validação criptográfica de token JWT via Web Crypto API nativa (compatível com Edge e Node.js).
 */
async function verifyJwtEdge(token: string, secret: string): Promise<{ userId: string; role: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const normalizedSig = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const sigStr = atob(normalizedSig);
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBytes[i] = sigStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!isValid) return null;

    const normalizedPayload = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = JSON.parse(atob(normalizedPayload));

    // Valida expiração do token se houver claim 'exp'
    if (payloadJson.exp && payloadJson.exp * 1000 < Date.now()) {
      return null;
    }

    return payloadJson;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteção server-side de rotas do painel administrativo (/admin e /admin/*)
  if (pathname.startsWith("/admin")) {
    let token = request.cookies.get("auth_token")?.value;

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    let isAuthorized = false;
    if (token) {
      const payload = await verifyJwtEdge(token, JWT_SECRET);
      if (payload && payload.role === "admin") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
  ],
};

export default proxy;
