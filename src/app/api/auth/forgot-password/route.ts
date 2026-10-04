import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordLimiter, getIpFromRequest } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const ip = getIpFromRequest(request);
    const limitCheck = forgotPasswordLimiter.check(ip);
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Por favor, aguarde um momento antes de tentar novamente.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
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

      // Generate a 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
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

      // Simulate sending email (in a real app, use SendGrid, Resend, etc.)
      console.log(`\n\n==============================================`);
      console.log(`[SIMULAÇÃO DE E-MAIL] Recuperação de Senha`);
      console.log(`Para: ${user.email}`);
      console.log(`Seu código de recuperação é: ${resetCode}`);
      console.log(`Tentativa registrada: ${nextCount}`);
      if (newBlockedUntil) {
        console.log(`⚠️ Bloqueio temporário progressivo ativado até: ${newBlockedUntil.toISOString()}`);
      }
      console.log(`==============================================\n\n`);

      if (newBlockedUntil) {
        const msRemaining = newBlockedUntil.getTime() - Date.now();
        const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));
        return NextResponse.json({
          success: true,
          message: `Código enviado. Atenção: limite de 4 solicitações atingido. Próxima solicitação bloqueada por ${hoursRemaining > 24 ? "1 semana" : `${hoursRemaining}h`}.`,
          warning: "RATE_LIMIT_COOLDOWN_STARTED",
          blockedUntil: newBlockedUntil.toISOString(),
        });
      }
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
