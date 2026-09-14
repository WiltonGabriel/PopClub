import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";

const DEFAULT_SETTINGS = {
  id: "store_config",
  deliveryFee: 5.0,
  freeDeliveryThreshold: 60.0,
  whatsappNumber: "5565999999999",
  whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.",
  isOpen: true,
  currentShiftId: null,
  estimatedDeliveryTime: "30-50 min",
};

const settingsUpdateSchema = z.object({
  deliveryFee: z.number().min(0, "A taxa de entrega não pode ser negativa").optional(),
  freeDeliveryThreshold: z.number().min(0, "O valor mínimo não pode ser negativo").nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  whatsappMessage: z.string().nullable().optional(),
  isOpen: z.boolean().optional(),
  currentShiftId: z.string().nullable().optional(),
  estimatedDeliveryTime: z.string().optional(),
  openedAt: z.string().nullable().optional(),
  closedAt: z.string().nullable().optional(),
});

export async function GET() {
  try {
    let settings = await prisma.storeSettings.findUnique({
      where: { id: "store_config" },
    });

    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          id: "store_config",
          deliveryFee: DEFAULT_SETTINGS.deliveryFee,
          freeDeliveryThreshold: DEFAULT_SETTINGS.freeDeliveryThreshold,
          whatsappNumber: DEFAULT_SETTINGS.whatsappNumber,
          whatsappMessage: DEFAULT_SETTINGS.whatsappMessage,
          isOpen: DEFAULT_SETTINGS.isOpen,
          estimatedDeliveryTime: DEFAULT_SETTINGS.estimatedDeliveryTime,
        },
      });
    }

    return NextResponse.json({
      id: settings.id,
      deliveryFee: Number(settings.deliveryFee),
      freeDeliveryThreshold: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null,
      whatsappNumber: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
      whatsappMessage: settings.whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
      isOpen: settings.isOpen,
      currentShiftId: settings.currentShiftId,
      estimatedDeliveryTime: settings.estimatedDeliveryTime || DEFAULT_SETTINGS.estimatedDeliveryTime,
      openedAt: settings.openedAt ? settings.openedAt.toISOString() : null,
      closedAt: settings.closedAt ? settings.closedAt.toISOString() : null,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Erro ao buscar configurações da loja:", error);
    return NextResponse.json(
      {
        id: "store_config",
        deliveryFee: DEFAULT_SETTINGS.deliveryFee,
        freeDeliveryThreshold: DEFAULT_SETTINGS.freeDeliveryThreshold,
        whatsappNumber: DEFAULT_SETTINGS.whatsappNumber,
        whatsappMessage: DEFAULT_SETTINGS.whatsappMessage,
        isOpen: true,
        currentShiftId: null,
        estimatedDeliveryTime: DEFAULT_SETTINGS.estimatedDeliveryTime,
        openedAt: null,
        closedAt: null,
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem alterar configurações da loja." },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido ou corpo vazio." },
        { status: 400 }
      );
    }

    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      deliveryFee,
      freeDeliveryThreshold,
      whatsappNumber,
      whatsappMessage,
      isOpen,
      currentShiftId,
      estimatedDeliveryTime,
      openedAt,
      closedAt,
    } = parsed.data;

    const dataToUpdate: any = {};
    if (deliveryFee !== undefined) dataToUpdate.deliveryFee = deliveryFee;
    if (freeDeliveryThreshold !== undefined) dataToUpdate.freeDeliveryThreshold = freeDeliveryThreshold;
    if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber;
    if (whatsappMessage !== undefined) dataToUpdate.whatsappMessage = whatsappMessage;
    if (isOpen !== undefined) dataToUpdate.isOpen = isOpen;
    if (currentShiftId !== undefined) dataToUpdate.currentShiftId = currentShiftId;
    if (estimatedDeliveryTime !== undefined) dataToUpdate.estimatedDeliveryTime = estimatedDeliveryTime;
    if (openedAt !== undefined) dataToUpdate.openedAt = openedAt ? new Date(openedAt) : null;
    if (closedAt !== undefined) dataToUpdate.closedAt = closedAt ? new Date(closedAt) : null;

    const settings = await prisma.storeSettings.upsert({
      where: { id: "store_config" },
      update: dataToUpdate,
      create: {
        id: "store_config",
        deliveryFee: deliveryFee ?? DEFAULT_SETTINGS.deliveryFee,
        freeDeliveryThreshold: freeDeliveryThreshold !== undefined ? freeDeliveryThreshold : DEFAULT_SETTINGS.freeDeliveryThreshold,
        whatsappNumber: whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
        whatsappMessage: whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
        isOpen: isOpen !== undefined ? isOpen : DEFAULT_SETTINGS.isOpen,
        currentShiftId: currentShiftId || null,
        estimatedDeliveryTime: estimatedDeliveryTime || DEFAULT_SETTINGS.estimatedDeliveryTime,
        openedAt: openedAt ? new Date(openedAt) : null,
        closedAt: closedAt ? new Date(closedAt) : null,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        deliveryFee: Number(settings.deliveryFee),
        freeDeliveryThreshold: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null,
        whatsappNumber: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
        whatsappMessage: settings.whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
        isOpen: settings.isOpen,
        currentShiftId: settings.currentShiftId,
        estimatedDeliveryTime: settings.estimatedDeliveryTime,
        openedAt: settings.openedAt ? settings.openedAt.toISOString() : null,
        closedAt: settings.closedAt ? settings.closedAt.toISOString() : null,
        updatedAt: settings.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar configurações da loja:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao atualizar configurações." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
