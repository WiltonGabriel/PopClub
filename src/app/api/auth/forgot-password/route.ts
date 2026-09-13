import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }
    const { email } = body || {};

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Generate a 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCode,
          resetCodeExpires,
        },
      });

      // Simulate sending email (in a real app, use SendGrid, Resend, etc.)
      console.log(`\n\n==============================================`);
      console.log(`[SIMULAÇÃO DE E-MAIL] Recuperação de Senha`);
      console.log(`Para: ${user.email}`);
      console.log(`Seu código de recuperação é: ${resetCode}`);
      console.log(`Este código expira em 15 minutos.`);
      console.log(`==============================================\n\n`);
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: "Se o e-mail estiver cadastrado, um código foi enviado.",
    });
  } catch (error: any) {
    console.error("Erro no forgot-password:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao solicitar recuperação de senha." },
      { status: 500 }
    );
  }
}
