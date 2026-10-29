import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookies } from "@/lib/auth";
import { phoneSchema, fullNameSchema } from "@/lib/validations/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const verifyDeviceBodySchema = z.object({
  phone: phoneSchema,
  addressId: z.string().optional().nullable(),
  houseNumber: z.string().trim().optional().nullable(),
  isNoNumber: z.boolean().optional().nullable(),
  updatedName: z.string().trim().optional().nullable(),
  newAddress: z
    .object({
      street: z.string().trim().min(1, "Logradouro é obrigatório"),
      number: z.string().trim().min(1, "Número é obrigatório"),
      neighborhood: z.string().trim().min(1, "Bairro é obrigatório"),
      city: z.string().trim().default("Local"),
      complement: z.string().trim().optional().nullable(),
      reference: z.string().trim().optional().nullable(),
      zip: z.string().trim().optional().nullable(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .optional()
    .nullable(),
});

function normalizeHouseNumber(str: string | null | undefined): string {
  if (!str) return "sn";
  const clean = str
    .trim()
    .toLowerCase()
    .replace(/^n[º°.]?\s*/i, "")
    .replace(/\s+/g, "");

  if (["sn", "s/n", "s-n", "s.n.", "semnumero", "semnúmero", "0", ""].includes(clean)) {
    return "sn";
  }
  return clean;
}

// Rastreador em memória de tentativas anti-brute force
const attemptsMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

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

    const parsed = verifyDeviceBodySchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { phone, addressId, houseNumber, isNoNumber, updatedName, newAddress } = parsed.data;

    let isHttps = false;
    try {
      const proto = request.headers.get("x-forwarded-proto");
      isHttps = proto === "https" || (typeof request.url === "string" && request.url.startsWith("https://"));
    } catch {
      isHttps = false;
    }

    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Cliente não encontrado para o telefone informado." },
        { status: 404 }
      );
    }

    // Blindagem Anti-Account Takeover: contas com senha/registradas não podem usar verify-device
    if ((user.role !== "CLIENT" && (user.role as string) !== "client") || user.passwordHash || user.isRegistered) {
      return NextResponse.json(
        {
          error: "Esta conta possui cadastro formal com senha. Por favor, autentique-se informando sua senha.",
          requiresPassword: true,
        },
        { status: 403 }
      );
    }

    let verifiedAddress: any = null;

    const existingLocationsCount = await prisma.userLocation.count({
      where: { userId: user.id },
    });

    if (addressId && (houseNumber || isNoNumber)) {
      // Trava Anti-Brute Force (5 tentativas consecutivas)
      const attemptKey = `${phone}:${addressId}`;
      const now = Date.now();
      const attemptRecord = attemptsMap.get(attemptKey);

      if (attemptRecord && attemptRecord.count >= MAX_ATTEMPTS) {
        if (now < attemptRecord.lockedUntil) {
          return NextResponse.json(
            {
              error: "Limite de tentativas atingido. Por segurança, selecione 'Entregar em outro endereço' para preencher o local de entrega.",
              code: "MAX_ATTEMPTS_EXCEEDED",
              locked: true,
              attemptsLeft: 0,
            },
            { status: 429 }
          );
        } else {
          attemptsMap.delete(attemptKey);
        }
      }

      // Confirmação do número residencial do endereço cadastrado
      const existingLocation = await prisma.userLocation.findFirst({
        where: { id: addressId, userId: user.id },
      });

      if (!existingLocation) {
        return NextResponse.json(
          { error: "Endereço de referência não encontrado." },
          { status: 404 }
        );
      }

      const expectedNumber = normalizeHouseNumber(existingLocation.number);
      const providedNumber = isNoNumber ? "sn" : normalizeHouseNumber(houseNumber);

      if (expectedNumber !== providedNumber) {
        const currentCount = (attemptsMap.get(attemptKey)?.count || 0) + 1;
        attemptsMap.set(attemptKey, {
          count: currentCount,
          lockedUntil: now + LOCKOUT_DURATION_MS,
        });

        const attemptsLeft = Math.max(0, MAX_ATTEMPTS - currentCount);

        if (currentCount >= MAX_ATTEMPTS) {
          return NextResponse.json(
            {
              error: "Limite de tentativas atingido. Por segurança, selecione 'Entregar em outro endereço' para preencher o local de entrega.",
              code: "MAX_ATTEMPTS_EXCEEDED",
              locked: true,
              attemptsLeft: 0,
            },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: `Número residencial incorreto para este endereço. Tentativas restantes: ${attemptsLeft}.`,
            code: "INVALID_HOUSE_NUMBER",
            attemptsLeft,
          },
          { status: 400 }
        );
      }

      // Sucesso na validação: limpa o contador de erros
      attemptsMap.delete(attemptKey);
      verifiedAddress = existingLocation;

      // Se o cliente autenticado também enviou um novo endereço após validar o anterior:
      if (newAddress) {
        verifiedAddress = await prisma.userLocation.create({
          data: {
            userId: user.id,
            street: newAddress.street,
            number: newAddress.number,
            neighborhood: newAddress.neighborhood,
            city: newAddress.city,
            complement: newAddress.complement || null,
            reference: newAddress.reference || null,
            zip: newAddress.zip || null,
            latitude: newAddress.latitude || null,
            longitude: newAddress.longitude || null,
            addressLine: `${newAddress.street}, ${newAddress.number} - ${newAddress.neighborhood}, ${newAddress.city}`,
            isDefault: true,
          },
        });
      }
    } else if (newAddress && existingLocationsCount === 0) {
      // Se a conta não tem qualquer endereço anterior, cadastra o primeiro endereço
      verifiedAddress = await prisma.userLocation.create({
        data: {
          userId: user.id,
          street: newAddress.street,
          number: newAddress.number,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city,
          complement: newAddress.complement || null,
          reference: newAddress.reference || null,
          zip: newAddress.zip || null,
          latitude: newAddress.latitude || null,
          longitude: newAddress.longitude || null,
          addressLine: `${newAddress.street}, ${newAddress.number} - ${newAddress.neighborhood}, ${newAddress.city}`,
          isDefault: true,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Informe o número da residência ou cadastre um novo endereço de entrega." },
        { status: 400 }
      );
    }

    // Atualiza nome do usuário silenciosamente caso tenha digitado variação mais recente válida
    if (updatedName && updatedName.trim().length >= 3) {
      const parsedName = fullNameSchema.safeParse(updatedName);
      if (parsedName.success && parsedName.data !== user.fullName) {
        await prisma.user.update({
          where: { id: user.id },
          data: { fullName: parsedName.data },
        });
      }
    }

    const token = signToken({
      userId: user.id,
      phone: user.phone,
      name: updatedName || user.fullName,
      email: user.email,
      username: user.username,
      role: user.role,
      isRegistered: Boolean(user.isRegistered),
      tokenVersion: user.tokenVersion ?? 1,
    });

    const response = NextResponse.json({
      status: "authenticated",
      user: {
        id: user.id,
        fullName: updatedName || user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isRegistered: Boolean(user.isRegistered),
      },
      verifiedAddress,
    });

    setSessionCookies(response, token, isHttps);
    try {
      const cookieStore = await cookies();
      setSessionCookies({ cookies: cookieStore } as any, token, isHttps);
    } catch {}

    return response;
  } catch (error: any) {
    console.error("❌ [API /api/auth/verify-device] Erro interno:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao confirmar identificação do aparelho." },
      { status: 500 }
    );
  }
}
