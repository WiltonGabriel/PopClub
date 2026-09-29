import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }
    const { email, code, newPassword } = (body || {}) as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    if (user.resetCode !== code) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    if (!user.resetCodeExpires || new Date() > user.resetCodeExpires) {
      return NextResponse.json({ error: "Código expirado. Solicite um novo código." }, { status: 400 });
    }

    // Validação de senha
    const hasLetter = /[A-Za-z]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }
    if (!hasNumber) {
      return NextResponse.json({ error: "A senha deve conter pelo menos um número." }, { status: 400 });
    }
    if (!hasLetter && !hasSpecial) {
      return NextResponse.json({ error: "A senha deve conter pelo menos uma letra ou caractere especial." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return NextResponse.json({ success: true, message: "Senha redefinida com sucesso." });
  } catch (error: unknown) {
    console.error("Erro no reset-password:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao redefinir a senha." },
      { status: 500 }
    );
  }
}
