import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }
    const identifier = (body?.identifier || body?.email || body?.username || "").trim();
    const password = body?.password;

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

    // Determina se a requisição atual é HTTPS (direta ou atrás de proxy reverso)
    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    // Cookie seguro somente se realmente estiver em HTTPS, evitando descarte do cookie em conexões HTTP
    const secure = isHttps;

    const cookieOptions = {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    };

    // Configura cookie httpOnly no cookieStore e na resposta
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, cookieOptions);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
      token,
    });

    response.cookies.set("auth_token", token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao realizar login." },
      { status: 500 }
    );
  }
}
