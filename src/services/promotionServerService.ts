import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PromotionDomainService } from "@/domain/services/PromotionDomainService";
import { CreatePromotionInput, UpdatePromotionInput } from "@/lib/validations/promotion";
import { ResourceNotFoundException, ValidationException } from "@/domain/errors";
import { AdminAuditActor, recordAdminAudit } from "@/services/auditLogService";

const promotionProductSelect = {
  id: true,
  name: true,
  price: true,
  imageUrl: true,
  isAvailable: true,
  isCombo: true,
  addonGroups: {
    select: {
      groupId: true,
    },
  },
} as const;

type PromotionRecordWithProduct = {
  id: string;
  title: string;
  badge: string;
  description: string | null;
  bannerImageUrl: string | null;
  gradientStart: string;
  gradientEnd: string;
  discountType: string;
  discountValue: Prisma.Decimal | number | string;
  isActive: boolean;
  startsAt: Date | string;
  expiresAt: Date | string | null;
  showDuration: boolean;
  durationDisplay: string[];
  autoBanner: boolean;
  showScarcity: boolean;
  scarcityUnits: number | null;
  scarcityType: string | null;
  scarcityInitial: number | null;
  scarcitySold: number;
  showProgressBar: boolean;
  urgencyType: string | null;
  sessionMinutes: number | null;
  productId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  product?: {
    id: string;
    name: string;
    price: Prisma.Decimal | number | string;
    imageUrl: string | null;
    isAvailable?: boolean;
    isCombo?: boolean;
    addonGroups?: Array<{ groupId: string }>;
  } | null;
};

export function formatPromotionDto(promo: PromotionRecordWithProduct, now: Date = new Date()) {
  const productPrice = Number(promo.product?.price ?? 0);
  const discountValue = Number(promo.discountValue ?? 0);
  const pricing = PromotionDomainService.calculatePromotionPricing(
    productPrice,
    promo.discountType,
    discountValue
  );
  const visibility = PromotionDomainService.getPromotionVisibilityStatus(
    {
      isActive: Boolean(promo.isActive),
      startsAt: promo.startsAt,
      expiresAt: promo.expiresAt,
      scarcityType: promo.scarcityType,
      scarcityUnits: promo.scarcityUnits,
      product: promo.product ? { isAvailable: promo.product.isAvailable } : null,
    },
    now
  );

  const addonGroupIds = Array.isArray(promo.product?.addonGroups)
    ? promo.product.addonGroups.map((item) => item.groupId)
    : [];

  return {
    id: promo.id,
    title: promo.title,
    badge: promo.badge,
    description: promo.description,
    bannerImageUrl: promo.bannerImageUrl,
    gradientStart: promo.gradientStart,
    gradientEnd: promo.gradientEnd,
    discountType: promo.discountType,
    discountValue,
    isActive: promo.isActive,
    startsAt: promo.startsAt,
    expiresAt: promo.expiresAt,
    showDuration: promo.showDuration,
    durationDisplay: promo.durationDisplay || [],
    autoBanner: promo.autoBanner,
    showScarcity: promo.showScarcity,
    scarcityUnits: promo.scarcityUnits,
    scarcityType: promo.scarcityType,
    scarcityInitial: promo.scarcityInitial,
    scarcitySold: promo.scarcitySold,
    showProgressBar: promo.showProgressBar,
    urgencyType: promo.urgencyType,
    sessionMinutes: promo.sessionMinutes,
    productId: promo.productId,
    productName: promo.product?.name ?? null,
    productPrice,
    productImage: promo.product?.imageUrl ?? null,
    promoPrice: pricing.finalPrice,
    discountAmount: pricing.discountAmount,
    discountPercent: pricing.discountPercent,
    visibilityStatus: visibility.status,
    isVisiblePublicly: visibility.isVisiblePublicly,
    visibilityLabel: visibility.label,
    visibilityReason: visibility.reason,
    product: promo.product
      ? {
          id: promo.product.id,
          name: promo.product.name,
          price: productPrice,
          imageUrl: promo.product.imageUrl,
          isAvailable: promo.product.isAvailable ?? true,
          isCombo: promo.product.isCombo ?? false,
          addonGroupIds,
        }
      : undefined,
    createdAt: promo.createdAt,
    updatedAt: promo.updatedAt,
  };
}

function validateFutureExpirationDate(
  expiresAt: string | Date | null | undefined,
  now: Date
): Date {
  if (!expiresAt) {
    throw new ValidationException(
      "Informe uma data/hora limite para a duração da promoção.",
      { expiresAt: "Data de expiração obrigatória quando a duração por data está ativada." },
      "product"
    );
  }

  const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
    throw new ValidationException(
      "A data de expiração da promoção deve ser futura.",
      { expiresAt: "Escolha uma data e horário futuros para não expirar a oferta imediatamente." },
      "product"
    );
  }

  return parsed;
}

export class PromotionServerService {
  public async listPromotions(options: { includeAll: boolean }) {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: options.includeAll ? undefined : { isActive: true },
      include: {
        product: {
          select: promotionProductSelect,
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    const formatted = promotions.map((promo) =>
      formatPromotionDto(promo as unknown as PromotionRecordWithProduct, now)
    );

    if (options.includeAll) {
      return formatted;
    }

    return formatted.filter((promo) => promo.isVisiblePublicly);
  }

  public async getPromotionById(id: string) {
    const promo = await prisma.promotion.findUnique({
      where: { id },
      include: {
        product: {
          select: promotionProductSelect,
        },
      },
    });

    if (!promo) {
      throw new ResourceNotFoundException("Promoção", id, "Promoção não encontrada.");
    }

    return formatPromotionDto(promo as unknown as PromotionRecordWithProduct, new Date());
  }

  public async createPromotion(input: CreatePromotionInput, actor: AdminAuditActor) {
    const now = new Date();
    const targetProduct = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true },
    });

    if (!targetProduct) {
      throw new ResourceNotFoundException(
        "Produto",
        input.productId,
        "O produto vinculado à promoção não foi encontrado."
      );
    }

    if (input.showDuration && (input.urgencyType || "date") === "date") {
      validateFutureExpirationDate(input.expiresAt, now);
    }

    const normalizedExpiresAt = PromotionDomainService.normalizePromotionExpiration(
      {
        showDuration: Boolean(input.showDuration),
        urgencyType: input.urgencyType,
        expiresAt: input.expiresAt,
        sessionMinutes: input.sessionMinutes,
      },
      now
    );

    const startsAt = input.startsAt ? new Date(input.startsAt) : now;
    const durationDisplay =
      input.durationDisplay && input.durationDisplay.length > 0
        ? input.durationDisplay
        : PromotionDomainService.buildDurationDisplay({
            showDuration: Boolean(input.showDuration),
            showScarcity: Boolean(input.showScarcity),
            urgencyType: input.urgencyType,
          });

    const created = await prisma.promotion.create({
      data: {
        title: input.title,
        badge: input.badge,
        description: input.description ?? null,
        bannerImageUrl: input.bannerImageUrl ?? null,
        gradientStart: input.gradientStart,
        gradientEnd: input.gradientEnd,
        discountType: input.discountType,
        discountValue: input.discountValue,
        isActive: input.isActive,
        startsAt: Number.isNaN(startsAt.getTime()) ? now : startsAt,
        expiresAt: normalizedExpiresAt,
        showDuration: input.showDuration,
        durationDisplay,
        productId: input.productId,
        autoBanner: input.autoBanner,
        showScarcity: input.showScarcity,
        scarcityUnits: input.showScarcity ? (input.scarcityUnits ?? null) : null,
        scarcityType: input.scarcityType,
        scarcityInitial: input.showScarcity
          ? (input.scarcityInitial ?? input.scarcityUnits ?? null)
          : null,
        scarcitySold: input.scarcitySold,
        showProgressBar: input.showProgressBar,
        urgencyType: input.urgencyType,
        sessionMinutes: input.showDuration ? (input.sessionMinutes ?? null) : null,
      },
      include: {
        product: {
          select: promotionProductSelect,
        },
      },
    });

    await recordAdminAudit({
      actor,
      action: "promotion_create",
      resourceType: "promotion",
      resourceId: created.id,
      summary: `Promoção "${created.title}" criada para ${targetProduct.name} (ativa: ${created.isActive ? "sim" : "não"})`,
      diffKeys: Object.keys(input),
    });

    return formatPromotionDto(created as unknown as PromotionRecordWithProduct, now);
  }

  public async updatePromotion(id: string, input: UpdatePromotionInput, actor: AdminAuditActor) {
    const now = new Date();
    const existing = await prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ResourceNotFoundException("Promoção", id, "Promoção não encontrada.");
    }

    if (input.productId && input.productId !== existing.productId) {
      const targetProduct = await prisma.product.findUnique({
        where: { id: input.productId },
        select: { id: true },
      });
      if (!targetProduct) {
        throw new ResourceNotFoundException(
          "Produto",
          input.productId,
          "O produto vinculado à promoção não foi encontrado."
        );
      }
    }

    const hasDurationChange =
      input.showDuration !== undefined ||
      input.urgencyType !== undefined ||
      input.expiresAt !== undefined ||
      input.sessionMinutes !== undefined;

    const nextShowDuration =
      input.showDuration !== undefined ? input.showDuration : existing.showDuration;
    const nextUrgencyType =
      input.urgencyType !== undefined ? input.urgencyType : existing.urgencyType;
    const nextSessionMinutes =
      input.sessionMinutes !== undefined ? input.sessionMinutes : existing.sessionMinutes;
    const nextExpiresAtInput =
      input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt;
    const nextShowScarcity =
      input.showScarcity !== undefined ? input.showScarcity : existing.showScarcity;

    let normalizedExpiresAt: Date | null | undefined = undefined;
    if (hasDurationChange) {
      if (nextShowDuration && (nextUrgencyType || "date") === "date") {
        validateFutureExpirationDate(nextExpiresAtInput, now);
      }
      normalizedExpiresAt = PromotionDomainService.normalizePromotionExpiration(
        {
          showDuration: nextShowDuration,
          urgencyType: nextUrgencyType,
          expiresAt: nextExpiresAtInput,
          sessionMinutes: nextSessionMinutes,
        },
        now
      );
    }

    const nextDurationDisplay =
      input.durationDisplay !== undefined
        ? input.durationDisplay
        : hasDurationChange || input.showScarcity !== undefined
          ? PromotionDomainService.buildDurationDisplay({
              showDuration: nextShowDuration,
              showScarcity: nextShowScarcity,
              urgencyType: nextUrgencyType,
            })
          : undefined;

    const updateData: Prisma.PromotionUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.badge !== undefined ? { badge: input.badge } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.bannerImageUrl !== undefined ? { bannerImageUrl: input.bannerImageUrl } : {}),
      ...(input.gradientStart !== undefined ? { gradientStart: input.gradientStart } : {}),
      ...(input.gradientEnd !== undefined ? { gradientEnd: input.gradientEnd } : {}),
      ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
      ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.startsAt !== undefined && input.startsAt !== null
        ? { startsAt: new Date(input.startsAt) }
        : {}),
      ...(normalizedExpiresAt !== undefined ? { expiresAt: normalizedExpiresAt } : {}),
      ...(input.showDuration !== undefined ? { showDuration: input.showDuration } : {}),
      ...(nextDurationDisplay !== undefined ? { durationDisplay: nextDurationDisplay } : {}),
      ...(input.productId !== undefined
        ? { product: { connect: { id: input.productId } } }
        : {}),
      ...(input.autoBanner !== undefined ? { autoBanner: input.autoBanner } : {}),
      ...(input.showScarcity !== undefined ? { showScarcity: input.showScarcity } : {}),
      ...(input.scarcityUnits !== undefined ? { scarcityUnits: input.scarcityUnits } : {}),
      ...(input.scarcityType !== undefined ? { scarcityType: input.scarcityType } : {}),
      ...(input.scarcityInitial !== undefined ? { scarcityInitial: input.scarcityInitial } : {}),
      ...(input.scarcitySold !== undefined ? { scarcitySold: input.scarcitySold } : {}),
      ...(input.showProgressBar !== undefined ? { showProgressBar: input.showProgressBar } : {}),
      ...(input.urgencyType !== undefined ? { urgencyType: input.urgencyType } : {}),
      ...(input.sessionMinutes !== undefined
        ? { sessionMinutes: nextShowDuration ? input.sessionMinutes : null }
        : {}),
    };

    const updated = await prisma.promotion.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: promotionProductSelect,
        },
      },
    });

    await recordAdminAudit({
      actor,
      action: "promotion_update",
      resourceType: "promotion",
      resourceId: updated.id,
      summary: `Promoção "${updated.title}" atualizada (ativa: ${updated.isActive ? "sim" : "não"})`,
      diffKeys: Object.keys(input),
    });

    return formatPromotionDto(updated as unknown as PromotionRecordWithProduct, now);
  }

  public async deletePromotion(id: string, actor: AdminAuditActor) {
    const existing = await prisma.promotion.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!existing) {
      throw new ResourceNotFoundException("Promoção", id, "Promoção não encontrada.");
    }

    await prisma.promotion.delete({
      where: { id },
    });

    await recordAdminAudit({
      actor,
      action: "promotion_delete",
      resourceType: "promotion",
      resourceId: id,
      summary: `Promoção "${existing.title}" removida`,
    });

    return { deleted: true, id };
  }
}

export const promotionServerService = new PromotionServerService();
