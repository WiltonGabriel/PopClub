import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";
import type {
  AddonGroup,
  AddonItem,
  CreateAddonGroupInput,
  CreateAddonItemInput,
} from "@/services/addonService";
import type { Product } from "@/services/productService";

export const TEMP_GROUP_PREFIX = "temp-group-";
export const TEMP_ITEM_PREFIX = "temp-item-";

export interface AddonDraftGroupInput {
  name: string;
  description?: string;
  minQuantity: number;
  maxQuantity: number;
  freeQuantity: number;
  isRequired: boolean;
  allowItemQuantity?: boolean;
  isActive?: boolean;
}

export interface AddonDraftItemInput {
  name: string;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

export interface AddonDraftState {
  groups: AddonGroup[];
  productLinks: Record<string, string[]>;
}

export interface AddonDraftItemUpdate {
  id: string;
  groupId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
}

export interface AddonDraftDiff {
  isDirty: boolean;
  totalChanges: number;
  groupsToCreate: Array<{ tempId: string; input: CreateAddonGroupInput }>;
  groupsToUpdate: Array<{ id: string; input: Partial<CreateAddonGroupInput> }>;
  groupsToDelete: string[];
  itemsToCreate: Array<{ tempId: string; input: CreateAddonItemInput }>;
  itemsToUpdate: AddonDraftItemUpdate[];
  itemsToDelete: string[];
  productLinksToUpdate: Array<{ productId: string; addonGroupIds: string[] }>;
}

let tempIdCounter = 0;

function generateTempId(prefix: string): string {
  tempIdCounter += 1;
  return `${prefix}${Date.now()}-${tempIdCounter}`;
}

export function isTempAddonId(id: string): boolean {
  return id.startsWith(TEMP_GROUP_PREFIX) || id.startsWith(TEMP_ITEM_PREFIX);
}

function normalizePrice(value: number | string | undefined | null): number {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

function normalizeNullableText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeGroupBounds(input: AddonDraftGroupInput): {
  minQuantity: number;
  maxQuantity: number;
  freeQuantity: number;
} {
  const minQuantity = Math.max(0, Math.trunc(Number(input.minQuantity) || 0));
  const rawMax = Math.max(1, Math.trunc(Number(input.maxQuantity) || 1));
  const maxQuantity = Math.max(minQuantity, rawMax);
  const freeQuantity = Math.max(0, Math.trunc(Number(input.freeQuantity) || 0));
  return { minQuantity, maxQuantity, freeQuantity };
}

function cloneItemsWithSequentialSortOrder(items: AddonItem[], groupId: string): AddonItem[] {
  return items.map((item, idx) => ({
    ...item,
    groupId,
    price: normalizePrice(item.price),
    imageUrl: normalizeNullableText(item.imageUrl),
    isAvailable: Boolean(item.isAvailable),
    sortOrder: idx,
  }));
}

function cloneGroups(groups: AddonGroup[]): AddonGroup[] {
  return groups.map((group) => {
    const sortedItems = [...(group.items || [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    return {
      ...group,
      description: normalizeNullableText(group.description),
      items: sortedItems.map((item) => ({
        ...item,
        groupId: group.id,
        price: normalizePrice(item.price),
        imageUrl: normalizeNullableText(item.imageUrl),
        isAvailable: Boolean(item.isAvailable),
        sortOrder: item.sortOrder ?? 0,
      })),
    };
  });
}

function buildGroupsMetaMap(groups: AddonGroup[]): Map<string, { name: string; sortOrder: number }> {
  const map = new Map<string, { name: string; sortOrder: number }>();
  for (const g of groups) {
    map.set(g.id, { name: g.name, sortOrder: g.sortOrder ?? 0 });
  }
  return map;
}

export function extractProductAddonGroupIds(product: Product): string[] {
  const rawIds =
    product.addonGroupIds && product.addonGroupIds.length > 0
      ? product.addonGroupIds
      : (product.addonGroups || [])
          .map((ag) => ag.groupId || ag.group?.id || ag.id)
          .filter((id): id is string => Boolean(id));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of rawIds) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  return unique;
}

/**
 * Cria o estado inicial (base ou rascunho) a partir dos grupos e produtos carregados.
 */
export function createInitialAddonDraft(
  groups: AddonGroup[],
  products: Product[]
): AddonDraftState {
  const clonedGroups = cloneGroups(groups);
  const productLinks: Record<string, string[]> = {};

  for (const product of products) {
    if (!product.isCombo) {
      productLinks[product.id] = extractProductAddonGroupIds(product);
    }
  }

  return {
    groups: clonedGroups,
    productLinks,
  };
}

/**
 * Clona um estado de rascunho para descarte ou inicialização segura.
 */
export function cloneAddonDraftState(state: AddonDraftState): AddonDraftState {
  const productLinks: Record<string, string[]> = {};
  for (const [productId, ids] of Object.entries(state.productLinks)) {
    productLinks[productId] = [...ids];
  }
  return {
    groups: cloneGroups(state.groups),
    productLinks,
  };
}

/**
 * Cria ou edita um grupo de complementos apenas no rascunho local.
 */
export function upsertGroupInDraft(
  state: AddonDraftState,
  input: AddonDraftGroupInput,
  editingGroupId?: string | null,
  customTempId?: string
): { state: AddonDraftState; groupId: string } {
  const bounds = normalizeGroupBounds(input);
  const normalizedName = input.name.trim();
  const normalizedDesc = normalizeNullableText(input.description);

  if (editingGroupId) {
    const nextGroups = state.groups.map((group) =>
      group.id === editingGroupId
        ? {
            ...group,
            name: normalizedName,
            description: normalizedDesc,
            ...bounds,
            isRequired: Boolean(input.isRequired),
            allowItemQuantity: Boolean(input.allowItemQuantity),
            isActive: input.isActive !== undefined ? Boolean(input.isActive) : group.isActive,
          }
        : group
    );
    return {
      state: {
        ...state,
        groups: AddonOrganizationService.sortAddonGroups(nextGroups),
      },
      groupId: editingGroupId,
    };
  }

  const newGroupId = customTempId || generateTempId(TEMP_GROUP_PREFIX);
  const newGroup: AddonGroup = {
    id: newGroupId,
    name: normalizedName,
    description: normalizedDesc,
    ...bounds,
    isRequired: Boolean(input.isRequired),
    allowItemQuantity: Boolean(input.allowItemQuantity),
    sortOrder: state.groups.length,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    productsCount: 0,
    items: [],
  };

  return {
    state: {
      ...state,
      groups: AddonOrganizationService.sortAddonGroups([...state.groups, newGroup]),
    },
    groupId: newGroupId,
  };
}

/**
 * Exclui um grupo do rascunho e limpa seu ID dos vínculos de produtos base.
 */
export function deleteGroupInDraft(state: AddonDraftState, groupId: string): AddonDraftState {
  const nextGroups = state.groups.filter((g) => g.id !== groupId);
  const nextLinks: Record<string, string[]> = {};

  for (const [productId, ids] of Object.entries(state.productLinks)) {
    nextLinks[productId] = ids.filter((id) => id !== groupId);
  }

  return {
    groups: nextGroups,
    productLinks: nextLinks,
  };
}

/**
 * Cria ou atualiza um item de complemento no rascunho (suporta mudança de grupo ao editar).
 */
export function upsertItemInDraft(
  state: AddonDraftState,
  input: AddonDraftItemInput,
  targetGroupId: string,
  editingItemId?: string | null,
  customTempId?: string
): { state: AddonDraftState; itemId: string } {
  const normalizedName = input.name.trim();
  const normalizedPrice = normalizePrice(input.price);
  const normalizedImageUrl = normalizeNullableText(input.imageUrl);

  if (!state.groups.some((g) => g.id === targetGroupId)) {
    return { state, itemId: editingItemId || "" };
  }

  if (editingItemId) {
    let existingItem: AddonItem | null = null;
    for (const group of state.groups) {
      const found = group.items.find((item) => item.id === editingItemId);
      if (found) {
        existingItem = found;
        break;
      }
    }

    if (!existingItem) {
      return { state, itemId: editingItemId };
    }

    const updatedFields: AddonItem = {
      ...existingItem,
      name: normalizedName,
      price: normalizedPrice,
      imageUrl: normalizedImageUrl,
      isAvailable: input.isAvailable !== undefined ? Boolean(input.isAvailable) : existingItem.isAvailable,
      groupId: targetGroupId,
    };

    const nextGroups = state.groups.map((group) => {
      const hasItem = group.items.some((i) => i.id === editingItemId);

      // Mesmo grupo: atualiza no lugar preservando sortOrder dos irmãos
      if (group.id === targetGroupId && hasItem) {
        return {
          ...group,
          items: group.items.map((i) => (i.id === editingItemId ? updatedFields : i)),
        };
      }

      // Remove do grupo antigo se mudou de grupo
      if (hasItem && group.id !== targetGroupId) {
        return {
          ...group,
          items: cloneItemsWithSequentialSortOrder(
            group.items.filter((i) => i.id !== editingItemId),
            group.id
          ),
        };
      }

      // Insere ao final do novo grupo de destino
      if (group.id === targetGroupId && !hasItem) {
        return {
          ...group,
          items: cloneItemsWithSequentialSortOrder([...group.items, updatedFields], group.id),
        };
      }

      return group;
    });

    return {
      state: { ...state, groups: nextGroups },
      itemId: editingItemId,
    };
  }

  const newItemId = customTempId || generateTempId(TEMP_ITEM_PREFIX);
  const nextGroups = state.groups.map((group) => {
    if (group.id !== targetGroupId) return group;
    const nextSortOrder =
      group.items.reduce((max, i) => Math.max(max, i.sortOrder ?? 0), -1) + 1;
    const created: AddonItem = {
      id: newItemId,
      groupId: targetGroupId,
      name: normalizedName,
      price: normalizedPrice,
      imageUrl: normalizedImageUrl,
      isAvailable: input.isAvailable !== undefined ? Boolean(input.isAvailable) : true,
      sortOrder: nextSortOrder,
    };
    return {
      ...group,
      items: [...group.items, created],
    };
  });

  return {
    state: { ...state, groups: nextGroups },
    itemId: newItemId,
  };
}

/**
 * Remove um item de complemento do rascunho e reordena os restantes do grupo.
 */
export function deleteItemInDraft(state: AddonDraftState, itemId: string): AddonDraftState {
  const nextGroups = state.groups.map((group) => {
    if (!group.items.some((i) => i.id === itemId)) return group;
    return {
      ...group,
      items: cloneItemsWithSequentialSortOrder(
        group.items.filter((i) => i.id !== itemId),
        group.id
      ),
    };
  });

  return {
    ...state,
    groups: nextGroups,
  };
}

/**
 * Alterna a disponibilidade de um item de complemento no rascunho.
 */
export function toggleItemAvailabilityInDraft(
  state: AddonDraftState,
  itemId: string
): AddonDraftState {
  const nextGroups = state.groups.map((group) => {
    if (!group.items.some((i) => i.id === itemId)) return group;
    return {
      ...group,
      items: group.items.map((item) =>
        item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
      ),
    };
  });

  return {
    ...state,
    groups: nextGroups,
  };
}

/**
 * Move um item entre grupos ou reordena dentro do mesmo grupo, recalculando sortOrder (0..n-1).
 */
export function moveItemInDraft(
  state: AddonDraftState,
  itemId: string,
  targetGroupId: string,
  targetIndex?: number
): AddonDraftState {
  let sourceGroupId: string | null = null;
  let sourceIndex = -1;
  let draggedItem: AddonItem | null = null;

  for (const group of state.groups) {
    const idx = group.items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      sourceGroupId = group.id;
      sourceIndex = idx;
      draggedItem = group.items[idx];
      break;
    }
  }

  if (!draggedItem || !sourceGroupId) return state;
  const targetGroup = state.groups.find((g) => g.id === targetGroupId);
  if (!targetGroup) return state;

  // Sem alteração quando solto exatamente na mesma posição no mesmo grupo
  if (sourceGroupId === targetGroupId && targetIndex === sourceIndex) {
    return state;
  }

  const nextGroups = state.groups.map((group) => {
    if (group.id === sourceGroupId && group.id === targetGroupId) {
      const remaining = group.items.filter((i) => i.id !== itemId);
      const insertAt =
        targetIndex !== undefined
          ? Math.max(0, Math.min(targetIndex, remaining.length))
          : remaining.length;
      const reordered = [...remaining];
      reordered.splice(insertAt, 0, { ...draggedItem, groupId: targetGroupId });
      return {
        ...group,
        items: cloneItemsWithSequentialSortOrder(reordered, group.id),
      };
    }

    if (group.id === sourceGroupId) {
      return {
        ...group,
        items: cloneItemsWithSequentialSortOrder(
          group.items.filter((i) => i.id !== itemId),
          group.id
        ),
      };
    }

    if (group.id === targetGroupId) {
      const nextItems = [...group.items];
      const insertAt =
        targetIndex !== undefined
          ? Math.max(0, Math.min(targetIndex, nextItems.length))
          : nextItems.length;
      nextItems.splice(insertAt, 0, { ...draggedItem, groupId: targetGroupId });
      return {
        ...group,
        items: cloneItemsWithSequentialSortOrder(nextItems, group.id),
      };
    }

    return group;
  });

  return {
    ...state,
    groups: nextGroups,
  };
}

/**
 * Vincula ou desvincula um grupo em um produto base no rascunho.
 */
export function toggleProductAddonGroupInDraft(
  state: AddonDraftState,
  productId: string,
  groupId: string
): AddonDraftState {
  if (!state.groups.some((g) => g.id === groupId)) return state;

  const current = state.productLinks[productId] || [];
  const exists = current.includes(groupId);
  const rawNext = exists ? current.filter((id) => id !== groupId) : [...current, groupId];

  return setProductAddonGroupsInDraft(state, productId, rawNext);
}

/**
 * Define a lista ordenada de grupos vinculados a um produto base no rascunho.
 */
export function setProductAddonGroupsInDraft(
  state: AddonDraftState,
  productId: string,
  groupIds: string[]
): AddonDraftState {
  const validGroupIdsSet = new Set(state.groups.map((g) => g.id));
  const filtered = groupIds.filter((id) => validGroupIdsSet.has(id));
  const groupsMeta = buildGroupsMetaMap(state.groups);
  const ordered = AddonOrganizationService.sortAddonGroupIds(filtered, groupsMeta);

  return {
    ...state,
    productLinks: {
      ...state.productLinks,
      [productId]: ordered,
    },
  };
}

function areStringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hasGroupChanged(initialGroup: AddonGroup, currentGroup: AddonGroup): boolean {
  return (
    initialGroup.name !== currentGroup.name ||
    normalizeNullableText(initialGroup.description) !==
      normalizeNullableText(currentGroup.description) ||
    initialGroup.minQuantity !== currentGroup.minQuantity ||
    initialGroup.maxQuantity !== currentGroup.maxQuantity ||
    initialGroup.freeQuantity !== currentGroup.freeQuantity ||
    Boolean(initialGroup.isRequired) !== Boolean(currentGroup.isRequired) ||
    Boolean(initialGroup.allowItemQuantity) !== Boolean(currentGroup.allowItemQuantity) ||
    initialGroup.sortOrder !== currentGroup.sortOrder ||
    Boolean(initialGroup.isActive) !== Boolean(currentGroup.isActive)
  );
}

function hasItemChanged(initialItem: AddonItem, currentItem: AddonItem): boolean {
  return (
    initialItem.groupId !== currentItem.groupId ||
    initialItem.name !== currentItem.name ||
    normalizePrice(initialItem.price) !== normalizePrice(currentItem.price) ||
    normalizeNullableText(initialItem.imageUrl) !== normalizeNullableText(currentItem.imageUrl) ||
    Boolean(initialItem.isAvailable) !== Boolean(currentItem.isAvailable) ||
    (initialItem.sortOrder ?? 0) !== (currentItem.sortOrder ?? 0)
  );
}

/**
 * Calcula exatamente o conjunto mínimo de operações necessárias para persistir o rascunho.
 */
export function computeAddonDraftDiff(
  initialState: AddonDraftState,
  currentState: AddonDraftState
): AddonDraftDiff {
  const initialGroupsById = new Map(initialState.groups.map((g) => [g.id, g]));
  const currentGroupsById = new Map(currentState.groups.map((g) => [g.id, g]));

  const groupsToCreate: AddonDraftDiff["groupsToCreate"] = [];
  const groupsToUpdate: AddonDraftDiff["groupsToUpdate"] = [];
  const groupsToDelete: string[] = [];

  for (const initGroup of initialState.groups) {
    if (!isTempAddonId(initGroup.id) && !currentGroupsById.has(initGroup.id)) {
      groupsToDelete.push(initGroup.id);
    }
  }

  for (const currGroup of currentState.groups) {
    if (isTempAddonId(currGroup.id)) {
      groupsToCreate.push({
        tempId: currGroup.id,
        input: {
          name: currGroup.name,
          description: currGroup.description ?? undefined,
          minQuantity: currGroup.minQuantity,
          maxQuantity: currGroup.maxQuantity,
          freeQuantity: currGroup.freeQuantity,
          isRequired: currGroup.isRequired,
          allowItemQuantity: Boolean(currGroup.allowItemQuantity),
          sortOrder: currGroup.sortOrder,
          isActive: currGroup.isActive,
        },
      });
    } else {
      const initGroup = initialGroupsById.get(currGroup.id);
      if (initGroup && hasGroupChanged(initGroup, currGroup)) {
        groupsToUpdate.push({
          id: currGroup.id,
          input: {
            name: currGroup.name,
            description: currGroup.description ?? undefined,
            minQuantity: currGroup.minQuantity,
            maxQuantity: currGroup.maxQuantity,
            freeQuantity: currGroup.freeQuantity,
            isRequired: currGroup.isRequired,
            allowItemQuantity: Boolean(currGroup.allowItemQuantity),
            sortOrder: currGroup.sortOrder,
            isActive: currGroup.isActive,
          },
        });
      }
    }
  }

  const deletedGroupSet = new Set(groupsToDelete);
  const initialItemsById = new Map<string, AddonItem>();
  for (const g of initialState.groups) {
    for (const item of g.items) {
      initialItemsById.set(item.id, { ...item, groupId: g.id });
    }
  }

  const currentItemsById = new Map<string, AddonItem>();
  for (const g of currentState.groups) {
    for (const item of g.items) {
      currentItemsById.set(item.id, { ...item, groupId: g.id });
    }
  }

  const itemsToCreate: AddonDraftDiff["itemsToCreate"] = [];
  const itemsToUpdate: AddonDraftDiff["itemsToUpdate"] = [];
  const itemsToDelete: string[] = [];

  for (const [initId, initItem] of initialItemsById.entries()) {
    if (!isTempAddonId(initId) && !currentItemsById.has(initId)) {
      // Itens cujo grupo pai já será excluído são removidos em cascata no PostgreSQL
      if (!deletedGroupSet.has(initItem.groupId)) {
        itemsToDelete.push(initId);
      }
    }
  }

  for (const [currId, currItem] of currentItemsById.entries()) {
    if (isTempAddonId(currId)) {
      itemsToCreate.push({
        tempId: currId,
        input: {
          groupId: currItem.groupId,
          name: currItem.name,
          price: normalizePrice(currItem.price),
          imageUrl: normalizeNullableText(currItem.imageUrl),
          isAvailable: Boolean(currItem.isAvailable),
          sortOrder: currItem.sortOrder ?? 0,
        },
      });
    } else {
      const initItem = initialItemsById.get(currId);
      if (initItem && hasItemChanged(initItem, currItem)) {
        itemsToUpdate.push({
          id: currId,
          groupId: currItem.groupId,
          name: currItem.name,
          price: normalizePrice(currItem.price),
          imageUrl: normalizeNullableText(currItem.imageUrl),
          isAvailable: Boolean(currItem.isAvailable),
          sortOrder: currItem.sortOrder ?? 0,
        });
      }
    }
  }

  const productLinksToUpdate: AddonDraftDiff["productLinksToUpdate"] = [];
  const allProductIds = new Set([
    ...Object.keys(initialState.productLinks),
    ...Object.keys(currentState.productLinks),
  ]);

  for (const productId of allProductIds) {
    const initLinks = initialState.productLinks[productId] || [];
    const currLinks = currentState.productLinks[productId] || [];
    if (!areStringArraysEqual(initLinks, currLinks)) {
      productLinksToUpdate.push({
        productId,
        addonGroupIds: [...currLinks],
      });
    }
  }

  const totalChanges =
    groupsToCreate.length +
    groupsToUpdate.length +
    groupsToDelete.length +
    itemsToCreate.length +
    itemsToUpdate.length +
    itemsToDelete.length +
    productLinksToUpdate.length;

  return {
    isDirty: totalChanges > 0,
    totalChanges,
    groupsToCreate,
    groupsToUpdate,
    groupsToDelete,
    itemsToCreate,
    itemsToUpdate,
    itemsToDelete,
    productLinksToUpdate,
  };
}
