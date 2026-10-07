import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";
import { hasPermission } from "@/lib/permissions";

interface CourierPayload {
  name?: string;
  phone?: string;
  vehicle?: string;
  plate?: string | null;
  pixKey?: string | null;
  status?: string;
  isActive?: boolean;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!hasPermission(user, "settings_manage") && !hasPermission(user, "ORDERS_KANBAN")) {
      return apiError("Acesso negado. Permissão para gerenciar logística/entregadores necessária.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    let body: CourierPayload;
    try {
      body = (await request.json()) as CourierPayload;
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const { name, phone, vehicle, plate, pixKey, status, isActive } = body || {};

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (phone !== undefined) dataToUpdate.phone = String(phone).trim();
    if (vehicle !== undefined) dataToUpdate.vehicle = String(vehicle).trim();
    if (plate !== undefined) dataToUpdate.plate = plate ? String(plate).trim().toUpperCase() : null;
    if (pixKey !== undefined) dataToUpdate.pixKey = pixKey ? String(pixKey).trim() : null;
    if (status !== undefined) dataToUpdate.status = status;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.courier.update({
      where: { id },
      data: dataToUpdate,
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
    if (!hasPermission(user, "settings_manage") && !hasPermission(user, "ORDERS_KANBAN")) {
      return apiError("Acesso negado. Permissão para gerenciar logística/entregadores necessária.", 403, "FORBIDDEN");
    }

    const { id } = await params;

    // Soft delete para manter integridade histórica de despachos
    await prisma.courier.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ success: true, message: "Entregador removido com sucesso." });
  } catch (error: unknown) {
    return handleApiError(error, "DELETE /api/couriers/[id]", "Erro ao remover entregador.");
  }
}
