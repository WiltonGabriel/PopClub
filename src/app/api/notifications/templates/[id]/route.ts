import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;
    interface UpdateTemplateBody {
      title?: string;
      message?: string;
      category?: string;
      couponId?: string | null;
    }

    let body: UpdateTemplateBody = {};
    try {
      body = (await request.json()) as UpdateTemplateBody;
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }

    const { title, message, category, couponId } = body || {};

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(message && { message: message.trim() }),
        ...(category && { category }),
        ...(couponId !== undefined && { couponId }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Erro ao atualizar modelo de notificação:", error);
    return NextResponse.json({ error: "Erro ao atualizar modelo." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { id } = await params;

    await prisma.notificationTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao deletar modelo de notificação:", error);
    return NextResponse.json({ error: "Erro ao excluir modelo." }, { status: 500 });
  }
}
