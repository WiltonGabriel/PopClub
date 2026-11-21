import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error-handler";
import {
  emailVerificationCheckLimiter,
  getRateLimitKey,
  createRateLimitResponse,
} from "@/lib/rateLimit";
import { verifyUserEmailByCode } from "@/services/emailVerificationService";

interface VerifyEmailRequestBody {
  email?: unknown;
  code?: unknown;
}

export async function POST(request: Request) {
  try {
    let body: VerifyEmailRequestBody;
    try {
      body = (await request.json()) as VerifyEmailRequestBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const bodyEmail = typeof body?.email === "string" ? body.email.trim() : "";
    const rawCode = typeof body?.code === "string" ? body.code.trim() : "";

    let targetEmail = bodyEmail;
    let authUserId: string | null = null;
    if (!targetEmail) {
      const authUser = await getAuthUser(request);
      targetEmail = authUser?.email?.trim() || "";
      authUserId = authUser?.id || null;
    }

    if (!targetEmail || !rawCode) {
      return NextResponse.json(
        { success: false, error: "E-mail e código de confirmação são obrigatórios." },
        { status: 400 }
      );
    }

    const limitKey = getRateLimitKey(
      request,
      "email-verify-check",
      authUserId || targetEmail.toLowerCase()
    );
    const limitCheck = emailVerificationCheckLimiter.check(limitKey);
    if (!limitCheck.success) {
      return createRateLimitResponse(
        limitCheck,
        "Muitas tentativas de confirmação de e-mail. Aguarde antes de tentar novamente."
      );
    }

    const result = await verifyUserEmailByCode({
      email: targetEmail,
      code: rawCode,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          code: result.code,
          error: result.error,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        alreadyVerified: result.alreadyVerified,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(error, "POST /api/auth/verify-email", "Erro interno ao verificar e-mail.");
  }
}
