import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { authLimiter, getIpFromRequest } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = authLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Por favor, aguarde um momento antes de tentar novamente.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }
    const { username, email, password, fullName } = (body as Record<string, string>) || {};

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // Validação de senha
    const hasLetter = /[A-Za-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }
    if (!hasNumber) {
      return NextResponse.json({ error: "A senha deve conter pelo menos um número." }, { status: 400 });
    }
    if (!hasLetter && !hasSpecial) {
      return NextResponse.json({ error: "A senha deve conter pelo menos uma letra ou caractere especial." }, { status: 400 });
    }

    // Unicidade de e-mail e username no cadastro
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { username: cleanUsername }],
      },
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 });
      }
      return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        fullName: fullName || cleanUsername,
        role: Role.CLIENT,
        isRegistered: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        isRegistered: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isRegistered: true,
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ success: true, user, token });
  } catch (error: unknown) {
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao realizar cadastro." }, { status: 500 });
  }
}
