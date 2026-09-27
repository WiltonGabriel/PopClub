import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const updateLocationSchema = z.object({
  name: z.string().max(100, "Nome muito longo (máximo 100 caracteres)").nullable().optional(),
  label: z.string().max(100, "Label muito longo (máximo 100 caracteres)").nullable().optional(),
  street: z.string().min(1, "Nome da rua é obrigatório").max(100, "Nome da rua muito longo (máximo 100 caracteres)").optional(),
  number: z.string().min(1, "Número é obrigatório").max(50, "Número muito longo (máximo 50 caracteres)").optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório").max(100, "Bairro muito longo (máximo 100 caracteres)").optional(),
  city: z.string().max(100, "Nome da cidade muito longo (máximo 100 caracteres)").optional(),
  state: z.string().max(50, "Nome do estado muito longo (máximo 50 caracteres)").optional(),
  complement: z.string().max(300, "Complemento muito longo (máximo 300 caracteres)").nullable().optional(),
  reference: z.string().max(300, "Referência muito longa (máximo 300 caracteres)").nullable().optional(),
  zip: z.string().max(50, "CEP muito longo (máximo 50 caracteres)").nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
  is_default: z.boolean().optional(),
  address_line: z.string().max(1000, "Endereço muito longo").nullable().optional(),
  addressLine: z.string().max(1000, "Endereço muito longo").nullable().optional(),
});

function formatLocation(loc: any) {
  const generatedAddressLine =
    loc.addressLine || `${loc.street}, ${loc.number} - ${loc.neighborhood}, ${loc.city}`;
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const existing = await prisma.userLocation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Endereço não encontrado ou não autorizado." }, { status: 404 });
    }

    await prisma.userLocation.delete({
      where: { id },
    });

    // Se o deletado era o padrão, promover o mais recente a padrão
    if (existing.isDefault) {
      const nextDefault = await prisma.userLocation.findFirst({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" },
      });
      if (nextDefault) {
        await prisma.userLocation.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Endereço removido com sucesso." });
  } catch (error: any) {
    console.error("Erro ao deletar endereço:", error);
    return NextResponse.json({ error: "Erro ao deletar endereço." }, { status: 500 });
  }
}

async function handleUpdateLocation(
  request: Request,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await paramsPromise;
    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const existing = await prisma.userLocation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
    }

    const parsed = updateLocationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const data = parsed.data;
    const isDefaultSetting = data.isDefault !== undefined ? data.isDefault : data.is_default;

    if (isDefaultSetting === true) {
      await prisma.userLocation.updateMany({
        where: { userId: authUser.id },
        data: { isDefault: false },
      });
    }

    const finalName = data.name !== undefined ? data.name : (data.label !== undefined ? data.label : undefined);
    const newStreet = data.street ?? existing.street;
    const newNumber = data.number ?? existing.number;
    const newNeighborhood = data.neighborhood ?? existing.neighborhood;
    const newCity = data.city ?? existing.city;

    const generatedAddressLine =
      data.address_line ||
      data.addressLine ||
      `${newStreet}, ${newNumber} - ${newNeighborhood}, ${newCity}`;

    const updated = await prisma.userLocation.update({
      where: { id },
      data: {
        ...(finalName !== undefined ? { name: finalName } : {}),
        ...(data.street !== undefined ? { street: data.street } : {}),
        ...(data.number !== undefined ? { number: data.number } : {}),
        ...(data.neighborhood !== undefined ? { neighborhood: data.neighborhood } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.complement !== undefined ? { complement: data.complement } : {}),
        ...(data.reference !== undefined ? { reference: data.reference } : {}),
        ...(data.zip !== undefined ? { zip: data.zip } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.accuracy !== undefined ? { accuracy: data.accuracy } : {}),
        ...(isDefaultSetting !== undefined ? { isDefault: Boolean(isDefaultSetting) } : {}),
        addressLine: generatedAddressLine,
      },
    });

    return NextResponse.json(formatLocation(updated));
  } catch (error: any) {
    console.error("Erro ao atualizar endereço:", error);
    return NextResponse.json({ error: "Erro ao atualizar endereço." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdateLocation(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdateLocation(request, params);
}
