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
    comboItems: p.comboItems?.map((ci: any) => ({
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
        addonGroups: ci.product.addonGroups?.map((pag: any) => ({
          groupId: pag.groupId,
          group: pag.group,
        })) || [],
      } : null,
    })) || [],
    addonGroups: p.addonGroups?.map((pag: any) => ({
      groupId: pag.groupId,
      group: pag.group,
    })) || [],
    promotions: p.promotions || [],
  };
}
