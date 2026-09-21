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

function normalizeHouseNumber(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/^n[º°.]?\s*/i, "")
    .replace(/\s+/g, "");
}

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

    const { phone, addressId, houseNumber, updatedName, newAddress } = parsed.data;

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

    let verifiedAddress: any = null;

    if (newAddress) {
      // O cliente optou por cadastrar um novo endereço
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
    } else if (addressId && houseNumber) {
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
      const providedNumber = normalizeHouseNumber(houseNumber);

      if (expectedNumber !== providedNumber) {
        return NextResponse.json(
          {
            error: "Número residencial incorreto para este endereço. Por favor, verifique ou opte por entregar em outro endereço.",
            code: "INVALID_HOUSE_NUMBER",
          },
          { status: 400 }
        );
      }

      verifiedAddress = existingLocation;
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
