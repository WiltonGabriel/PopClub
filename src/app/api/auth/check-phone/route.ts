import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeAndNormalizePhone } from "@/lib/validations/auth";
import { phoneCheckLimiter, getRateLimitKey, createRateLimitResponse } from "@/lib/rateLimit";

function maskFullName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    if (first.length <= 2) return first;
    return `${first.slice(0, 2)}${"*".repeat(Math.min(first.length - 2, 4))}`;
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial}.***`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone") || "";
    const cleanPhone = sanitizeAndNormalizePhone(rawPhone) || rawPhone.replace(/\D/g, "");

    const limitKey = getRateLimitKey(request, "check-phone", cleanPhone || "empty");
    const limitCheck = phoneCheckLimiter.check(limitKey);
    if (!limitCheck.success) {
      return createRateLimitResponse(limitCheck, "Muitas consultas de telefone. Aguarde antes de tentar novamente.");
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return NextResponse.json({
        exists: false,
        isRegistered: false,
        hasPassword: false,
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: rawPhone.replace(/\D/g, "") },
        ],
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        isRegistered: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        exists: false,
        isRegistered: false,
        hasPassword: false,
      });
    }

    const isRegistered = Boolean(user.isRegistered);
    const hasPassword = Boolean(user.passwordHash);

    return NextResponse.json({
      exists: true,
      isRegistered,
      hasPassword,
      fullName: maskFullName(user.fullName || user.username),
      maskedEmail: user.email
        ? user.email.replace(/(.{2})(.*)(?=@)/, (_gp, a, b) => a + "*".repeat(b.length))
        : null,
    });
  } catch (error) {
    console.error("Erro ao verificar telefone:", error);
    return NextResponse.json(
      { error: "Erro ao verificar telefone." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = String(body?.phone || "");
    const cleanPhone = rawPhone.replace(/\D/g, "");

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return NextResponse.json({
        exists: false,
        isRegistered: false,
        hasPassword: false,
      });
    }

    const user = await prisma.user.findFirst({
      where: { phone: cleanPhone },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        isRegistered: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        exists: false,
        isRegistered: false,
        hasPassword: false,
      });
    }

    const isRegistered = Boolean(user.isRegistered);
    const hasPassword = Boolean(user.passwordHash);

    return NextResponse.json({
      exists: true,
      isRegistered,
      hasPassword,
      fullName: user.fullName || user.username || "",
      maskedEmail: user.email
        ? user.email.replace(/(.{2})(.*)(?=@)/, (_gp, a, b) => a + "*".repeat(b.length))
        : null,
    });
  } catch (error) {
    console.error("Erro ao verificar telefone:", error);
    return NextResponse.json(
      { error: "Erro ao verificar telefone." },
      { status: 500 }
    );
  }
}
