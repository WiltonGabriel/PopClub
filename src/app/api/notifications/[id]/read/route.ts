import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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

    // Localiza pelo id do UserNotification ou pelo notificationId
    const record = await prisma.userNotification.findFirst({
      where: {
        userId: authUser.id,
        OR: [
          { id },
          { notificationId: id },
        ],
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Notificação não encontrada." }, { status: 404 });
    }

    const updated = await prisma.userNotification.update({
      where: { id: record.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
    });
  } catch (error: any) {
    console.error("Erro ao marcar notificação como lida:", error);
    return NextResponse.json({ error: "Erro ao atualizar status de leitura." }, { status: 500 });
  }
}
