import { prisma } from "@/lib/prisma";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

/**
 * Ordena e deduplica os IDs de grupos de complementos antes de gravar em ProductAddonGroup,
 * garantindo que grupos de talheres/descartáveis fiquem sempre ao final.
 */
export async function resolveOrderedAddonGroupIds(
  addonGroupIds: readonly string[]
): Promise<string[]> {
  if (!Array.isArray(addonGroupIds) || addonGroupIds.length === 0) {
    return [];
  }

  const dbGroups = await prisma.addonGroup.findMany({
    where: { id: { in: [...addonGroupIds] } },
    select: { id: true, name: true, sortOrder: true },
  });

  const groupsById = new Map<string, { name: string; sortOrder: number }>();
  for (const g of dbGroups) {
    groupsById.set(g.id, { name: g.name, sortOrder: g.sortOrder });
  }

  return AddonOrganizationService.sortAddonGroupIds(addonGroupIds, groupsById);
}
