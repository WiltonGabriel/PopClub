/**
 * Serviço de domínio puro responsável pela organização, ordenação canônica,
 * deduplicação e auditoria de grupos e itens de complementos (incluindo combos e pedidos).
 */

export interface SortableAddonGroup {
  id?: string;
  groupId?: string;
  name?: string | null;
  sortOrder?: number | null;
  group?: {
    id?: string;
    name?: string | null;
    sortOrder?: number | null;
  } | null;
}

export interface MinimalAuditAddonItem {
  id?: string;
  name: string;
  price?: number | string;
  isAvailable?: boolean;
}

export interface MinimalAuditAddonGroup {
  id: string;
  name: string;
  sortOrder?: number | null;
  isActive?: boolean;
  productsCount?: number;
  allowItemQuantity?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  freeQuantity?: number;
  items?: MinimalAuditAddonItem[];
}

export interface MinimalAuditProduct {
  id: string;
  name: string;
  isCombo?: boolean;
  addonGroups?: Array<{
    groupId?: string;
    sortOrder?: number | null;
    group?: { id?: string; name?: string | null; sortOrder?: number | null } | null;
  }>;
  comboItems?: Array<{
    productId: string;
    quantity?: number;
    product?: {
      id: string;
      name: string;
      addonGroups?: Array<{
        groupId?: string;
        sortOrder?: number | null;
        group?: { id?: string; name?: string | null; sortOrder?: number | null } | null;
      }>;
    } | null;
  }>;
}

export interface OrderAddonLike {
  id?: string;
  name: string;
  groupName?: string | null;
  price: number | string;
  quantity?: number;
}

export interface OrganizedAddonSection<T extends OrderAddonLike> {
  groupName: string;
  isCutlery: boolean;
  items: T[];
}

export interface AddonAuditIssue {
  code:
    | "DUPLICATE_GROUP"
    | "DUPLICATE_ITEM"
    | "CUTLERY_NOT_LAST"
    | "EMPTY_OR_ORPHAN_GROUP"
    | "REDUNDANT_COMBO_GROUP"
    | "MISSING_ITEM_QUANTITY_SUPPORT";
  severity: "warning" | "error";
  title: string;
  description: string;
  groupId?: string;
  productId?: string;
}

const CUTLERY_KEYWORDS_REGEX =
  /\b(talher(?:es)?|descart[aá]ve(?:l|is)|utens[ií]lio(?:s)?|canudo(?:s)?|guardanapo(?:s)?|cutlery)\b/i;

const CUTLERY_SPOON_PHRASE_REGEX =
  /(\b(?:quero|preciso|sem)\s+(?:de\s+)?colher\b|\bcolher\s+(?:descart[aá]vel|refor[cç]ada|de\s+a[cç]a[ií])\b)/i;

const UNIT_SLOT_PREFIX_REGEX =
  /^(?:copo|marmita|milk\s*shake|shake|garrafa|pote|roleta)\s*(?:\d+\s*)?(?:\([^)]+\))?\s*[-•:]\s*/i;

export class AddonOrganizationService {
  /**
   * Normaliza texto removendo acentos, espaços extras e deixando minúsculo para comparação segura.
   */
  public static normalizeText(value?: string | null): string {
    if (!value) return "";
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Identifica se um grupo ou item pertence à categoria de talheres, colheres, canudos ou descartáveis.
   */
  public static isCutleryGroupName(name?: string | null): boolean {
    const normalized = this.normalizeText(name);
    if (!normalized) return false;
    return CUTLERY_KEYWORDS_REGEX.test(normalized) || CUTLERY_SPOON_PHRASE_REGEX.test(normalized);
  }

  /**
   * Remove sufixos redundantes de quantidade do nome (ex: "Banana (2x)" -> "Banana").
   */
  public static stripQuantitySuffix(name: string): string {
    return name.replace(/\s*\(\d+x\)\s*$/i, "").trim();
  }

  /**
   * Separa prefixo de unidade do combo e o nome do grupo (ex: "Copo 400ml #1 • Frutas").
   */
  public static extractUnitAndGroup(groupName?: string | null): {
    unitTitle: string | null;
    groupTitle: string;
  } {
    const raw = (groupName || "").trim();
    const sepIndex = raw.indexOf(" • ");
    if (sepIndex > 0) {
      return {
        unitTitle: raw.slice(0, sepIndex).trim(),
        groupTitle: raw.slice(sepIndex + 3).trim(),
      };
    }
    return {
      unitTitle: null,
      groupTitle: raw || "Complementos",
    };
  }

  /**
   * Extrai nome e sortOrder de um grupo plano ou registro pivot (ProductAddonGroup).
   */
  private static extractGroupMeta(entry: SortableAddonGroup): {
    name: string;
    sortOrder: number;
  } {
    const nested = entry.group;
    const name = entry.name ?? nested?.name ?? "";
    const sortOrder = entry.sortOrder ?? nested?.sortOrder ?? 0;
    return {
      name: String(name || ""),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    };
  }

  /**
   * Ordena grupos de complementos colocando "Talheres / Descartáveis" e similares sempre ao final,
   * preservando sortOrder explícito dentro de cada bloco e estabilidade relativa.
   */
  public static sortAddonGroups<T extends SortableAddonGroup>(groups: readonly T[]): T[] {
    return groups
      .map((item, index) => ({ item, index, meta: this.extractGroupMeta(item) }))
      .sort((a, b) => {
        const aCutlery = this.isCutleryGroupName(a.meta.name);
        const bCutlery = this.isCutleryGroupName(b.meta.name);
        if (aCutlery !== bCutlery) {
          return aCutlery ? 1 : -1;
        }
        if (a.meta.sortOrder !== b.meta.sortOrder) {
          return a.meta.sortOrder - b.meta.sortOrder;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }

  /**
   * Ordena e deduplica IDs de grupos para persistência no produto, mantendo descartáveis/talheres ao final.
   */
  public static sortAddonGroupIds(
    groupIds: readonly string[],
    groupsById: Map<string, { name?: string | null; sortOrder?: number | null }>
  ): string[] {
    const uniqueIds: string[] = [];
    const seen = new Set<string>();
    for (const id of groupIds) {
      if (id && !seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    return uniqueIds
      .map((id, index) => {
        const meta = groupsById.get(id);
        return {
          id,
          index,
          name: meta?.name || "",
          sortOrder: meta?.sortOrder ?? index,
        };
      })
      .sort((a, b) => {
        const aCutlery = this.isCutleryGroupName(a.name);
        const bCutlery = this.isCutleryGroupName(b.name);
        if (aCutlery !== bCutlery) {
          return aCutlery ? 1 : -1;
        }
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.id);
  }

  /**
   * Para combos multi-itens:
   * - Remove grupos de talheres/descartáveis de dentro de cada unidade individual (copo/marmita) para não repetir.
   * - Evita duplicação de grupos legados do combo pai que espelham os mesmos complementos das unidades filhas.
   * - Posiciona um único bloco de complementos gerais do combo (incluindo apenas um grupo de talheres/descartáveis) no final.
   */
  public static partitionComboGroups<TGroup extends { id: string; name: string; sortOrder?: number | null }>(params: {
    comboAddonGroups: readonly TGroup[];
    comboUnits: Array<{
      key: string;
      title: string;
      groups: readonly TGroup[];
    }>;
  }): {
    units: Array<{ key: string; title: string; groups: TGroup[] }>;
    comboTrailingGroups: TGroup[];
  } {
    const childNonCutleryNames = new Set<string>();
    const childGroupIds = new Set<string>();
    let firstChildCutleryGroup: TGroup | null = null;

    const cleanUnits = params.comboUnits.map((unit) => {
      const sorted = this.sortAddonGroups(unit.groups);
      const pertinentGroups: TGroup[] = [];

      for (const group of sorted) {
        if (this.isCutleryGroupName(group.name)) {
          if (!firstChildCutleryGroup) {
            firstChildCutleryGroup = group;
          }
          continue;
        }
        pertinentGroups.push(group);
        childGroupIds.add(group.id);
        childNonCutleryNames.add(this.normalizeText(group.name));
      }

      return {
        key: unit.key,
        title: unit.title,
        groups: pertinentGroups,
      };
    });

    const sortedParentGroups = this.sortAddonGroups(params.comboAddonGroups || []);
    const comboNonCutlery: TGroup[] = [];
    const comboCutlery: TGroup[] = [];
    const seenTrailingIds = new Set<string>();
    const hasChildGroups = childGroupIds.size > 0;

    for (const parentGroup of sortedParentGroups) {
      if (seenTrailingIds.has(parentGroup.id)) continue;

      if (this.isCutleryGroupName(parentGroup.name)) {
        comboCutlery.push(parentGroup);
        seenTrailingIds.add(parentGroup.id);
        continue;
      }

      // Evita duplicação se o combo pai ainda tiver grupos legados que repetem opções dos itens filhos
      const normalizedParentName = this.normalizeText(parentGroup.name);
      const isDirectDuplicate = childGroupIds.has(parentGroup.id) || childNonCutleryNames.has(normalizedParentName);
      const isLegacyPerSlotGroup = hasChildGroups && UNIT_SLOT_PREFIX_REGEX.test(parentGroup.name);

      if (!isDirectDuplicate && !isLegacyPerSlotGroup) {
        comboNonCutlery.push(parentGroup);
        seenTrailingIds.add(parentGroup.id);
      }
    }

    // Garante no máximo um grupo de talheres/descartáveis consolidado ao final do combo
    const finalCutleryGroup = comboCutlery[0] || firstChildCutleryGroup;
    const comboTrailingGroups = finalCutleryGroup
      ? [...comboNonCutlery, finalCutleryGroup]
      : comboNonCutlery;

    return {
      units: cleanUnits,
      comboTrailingGroups,
    };
  }

  /**
   * Consolida, limpa sufixos redundantes e organiza os complementos de um item de pedido em seções,
   * garantindo que talheres/descartáveis apareçam sempre por último.
   */
  public static organizeOrderAddons<T extends OrderAddonLike>(addons: readonly T[]): {
    flatSorted: T[];
    sections: OrganizedAddonSection<T>[];
  } {
    if (!addons || addons.length === 0) {
      return { flatSorted: [], sections: [] };
    }

    const sectionOrder: string[] = [];
    const sectionsMap = new Map<string, { isCutlery: boolean; itemsMap: Map<string, T> }>();

    for (const rawAddon of addons) {
      const cleanName = this.stripQuantitySuffix(String(rawAddon.name || "").trim());
      const unitPrice = Number(rawAddon.price) || 0;
      const qty = Math.max(1, Number(rawAddon.quantity) || 1);

      const rawGroup = String(rawAddon.groupName || "").trim();
      const itemIsCutlery = this.isCutleryGroupName(rawGroup) || this.isCutleryGroupName(cleanName);
      const groupName = rawGroup || (itemIsCutlery ? "Talheres / Descartáveis" : "Complementos");

      if (!sectionsMap.has(groupName)) {
        sectionOrder.push(groupName);
        sectionsMap.set(groupName, {
          isCutlery: itemIsCutlery,
          itemsMap: new Map<string, T>(),
        });
      }

      const section = sectionsMap.get(groupName)!;
      if (itemIsCutlery) {
        section.isCutlery = true;
      }

      // Consolida itens repetidos no mesmo grupo e faixa de preço
      const itemKey = `${this.normalizeText(rawAddon.id || cleanName)}::${unitPrice.toFixed(2)}`;
      const existing = section.itemsMap.get(itemKey);

      if (existing) {
        existing.quantity = (Number(existing.quantity) || 1) + qty;
      } else {
        section.itemsMap.set(itemKey, {
          ...rawAddon,
          name: cleanName,
          groupName,
          price: unitPrice,
          quantity: qty,
        });
      }
    }

    const nonCutlerySections: OrganizedAddonSection<T>[] = [];
    const cutlerySections: OrganizedAddonSection<T>[] = [];

    for (const groupName of sectionOrder) {
      const entry = sectionsMap.get(groupName)!;
      const items = Array.from(entry.itemsMap.values()).sort((a, b) => {
        const aCut = this.isCutleryGroupName(a.name);
        const bCut = this.isCutleryGroupName(b.name);
        if (aCut !== bCut) return aCut ? 1 : -1;
        return 0;
      });

      const sectionObj: OrganizedAddonSection<T> = {
        groupName,
        isCutlery: entry.isCutlery,
        items,
      };

      if (entry.isCutlery) {
        cutlerySections.push(sectionObj);
      } else {
        nonCutlerySections.push(sectionObj);
      }
    }

    const sections = [...nonCutlerySections, ...cutlerySections];
    const flatSorted = sections.flatMap((section) => section.items);

    return { flatSorted, sections };
  }

  /**
   * Audita grupos de complementos e vínculos de produtos para destacar inconsistências no Painel Operacional.
   */
  public static auditAddonCatalog(
    groups: readonly MinimalAuditAddonGroup[],
    products: readonly MinimalAuditProduct[] = []
  ): AddonAuditIssue[] {
    const issues: AddonAuditIssue[] = [];

    // 1. Grupos duplicados por nome normalizado
    const groupsByNormName = new Map<string, MinimalAuditAddonGroup[]>();
    for (const group of groups) {
      const norm = this.normalizeText(group.name);
      if (!norm) continue;
      const list = groupsByNormName.get(norm) || [];
      list.push(group);
      groupsByNormName.set(norm, list);
    }

    for (const [, dupes] of groupsByNormName.entries()) {
      if (dupes.length > 1) {
        issues.push({
          code: "DUPLICATE_GROUP",
          severity: "warning",
          title: `Grupo duplicado: "${dupes[0].name}"`,
          description: `Existem ${dupes.length} grupos com o mesmo nome. Revise para evitar seleções repetidas nos produtos.`,
          groupId: dupes[1].id,
        });
      }
    }

    // 2. Problemas internos dos grupos (itens duplicados, grupo vazio/órfão, max > 1 com 1 item sem allowItemQuantity, ordem de talheres)
    const maxNonCutlerySortOrder = groups
      .filter((g) => !this.isCutleryGroupName(g.name))
      .reduce((max, g) => Math.max(max, Number(g.sortOrder ?? 0)), 0);

    for (const group of groups) {
      const items = group.items || [];
      const itemNormSeen = new Map<string, string>();
      for (const item of items) {
        const normItem = this.normalizeText(item.name);
        if (!normItem) continue;
        if (itemNormSeen.has(normItem)) {
          issues.push({
            code: "DUPLICATE_ITEM",
            severity: "warning",
            title: `Opção duplicada em "${group.name}"`,
            description: `O item "${item.name}" aparece mais de uma vez neste grupo.`,
            groupId: group.id,
          });
          break;
        }
        itemNormSeen.set(normItem, item.name);
      }

      if (items.length === 0 || group.productsCount === 0) {
        issues.push({
          code: "EMPTY_OR_ORPHAN_GROUP",
          severity: "warning",
          title:
            items.length === 0
              ? `Grupo sem opções: "${group.name}"`
              : `Grupo sem produtos vinculados: "${group.name}"`,
          description:
            items.length === 0
              ? "Este grupo não possui itens cadastrados."
              : "Este grupo não está associado a nenhum produto no cardápio.",
          groupId: group.id,
        });
      }

      if (
        items.length === 1 &&
        Number(group.maxQuantity ?? 1) > 1 &&
        group.allowItemQuantity === false
      ) {
        issues.push({
          code: "MISSING_ITEM_QUANTITY_SUPPORT",
          severity: "error",
          title: `Quantidade bloqueada em "${group.name}"`,
          description: `O grupo permite até ${group.maxQuantity} unidade(s), mas possui 1 item com incremento (+/-) desativado.`,
          groupId: group.id,
        });
      }

      if (this.isCutleryGroupName(group.name) && Number(group.sortOrder ?? 0) < maxNonCutlerySortOrder) {
        issues.push({
          code: "CUTLERY_NOT_LAST",
          severity: "warning",
          title: `Ordem de exibição de "${group.name}"`,
          description: `O grupo de talheres/descartáveis tem ordem (${group.sortOrder ?? 0}) menor que outros grupos (${maxNonCutlerySortOrder}). Recomendado manter ao final.`,
          groupId: group.id,
        });
      }
    }

    // 3. Auditoria por produto/combo
    for (const product of products) {
      const links = product.addonGroups || [];
      let seenCutlery = false;
      for (const link of links) {
        const gName = link.group?.name || "";
        const isCut = this.isCutleryGroupName(gName);
        if (isCut) {
          seenCutlery = true;
        } else if (seenCutlery) {
          issues.push({
            code: "CUTLERY_NOT_LAST",
            severity: "warning",
            title: `Ordem incorreta em "${product.name}"`,
            description: `Complementos de talheres/descartáveis estão aparecendo antes de "${gName}".`,
            productId: product.id,
          });
          break;
        }
      }

      if (product.isCombo && (product.comboItems?.length || 0) > 0 && links.length > 0) {
        const hasRedundantSlotGroup = links.some((link) => {
          const gName = link.group?.name || "";
          return !this.isCutleryGroupName(gName) && UNIT_SLOT_PREFIX_REGEX.test(gName);
        });
        if (hasRedundantSlotGroup) {
          issues.push({
            code: "REDUNDANT_COMBO_GROUP",
            severity: "warning",
            title: `Grupos legados redundantes no combo "${product.name}"`,
            description:
              "Este combo já herda os complementos dos produtos vinculados em comboItems e possui grupos legados extras no produto pai.",
            productId: product.id,
          });
        }
      }
    }

    return issues;
  }
}
