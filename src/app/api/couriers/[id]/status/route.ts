import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";
import { courierStatusSchema } from "@/services/courierDispatchProjection";
import { recordAdminAudit } from "@/services/auditLogService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return apiError("Não autenticado.", 401, "UNAUTHORIZED");
    }
    if (!hasPermission(user, "logistics_manage")) {
      return apiError(
        "Acesso negado. Permissão logistics_manage necessária.",
        403,
        "FORBIDDEN"
      );
    }

    const { id } = await params;
    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const parsed = courierStatusSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError("Status inválido. Use 'available', 'in_transit', 'off_duty' ou 'unavailable'.", 400);
    }

    const updated = await prisma.courier.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_COURIER_STATUS",
      resourceType: "courier",
      resourceId: updated.id,
      summary: `Alterou status do entregador "${updated.name}" para "${updated.status}".`,
      diffKeys: ["status"],
      metadata: { status: updated.status },
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    return handleApiError(error, "PATCH /api/couriers/[id]/status", "Erro ao alterar status do entregador.");
  }
}
