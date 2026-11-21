import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setSessionCookies, isRequestHttps, type CookieResponseTarget } from "@/lib/auth";
import { hasPermission, isUserAdmin } from "@/lib/permissions";
import { sanitizeAndNormalizePhone } from "@/lib/validations/auth";
import { cookies } from "next/headers";
import { authLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";

type LoginUserWithRole = Prisma.UserGetPayload<{
  include: { customRole: { select: { permissions: true } } };
}>;

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = authLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas tentativas de login. Por favor, aguarde antes de tentar novamente.");
    }

    let body: { identifier?: string; email?: string; username?: string; password?: string };
    try {
      body = await request.json();
    } catch (parseErr) {
      console.warn("⚠️ [API /api/auth/login] Falha ao analisar JSON do corpo:", parseErr);
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const identifier = String(body?.identifier || body?.email || body?.username || "").trim();
    const password = typeof body?.password === "string" ? body.password : String(body?.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Identificador (e-mail ou usuário) e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Busca usuário por e-mail, username ou telefone de forma segura
    let user: LoginUserWithRole | null = null;
    try {
      const trimmedId = identifier.trim();
      const withoutAt = trimmedId.replace(/^@+/, "");
      const cleanDigits = identifier.replace(/\D/g, "");
      const normalizedPhone = sanitizeAndNormalizePhone(identifier);

      const orConditions: Prisma.UserWhereInput[] = [
        { email: { equals: trimmedId.toLowerCase(), mode: "insensitive" } },
        { username: { equals: trimmedId, mode: "insensitive" } },
        { username: { equals: withoutAt, mode: "insensitive" } },
        { username: { equals: `@${withoutAt}`, mode: "insensitive" } },
      ];

      if (normalizedPhone && normalizedPhone.length >= 10) {
        orConditions.push({ phone: normalizedPhone });
      }
      if (cleanDigits.length >= 10) {
        orConditions.push({ phone: cleanDigits });
        if (cleanDigits.startsWith("55") && (cleanDigits.length === 12 || cleanDigits.length === 13)) {
          orConditions.push({ phone: cleanDigits.substring(2) });
        }
      }

      user = await prisma.user.findFirst({
        where: {
          OR: orConditions,
        },
        include: {
          customRole: {
            select: {
              permissions: true,
            },
          },
        },
      });
    } catch (dbErr: unknown) {
      console.error("❌ [API /api/auth/login] Erro de banco de dados ao buscar usuário:", dbErr);
      return NextResponse.json(
        { error: "Erro de conexão ao verificar credenciais no banco." },
        { status: 500 }
      );
    }

    if (!user) {
      console.warn(`[API /api/auth/login] Usuário não encontrado: "${identifier}"`);
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail/usuário e senha." },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      if (user.googleId) {
        return NextResponse.json(
          {
            error:
              "Esta conta utiliza login com Google. Clique em 'Continuar com Google' ou use 'Esqueceu a senha?' para definir uma senha.",
            code: "GOOGLE_ACCOUNT_NO_PASSWORD",
          },
          { status: 401 }
        );
      }
      console.error(`❌ [API /api/auth/login] Usuário ID ${user.id} sem hash de senha configurado.`);
      return NextResponse.json(
        { error: "Conta sem senha definida. Utilize a recuperação de senha." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.warn(`[API /api/auth/login] Senha incorreta para o usuário: "${identifier}"`);
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail/usuário e senha." },
        { status: 401 }
      );
    }

    if (!user.isActive || user.deletedAt) {
      return NextResponse.json(
        { error: "Esta conta foi desativada. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        {
          error: user.blockReason
            ? `Esta conta está bloqueada: ${user.blockReason}`
            : "Esta conta está bloqueada administrativamente.",
        },
        { status: 403 }
      );
    }

    const canManageUsers = isUserAdmin(user) || hasPermission(user, "users_manage");

    let token: string;
    try {
      token = signToken({
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
    } catch (tokenErr: unknown) {
      console.error("❌ [API /api/auth/login] Falha ao assinar token JWT:", tokenErr);
      return NextResponse.json(
        { error: "Erro ao gerar sessão de autenticação." },
        { status: 500 }
      );
    }

    const isHttps = isRequestHttps(request);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        fullName: user.fullName,
        isRegistered: Boolean(user.isRegistered),
      },
      token,
    });

    setSessionCookies(response, token, isHttps);

    try {
      const cookieStore = await cookies();
      setSessionCookies({ cookies: cookieStore } as CookieResponseTarget, token, isHttps);
    } catch {
      // Ignora erro se o contexto do store já estiver encerrado
    }

    return response;
  } catch (error: unknown) {
    const errObj = error instanceof Error ? error : null;
    console.error("❌ [API /api/auth/login] Erro interno não tratado:", {
      message: errObj?.message,
      name: errObj?.name,
      stack: errObj?.stack,
    });
    return NextResponse.json(
      {
        error: "Erro interno no servidor ao realizar login.",
        message: process.env.NODE_ENV !== "production" ? errObj?.message : undefined,
      },
      { status: 500 }
    );
  }
}
