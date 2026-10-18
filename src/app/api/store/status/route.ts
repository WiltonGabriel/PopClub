import { NextResponse } from "next/server";
import { getStoreOperationalStatus, DEFAULT_STORE_SCHEDULE, BusinessHourDay } from "@/lib/storeSchedule";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const operationalStatus = await getStoreOperationalStatus();

    let settings = null;
    try {
      settings = await prisma.storeSettings.findUnique({
        where: { id: "store_config" },
        select: {
          businessHours: true,
          estimatedDeliveryTime: true,
          isOpen: true,
        },
      });
    } catch {}

    const businessHours = (settings?.businessHours as unknown as BusinessHourDay[]) || DEFAULT_STORE_SCHEDULE;

    return NextResponse.json({
      success: true,
      ...operationalStatus,
      isOpen: operationalStatus.canAcceptOrders,
      estimatedDeliveryTime: settings?.estimatedDeliveryTime || "30-50 min",
      businessHours,
      serverTimeCuiaba: operationalStatus.cuiabaTime,
    });
  } catch (error: unknown) {
    console.error("Erro ao obter status da loja:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao verificar status operacional da loja.",
        status: "STORE_CLOSED",
        canAcceptOrders: false,
        isConveyorOpen: false,
        isWithinSchedule: false,
        openingTime: "13:00",
        closingTime: "23:30",
      },
      { status: 500 }
    );
  }
}
