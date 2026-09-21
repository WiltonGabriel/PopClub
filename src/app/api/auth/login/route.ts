import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setSessionCookies } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    let body: any;
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

    // Busca usuário por e-mail ou username de forma insensível a maiúsculas
    let user: any = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase().trim() },
            { username: identifier.trim() },
          ],
        },
      });
    } catch (dbErr: any) {
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
      });
    } catch (tokenErr: any) {
      console.error("❌ [API /api/auth/login] Falha ao assinar token JWT:", tokenErr);
      return NextResponse.json(
        { error: "Erro ao gerar sessão de autenticação." },
        { status: 500 }
      );
    }

    // Determina se a requisição atual é HTTPS (direta ou atrás de proxy reverso Traefik)
    let isHttps = false;
    try {
      const proto = request.headers.get("x-forwarded-proto");
      isHttps = proto === "https" || (typeof request.url === "string" && request.url.startsWith("https://"));
    } catch {
      isHttps = false;
    }

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
      setSessionCookies({ cookies: cookieStore } as any, token, isHttps);
    } catch {
      // Ignora erro se o contexto do store já estiver encerrado
    }

    return response;
  } catch (error: any) {
    console.error("❌ [API /api/auth/login] Erro interno não tratado:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        error: "Erro interno no servidor ao realizar login.",
        message: process.env.NODE_ENV !== "production" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
