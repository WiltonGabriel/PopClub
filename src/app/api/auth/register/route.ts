import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword, signToken, setSessionCookies, type CookieResponseTarget } from "@/lib/auth";
import { cleanCpf, validateCpf } from "@/lib/cpf";
import { cookies } from "next/headers";
import { authLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import {
  createEmailVerificationPayload,
  dispatchEmailVerification,
} from "@/services/emailVerificationService";

interface RegisteredUser {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string | null;
  phone: string | null;
  cpf: string | null;
  role: Role;
  isRegistered: boolean;
  emailVerified?: boolean;
  tokenVersion?: number;
}

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = authLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas tentativas de cadastro. Por favor, aguarde antes de tentar novamente.");
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { username, email, password, fullName, phone, cpf } = (body as Record<string, string>) || {};
    const acceptedTerms = body?.acceptedTerms === true;

    if (!acceptedTerms) {
      return NextResponse.json(
        {
          error: "É obrigatório ler e aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.",
          code: "TERMS_NOT_ACCEPTED",
        },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const cleanName = (fullName || "").trim();
    if (!cleanName || cleanName.length < 3) {
      return NextResponse.json({ error: "Nome completo é obrigatório (mínimo 3 caracteres)." }, { status: 400 });
    }

    // Validação de senha
    const hasLetter = /[A-Za-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }
    if (!hasLetter) {
      return NextResponse.json({ error: "A senha deve conter pelo menos uma letra." }, { status: 400 });
    }
    if (!hasNumber && !hasSpecial) {
      return NextResponse.json({ error: "A senha deve conter pelo menos um número ou caractere especial." }, { status: 400 });
    }

    // Validação de Telefone / WhatsApp (obrigatório)
    let cleanPhone: string | null = null;
    if (phone && typeof phone === "string" && phone.trim()) {
      cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return NextResponse.json({ error: "WhatsApp inválido. Inclua o DDD com 2 dígitos." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "WhatsApp / Telefone é obrigatório." }, { status: 400 });
    }

    // CPF opcional (validado apenas se fornecido)
    let cleanedCpf: string | null = null;
    if (cpf && typeof cpf === "string" && cpf.trim()) {
      cleanedCpf = cleanCpf(cpf);
      if (!validateCpf(cleanedCpf)) {
        return NextResponse.json({ error: "CPF informado é inválido." }, { status: 400 });
      }
    }

    // Username sanitizado
    const rawUsername = username ? username.trim() : cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    let cleanUsername = rawUsername;

    // Unicidade de e-mail e CPF
    if (cleanedCpf) {
      const existingCpf = await prisma.user.findFirst({
        where: { cpf: cleanedCpf },
      });
      if (existingCpf) {
        return NextResponse.json({ error: "Este CPF já está em uso por outro usuário." }, { status: 409 });
      }
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 });
    }

    // Se já houver um usuário com este username, adiciona sufixo aleatório
    const existingUsername = await prisma.user.findFirst({
      where: { username: cleanUsername },
    });
    if (existingUsername) {
      cleanUsername = `${cleanUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const passwordHash = await hashPassword(password);
    const { code: emailVerificationCode, expiresAt: emailVerificationExpires } =
      createEmailVerificationPayload();

    // Se houver um usuário guest/acesso rápido pelo telefone, promove a conta
    let user: RegisteredUser | null = null;
    if (cleanPhone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: { phone: cleanPhone },
      });

      if (existingPhoneUser) {
        if (existingPhoneUser.isRegistered && existingPhoneUser.email && existingPhoneUser.email !== cleanEmail) {
          return NextResponse.json(
            { error: "Este número de WhatsApp já possui uma conta cadastrada. Faça login." },
            { status: 409 }
          );
        }

        // Promove o usuário do Acesso Rápido para Cliente Cadastrado
        user = await prisma.user.update({
          where: { id: existingPhoneUser.id },
          data: {
            username: existingPhoneUser.username || cleanUsername,
            email: cleanEmail,
            passwordHash,
            fullName: cleanName || existingPhoneUser.fullName,
            cpf: cleanedCpf || existingPhoneUser.cpf,
            role: Role.CLIENT,
            isRegistered: true,
            emailVerified: false,
            emailVerificationCode,
            emailVerificationExpires,
          },
          select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            phone: true,
            cpf: true,
            role: true,
            isRegistered: true,
            emailVerified: true,
            tokenVersion: true,
          },
        });
      }
    }

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            username: cleanUsername,
            email: cleanEmail,
            phone: cleanPhone,
            cpf: cleanedCpf,
            passwordHash,
            fullName: cleanName,
            role: Role.CLIENT,
            isRegistered: true,
            emailVerified: false,
            emailVerificationCode,
            emailVerificationExpires,
          },
          select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            phone: true,
            cpf: true,
            role: true,
            isRegistered: true,
            emailVerified: true,
            tokenVersion: true,
          },
        });
      } catch (createErr: unknown) {
        const prismaErrorCode =
          typeof createErr === "object" && createErr !== null && "code" in createErr
            ? (createErr as { code?: unknown }).code
            : undefined;
        if (prismaErrorCode === "P2002") {
          return NextResponse.json(
            { error: "Este número de WhatsApp ou e-mail já possui uma conta cadastrada. Faça login." },
            { status: 409 }
          );
        }
        throw createErr;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Erro ao criar usuário." }, { status: 500 });
    }

    let emailVerificationSent = false;
    try {
      const sendResult = await dispatchEmailVerification({
        userId: user.id,
        email: cleanEmail,
        name: cleanName,
        code: emailVerificationCode,
        request,
      });
      emailVerificationSent = sendResult.success;
    } catch (emailErr: unknown) {
      console.error("[register] Erro ao disparar verificação de e-mail:", emailErr);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      name: user.fullName,
      role: user.role,
      isRegistered: true,
      tokenVersion: user.tokenVersion ?? 1,
    });

    let isHttps = false;
    try {
      const proto = request.headers.get("x-forwarded-proto");
      isHttps = proto === "https" || (typeof request.url === "string" && request.url.startsWith("https://"));
    } catch {
      isHttps = false;
    }

    const normalizedUser = {
      ...user,
      emailVerified: Boolean((user as { emailVerified?: boolean }).emailVerified),
    };

    const response = NextResponse.json({
      success: true,
      user: normalizedUser,
      token,
      emailVerificationSent,
    });

    setSessionCookies(response, token, isHttps);
    try {
      const cookieStore = await cookies();
      setSessionCookies({ cookies: cookieStore } as CookieResponseTarget, token, isHttps);
    } catch {}

    return response;
  } catch (error: unknown) {
    console.error("Erro no cadastro:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao realizar cadastro." }, { status: 500 });
  }
}
