import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { z } from "zod";
import { handleApiError, apiSuccess, apiError } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";
import { hasPermission } from "@/lib/permissions";
import { recordAdminAudit } from "@/services/auditLogService";

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
  maxDeliveryRadiusKm: 10,
  businessHours: [
    { day: "monday", label: "Segunda-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "tuesday", label: "Terça-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "wednesday", label: "Quarta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "thursday", label: "Quinta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "friday", label: "Sexta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "saturday", label: "Sábado", isOpen: true, openTime: "13:00", closeTime: "23:30" },
    { day: "sunday", label: "Domingo", isOpen: true, openTime: "14:00", closeTime: "23:00" },
  ],
  openingHoursText: "Terça a Domingo das 14h às 22h",
  footerSlogan: "Açaí artesanal, cremosidade única e o sabor que transforma o seu dia.",
  footerBadgeText: "Delivery Próprio e Artesanal",
  showPaymentMethods: true,
  acceptedPayments: ["pix", "dinheiro", "credito", "debito"],
  googleMapsUrl: "https://maps.google.com/?q=Av.+Filinto+M%C3%BCller,+850+-+Centro+Sul,+V%C3%A1rzea+Grande+-+MT",
  storeCnpj: null as string | null,
  storeAddress: "Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT",
  orderNotificationTemplates: {
    pending: "Olá, {cliente}! Recebemos seu pedido #{codigo_pedido} no Pop Shake. Estamos preparando tudo com muito carinho! Total: {total} ({forma_pagamento}).",
    preparing: "Seu pedido #{codigo_pedido} já está na cozinha sendo preparado! Tempo estimado: {tempo_estimado}.",
    ready: "Oba, {cliente}! Seu pedido #{codigo_pedido} está prontinho na bancada aguardando saída.",
    delivering: "Seu pedido #{codigo_pedido} saiu para entrega! Acompanhe o motoboy em tempo real: {link_rastreamento}",
    completed: "Pedido #{codigo_pedido} entregue com sucesso! Obrigado pela preferência, {cliente}! 🍧 Avalie nosso atendimento e ganhe mimos!",
    support: "Olá, {cliente}! Precisa de ajuda com o pedido #{codigo_pedido}? Estamos à disposição pelo WhatsApp ou telefone da loja.",
  },
  instagramUrl: "@popshake",
  facebookUrl: "",
  supportPhone: "5565999999999",
  postSaleMessage: "Obrigado pelo seu pedido no Pop Shake! Como foi sua experiência hoje? Avalie nosso atendimento e ganhe um cupom de desconto para o próximo pedido! 🍧",
  supportMessage: "Olá! Preciso de ajuda com meu pedido no Pop Shake.",
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
  supportWhatsapp: z.string().nullable().optional(),
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
  maxDeliveryRadiusKm: z.preprocess(coerceNullableNumber, z.number().min(0).nullable()).optional(),
  businessHours: z.any().optional(),
  openingHoursText: z.string().nullable().optional(),
  orderNotificationTemplates: z.any().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  supportPhone: z.string().nullable().optional(),
  postSaleMessage: z.string().nullable().optional(),
  supportMessage: z.string().nullable().optional(),
  openedAt: z.string().nullable().optional(),
  closedAt: z.string().nullable().optional(),
  footerSlogan: z.string().nullable().optional(),
  footerBadgeText: z.string().nullable().optional(),
  showPaymentMethods: z.boolean().optional(),
  acceptedPayments: z.union([z.array(z.string()), z.string()]).transform((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
    return ["pix", "dinheiro", "credito", "debito"];
  }).optional(),
  googleMapsUrl: z.string().nullable().optional(),
  storeCnpj: z.string().trim().max(32, "CNPJ deve ter no máximo 32 caracteres").nullable().optional(),
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
          footerSlogan: DEFAULT_SETTINGS.footerSlogan,
          footerBadgeText: DEFAULT_SETTINGS.footerBadgeText,
          showPaymentMethods: DEFAULT_SETTINGS.showPaymentMethods,
          acceptedPayments: DEFAULT_SETTINGS.acceptedPayments,
          googleMapsUrl: DEFAULT_SETTINGS.googleMapsUrl,
          storeAddress: DEFAULT_SETTINGS.storeAddress,
          openingHoursText: DEFAULT_SETTINGS.openingHoursText,
        },
      });
    }

    return apiSuccess({
      id: settings.id,
      deliveryFee: Number(settings.deliveryFee),
      freeDeliveryThreshold: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null,
      whatsappNumber: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
      supportWhatsapp: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
      whatsappMessage: settings.whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
      isOpen: settings.isOpen,
      currentShiftId: settings.currentShiftId,
      estimatedDeliveryTime: settings.estimatedDeliveryTime || DEFAULT_SETTINGS.estimatedDeliveryTime,
      estimatedTimePresets: settings.estimatedTimePresets?.length ? settings.estimatedTimePresets : DEFAULT_SETTINGS.estimatedTimePresets,
      rejectionReasonPresets: settings.rejectionReasonPresets?.length ? settings.rejectionReasonPresets : DEFAULT_SETTINGS.rejectionReasonPresets,
      storeLatitude: settings.storeLatitude ?? DEFAULT_SETTINGS.storeLatitude,
      storeLongitude: settings.storeLongitude ?? DEFAULT_SETTINGS.storeLongitude,
      storeAddress: settings.storeAddress || DEFAULT_SETTINGS.storeAddress,
      maxDeliveryRadiusKm: settings.maxDeliveryRadiusKm ?? DEFAULT_SETTINGS.maxDeliveryRadiusKm,
      businessHours: settings.businessHours || DEFAULT_SETTINGS.businessHours,
      openingHoursText: settings.openingHoursText || DEFAULT_SETTINGS.openingHoursText,
      footerSlogan: settings.footerSlogan || DEFAULT_SETTINGS.footerSlogan,
      footerBadgeText: settings.footerBadgeText || DEFAULT_SETTINGS.footerBadgeText,
      showPaymentMethods: settings.showPaymentMethods ?? DEFAULT_SETTINGS.showPaymentMethods,
      acceptedPayments: settings.acceptedPayments?.length ? settings.acceptedPayments : DEFAULT_SETTINGS.acceptedPayments,
      googleMapsUrl: settings.googleMapsUrl || DEFAULT_SETTINGS.googleMapsUrl,
      storeCnpj: settings.storeCnpj ?? DEFAULT_SETTINGS.storeCnpj,
      orderNotificationTemplates: settings.orderNotificationTemplates || DEFAULT_SETTINGS.orderNotificationTemplates,
      instagramUrl: settings.instagramUrl || DEFAULT_SETTINGS.instagramUrl,
      facebookUrl: settings.facebookUrl || DEFAULT_SETTINGS.facebookUrl,
      supportPhone: settings.supportPhone || DEFAULT_SETTINGS.supportPhone,
      postSaleMessage: settings.postSaleMessage || DEFAULT_SETTINGS.postSaleMessage,
      supportMessage: settings.supportMessage || DEFAULT_SETTINGS.supportMessage,
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
      supportWhatsapp: DEFAULT_SETTINGS.whatsappNumber,
      whatsappMessage: DEFAULT_SETTINGS.whatsappMessage,
      isOpen: true,
      currentShiftId: null,
      estimatedDeliveryTime: DEFAULT_SETTINGS.estimatedDeliveryTime,
      estimatedTimePresets: DEFAULT_SETTINGS.estimatedTimePresets,
      rejectionReasonPresets: DEFAULT_SETTINGS.rejectionReasonPresets,
      storeLatitude: DEFAULT_SETTINGS.storeLatitude,
      storeLongitude: DEFAULT_SETTINGS.storeLongitude,
      storeAddress: DEFAULT_SETTINGS.storeAddress,
      maxDeliveryRadiusKm: DEFAULT_SETTINGS.maxDeliveryRadiusKm,
      businessHours: DEFAULT_SETTINGS.businessHours,
      openingHoursText: DEFAULT_SETTINGS.openingHoursText,
      footerSlogan: DEFAULT_SETTINGS.footerSlogan,
      footerBadgeText: DEFAULT_SETTINGS.footerBadgeText,
      showPaymentMethods: DEFAULT_SETTINGS.showPaymentMethods,
      acceptedPayments: DEFAULT_SETTINGS.acceptedPayments,
      googleMapsUrl: DEFAULT_SETTINGS.googleMapsUrl,
      storeCnpj: DEFAULT_SETTINGS.storeCnpj,
      orderNotificationTemplates: DEFAULT_SETTINGS.orderNotificationTemplates,
      instagramUrl: DEFAULT_SETTINGS.instagramUrl,
      facebookUrl: DEFAULT_SETTINGS.facebookUrl,
      supportPhone: DEFAULT_SETTINGS.supportPhone,
      postSaleMessage: DEFAULT_SETTINGS.postSaleMessage,
      supportMessage: DEFAULT_SETTINGS.supportMessage,
      openedAt: null,
      closedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }
}

const KANBAN_ALLOWED_SETTINGS_KEYS = new Set([
  "estimatedDeliveryTime",
  "estimatedTimePresets",
  "rejectionReasonPresets",
]);

const LOGISTICS_ALLOWED_SETTINGS_KEYS = new Set([
  "deliveryFee",
  "freeDeliveryThreshold",
  "maxDeliveryRadiusKm",
  "storeAddress",
  "storeLatitude",
  "storeLongitude",
  "latitude",
  "longitude",
  "businessHours",
  "openingHoursText",
]);

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Formato de requisição inválido ou corpo vazio.", 400);
    }

    const bodyKeys =
      body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body) : [];
    const hasSettingsManage = hasPermission(user, "settings_manage");
    const isKanbanScopedUpdate =
      bodyKeys.length > 0 &&
      bodyKeys.every((k) => KANBAN_ALLOWED_SETTINGS_KEYS.has(k)) &&
      hasPermission(user, "ORDERS_KANBAN");
    const isLogisticsScopedUpdate =
      bodyKeys.length > 0 &&
      bodyKeys.every((k) => LOGISTICS_ALLOWED_SETTINGS_KEYS.has(k)) &&
      hasPermission(user, "logistics_manage");

    if (!user || (!hasSettingsManage && !isKanbanScopedUpdate && !isLogisticsScopedUpdate)) {
      return apiError("Acesso negado. Permissão para alterar configurações da loja necessária.", 403, "FORBIDDEN");
    }

    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400, "VALIDATION_ERROR");
    }

    const {
      deliveryFee,
      freeDeliveryThreshold,
      whatsappNumber,
      supportWhatsapp,
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
      maxDeliveryRadiusKm,
      businessHours,
      openingHoursText,
      orderNotificationTemplates,
      instagramUrl,
      facebookUrl,
      supportPhone,
      postSaleMessage,
      supportMessage,
      openedAt,
      closedAt,
      footerSlogan,
      footerBadgeText,
      showPaymentMethods,
      acceptedPayments,
      googleMapsUrl,
      storeCnpj,
    } = parsed.data;

    const effectiveLat = storeLatitude !== undefined ? storeLatitude : latitude;
    const effectiveLng = storeLongitude !== undefined ? storeLongitude : longitude;
    const effectiveWhatsapp = whatsappNumber !== undefined ? whatsappNumber : supportWhatsapp;

    const dataToUpdate: Record<string, unknown> = {};
    if (deliveryFee !== undefined) dataToUpdate.deliveryFee = deliveryFee;
    if (freeDeliveryThreshold !== undefined) dataToUpdate.freeDeliveryThreshold = freeDeliveryThreshold;
    if (effectiveWhatsapp !== undefined) dataToUpdate.whatsappNumber = effectiveWhatsapp;
    if (whatsappMessage !== undefined) dataToUpdate.whatsappMessage = whatsappMessage;
    if (isOpen !== undefined) dataToUpdate.isOpen = isOpen;
    if (currentShiftId !== undefined) dataToUpdate.currentShiftId = currentShiftId;
    if (estimatedDeliveryTime !== undefined) dataToUpdate.estimatedDeliveryTime = estimatedDeliveryTime;
    if (estimatedTimePresets !== undefined) dataToUpdate.estimatedTimePresets = estimatedTimePresets;
    if (rejectionReasonPresets !== undefined) dataToUpdate.rejectionReasonPresets = rejectionReasonPresets;
    if (effectiveLat !== undefined) dataToUpdate.storeLatitude = effectiveLat;
    if (effectiveLng !== undefined) dataToUpdate.storeLongitude = effectiveLng;
    if (storeAddress !== undefined) dataToUpdate.storeAddress = storeAddress;
    if (maxDeliveryRadiusKm !== undefined) dataToUpdate.maxDeliveryRadiusKm = maxDeliveryRadiusKm;
    if (businessHours !== undefined) dataToUpdate.businessHours = businessHours;
    if (openingHoursText !== undefined) dataToUpdate.openingHoursText = openingHoursText;
    if (orderNotificationTemplates !== undefined) dataToUpdate.orderNotificationTemplates = orderNotificationTemplates;
    if (instagramUrl !== undefined) dataToUpdate.instagramUrl = instagramUrl;
    if (facebookUrl !== undefined) dataToUpdate.facebookUrl = facebookUrl;
    if (supportPhone !== undefined) dataToUpdate.supportPhone = supportPhone;
    if (postSaleMessage !== undefined) dataToUpdate.postSaleMessage = postSaleMessage;
    if (supportMessage !== undefined) dataToUpdate.supportMessage = supportMessage;
    if (openedAt !== undefined) dataToUpdate.openedAt = openedAt ? new Date(openedAt) : null;
    if (closedAt !== undefined) dataToUpdate.closedAt = closedAt ? new Date(closedAt) : null;
    if (footerSlogan !== undefined) dataToUpdate.footerSlogan = footerSlogan;
    if (footerBadgeText !== undefined) dataToUpdate.footerBadgeText = footerBadgeText;
    if (showPaymentMethods !== undefined) dataToUpdate.showPaymentMethods = showPaymentMethods;
    if (acceptedPayments !== undefined) dataToUpdate.acceptedPayments = acceptedPayments;
    if (googleMapsUrl !== undefined) dataToUpdate.googleMapsUrl = googleMapsUrl;
    if (storeCnpj !== undefined) dataToUpdate.storeCnpj = storeCnpj || null;

    const settings = await prisma.storeSettings.upsert({
      where: { id: "store_config" },
      update: dataToUpdate,
      create: {
        id: "store_config",
        deliveryFee: deliveryFee ?? DEFAULT_SETTINGS.deliveryFee,
        freeDeliveryThreshold: freeDeliveryThreshold !== undefined ? freeDeliveryThreshold : DEFAULT_SETTINGS.freeDeliveryThreshold,
        whatsappNumber: effectiveWhatsapp || DEFAULT_SETTINGS.whatsappNumber,
        whatsappMessage: whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
        isOpen: isOpen !== undefined ? isOpen : DEFAULT_SETTINGS.isOpen,
        currentShiftId: currentShiftId || null,
        estimatedDeliveryTime: estimatedDeliveryTime || DEFAULT_SETTINGS.estimatedDeliveryTime,
        estimatedTimePresets: estimatedTimePresets || DEFAULT_SETTINGS.estimatedTimePresets,
        rejectionReasonPresets: rejectionReasonPresets || DEFAULT_SETTINGS.rejectionReasonPresets,
        storeLatitude: effectiveLat ?? DEFAULT_SETTINGS.storeLatitude,
        storeLongitude: effectiveLng ?? DEFAULT_SETTINGS.storeLongitude,
        storeAddress: storeAddress || DEFAULT_SETTINGS.storeAddress,
        maxDeliveryRadiusKm: maxDeliveryRadiusKm ?? DEFAULT_SETTINGS.maxDeliveryRadiusKm,
        businessHours: businessHours ?? DEFAULT_SETTINGS.businessHours,
        openingHoursText: openingHoursText || DEFAULT_SETTINGS.openingHoursText,
        orderNotificationTemplates: orderNotificationTemplates || DEFAULT_SETTINGS.orderNotificationTemplates,
        instagramUrl: instagramUrl || DEFAULT_SETTINGS.instagramUrl,
        facebookUrl: facebookUrl || DEFAULT_SETTINGS.facebookUrl,
        supportPhone: supportPhone || DEFAULT_SETTINGS.supportPhone,
        postSaleMessage: postSaleMessage || DEFAULT_SETTINGS.postSaleMessage,
        supportMessage: supportMessage || DEFAULT_SETTINGS.supportMessage,
        openedAt: openedAt ? new Date(openedAt) : null,
        closedAt: closedAt ? new Date(closedAt) : null,
        footerSlogan: footerSlogan || DEFAULT_SETTINGS.footerSlogan,
        footerBadgeText: footerBadgeText || DEFAULT_SETTINGS.footerBadgeText,
        showPaymentMethods: showPaymentMethods !== undefined ? showPaymentMethods : DEFAULT_SETTINGS.showPaymentMethods,
        acceptedPayments: acceptedPayments || DEFAULT_SETTINGS.acceptedPayments,
        googleMapsUrl: googleMapsUrl || DEFAULT_SETTINGS.googleMapsUrl,
        storeCnpj: storeCnpj || null,
      },
    });

    await recordAdminAudit({
      actor: user ? { id: user.id, role: user.role } : null,
      action: "UPDATE_STORE_SETTINGS",
      resourceType: "store_settings",
      resourceId: settings.id,
      summary: "Atualizou configurações operacionais/comerciais da loja.",
      diffKeys: Object.keys(dataToUpdate),
      metadata: { updatedFields: Object.keys(dataToUpdate) },
    });

    return apiSuccess({
      success: true,
      settings: {
        id: settings.id,
        deliveryFee: Number(settings.deliveryFee),
        freeDeliveryThreshold: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null,
        whatsappNumber: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
        supportWhatsapp: settings.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber,
        whatsappMessage: settings.whatsappMessage || DEFAULT_SETTINGS.whatsappMessage,
        isOpen: settings.isOpen,
        currentShiftId: settings.currentShiftId,
        estimatedDeliveryTime: settings.estimatedDeliveryTime,
        estimatedTimePresets: settings.estimatedTimePresets,
        rejectionReasonPresets: settings.rejectionReasonPresets,
        storeLatitude: settings.storeLatitude ?? DEFAULT_SETTINGS.storeLatitude,
        storeLongitude: settings.storeLongitude ?? DEFAULT_SETTINGS.storeLongitude,
        storeAddress: settings.storeAddress || DEFAULT_SETTINGS.storeAddress,
        maxDeliveryRadiusKm: settings.maxDeliveryRadiusKm ?? DEFAULT_SETTINGS.maxDeliveryRadiusKm,
        businessHours: settings.businessHours || DEFAULT_SETTINGS.businessHours,
        openingHoursText: settings.openingHoursText || DEFAULT_SETTINGS.openingHoursText,
        footerSlogan: settings.footerSlogan || DEFAULT_SETTINGS.footerSlogan,
        footerBadgeText: settings.footerBadgeText || DEFAULT_SETTINGS.footerBadgeText,
        showPaymentMethods: settings.showPaymentMethods ?? DEFAULT_SETTINGS.showPaymentMethods,
        acceptedPayments: settings.acceptedPayments?.length ? settings.acceptedPayments : DEFAULT_SETTINGS.acceptedPayments,
        googleMapsUrl: settings.googleMapsUrl || DEFAULT_SETTINGS.googleMapsUrl,
        storeCnpj: settings.storeCnpj ?? DEFAULT_SETTINGS.storeCnpj,
        orderNotificationTemplates: settings.orderNotificationTemplates || DEFAULT_SETTINGS.orderNotificationTemplates,
        instagramUrl: settings.instagramUrl || DEFAULT_SETTINGS.instagramUrl,
        facebookUrl: settings.facebookUrl || DEFAULT_SETTINGS.facebookUrl,
        supportPhone: settings.supportPhone || DEFAULT_SETTINGS.supportPhone,
        postSaleMessage: settings.postSaleMessage || DEFAULT_SETTINGS.postSaleMessage,
        supportMessage: settings.supportMessage || DEFAULT_SETTINGS.supportMessage,
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
