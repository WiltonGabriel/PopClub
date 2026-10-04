import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone") || "";
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
