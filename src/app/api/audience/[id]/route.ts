import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthUser } from "../../../../lib/auth";
import { hasPermission } from "../../../../lib/permissions";
import { recordAdminAudit } from "../../../../services/auditLogService";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (!hasPermission(authUser, "notifications_manage")) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão notifications_manage necessária." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID não fornecido." }, { status: 400 });
    }

    await prisma.customAudienceList.delete({
      where: { id },
    });

    await recordAdminAudit({
      actor: { id: authUser.id, role: authUser.role },
      action: "DELETE_AUDIENCE_LIST",
      resourceType: "custom_audience_list",
      resourceId: id,
      summary: "Excluiu lista personalizada de audiência.",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir lista personalizada:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
