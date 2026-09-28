import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/apiResponse";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Corpo da requisição inválido.", 400);
    }

    const { name, phone, vehicle, plate, pixKey, status, isActive } = body || {};

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (phone !== undefined) dataToUpdate.phone = phone.trim();
    if (vehicle !== undefined) dataToUpdate.vehicle = vehicle.trim();
    if (plate !== undefined) dataToUpdate.plate = plate ? plate.trim().toUpperCase() : null;
    if (pixKey !== undefined) dataToUpdate.pixKey = pixKey ? pixKey.trim() : null;
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
    if (!user || user.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores.", 403, "FORBIDDEN");
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
