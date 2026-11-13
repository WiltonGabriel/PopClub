import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

export const productInclude = {
  categoryRel: {
    select: { name: true },
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

  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: Number(p.price),
    servesText: p.servesText || null,
    isHighlight: Boolean(p.isHighlight),
    categoryId: p.categoryId,
    category: p.categoryRel?.name || p.category || "Outros",
    imageUrl: p.imageUrl || "",
    stock: p.stock,
    isAvailable: p.isAvailable,
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
    promotion: (p.promotions || []).find((pr: any) => pr.isActive)
      ? {
          id: p.promotions.find((pr: any) => pr.isActive).id,
          title: p.promotions.find((pr: any) => pr.isActive).title,
          badge: p.promotions.find((pr: any) => pr.isActive).badge,
          discountType: p.promotions.find((pr: any) => pr.isActive).discountType,
          discountValue: Number(p.promotions.find((pr: any) => pr.isActive).discountValue),
          isActive: true,
          startsAt: p.promotions.find((pr: any) => pr.isActive).startsAt
            ? p.promotions.find((pr: any) => pr.isActive).startsAt.toISOString()
            : null,
          expiresAt: p.promotions.find((pr: any) => pr.isActive).expiresAt
            ? p.promotions.find((pr: any) => pr.isActive).expiresAt.toISOString()
            : null,
          showDuration: Boolean(p.promotions.find((pr: any) => pr.isActive).showDuration),
          durationDisplay: p.promotions.find((pr: any) => pr.isActive).durationDisplay || [],
          showScarcity: Boolean(p.promotions.find((pr: any) => pr.isActive).showScarcity),
          scarcityUnits: p.promotions.find((pr: any) => pr.isActive).scarcityUnits ?? null,
          scarcityType: p.promotions.find((pr: any) => pr.isActive).scarcityType || "strategic",
          scarcityInitial: p.promotions.find((pr: any) => pr.isActive).scarcityInitial ?? null,
          scarcitySold: Number(p.promotions.find((pr: any) => pr.isActive).scarcitySold || 0),
          showProgressBar: Boolean(p.promotions.find((pr: any) => pr.isActive).showProgressBar),
          urgencyType: p.promotions.find((pr: any) => pr.isActive).urgencyType || "date",
          sessionMinutes: p.promotions.find((pr: any) => pr.isActive).sessionMinutes ?? null,
        }
      : null,
  };
}
