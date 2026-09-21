import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, signToken, setSessionCookies, hashPassword } from "@/lib/auth";
import { completeProfileSchema } from "@/lib/validations/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Você precisa estar identificado via Acesso Rápido para completar o cadastro." },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const parsed = completeProfileSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg, issues: parsed.error.issues }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Verifica se o e-mail já está sendo utilizado por outra conta
    const existingEmailUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        id: { not: authUser.id },
      },
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado em outra conta. Por favor, utilize outro e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Se o usuário não tiver username, podemos gerar um identificador amigável a partir do e-mail
    const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    let generatedUsername = authUser.username;
    if (!generatedUsername) {
      const existingWithUsername = await prisma.user.findUnique({
        where: { username: emailPrefix },
      });
      generatedUsername = existingWithUsername
        ? `${emailPrefix}_${Math.floor(1000 + Math.random() * 9000)}`
        : emailPrefix;
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        email: email.toLowerCase(),
        passwordHash,
        username: generatedUsername,
        isRegistered: true,
      },
    });

    let isHttps = false;
    try {
      const proto = request.headers.get("x-forwarded-proto");
      isHttps = proto === "https" || (typeof request.url === "string" && request.url.startsWith("https://"));
    } catch {
      isHttps = false;
    }

    const token = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      phone: updatedUser.phone,
      name: updatedUser.fullName,
      role: updatedUser.role,
      isRegistered: true,
    });

    const response = NextResponse.json({
      success: true,
      message: "Cadastro completo com sucesso! Cupons e recursos exclusivos liberados.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        phone: updatedUser.phone,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isRegistered: true,
      },
    });

    setSessionCookies(response, token, isHttps);
    try {
      const cookieStore = await cookies();
      setSessionCookies({ cookies: cookieStore } as any, token, isHttps);
    } catch {}

    return response;
  } catch (error: any) {
    console.error("❌ [API /api/auth/complete-profile] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao completar cadastro." },
      { status: 500 }
    );
  }
}
