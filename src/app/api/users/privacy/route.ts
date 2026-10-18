import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthUser, verifyPassword, clearSessionCookies } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Acesso negado. Autenticação necessária para consultar dados pessoais (Art. 18 da LGPD)." },
        { status: 401 }
      );
    }

    const [userRecord, locations, orders] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          isRegistered: true,
          createdAt: true,
          accessibilitySettings: true,
        },
      }),
      prisma.userLocation.findMany({
        where: { userId: authUser.id },
        select: {
          id: true,
          street: true,
          number: true,
          neighborhood: true,
          city: true,
          complement: true,
          reference: true,
          zip: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          status: true,
          totalAmount: true,
          subtotal: true,
          deliveryFee: true,
          paymentMethodType: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
      }),
    ]);

    if (!userRecord) {
      return NextResponse.json({ error: "Titular de dados não encontrado." }, { status: 404 });
    }

    const payload = {
      format: "LGPD_DATA_PORTABILITY_JSON" as const,
      version: "1.0" as const,
      generatedAt: new Date().toISOString(),
      legalFramework: {
        law: "Lei Geral de Proteção de Dados (Lei nº 13.709/2018)" as const,
        authority: "Autoridade Nacional de Proteção de Dados (ANPD)" as const,
        rightsUnderArticle18: [
          "I - confirmação da existência de tratamento",
          "II - acesso aos dados",
          "III - correção de dados incompletos, inexatos ou desatualizados",
          "IV - anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos",
          "V - portabilidade dos dados a outro fornecedor de serviço",
          "VI - eliminação dos dados pessoais tratados com o consentimento do titular",
          "VII - informação das entidades com as quais o controlador realizou uso compartilhado",
          "VIII - informação sobre a possibilidade de não fornecer consentimento",
          "IX - revogação do consentimento",
        ] as const,
      },
      controller: {
        businessName: "Pop Shake Sorveteria e Delivery",
        tradeName: "PopClub",
        dpoContactEmail: "privacidade@popshake.com.br",
        dpoChannelUrl: "/privacidade",
        headquarters: "Várzea Grande - MT",
      },
      legalBasesApplied: [
        {
          basis: "Execução de Contrato e Diligências Preliminares (Art. 7º, V)",
          purpose: "Processamento de pedidos, entrega em domicílio e cobrança de valores devidos.",
          article: "Art. 7º, inciso V da Lei nº 13.709/2018",
        },
        {
          basis: "Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II e Art. 16, I)",
          purpose: "Guarda de registros fiscais e contábeis de faturamento conforme legislação tributária.",
          article: "Art. 7º, inciso II e Art. 16, inciso I da Lei nº 13.709/2018",
        },
        {
          basis: "Legítimo Interesse do Controlador (Art. 7º, IX)",
          purpose: "Prevenção a fraudes, segurança da aplicação web e rate limiting defensivo.",
          article: "Art. 7º, inciso IX da Lei nº 13.709/2018",
        },
      ],
      subject: {
        id: userRecord.id,
        fullName: userRecord.fullName,
        username: userRecord.username,
        email: userRecord.email,
        phone: userRecord.phone,
        role: userRecord.role,
        isRegistered: Boolean(userRecord.isRegistered),
        createdAt: userRecord.createdAt.toISOString(),
      },
      locations: locations.map((loc) => ({
        id: loc.id,
        street: loc.street,
        number: loc.number,
        neighborhood: loc.neighborhood,
        city: loc.city,
        complement: loc.complement,
        reference: loc.reference,
        zip: loc.zip,
        createdAt: loc.createdAt.toISOString(),
      })),
      orders: orders.map((ord) => ({
        id: ord.id,
        createdAt: ord.createdAt.toISOString(),
        status: ord.status,
        totalAmount: Number(ord.totalAmount),
        subtotal: Number(ord.subtotal),
        deliveryFee: Number(ord.deliveryFee),
        paymentMethodType: ord.paymentMethodType,
        itemCount: ord.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Erro ao gerar relatório de portabilidade de dados LGPD:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a consulta de dados pessoais." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Acesso negado. Autenticação necessária para solicitar anonimização." },
        { status: 401 }
      );
    }

    // Busca dados do usuário para verificar senha (se registrado)
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        passwordHash: true,
        isRegistered: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Se o usuário possui senha cadastrada, exige verificação de segurança antes da exclusão
    if (user.isRegistered && user.passwordHash) {
      let password = "";
      try {
        const body = (await request.json()) as { password?: string };
        password = body?.password || "";
      } catch {
        // Sem corpo
      }

      if (!password) {
        return NextResponse.json(
          { error: "Informe sua senha para confirmar a exclusão e anonimização da conta.", code: "PASSWORD_REQUIRED" },
          { status: 400 }
        );
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Senha incorreta. Não foi possível autorizar a anonimização.", code: "INVALID_PASSWORD" },
          { status: 401 }
        );
      }
    }

    const anonSuffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const now = new Date();

    // Executa anonimização irreversível no banco
    await prisma.$transaction([
      // 1. Anonimiza PII no modelo User
      prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: "Cliente Anonimizado",
          username: `anon_${anonSuffix}`,
          email: null,
          phone: null,
          cpf: null,
          avatarUrl: "/avatars/avatar-sorvete.svg",
          passwordHash: null,
          isBlocked: true,
          isActive: false,
          deletedAt: now,
          tokenVersion: user.tokenVersion + 1,
          accessibilitySettings: {},
        },
      }),

      // 2. Exclui locais salvos
      prisma.userLocation.deleteMany({
        where: { userId: user.id },
      }),

      // 3. Exclui notificações pessoais
      prisma.userNotification.deleteMany({
        where: { userId: user.id },
      }),

      // 4. Anonimiza campos de entrega em pedidos passados preservando integridade fiscal e financeira (Art. 16, I)
      prisma.order.updateMany({
        where: { userId: user.id },
        data: {
          deliveryStreet: "Endereço Anonimizado (LGPD)",
          deliveryNumber: "S/N",
          deliveryComplement: null,
          deliveryReference: null,
          deliveryLatitude: null,
          deliveryLongitude: null,
          orderPin: null,
          courierLatitude: null,
          courierLongitude: null,
        },
      }),
    ]);

    const response = NextResponse.json({
      success: true,
      message:
        "Sua conta e dados pessoais foram irreversivelmente anonimizados em conformidade com o Art. 18, VI da LGPD. Os registros fiscais dos pedidos foram preservados de forma desidentificada nos termos do Art. 16, inciso I.",
    });

    // Limpa cookies de sessão
    clearSessionCookies(response);
    try {
      const cookieStore = await cookies();
      clearSessionCookies({ cookies: cookieStore } as any);
    } catch {
      // Ignora se não puder acessar o cookieStore síncrono
    }

    return response;
  } catch (error) {
    console.error("Erro ao processar exclusão e anonimização de titular LGPD:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a anonimização dos dados." },
      { status: 500 }
    );
  }
}
