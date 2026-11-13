import { AddonRuleViolationException } from "@/domain/errors";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

export interface DomainAddonGroup {
  id: string;
  name: string;
  minQuantity?: number;
  maxQuantity?: number;
  freeQuantity?: number;
  allowItemQuantity?: boolean;
  isActive?: boolean;
}

export interface DomainAddonItem {
  id: string;
  groupId: string;
  name: string;
  price: number | string;
  isAvailable?: boolean;
}

export interface SelectedAddonInput {
  id: string;
  name?: string | null;
  groupName?: string | null;
  price?: number | null;
  quantity?: number | null;
}

export interface ValidatedProcessedAddon {
  id: string;
  name: string;
  groupName: string;
  price: number;
  quantity: number;
}

export interface GroupValidationResult {
  addonsSubtotal: number;
  processedAddons: ValidatedProcessedAddon[];
}

export class AddonDomainService {
  /**
   * Valida as regras de um grupo de adicionais/complementos (limite máximo, cotas gratuitas, quantidades permitidas).
   */
  public static validateGroupSelections(params: {
    group: DomainAddonGroup;
    dbItems: Map<string, DomainAddonItem>;
    selections: SelectedAddonInput[];
    comboMultiplier?: number;
  }): GroupValidationResult {
    const { group, dbItems, selections, comboMultiplier = 1 } = params;

    if (group.isActive === false) {
      throw new AddonRuleViolationException(
        group.name,
        "GROUP_INACTIVE",
        `O grupo de complementos "${group.name}" está inativo no momento.`,
        { groupId: group.id }
      );
    }

    const maxAllowed = (group.maxQuantity ?? 99) * comboMultiplier;
    const minRequired = (group.minQuantity ?? 0) * comboMultiplier;
    const freeSlots = (group.freeQuantity ?? 0) * comboMultiplier;

    let totalGroupQuantity = 0;
    const allowMultiplePerItem = group.allowItemQuantity ?? true;

    // 1. Validação de cada item e integridade da quantidade
    for (const sel of selections) {
      const dbItem = dbItems.get(sel.id);
      if (!dbItem) {
        throw new AddonRuleViolationException(
          group.name,
          "ITEM_UNAVAILABLE",
          `Complemento selecionado não encontrado ou indisponível no grupo "${group.name}".`,
          { itemId: sel.id, groupId: group.id }
        );
      }

      if (dbItem.isAvailable === false) {
        throw new AddonRuleViolationException(
          group.name,
          "ITEM_UNAVAILABLE",
          `O complemento "${dbItem.name}" está pausado ou esgotado na cozinha.`,
          { itemId: dbItem.id, itemName: dbItem.name, groupId: group.id }
        );
      }

      const qty = sel.quantity ?? 1;
      if (qty <= 0) {
        throw new AddonRuleViolationException(
          group.name,
          "MIN_QUANTITY_NOT_MET",
          `A quantidade do complemento "${dbItem.name}" deve ser positiva.`,
          { itemId: dbItem.id, quantity: qty }
        );
      }

      if (!allowMultiplePerItem && qty > 1) {
        throw new AddonRuleViolationException(
          group.name,
          "ITEM_QUANTITY_NOT_ALLOWED",
          `O grupo "${group.name}" não permite selecionar mais de 1 unidade do mesmo item ("${dbItem.name}").`,
          { itemId: dbItem.id, itemName: dbItem.name, requestedQuantity: qty }
        );
      }

      totalGroupQuantity += qty;
    }

    // 2. Validação dos limites do grupo
    if (totalGroupQuantity > maxAllowed) {
      throw new AddonRuleViolationException(
        group.name,
        "MAX_QUANTITY_EXCEEDED",
        `O grupo "${group.name}" permite no máximo ${maxAllowed} item(ns). Você selecionou ${totalGroupQuantity}.`,
        { maxAllowed, totalGroupQuantity, groupId: group.id }
      );
    }

    if (totalGroupQuantity < minRequired) {
      throw new AddonRuleViolationException(
        group.name,
        "MIN_QUANTITY_NOT_MET",
        `O grupo "${group.name}" exige no mínimo ${minRequired} item(ns). Você selecionou ${totalGroupQuantity}.`,
        { minRequired, totalGroupQuantity, groupId: group.id }
      );
    }

    // 3. Aplicação da cota gratuita e cálculo financeiro
    let freeSlotsRemaining = freeSlots;
    let addonsSubtotal = 0;
    const processedAddons: ValidatedProcessedAddon[] = [];

    for (const sel of selections) {
      const dbItem = dbItems.get(sel.id)!;
      const rawPrice = Number(dbItem.price) || 0;
      const qty = sel.quantity ?? 1;

      for (let i = 0; i < qty; i++) {
        let finalPrice = rawPrice;

        if (freeSlotsRemaining > 0) {
          finalPrice = 0;
          freeSlotsRemaining--;
        } else if (rawPrice <= 0) {
          finalPrice = 0;
        }

        addonsSubtotal += finalPrice;
        processedAddons.push({
          id: dbItem.id,
          name: AddonOrganizationService.stripQuantitySuffix(sel.name || dbItem.name) || dbItem.name,
          groupName: sel.groupName || group.name,
          price: finalPrice,
          quantity: 1,
        });
      }
    }

    return {
      addonsSubtotal: Number(addonsSubtotal.toFixed(2)),
      processedAddons,
    };
  }
}
