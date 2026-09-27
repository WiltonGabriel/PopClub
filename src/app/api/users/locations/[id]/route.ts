import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await prisma.userLocation.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Endereço não encontrado." }, { status: 404 });
    }

    if (body.isDefault || body.is_default) {
      await prisma.userLocation.updateMany({
        where: { userId: authUser.id },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.userLocation.update({
      where: { id },
      data: {
        ...(body.isDefault !== undefined || body.is_default !== undefined
          ? { isDefault: Boolean(body.isDefault ?? body.is_default) }
          : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.label !== undefined ? { name: body.label } : {}),
      },
    });

    return NextResponse.json({
      id: updated.id,
      user_id: updated.userId,
      is_default: updated.isDefault,
      name: updated.name,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar endereço:", error);
    return NextResponse.json({ error: "Erro ao atualizar endereço." }, { status: 500 });
  }
}
