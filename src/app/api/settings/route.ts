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
};

const settingsUpdateSchema = z.object({
  deliveryFee: z.number().min(0, "A taxa de entrega não pode ser negativa").optional(),
  freeDeliveryThreshold: z.number().min(0, "O valor mínimo não pode ser negativo").nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  whatsappMessage: z.string().nullable().optional(),
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
        },
      });
    }

    return NextResponse.json({
      id: settings.id,
      deliveryFee: Number(settings.deliveryFee),
      freeDeliveryThreshold: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null,
      whatsappNumber: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
      whatsappMessage: settings.whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
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

    const { deliveryFee, freeDeliveryThreshold, whatsappNumber, whatsappMessage } = parsed.data;

    const dataToUpdate: any = {};
    if (deliveryFee !== undefined) dataToUpdate.deliveryFee = deliveryFee;
    if (freeDeliveryThreshold !== undefined) dataToUpdate.freeDeliveryThreshold = freeDeliveryThreshold;
    if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber;
    if (whatsappMessage !== undefined) dataToUpdate.whatsappMessage = whatsappMessage;

    const settings = await prisma.storeSettings.upsert({
      where: { id: "store_config" },
      update: dataToUpdate,
      create: {
        id: "store_config",
        deliveryFee: deliveryFee ?? DEFAULT_SETTINGS.deliveryFee,
        freeDeliveryThreshold: freeDeliveryThreshold !== undefined ? freeDeliveryThreshold : DEFAULT_SETTINGS.freeDeliveryThreshold,
        whatsappNumber: whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
        whatsappMessage: whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
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
