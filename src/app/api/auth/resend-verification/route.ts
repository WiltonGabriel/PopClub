import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error-handler";
import {
  emailVerificationSendLimiter,
  getRateLimitKey,
  createRateLimitResponse,
} from "@/lib/rateLimit";
import { resendVerificationForUser } from "@/services/emailVerificationService";

interface ResendVerificationBody {
  email?: unknown;
}

const ANTI_ENUMERATION_MESSAGE =
  "Se o e-mail estiver cadastrado, enviaremos um código de confirmação.";

export async function POST(request: Request) {
  try {
    let body: ResendVerificationBody = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object") {
        body = parsed as ResendVerificationBody;
      }
    } catch {
      body = {};
    }

    const requestedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const authUser = await getAuthUser(request);

    const limitIdentifier = authUser?.id || requestedEmail || "anonymous";
    const limitKey = getRateLimitKey(request, "email-verify-send", limitIdentifier);
    const limitCheck = emailVerificationSendLimiter.check(limitKey);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Muitas solicitações de código de confirmação. Aguarde antes de tentar novamente."
      );
    }

    const useAuthenticatedUser =
      Boolean(authUser) &&
      (!requestedEmail || requestedEmail === (authUser?.email || "").toLowerCase());

    let targetUser: {
      id: string;
      email: string | null;
      fullName: string | null;
      username: string | null;
      emailVerified: boolean;
    } | null = null;

    if (useAuthenticatedUser && authUser) {
      targetUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          emailVerified: true,
        },
      });

      if (!targetUser || !targetUser.email) {
        return NextResponse.json(
          { success: false, error: "Sua conta ainda não possui um e-mail cadastrado." },
          { status: 400 }
        );
      }
    } else {
      if (!requestedEmail) {
        return NextResponse.json(
          { success: false, error: "Informe o e-mail para reenviar o código de confirmação." },
          { status: 400 }
        );
      }

      targetUser = await prisma.user.findFirst({
        where: { email: { equals: requestedEmail, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          emailVerified: true,
        },
      });

      if (!targetUser || !targetUser.email) {
        return NextResponse.json(
          { success: true, message: ANTI_ENUMERATION_MESSAGE },
          { status: 200 }
        );
      }
    }

    if (targetUser.emailVerified === true) {
      return NextResponse.json(
        {
          success: true,
          alreadyVerified: true,
          message: "Seu e-mail já está verificado.",
        },
        { status: 200 }
      );
    }

    const { code, sendResult } = await resendVerificationForUser({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.fullName || targetUser.username,
      request,
    });

    if (!sendResult.success && useAuthenticatedUser) {
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          error: "Não foi possível enviar o e-mail de confirmação no momento. Tente novamente em instantes.",
        },
        { status: 502 }
      );
    }

    const allowDevCode =
      process.env.NODE_ENV !== "production" && sendResult.mode === "simulation";

    return NextResponse.json(
      {
        success: true,
        emailSent: sendResult.success,
        message: useAuthenticatedUser
          ? "Código de confirmação enviado para o seu e-mail."
          : ANTI_ENUMERATION_MESSAGE,
        ...(allowDevCode ? { devCode: code } : {}),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(
      error,
      "POST /api/auth/resend-verification",
      "Erro interno ao reenviar confirmação de e-mail."
    );
  }
}
