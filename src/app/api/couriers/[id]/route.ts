import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";
import { courierUpdateSchema } from "@/services/courierDispatchProjection";
import { recordAdminAudit } from "@/services/auditLogService";

export async function PUT(
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
        "Acesso negado. Permissão logistics_manage necessária para gerenciar entregadores.",
        403,
        "FORBIDDEN"
      );
    }

    const { id } = await params;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const parsed = courierUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Dados do entregador inválidos.";
      return apiError(msg, 400, "VALIDATION_ERROR");
    }

    const { name, phone, vehicle, plate, pixKey, status, isActive } = parsed.data;

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (vehicle !== undefined) dataToUpdate.vehicle = vehicle;
    if (plate !== undefined) dataToUpdate.plate = plate ? plate.toUpperCase() : null;
    if (pixKey !== undefined) dataToUpdate.pixKey = pixKey || null;
    if (status !== undefined) dataToUpdate.status = status;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    const updated = await prisma.courier.update({
      where: { id },
      data: dataToUpdate,
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "UPDATE_COURIER",
      resourceType: "courier",
      resourceId: updated.id,
      summary: `Atualizou dados do entregador "${updated.name}".`,
      diffKeys: Object.keys(dataToUpdate),
      metadata: { status: updated.status, isActive: updated.isActive },
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    return handleApiError(error, "PUT /api/couriers/[id]", "Erro ao atualizar entregador.");
  }
}

export async function DELETE(
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
        "Acesso negado. Permissão logistics_manage necessária para remover entregadores.",
        403,
        "FORBIDDEN"
      );
    }

    const { id } = await params;

    // Soft delete para manter integridade histórica de despachos
    await prisma.courier.update({
      where: { id },
      data: { isActive: false },
    });

    await recordAdminAudit({
      actor: { id: user.id, role: user.role },
      action: "DELETE_COURIER",
      resourceType: "courier",
      resourceId: id,
      summary: "Desativou entregador da frota.",
      diffKeys: ["isActive"],
    });

    return apiSuccess({ success: true, message: "Entregador removido com sucesso." });
  } catch (error: unknown) {
    return handleApiError(error, "DELETE /api/couriers/[id]", "Erro ao remover entregador.");
  }
}
