import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const updated = await prisma.userNotification.updateMany({
      where: {
        userId: authUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updated.count,
    });
  } catch (error: any) {
    console.error("Erro ao marcar todas notificações como lidas:", error);
    return NextResponse.json({ error: "Erro ao atualizar notificações." }, { status: 500 });
  }
}
