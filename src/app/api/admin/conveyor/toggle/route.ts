import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { hasPermission, isUserAdmin } from "@/lib/permissions";
import { getStoreOperationalStatus } from "@/lib/storeSchedule";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Autenticação obrigatória." },
        { status: 401 }
      );
    }

    const canManageConveyor =
      isUserAdmin(user) ||
      hasPermission(user, "ORDERS_KANBAN") ||
      hasPermission(user, "settings_manage");

    if (!canManageConveyor) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão para gerenciar a esteira da loja necessária." },
        { status: 403 }
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

        const newShift = await prisma.shift.create({
          data: {
            code: shiftCode,
            openedAt: now,
            isOpen: true,
            estimatedDeliveryTime: updatedSettings.estimatedDeliveryTime || "30-50 min",
          },
        });

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
    console.error("Erro ao alternar esteira da loja:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar status da esteira." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return PATCH(request);
}
