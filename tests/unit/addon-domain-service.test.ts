import { describe, it, expect } from "vitest";
import { AddonDomainService, DomainAddonGroup, DomainAddonItem } from "@/domain/services/AddonDomainService";
import { AddonRuleViolationException } from "@/domain/errors";

describe("AddonDomainService (Regras Puras de Grupos de Adicionais)", () => {
  const mockGroup: DomainAddonGroup = {
    id: "grp-caldas",
    name: "Caldas e Coberturas",
    minQuantity: 0,
    maxQuantity: 2,
    freeQuantity: 1,
    allowItemQuantity: false,
    isActive: true,
  };

  const dbItems = new Map<string, DomainAddonItem>([
    ["item-nutella", { id: "item-nutella", groupId: "grp-caldas", name: "Nutella Pura", price: 6.0, isAvailable: true }],
    ["item-leite-cond", { id: "item-leite-cond", groupId: "grp-caldas", name: "Leite Condensado", price: 3.0, isAvailable: true }],
    ["item-morango", { id: "item-morango", groupId: "grp-caldas", name: "Geleia de Morango", price: 4.0, isAvailable: false }],
  ]);

  it("permite seleção válida e aplica cota gratuita no primeiro item", () => {
    const result = AddonDomainService.validateGroupSelections({
      group: mockGroup,
      dbItems,
      selections: [
        { id: "item-nutella", quantity: 1 },
        { id: "item-leite-cond", quantity: 1 },
      ],
    });

    expect(result.processedAddons.length).toBe(2);
    // Primeiro item gratuito (cota de 1 grátis consumida) -> R$ 0.00
    expect(result.processedAddons[0].price).toBe(0);
    // Segundo item pago -> R$ 3.00
    expect(result.processedAddons[1].price).toBe(3.0);
    expect(result.addonsSubtotal).toBe(3.0);
  });

  it("lança AddonRuleViolationException quando o grupo está inativo", () => {
    expect(() => {
      AddonDomainService.validateGroupSelections({
        group: { ...mockGroup, isActive: false },
        dbItems,
        selections: [{ id: "item-nutella", quantity: 1 }],
      });
    }).toThrow(AddonRuleViolationException);
  });

  it("lança AddonRuleViolationException quando o item selecionado está pausado/esgotado", () => {
    expect(() => {
      AddonDomainService.validateGroupSelections({
        group: mockGroup,
        dbItems,
        selections: [{ id: "item-morango", quantity: 1 }], // isAvailable = false
      });
    }).toThrowError(/está pausado ou esgotado na cozinha/);
  });

  it("lança AddonRuleViolationException quando o item não existe no catálogo", () => {
    expect(() => {
      AddonDomainService.validateGroupSelections({
        group: mockGroup,
        dbItems,
        selections: [{ id: "item-fantasma", quantity: 1 }],
      });
    }).toThrowError(/não encontrado ou indisponível/);
  });

  it("lança AddonRuleViolationException quando allowItemQuantity é false e cliente seleciona mais de 1 unidade", () => {
    expect(() => {
      AddonDomainService.validateGroupSelections({
        group: { ...mockGroup, allowItemQuantity: false },
        dbItems,
        selections: [{ id: "item-nutella", quantity: 2 }],
      });
    }).toThrowError(/não permite selecionar mais de 1 unidade do mesmo item/);
  });

  it("permite múltiplas unidades do mesmo item quando allowItemQuantity é true", () => {
    const permissiveGroup: DomainAddonGroup = {
      ...mockGroup,
      maxQuantity: 3,
      allowItemQuantity: true,
    };

    const result = AddonDomainService.validateGroupSelections({
      group: permissiveGroup,
      dbItems,
      selections: [{ id: "item-nutella", quantity: 2 }],
    });

    expect(result.processedAddons.length).toBe(2);
    // 1 grátis e 1 pago (6.0)
    expect(result.addonsSubtotal).toBe(6.0);
  });

  it("lança AddonRuleViolationException quando excede o limite máximo permitido pelo grupo", () => {
    expect(() => {
      AddonDomainService.validateGroupSelections({
        group: { ...mockGroup, maxQuantity: 1, allowItemQuantity: true },
        dbItems,
        selections: [
          { id: "item-nutella", quantity: 1 },
          { id: "item-leite-cond", quantity: 1 },
        ],
      });
    }).toThrowError(/permite no máximo 1 item\(ns\)\. Você selecionou 2\./);
  });

  it("multiplica cotas e limites quando o produto é um combo composto (comboMultiplier)", () => {
    // Combo com 2 unidades: maxQuantity passa de 2 para 4, freeQuantity passa de 1 para 2
    const result = AddonDomainService.validateGroupSelections({
      group: { ...mockGroup, allowItemQuantity: true },
      dbItems,
      comboMultiplier: 2,
      selections: [
        { id: "item-nutella", quantity: 2 },
        { id: "item-leite-cond", quantity: 2 },
      ],
    });

    // 4 itens selecionados. As primeiras 2 unidades são gratuitas (2x Nutella = 0 + 0).
    // As 2 de leite condensado são pagas (2x 3.00 = 6.00).
    expect(result.processedAddons.length).toBe(4);
    expect(result.addonsSubtotal).toBe(6.0);
  });

  it("remove sufixo redundante '(Nx)' do nome ao processar seleções", () => {
    const result = AddonDomainService.validateGroupSelections({
      group: { ...mockGroup, allowItemQuantity: true },
      dbItems,
      selections: [{ id: "item-nutella", name: "Nutella Pura (2x)", quantity: 2 }],
    });

    expect(result.processedAddons.every((p) => p.name === "Nutella Pura")).toBe(true);
  });
});
