import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const locationSchema = z.object({
  name: z.string().max(100, "Nome muito longo").nullable().optional(),
  label: z.string().max(100, "Label muito longo").nullable().optional(),
  street: z.string().min(1, "Nome da rua é obrigatório").max(100, "Nome da rua muito longo").default(""),
  number: z.string().min(1, "Número é obrigatório").max(50, "Número muito longo").default(""),
  neighborhood: z.string().min(1, "Bairro é obrigatório").max(100, "Bairro muito longo").default(""),
  city: z.string().max(100, "Nome da cidade muito longo").default("Várzea Grande"),
  state: z.string().max(50, "Nome do estado muito longo").default("MT"),
  complement: z.string().max(300, "Complemento muito longo").nullable().optional(),
  reference: z.string().max(300, "Referência muito longa").nullable().optional(),
  zip: z.string().max(50, "CEP muito longo").nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
  is_default: z.boolean().optional(),
  address_line: z.string().max(1000, "Endereço muito longo").nullable().optional(),
  addressLine: z.string().max(1000, "Endereço muito longo").nullable().optional(),
});

function formatLocation(loc: any) {
  const generatedAddressLine = loc.addressLine || `${loc.street}, ${loc.number} - ${loc.neighborhood}, ${loc.city}`;
  return {
    id: loc.id,
    user_id: loc.userId,
    userId: loc.userId,
    name: loc.name,
    label: loc.name,
    street: loc.street,
    number: loc.number,
    neighborhood: loc.neighborhood,
    city: loc.city,
    state: loc.state,
    complement: loc.complement || undefined,
    reference: loc.reference || undefined,
    zip: loc.zip || undefined,
    address_line: generatedAddressLine,
    addressLine: generatedAddressLine,
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy,
    is_default: loc.isDefault,
    isDefault: loc.isDefault,
    created_at: loc.createdAt instanceof Date ? loc.createdAt.toISOString() : loc.createdAt,
    createdAt: loc.createdAt instanceof Date ? loc.createdAt.toISOString() : loc.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json([]);
    }

    const locations = await prisma.userLocation.findMany({
      where: { userId: authUser.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(locations.map(formatLocation));
  } catch (error: any) {
    console.error("Erro ao buscar localizações:", error);
    return NextResponse.json({ error: "Erro ao buscar localizações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const countLocations = await prisma.userLocation.count({
      where: { userId: authUser.id },
    });

    if (countLocations >= 10) {
      return NextResponse.json(
        { error: "Limite máximo de 10 endereços atingido. Remova um endereço antigo para adicionar outro." },
        { status: 400 }
      );
    }

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    // Se o payload vier no formato simplificado antigo (somente address_line)
    if ((!rawBody.street || !rawBody.number) && (rawBody.address_line || rawBody.addressLine)) {
      const line = rawBody.address_line || rawBody.addressLine || "";
      const parts = line.split(",").map((p: string) => p.trim());
      rawBody.street = rawBody.street || parts[0] || "Endereço";
      rawBody.number = rawBody.number || (parts[1] ? parts[1].split("-")[0].trim() : "S/N");
      rawBody.neighborhood = rawBody.neighborhood || (parts[1] && parts[1].includes("-") ? parts[1].split("-")[1].trim() : "Bairro");
    }

    const parsed = locationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const data = parsed.data;
    let isDefault = Boolean(data.isDefault ?? data.is_default);
    const finalName = data.name || data.label || null;
    const finalAddressLine =
      data.address_line ||
      data.addressLine ||
      `${data.street}, ${data.number} - ${data.neighborhood}, ${data.city}`;

    // Se marcado como padrão, desmarca os anteriores
    if (isDefault) {
      await prisma.userLocation.updateMany({
        where: { userId: authUser.id },
        data: { isDefault: false },
      });
    } else {
      // Se for o primeiro endereço do usuário, define como padrão automaticamente
      const count = await prisma.userLocation.count({
        where: { userId: authUser.id },
      });
      if (count === 0) {
        isDefault = true;
      }
    }

    const newLocation = await prisma.userLocation.create({
      data: {
        userId: authUser.id,
        name: finalName,
        addressLine: finalAddressLine,
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        complement: data.complement || null,
        reference: data.reference || null,
        zip: data.zip || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        accuracy: data.accuracy ?? null,
        isDefault,
      },
    });

    return NextResponse.json(formatLocation(newLocation), { status: 201 });
  } catch (error: any) {
    console.error("Erro ao salvar endereço:", error);
    return NextResponse.json({ error: "Erro ao salvar endereço." }, { status: 500 });
  }
}
