import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

const DEFAULT_SETTINGS = {
  id: "store_config",
  deliveryFee: 5.0,
  freeDeliveryThreshold: 60.0,
  whatsappNumber: "5565999999999",
  whatsappMessage: "Olá! Gostaria de tirar uma dúvida sobre os pedidos da Pop Shake Sorveteria.",
  isOpen: true,
  currentShiftId: null,
  estimatedDeliveryTime: "30-50 min",
  estimatedTimePresets: ["20-30 min", "35-50 min", "50-70 min"],
  rejectionReasonPresets: [
    "Ingrediente/item do cardápio indisponível no momento",
    "Endereço fora da área de entrega atendida",
    "Pico de demanda: cozinha sobrecarregada temporariamente",
    "Estabelecimento em processo de fechamento de turno",
  ],
  storeLatitude: -15.6536,
  storeLongitude: -56.1322,
  storeAddress: "Várzea Grande, MT",
};

const coerceOptionalNumber = (val: unknown) => {
  if (val === undefined) return undefined;
  if (val === null || val === "" || (typeof val === "string" && val.trim() === "")) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
};

const coerceNullableNumber = (val: unknown) => {
  if (val === undefined) return undefined;
  if (val === null || val === "" || (typeof val === "string" && val.trim() === "")) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

const settingsUpdateSchema = z.object({
  deliveryFee: z.preprocess(coerceOptionalNumber, z.number().min(0, "A taxa de entrega não pode ser negativa")).optional(),
  freeDeliveryThreshold: z.preprocess(coerceNullableNumber, z.number().min(0, "O valor mínimo não pode ser negativo").nullable()).optional(),
  whatsappNumber: z.string().nullable().optional(),
  whatsappMessage: z.string().nullable().optional(),
  isOpen: z.boolean().optional(),
  currentShiftId: z.string().nullable().optional(),
  estimatedDeliveryTime: z.string().optional(),
  estimatedTimePresets: z.array(z.string().trim().max(15, "Preset de tempo deve ter no máximo 15 caracteres")).max(4, "Máximo de 4 presets de tempo permitidos").optional(),
  rejectionReasonPresets: z.array(z.string().trim().max(60, "Motivo deve ter no máximo 60 caracteres")).max(6, "Máximo de 6 presets de motivo permitidos").optional(),
  storeLatitude: z.preprocess(coerceNullableNumber, z.number().nullable()).optional(),
  storeLongitude: z.preprocess(coerceNullableNumber, z.number().nullable()).optional(),
  latitude: z.preprocess(coerceNullableNumber, z.number().nullable()).optional(),
  longitude: z.preprocess(coerceNullableNumber, z.number().nullable()).optional(),
  storeAddress: z.string().nullable().optional(),
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

    return apiSuccess({
      id: settings.id,
      deliveryFee: Number(settings.deliveryFee),
      freeDeliveryThreshold: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null,
      whatsappNumber: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
      whatsappMessage: settings.whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
      isOpen: settings.isOpen,
      currentShiftId: settings.currentShiftId,
      estimatedDeliveryTime: settings.estimatedDeliveryTime || DEFAULT_SETTINGS.estimatedDeliveryTime,
      estimatedTimePresets: settings.estimatedTimePresets?.length ? settings.estimatedTimePresets : DEFAULT_SETTINGS.estimatedTimePresets,
      rejectionReasonPresets: settings.rejectionReasonPresets?.length ? settings.rejectionReasonPresets : DEFAULT_SETTINGS.rejectionReasonPresets,
      storeLatitude: settings.storeLatitude ?? DEFAULT_SETTINGS.storeLatitude,
      storeLongitude: settings.storeLongitude ?? DEFAULT_SETTINGS.storeLongitude,
      storeAddress: settings.storeAddress || DEFAULT_SETTINGS.storeAddress,
      openedAt: settings.openedAt ? settings.openedAt.toISOString() : null,
      closedAt: settings.closedAt ? settings.closedAt.toISOString() : null,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    logger.warn("GET /api/settings", "Falha ao consultar configurações, retornando fallback seguro.", error);
    return apiSuccess({
      id: "store_config",
      deliveryFee: DEFAULT_SETTINGS.deliveryFee,
      freeDeliveryThreshold: DEFAULT_SETTINGS.freeDeliveryThreshold,
      whatsappNumber: DEFAULT_SETTINGS.whatsappNumber,
      whatsappMessage: DEFAULT_SETTINGS.whatsappMessage,
      isOpen: true,
      currentShiftId: null,
      estimatedDeliveryTime: DEFAULT_SETTINGS.estimatedDeliveryTime,
      estimatedTimePresets: DEFAULT_SETTINGS.estimatedTimePresets,
      rejectionReasonPresets: DEFAULT_SETTINGS.rejectionReasonPresets,
      storeLatitude: DEFAULT_SETTINGS.storeLatitude,
      storeLongitude: DEFAULT_SETTINGS.storeLongitude,
      storeAddress: DEFAULT_SETTINGS.storeAddress,
      openedAt: null,
      closedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== "admin") {
      return apiError("Acesso negado. Apenas administradores podem alterar configurações da loja.", 403, "FORBIDDEN");
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400);
    }

    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400, "VALIDATION_ERROR");
    }

    const {
      deliveryFee,
      freeDeliveryThreshold,
      whatsappNumber,
      whatsappMessage,
      isOpen,
      currentShiftId,
      estimatedDeliveryTime,
      estimatedTimePresets,
      rejectionReasonPresets,
      storeLatitude,
      storeLongitude,
      latitude,
      longitude,
      storeAddress,
      openedAt,
      closedAt,
    } = parsed.data;

    const effectiveLat = storeLatitude !== undefined ? storeLatitude : latitude;
    const effectiveLng = storeLongitude !== undefined ? storeLongitude : longitude;

    const dataToUpdate: any = {};
    if (deliveryFee !== undefined) dataToUpdate.deliveryFee = deliveryFee;
    if (freeDeliveryThreshold !== undefined) dataToUpdate.freeDeliveryThreshold = freeDeliveryThreshold;
    if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber;
    if (whatsappMessage !== undefined) dataToUpdate.whatsappMessage = whatsappMessage;
    if (isOpen !== undefined) dataToUpdate.isOpen = isOpen;
    if (currentShiftId !== undefined) dataToUpdate.currentShiftId = currentShiftId;
    if (estimatedDeliveryTime !== undefined) dataToUpdate.estimatedDeliveryTime = estimatedDeliveryTime;
    if (estimatedTimePresets !== undefined) dataToUpdate.estimatedTimePresets = estimatedTimePresets;
    if (rejectionReasonPresets !== undefined) dataToUpdate.rejectionReasonPresets = rejectionReasonPresets;
    if (effectiveLat !== undefined) dataToUpdate.storeLatitude = effectiveLat;
    if (effectiveLng !== undefined) dataToUpdate.storeLongitude = effectiveLng;
    if (storeAddress !== undefined) dataToUpdate.storeAddress = storeAddress;
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
        estimatedTimePresets: estimatedTimePresets || DEFAULT_SETTINGS.estimatedTimePresets,
        rejectionReasonPresets: rejectionReasonPresets || DEFAULT_SETTINGS.rejectionReasonPresets,
        storeLatitude: effectiveLat ?? DEFAULT_SETTINGS.storeLatitude,
        storeLongitude: effectiveLng ?? DEFAULT_SETTINGS.storeLongitude,
        storeAddress: storeAddress || DEFAULT_SETTINGS.storeAddress,
        openedAt: openedAt ? new Date(openedAt) : null,
        closedAt: closedAt ? new Date(closedAt) : null,
      },
    });

    return apiSuccess({
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
        estimatedTimePresets: settings.estimatedTimePresets,
        rejectionReasonPresets: settings.rejectionReasonPresets,
        storeLatitude: settings.storeLatitude ?? DEFAULT_SETTINGS.storeLatitude,
        storeLongitude: settings.storeLongitude ?? DEFAULT_SETTINGS.storeLongitude,
        storeAddress: settings.storeAddress || DEFAULT_SETTINGS.storeAddress,
        openedAt: settings.openedAt ? settings.openedAt.toISOString() : null,
        closedAt: settings.closedAt ? settings.closedAt.toISOString() : null,
        updatedAt: settings.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, "PUT /api/settings", "Erro ao atualizar configurações da loja.");
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
