import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission, isUserAdmin } from "@/lib/permissions";
import { getStoreOperationalStatus } from "@/lib/storeSchedule";
import { UnauthorizedException, ForbiddenActionException } from "@/domain/errors";
import { handleApiError } from "@/lib/apiResponse";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      throw new UnauthorizedException("Autenticação obrigatória.");
    }

    const canManageConveyor =
      isUserAdmin(user) ||
      hasPermission(user, "ORDERS_KANBAN") ||
      hasPermission(user, "settings_manage");

    if (!canManageConveyor) {
      throw new ForbiddenActionException(
        "ORDERS_KANBAN",
        "Acesso negado. Permissão para gerenciar a esteira da loja necessária."
      );
    }

    let body: { isOpen?: boolean } = {};
    try {
      body = await request.json();
    } catch {}

    const currentSettings = await prisma.storeSettings.findUnique({
      where: { id: "store_config" },
    });

    const currentIsOpen = currentSettings?.isOpen ?? true;
    const targetIsOpen = typeof body?.isOpen === "boolean" ? body.isOpen : !currentIsOpen;
    const now = new Date();

    const updatedSettings = await prisma.storeSettings.upsert({
      where: { id: "store_config" },
      update: {
        isOpen: targetIsOpen,
        openedAt: targetIsOpen ? now : undefined,
        closedAt: !targetIsOpen ? now : undefined,
      },
      create: {
        id: "store_config",
        isOpen: targetIsOpen,
        openedAt: targetIsOpen ? now : undefined,
        closedAt: !targetIsOpen ? now : undefined,
      },
    });

    // Se estiver abrindo e não houver turno ativo, abre um turno padrão
    if (targetIsOpen) {
      let activeShift = null;
      if (updatedSettings.currentShiftId) {
        activeShift = await prisma.shift.findUnique({
          where: { id: updatedSettings.currentShiftId },
        });
      }

      if (!activeShift || !activeShift.isOpen) {
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const shiftCode = `TURNO-${dateStr}-${randomSuffix}`;

        let newShift: any = null;
        try {
          newShift = await prisma.shift.create({
            data: {
              code: shiftCode,
              openedAt: now,
              isOpen: true,
              estimatedDeliveryTime: updatedSettings.estimatedDeliveryTime || "30-50 min",
            },
          });
        } catch (shiftErr: any) {
          if (shiftErr?.code === "P2002" || String(shiftErr?.message).includes("unique_active_shift")) {
            newShift = await prisma.shift.findFirst({
              where: { isOpen: true, closedAt: null },
              orderBy: { openedAt: "desc" },
            });
            if (!newShift) throw shiftErr;
          } else {
            throw shiftErr;
          }
        }

        await prisma.storeSettings.update({
          where: { id: "store_config" },
          data: { currentShiftId: newShift.id },
        });
      }
    }

    const operationalStatus = await getStoreOperationalStatus();

    return NextResponse.json({
      success: true,
      isOpen: targetIsOpen,
      status: operationalStatus.status,
      operationalStatus,
      message: targetIsOpen
        ? "Esteira operacional aberta com sucesso!"
        : "Esteira operacional pausada com sucesso.",
    });
  } catch (error: unknown) {
    return handleApiError(error, "PATCH /api/admin/conveyor/toggle", "Erro interno ao atualizar status da esteira.");
  }
}

export async function POST(request: Request) {
  return PATCH(request);
}
