import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json([]);
    }

    const locations = await prisma.userLocation.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    });

    const formatted = locations.map((loc) => ({
      id: loc.id,
      user_id: loc.userId,
      name: loc.name,
      address_line: loc.addressLine,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      is_default: loc.isDefault,
      created_at: loc.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar localizações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Formato de requisição inválido ou corpo vazio." }, { status: 400 });
    }

    const { name, address_line, latitude, longitude, accuracy, is_default } = body || {};

    if (!address_line) {
      return NextResponse.json({ error: "Endereço é obrigatório." }, { status: 400 });
    }

    if (is_default) {
      await prisma.userLocation.updateMany({
        where: { userId: authUser.id },
        data: { isDefault: false },
      });
    }

    const location = await prisma.userLocation.create({
      data: {
        userId: authUser.id,
        name: name || null,
        addressLine: address_line,
        latitude: latitude || 0,
        longitude: longitude || 0,
        accuracy: accuracy || null,
        isDefault: Boolean(is_default),
      },
    });

    return NextResponse.json({
      id: location.id,
      user_id: location.userId,
      name: location.name,
      address_line: location.addressLine,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      is_default: location.isDefault,
      created_at: location.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao salvar endereço." }, { status: 500 });
  }
}
