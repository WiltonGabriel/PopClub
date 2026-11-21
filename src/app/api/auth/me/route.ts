import { NextResponse } from "next/server";
import {
  getAuthUser,
  verifyToken,
  signToken,
  setSessionCookies,
  clearSessionCookies,
  isRequestHttps,
  SESSION_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
} from "@/lib/auth";
import { hasPermission, isUserAdmin } from "@/lib/permissions";

function extractIncomingToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match =
    cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`)) ||
    cookieHeader.match(new RegExp(`(?:^|;\\s*)${LEGACY_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(request: Request) {
  try {
    const incomingToken = extractIncomingToken(request);
    const user = await getAuthUser(request);

    if (!user) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      if (incomingToken) {
        clearSessionCookies(response);
      }
      return response;
    }

    const response = NextResponse.json({ user }, { status: 200 });

    // Sincroniza o cookie JWT caso o cargo (role) ou a permissão users_manage tenha sido alterada no banco
    const canManageUsers = isUserAdmin(user) || hasPermission(user, "users_manage");
    const payload = incomingToken ? verifyToken(incomingToken) : null;
    const roleChanged =
      !payload || String(payload.role || "").toLowerCase() !== String(user.role || "").toLowerCase();
    const usersPermChanged = !payload || Boolean(payload.canManageUsers) !== canManageUsers;
    const regChanged = !payload || Boolean(payload.isRegistered) !== Boolean(user.isRegistered);

    if (roleChanged || usersPermChanged || regChanged) {
      const freshToken = signToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        name: user.fullName,
        role: user.role,
        isRegistered: Boolean(user.isRegistered),
        canManageUsers,
        tokenVersion: user.tokenVersion ?? 1,
      });
      setSessionCookies(response, freshToken, isRequestHttps(request));
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Erro ao obter usuário atual" }, { status: 500 });
  }
}
