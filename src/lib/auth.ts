import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "popclub_secret_jwt_key_2026_super_secure";

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  role: "client" | "admin";
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Retorna o usuário logado com base nos cookies ou cabeçalho Authorization da requisição.
 */
export async function getAuthUser(request?: Request): Promise<{
  id: string;
  email: string;
  username: string;
  role: "client" | "admin";
  fullName: string | null;
  avatarUrl: string | null;
  avatar: string | null;
  accessibilitySettings: any;
  defaultPaymentMethod?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  defaultChangeFor?: number | null;
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
      token = cookieStore.get("auth_token")?.value;
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
          email: true,
          username: true,
          role: true,
          fullName: true,
          avatarUrl: true,
          accessibilitySettings: true,
        },
      });
    } catch (err: any) {
      console.warn("Aviso: Falha ao carregar campos estendidos do usuário, tentando campos essenciais:", err?.message);
      try {
        user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
          },
        });
      } catch (fallbackErr: any) {
        console.error("Erro crítico ao consultar usuário no banco:", fallbackErr);
        return null;
      }
    }

    if (!user) return null;

    const defaultAvatar = "/avatars/avatar-sorvete.svg";
    const avatar = user.avatarUrl || defaultAvatar;

    const rawSettings = (user.accessibilitySettings as Record<string, any>) || {};

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as "client" | "admin",
      fullName: user.fullName || null,
      avatarUrl: avatar,
      avatar,
      accessibilitySettings: user.accessibilitySettings || null,
      defaultPaymentMethod: rawSettings.defaultPaymentMethod || null,
      defaultChangeFor: rawSettings.defaultChangeFor !== undefined ? rawSettings.defaultChangeFor : null,
    };
  } catch (err: any) {
    console.error("Erro geral em getAuthUser:", err);
    return null;
  }
}
