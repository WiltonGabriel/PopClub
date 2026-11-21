import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordLimiter, getIpFromRequest, createRateLimitResponse } from "@/lib/rateLimit";
import { emailService } from "@/lib/emailService";
import { generateSixDigitCode, resolveAppBaseUrl } from "@/services/emailVerificationService";

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = forgotPasswordLimiter.check(ip);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas tentativas de recuperação de senha. Por favor, aguarde antes de tentar novamente.");
    }

    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }
    const email = body?.email;

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      const now = new Date();

      // Verifica se há bloqueio temporário ativo
      if (user.recoveryBlockedUntil && user.recoveryBlockedUntil > now) {
        const msRemaining = user.recoveryBlockedUntil.getTime() - now.getTime();
        const minutesRemaining = Math.ceil(msRemaining / (60 * 1000));
        let timeMsg = `${minutesRemaining} minuto(s)`;
        if (minutesRemaining >= 60) {
          const hoursRemaining = Math.ceil(minutesRemaining / 60);
          timeMsg = `${hoursRemaining} hora(s)`;
          if (hoursRemaining >= 24) {
            const daysRemaining = Math.ceil(hoursRemaining / 24);
            timeMsg = `${daysRemaining} dia(s)`;
          }
        }
        return NextResponse.json(
          {
            error: `Muitas solicitações de recuperação. Bloqueio temporário ativo por mais ${timeMsg}.`,
            code: "RECOVERY_BLOCKED",
            blockedUntil: user.recoveryBlockedUntil.toISOString(),
          },
          { status: 429 }
        );
      }

      const nextCount = (user.recoveryRequestCount || 0) + 1;

      // Após 4 solicitações de código de recuperação, aplique bloqueio temporário escalonado (1h -> 2h -> 1 semana)
      let newBlockedUntil: Date | null = null;
      if (nextCount === 4) {
        newBlockedUntil = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora
      } else if (nextCount === 5) {
        newBlockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
      } else if (nextCount >= 6) {
        newBlockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 semana
      }

      // Gera código seguro de 6 dígitos (CSPRNG)
      const resetCode = generateSixDigitCode();
      const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCode,
          resetCodeExpires,
          recoveryRequestCount: nextCount,
          recoveryBlockedUntil: newBlockedUntil,
        },
      });

      const targetEmail = user.email || cleanEmail;
      const resetUrl = `${resolveAppBaseUrl(request)}/recuperar-senha?email=${encodeURIComponent(targetEmail)}`;

      // Disparo via serviço modular de e-mail (simulação ou provedor de produção)
      const sendResult = await emailService.sendPasswordResetCode({
        to: targetEmail,
        name: user.fullName || user.username,
        code: resetCode,
        resetUrl,
        expiresMinutes: 15,
        idempotencyKey: `pwd_reset_${user.id}_${resetCode}`,
      });

      if (!sendResult.success) {
        console.error("[forgot-password] Falha ao enviar e-mail de recuperação:", {
          userId: user.id,
          error: sendResult.error,
        });
      }

      // Nunca expõe devCode em produção, mesmo quando nenhum provedor externo estiver configurado
      const allowDevCode =
        process.env.NODE_ENV !== "production" && sendResult.mode === "simulation";

      if (newBlockedUntil) {
        const msRemaining = newBlockedUntil.getTime() - Date.now();
        const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));
        return NextResponse.json({
          success: true,
          message: `Código enviado. Atenção: limite de solicitações atingido. Próxima solicitação bloqueada por ${hoursRemaining > 24 ? "1 semana" : `${hoursRemaining}h`}.`,
          warning: "RATE_LIMIT_COOLDOWN_STARTED",
          blockedUntil: newBlockedUntil.toISOString(),
          ...(allowDevCode ? { devCode: resetCode } : {}),
        });
      }

      return NextResponse.json({
        success: true,
        message: "Se o e-mail estiver cadastrado, um código foi enviado.",
        ...(allowDevCode ? { devCode: resetCode } : {}),
      });
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: "Se o e-mail estiver cadastrado, um código foi enviado.",
    });
  } catch (error: unknown) {
    console.error("Erro no forgot-password:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao solicitar recuperação de senha." },
      { status: 500 }
    );
  }
}
