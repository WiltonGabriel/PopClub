import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl,
      phone: profile.phone,
      created_at: profile.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar perfil." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const dataToUpdate: any = {};
    if (body?.full_name !== undefined) dataToUpdate.fullName = body.full_name;
    if (body?.avatar_url !== undefined) dataToUpdate.avatarUrl = body.avatar_url;
    if (body?.phone !== undefined) dataToUpdate.phone = body.phone;

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      full_name: updated.fullName,
      avatar_url: updated.avatarUrl,
      phone: updated.phone,
      created_at: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
  }
}
