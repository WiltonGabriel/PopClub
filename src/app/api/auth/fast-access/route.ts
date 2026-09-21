import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookies, getAuthUser } from "@/lib/auth";
import { fastAccessSchema } from "@/lib/validations/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const parseResult = fastAccessSchema.safeParse({
      fullName: body?.fullName ?? body?.name,
      phone: body?.phone,
    });

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg, issues: parseResult.error.issues }, { status: 400 });
    }

    const { fullName, phone } = parseResult.data;

    let isHttps = false;
    try {
      const proto = request.headers.get("x-forwarded-proto");
      isHttps = proto === "https" || (typeof request.url === "string" && request.url.startsWith("https://"));
    } catch {
      isHttps = false;
    }

    // Verifica se este dispositivo já possui uma sessão ativa para o mesmo telefone
    const currentAuth = await getAuthUser(request);
    if (currentAuth && currentAuth.phone === phone) {
      const response = NextResponse.json({
        status: "authenticated",
        user: {
          id: currentAuth.id,
          fullName: currentAuth.fullName,
          phone: currentAuth.phone,
          email: currentAuth.email,
          role: currentAuth.role,
          isRegistered: currentAuth.isRegistered,
        },
      });
      return response;
    }

    // Busca cliente existente no banco pelo telefone
    const existingUser = await prisma.user.findFirst({
      where: { phone },
      include: {
        locations: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });

    if (!existingUser) {
      // 1. Cliente novo: cria conta em Acesso Rápido (isRegistered = false)
      const newUser = await prisma.user.create({
        data: {
          fullName,
          phone,
          isRegistered: false,
          role: "client",
        },
      });

      const token = signToken({
        userId: newUser.id,
        phone: newUser.phone,
        name: newUser.fullName,
        role: newUser.role,
        isRegistered: false,
      });

      const response = NextResponse.json({
        status: "authenticated",
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          phone: newUser.phone,
          email: null,
          role: newUser.role,
          isRegistered: false,
        },
        isNewUser: true,
      });

      setSessionCookies(response, token, isHttps);
      try {
        const cookieStore = await cookies();
        setSessionCookies({ cookies: cookieStore } as any, token, isHttps);
      } catch {}

      return response;
    }

    // Se o pedido for Retirada no Balcão: BYPASS DE SEGURANÇA (não exige endereço nem número residencial)
    const isPickup = Boolean(
      body?.isPickup ||
      body?.isTakeout ||
      body?.orderType === "retirada" ||
      body?.deliveryType === "retirada"
    );

    // 2. Cliente existente com Entrega: verifica se possui endereço salvo para proteção de novo aparelho
    if (!isPickup) {
      const primaryLocation = existingUser.locations[0];
      if (primaryLocation && primaryLocation.number && primaryLocation.number.trim().length > 0) {
        // Retorna endereço com número residencial censurado (sem emitir cookie de sessão ainda)
        return NextResponse.json({
          status: "new_device_detected",
          maskedAddress: {
            addressId: primaryLocation.id,
            street: primaryLocation.street,
            neighborhood: primaryLocation.neighborhood,
            city: primaryLocation.city,
            complement: primaryLocation.complement || null,
            reference: primaryLocation.reference || null,
          },
          maskedPrompt: true,
          phone,
          existingName: existingUser.fullName || existingUser.username || null,
        });
      }
    }

    // 3. Cliente existente sem endereço salvo ou retirada: autentica direto e atualiza nome se necessário
    if (fullName && fullName !== existingUser.fullName) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { fullName },
      });
    }

    const token = signToken({
      userId: existingUser.id,
      phone: existingUser.phone,
      name: fullName || existingUser.fullName,
      email: existingUser.email,
      username: existingUser.username,
      role: existingUser.role,
      isRegistered: Boolean(existingUser.isRegistered),
    });

    const response = NextResponse.json({
      status: "authenticated",
      user: {
        id: existingUser.id,
        fullName: fullName || existingUser.fullName,
        phone: existingUser.phone,
        email: existingUser.email,
        role: existingUser.role,
        isRegistered: Boolean(existingUser.isRegistered),
      },
    });

    setSessionCookies(response, token, isHttps);
    try {
      const cookieStore = await cookies();
      setSessionCookies({ cookies: cookieStore } as any, token, isHttps);
    } catch {}

    return response;
  } catch (error: any) {
    console.error("❌ [API /api/auth/fast-access] Erro interno:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar Acesso Rápido." },
      { status: 500 }
    );
  }
}
