import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthUser,
  signToken,
  setSessionCookies,
  hashPassword,
  isRequestHttps,
  type CookieResponseTarget,
} from "@/lib/auth";
import { completeProfileSchema } from "@/lib/validations/auth";
import { cookies } from "next/headers";
import {
  createEmailVerificationPayload,
  dispatchEmailVerification,
} from "@/services/emailVerificationService";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Você precisa estar identificado via Acesso Rápido para completar o cadastro." },
        { status: 401 }
      );
    }

    let body: unknown;
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
    const cleanEmail = email.toLowerCase().trim();

    // Verifica se o e-mail já está sendo utilizado por outra conta
    const existingEmailUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: authUser.id },
      },
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { error: "Este e-mail já está vinculado a outra conta. Faça login com sua senha ou utilize outro e-mail." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const { code: emailVerificationCode, expiresAt: emailVerificationExpires } =
      createEmailVerificationPayload();

    // Se o usuário não tiver username, podemos gerar um identificador amigável a partir do e-mail
    const emailPrefix = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
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
        email: cleanEmail,
        passwordHash,
        username: generatedUsername,
        isRegistered: true,
        emailVerified: false,
        emailVerificationCode,
        emailVerificationExpires,
      },
    });

    let emailVerificationSent = false;
    try {
      const sendResult = await dispatchEmailVerification({
        userId: updatedUser.id,
        email: cleanEmail,
        name: updatedUser.fullName || generatedUsername,
        code: emailVerificationCode,
        request,
      });
      emailVerificationSent = sendResult.success;
    } catch (emailErr: unknown) {
      console.error("[complete-profile] Erro ao disparar verificação de e-mail:", emailErr);
    }

    const isHttps = isRequestHttps(request);

    const token = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      phone: updatedUser.phone,
      name: updatedUser.fullName,
      role: updatedUser.role,
      isRegistered: true,
      tokenVersion: updatedUser.tokenVersion ?? 1,
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
        emailVerified: Boolean(updatedUser.emailVerified),
      },
      token,
      emailVerificationSent,
    });

    setSessionCookies(response, token, isHttps);
    try {
      const cookieStore = await cookies();
      setSessionCookies({ cookies: cookieStore } as CookieResponseTarget, token, isHttps);
    } catch {
      // Ignora erro caso o cookie store não esteja disponível no contexto atual
    }

    return response;
  } catch (error: unknown) {
    console.error("❌ [API /api/auth/complete-profile] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao completar cadastro." },
      { status: 500 }
    );
  }
}
