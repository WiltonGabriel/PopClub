import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, fullName } = body;

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

    // Unicidade de e-mail e username no PostgreSQL
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
        role: cleanEmail === "admin@popclub.com" ? "admin" : "client",
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
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
  } catch (error: any) {
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao realizar cadastro." }, { status: 500 });
  }
}
