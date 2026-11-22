import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";
import { ProductDependencyDomainService } from "@/domain/services/ProductDependencyDomainService";
import { PromotionDomainService } from "@/domain/services/PromotionDomainService";

export const productInclude = {
  categoryRel: {
    select: { name: true, isActive: true },
  },
  cardBadge: true,
  promotions: {
    where: { isActive: true },
    orderBy: { createdAt: "desc" as const },
  },
  comboItems: {
    include: {
      product: {
        include: {
          addonGroups: {
            include: {
              group: {
                include: {
                  items: {
                    orderBy: { sortOrder: "asc" as const },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
  },
  addonGroups: {
    include: {
      group: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
};

export function formatProduct(p: any) {
  const sortedProductAddonGroups = AddonOrganizationService.sortAddonGroups(p.addonGroups || []);
  const comboAvailability = ProductDependencyDomainService.evaluateComboAvailability({
    isCombo: Boolean(p.isCombo),
    isAvailable: p.isAvailable,
    stock: p.stock ?? null,
    comboItems: p.comboItems || [],
  });

  const now = new Date();
  const visiblePromo = (p.promotions || []).find((pr: any) =>
    PromotionDomainService.isPromotionPubliclyVisible(
      {
        isActive: Boolean(pr.isActive),
        startsAt: pr.startsAt,
        expiresAt: pr.expiresAt,
        scarcityType: pr.scarcityType,
        scarcityUnits: pr.scarcityUnits,
        product: {
          isAvailable: p.isAvailable,
          stock: p.stock ?? null,
          deletedAt: p.deletedAt ?? null,
        },
      },
      now
    )
  );

  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: Number(p.price),
    servesText: p.servesText || null,
    isHighlight: Boolean(p.isHighlight),
    categoryId: p.categoryId,
    category: p.categoryRel?.name || p.category || "Outros",
    categoryIsActive: p.categoryRel ? Boolean(p.categoryRel.isActive) : true,
    imageUrl: p.imageUrl || "",
    stock: p.stock,
    isAvailable: p.isAvailable,
    effectiveIsAvailable: comboAvailability.effectiveIsAvailable,
    unavailableComponents: comboAvailability.unavailableComponents,
    comboStockLimit: comboAvailability.maxBuildableUnits,
    cardBadgeId: p.cardBadgeId,
    cardBadge: p.cardBadge,
    isCombo: Boolean(p.isCombo),
    showScarcity: Boolean(p.showScarcity),
    scarcityType: (p.scarcityType as "strategic" | "real") || "strategic",
    scarcityUnits: p.scarcityUnits ?? null,
    scarcityInitial: p.scarcityInitial ?? null,
    scarcitySold: Number(p.scarcitySold || 0),
    showProgressBar: Boolean(p.showProgressBar),
    showDuration: Boolean(p.showDuration),
    urgencyType: (p.urgencyType as "date" | "day" | "session") || "date",
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    sessionMinutes: p.sessionMinutes ?? null,
    comboItems: p.comboItems?.map((ci: any) => {
      const sortedChildAddonGroups = AddonOrganizationService.sortAddonGroups(ci.product?.addonGroups || []);
      return {
        id: ci.id,
        productId: ci.productId,
        quantity: ci.quantity,
        product: ci.product ? {
          id: ci.product.id,
          name: ci.product.name,
          description: ci.product.description || "",
          price: Number(ci.product.price),
          imageUrl: ci.product.imageUrl || "",
          servesText: ci.product.servesText || null,
          isAvailable: ci.product.isAvailable !== false,
          stock: ci.product.stock ?? null,
          deletedAt: ci.product.deletedAt ? ci.product.deletedAt.toISOString() : null,
          addonGroupIds: sortedChildAddonGroups.map((pag: any) => pag.groupId),
          addonGroups: sortedChildAddonGroups.map((pag: any) => ({
            groupId: pag.groupId,
            sortOrder: pag.sortOrder,
            group: pag.group,
          })),
        } : null,
      };
    }) || [],
    addonGroupIds: sortedProductAddonGroups.map((pag: any) => pag.groupId),
    addonGroups: sortedProductAddonGroups.map((pag: any) => ({
      groupId: pag.groupId,
      sortOrder: pag.sortOrder,
      group: pag.group,
    })),
    promotions: (p.promotions || []).map((pr: any) => ({
      id: pr.id,
      title: pr.title,
      badge: pr.badge,
      discountType: pr.discountType,
      discountValue: Number(pr.discountValue),
      isActive: Boolean(pr.isActive),
      startsAt: pr.startsAt ? pr.startsAt.toISOString() : null,
      expiresAt: pr.expiresAt ? pr.expiresAt.toISOString() : null,
      showDuration: Boolean(pr.showDuration),
      durationDisplay: pr.durationDisplay || [],
      showScarcity: Boolean(pr.showScarcity),
      scarcityUnits: pr.scarcityUnits ?? null,
      scarcityType: (pr.scarcityType as "strategic" | "real") || "strategic",
      scarcityInitial: pr.scarcityInitial ?? null,
      scarcitySold: Number(pr.scarcitySold || 0),
      showProgressBar: Boolean(pr.showProgressBar),
      urgencyType: (pr.urgencyType as "date" | "day" | "session") || "date",
      sessionMinutes: pr.sessionMinutes ?? null,
    })),
    promotion: visiblePromo
      ? {
          id: visiblePromo.id,
          title: visiblePromo.title,
          badge: visiblePromo.badge,
          discountType: visiblePromo.discountType,
          discountValue: Number(visiblePromo.discountValue),
          isActive: true,
          startsAt: visiblePromo.startsAt ? visiblePromo.startsAt.toISOString() : null,
          expiresAt: visiblePromo.expiresAt ? visiblePromo.expiresAt.toISOString() : null,
          showDuration: Boolean(visiblePromo.showDuration),
          durationDisplay: visiblePromo.durationDisplay || [],
          showScarcity: Boolean(visiblePromo.showScarcity),
          scarcityUnits: visiblePromo.scarcityUnits ?? null,
          scarcityType: visiblePromo.scarcityType || "strategic",
          scarcityInitial: visiblePromo.scarcityInitial ?? null,
          scarcitySold: Number(visiblePromo.scarcitySold || 0),
          showProgressBar: Boolean(visiblePromo.showProgressBar),
          urgencyType: visiblePromo.urgencyType || "date",
          sessionMinutes: visiblePromo.sessionMinutes ?? null,
        }
      : null,
  };
}
