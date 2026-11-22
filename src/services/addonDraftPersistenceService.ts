import { addonService } from "@/services/addonService";
import { productService } from "@/services/productService";
import { AddonDraftDiff, isTempAddonId } from "@/lib/addonDraftReducer";

export interface PersistAddonDraftResult {
  appliedOperations: number;
  createdGroupIds: Record<string, string>;
}

/**
 * Persiste todas as alterações pendentes do rascunho em ordem segura de dependências:
 * 1. Criar grupos novos (mapeando tempIds -> IDs reais)
 * 2. Atualizar grupos existentes
 * 3. Criar itens novos (usando groupId resolvido)
 * 4. Atualizar / mover / reordenar itens existentes (antes de eventuais exclusões de grupos)
 * 5. Excluir itens removidos
 * 6. Excluir grupos removidos
 * 7. Atualizar vínculos de grupos nos produtos base (resolvendo tempIds)
 */
export async function persistAddonDraftDiff(
  diff: AddonDraftDiff
): Promise<PersistAddonDraftResult> {
  const tempGroupIdMap = new Map<string, string>();
  let appliedOperations = 0;

  // 1. Criar grupos novos
  for (const entry of diff.groupsToCreate) {
    const created = await addonService.createGroup(entry.input);
    tempGroupIdMap.set(entry.tempId, created.id);
    appliedOperations += 1;
  }

  // 2. Atualizar grupos existentes
  for (const entry of diff.groupsToUpdate) {
    await addonService.updateGroup(entry.id, entry.input);
    appliedOperations += 1;
  }

  const resolveGroupId = (groupId: string): string => {
    return tempGroupIdMap.get(groupId) || groupId;
  };

  // 3. Criar itens novos
  for (const entry of diff.itemsToCreate) {
    await addonService.createItem({
      ...entry.input,
      groupId: resolveGroupId(entry.input.groupId),
    });
    appliedOperations += 1;
  }

  // 4. Atualizar / mover / reordenar itens existentes
  for (const entry of diff.itemsToUpdate) {
    await addonService.updateItem(entry.id, {
      groupId: resolveGroupId(entry.groupId),
      catalogKey: entry.catalogKey ?? null,
      name: entry.name,
      price: entry.price,
      imageUrl: entry.imageUrl,
      isAvailable: entry.isAvailable,
      sortOrder: entry.sortOrder,
    });
    appliedOperations += 1;
  }

  // 5. Excluir itens removidos
  for (const itemId of diff.itemsToDelete) {
    await addonService.deleteItem(itemId);
    appliedOperations += 1;
  }

  // 6. Excluir grupos removidos
  for (const groupId of diff.groupsToDelete) {
    await addonService.deleteGroup(groupId);
    appliedOperations += 1;
  }

  // 7. Atualizar vínculos em produtos base
  for (const link of diff.productLinksToUpdate) {
    const resolvedIds = link.addonGroupIds
      .map(resolveGroupId)
      .filter((id) => !isTempAddonId(id));
    await productService.updateProduct(link.productId, { addonGroupIds: resolvedIds });
    appliedOperations += 1;
  }

  return {
    appliedOperations,
    createdGroupIds: Object.fromEntries(tempGroupIdMap.entries()),
  };
}
