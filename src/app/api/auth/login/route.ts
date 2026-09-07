import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = (body.identifier || body.email || body.username || "").trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Identificador (e-mail ou usuário) e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Busca por e-mail ou username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.trim() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail/usuário e senha." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail/usuário e senha." },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Configura cookie httpOnly
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
      token,
    });
  } catch (error: any) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao realizar login." },
      { status: 500 }
    );
  }
}
