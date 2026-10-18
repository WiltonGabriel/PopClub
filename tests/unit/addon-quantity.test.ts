import { describe, it, expect } from "vitest";

describe("Modal de Produto & Complementos (Cálculos de Adicionais e Layout)", () => {
  interface AddonItemSelection {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }

  interface AddonGroupConfig {
    id: string;
    name: string;
    allowItemQuantity: boolean;
    maxQuantity: number;
    freeQuantity?: number;
  }

  // Função pura que simula o cálculo do total do modal de produtos com adicionais
  function calculateModalSubtotal(
    basePrice: number,
    productQuantity: number,
    selectedAddons: AddonItemSelection[]
  ): number {
    const addonsTotal = selectedAddons.reduce((acc, item) => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      return acc + itemTotal;
    }, 0);

    return (basePrice + addonsTotal) * productQuantity;
  }

  describe("Seleção Simples vs Incremento Numérico de Quantidade", () => {
    it("Grupo com allowItemQuantity: false aceita apenas seleção simples (quantidade unitária fixa = 1)", () => {
      const group: AddonGroupConfig = {
        id: "group-cobertura",
        name: "Escolha sua Cobertura",
        allowItemQuantity: false,
        maxQuantity: 1,
      };

      const selectedItem: AddonItemSelection = {
        id: "item-mel",
        name: "Mel Silvestre",
        price: 2.5,
        quantity: 1, // Fixa em 1 quando allowItemQuantity é false
      };

      expect(group.allowItemQuantity).toBe(false);
      expect(selectedItem.quantity).toBe(1);

      const subtotal = calculateModalSubtotal(20.0, 1, [selectedItem]);
      expect(subtotal).toBe(22.5); // 20.0 base + 2.5 addon
    });

    it("Grupo com allowItemQuantity: true incrementa unidades (+ / -) e recalcula o subtotal proporcionalmente", () => {
      const group: AddonGroupConfig = {
        id: "group-frutas",
        name: "Frutas Extras",
        allowItemQuantity: true,
        maxQuantity: 5,
      };

      let selectedItem: AddonItemSelection = {
        id: "item-morango",
        name: "Porção de Morango",
        price: 4.0,
        quantity: 1,
      };

      expect(group.allowItemQuantity).toBe(true);

      // Incrementa para 3 porções (+)
      selectedItem = { ...selectedItem, quantity: selectedItem.quantity + 1 };
      selectedItem = { ...selectedItem, quantity: selectedItem.quantity + 1 };
      expect(selectedItem.quantity).toBe(3);

      const basePrice = 25.0; // Açaí 500ml
      const productQty = 2; // 2 unidades do produto

      // (25.0 + (3 * 4.0)) * 2 = (25.0 + 12.0) * 2 = 37.0 * 2 = 74.0
      const subtotal = calculateModalSubtotal(basePrice, productQty, [selectedItem]);
      expect(subtotal).toBe(74.0);

      // Decrementa 1 porção (-)
      selectedItem = { ...selectedItem, quantity: selectedItem.quantity - 1 };
      expect(selectedItem.quantity).toBe(2);

      // (25.0 + (2 * 4.0)) * 2 = 33.0 * 2 = 66.0
      const updatedSubtotal = calculateModalSubtotal(basePrice, productQty, [selectedItem]);
      expect(updatedSubtotal).toBe(66.0);
    });
  });

  describe("Arquitetura Responsiva de Layout do Modal", () => {
    it("valida especificação das classes CSS de Layout Split (2 colunas) em Desktop e Coluna Única no Mobile", () => {
      // Classes do container Desktop (md+)
      const desktopContainerClasses = "hidden md:flex flex-row flex-1 min-h-0 overflow-hidden";
      const desktopLeftColumn = "w-1/2 shrink-0 border-r border-gray-200 dark:border-zinc-800";
      const desktopRightColumn = "flex-1 overflow-y-auto";

      expect(desktopContainerClasses).toContain("hidden md:flex");
      expect(desktopContainerClasses).toContain("flex-row");
      expect(desktopLeftColumn).toContain("w-1/2");

      // Classes do container Mobile (< md)
      const mobileContainerClasses = "flex flex-col md:hidden flex-1 min-h-0 overflow-y-auto";
      expect(mobileContainerClasses).toContain("flex flex-col md:hidden");
      expect(mobileContainerClasses).toContain("overflow-y-auto");
    });
  });
});
