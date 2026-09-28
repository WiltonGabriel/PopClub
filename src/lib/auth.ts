import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret && typeof secret === "string" && secret.trim().length > 0) {
    return secret.trim();
  }
  return "popclub_secret_jwt_key_2026_super_secure";
}

export const SESSION_COOKIE_NAME = "popshake_session";
export const LEGACY_COOKIE_NAME = "auth_token";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias

export interface TokenPayload {
  userId: string;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  name?: string | null;
  role: "client" | "admin" | "editor" | string;
  isRegistered?: boolean;
  tokenVersion?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(String(password), 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(String(password), String(hash));
  } catch (err) {
    console.error("Erro na verificação de hash de senha:", err);
    return false;
  }
}

export function signToken(payload: TokenPayload, expiresIn: string = "30d"): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Define o cookie de sessão HttpOnly popshake_session (e auth_token para compatibilidade).
 */
export function setSessionCookies(
  response: { cookies: { set: (name: string, val: string, opts: any) => void } },
  token: string,
  isHttps: boolean = false
) {
  const cookieOptions = {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };

  try {
    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
    response.cookies.set(LEGACY_COOKIE_NAME, token, cookieOptions);
  } catch (err) {
    console.warn("Aviso ao definir cookies de sessão:", err);
  }
}

/**
 * Remove os cookies de sessão no logout.
 */
export function clearSessionCookies(response: { cookies: { set: (name: string, val: string, opts: any) => void } }) {
  const clearOptions = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
  try {
    response.cookies.set(SESSION_COOKIE_NAME, "", clearOptions);
    response.cookies.set(LEGACY_COOKIE_NAME, "", clearOptions);
  } catch (err) {
    console.warn("Aviso ao limpar cookies de sessão:", err);
  }
}

/**
 * Retorna o usuário logado com base nos cookies ou cabeçalho Authorization da requisição.
 */
export async function getAuthUser(request?: Request): Promise<{
  id: string;
  cpf: string | null;
  email: string | null;
  username: string | null;
  role: "client" | "admin" | "editor" | string;
  permissions: string[];
  isActive: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  tokenVersion: number;
  fullName: string | null;
  avatarUrl: string | null;
  avatar: string | null;
  accessibilitySettings: unknown;
  defaultPaymentMethod?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  defaultChangeFor?: number | null;
  phone: string | null;
  isRegistered: boolean;
  notificationsEnabled: boolean;
  createdAt?: string | null;
  created_at?: string | null;
} | null> {
  try {
    let token: string | undefined;

    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get(LEGACY_COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    let user: any = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          cpf: true,
          email: true,
          username: true,
          role: true,
          permissions: true,
          isActive: true,
          isBlocked: true,
          blockReason: true,
          tokenVersion: true,
          fullName: true,
          avatarUrl: true,
          accessibilitySettings: true,
          phone: true,
          isRegistered: true,
          notificationsEnabled: true,
          createdAt: true,
        },
      });
    } catch (err: any) {
      console.warn("Aviso: Falha ao carregar campos estendidos do usuário, tentando campos essenciais:", err?.message);
      try {
        user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            cpf: true,
            email: true,
            username: true,
            role: true,
            permissions: true,
            isActive: true,
            isBlocked: true,
            blockReason: true,
            tokenVersion: true,
            isRegistered: true,
            createdAt: true,
          },
        });
      } catch (fallbackErr: any) {
        console.error("Erro crítico ao consultar usuário no banco:", fallbackErr);
        return null;
      }
    }

    if (!user) return null;

    // Desativação lógica (soft delete) ou bloqueio administrativo
    if (user.isActive === false || user.isBlocked === true) {
      return null;
    }

    // Invalidação imediata de sessão se o tokenVersion for incompatível (redefinição de cargo/senha)
    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      payload.tokenVersion !== user.tokenVersion
    ) {
      return null;
    }

    const defaultAvatar = "/avatars/avatar-sorvete.svg";
    const avatar = user.avatarUrl || defaultAvatar;

    const rawSettings = (user.accessibilitySettings as Record<string, any>) || {};
    const normalizedRole = String(user.role || "client").toLowerCase();

    return {
      id: user.id,
      cpf: user.cpf || null,
      email: user.email || null,
      username: user.username || null,
      role: normalizedRole,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      isActive: user.isActive !== false,
      isBlocked: Boolean(user.isBlocked),
      blockReason: user.blockReason || null,
      tokenVersion: user.tokenVersion || 1,
      fullName: user.fullName || null,
      avatarUrl: avatar,
      avatar,
      accessibilitySettings: user.accessibilitySettings || null,
      defaultPaymentMethod: rawSettings.defaultPaymentMethod || null,
      defaultChangeFor: rawSettings.defaultChangeFor !== undefined ? rawSettings.defaultChangeFor : null,
      phone: user.phone || null,
      isRegistered: Boolean(user.isRegistered),
      notificationsEnabled: Boolean(user.notificationsEnabled ?? true),
      createdAt: user.createdAt ? (user.createdAt as Date).toISOString() : null,
      created_at: user.createdAt ? (user.createdAt as Date).toISOString() : null,
    };
  } catch (err: unknown) {
    console.error("Erro geral em getAuthUser:", err);
    return null;
  }
}
