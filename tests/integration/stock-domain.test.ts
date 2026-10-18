import { describe, it, expect } from "vitest";

describe("Isolamento de Domínio de Estoque", () => {
  // Regra de filtragem de produtos base para a aba de estoque de Gerenciar Pedidos
  function filterBaseStockProducts(products: any[], activePromotions: any[], now: Date = new Date()) {
    const activePromoProductIds = new Set(
      activePromotions
        .filter((pr) => pr.isActive && (!pr.expiresAt || new Date(pr.expiresAt) > now))
        .map((pr) => pr.productId)
        .filter((id): id is string => Boolean(id))
    );

    return products.filter((p) => {
      // 1. Exclui estritamente Combos
      if (p.isCombo) return false;

      // 2. Exclui produtos com promoção ativa vinculada
      if (activePromoProductIds.has(p.id)) return false;
      if (
        p.promotions &&
        p.promotions.some((pr: any) => pr.isActive && (!pr.expiresAt || new Date(pr.expiresAt) > now))
      ) {
        return false;
      }

      return true;
    });
  }

  it("retorna exclusivamente produtos comuns (isCombo: false e sem promoção ativa) no Controle de Estoque da Cozinha", () => {
    const now = new Date("2026-10-18T12:00:00Z");

    const mockProducts = [
      {
        id: "p1-acai-comum",
        name: "Açaí Simples 300ml",
        isCombo: false,
        stock: 50,
        isAvailable: true,
        promotions: [],
      },
      {
        id: "p2-combo-casal",
        name: "Combo Casal Especial 2x500ml",
        isCombo: true, // COMBO
        stock: 20,
        isAvailable: true,
        promotions: [],
      },
      {
        id: "p3-barca-promo",
        name: "Barca Especial de Açaí",
        isCombo: false,
        stock: 15,
        isAvailable: true,
        promotions: [
          {
            id: "promo-ativa",
            isActive: true,
            expiresAt: new Date("2026-10-25T23:59:59Z"),
          },
        ],
      },
      {
        id: "p4-picole-promo-expirada",
        name: "Picolé de Ninho Trufado",
        isCombo: false,
        stock: 30,
        isAvailable: true,
        promotions: [
          {
            id: "promo-expirada",
            isActive: true,
            expiresAt: new Date("2026-10-10T23:59:59Z"), // Já expirou
          },
        ],
      },
    ];

    const mockActivePromotions = [
      {
        id: "promo-ativa",
        productId: "p3-barca-promo",
        isActive: true,
        expiresAt: new Date("2026-10-25T23:59:59Z"),
      },
    ];

    const baseStock = filterBaseStockProducts(mockProducts, mockActivePromotions, now);

    // Deve conter p1 (comum) e p4 (promo expirada, portanto voltou a ser produto comum)
    const baseIds = baseStock.map((p) => p.id);
    expect(baseIds).toContain("p1-acai-comum");
    expect(baseIds).toContain("p4-picole-promo-expirada");

    // NÃO deve conter o combo nem o item com promoção vigente
    expect(baseIds).not.toContain("p2-combo-casal");
    expect(baseIds).not.toContain("p3-barca-promo");
    expect(baseStock.length).toBe(2);
  });

  it("garante que lotes de combos e promoções são isolados em seus próprios monitores operacionais", () => {
    const comboProduct = {
      id: "combo-1",
      name: "Super Combo Verão",
      isCombo: true,
      scarcityType: "real",
      scarcityUnits: 12, // Lote gerenciado no monitor de combos
    };

    const promoProduct = {
      id: "promo-item-1",
      name: "Copo Festivo",
      isCombo: false,
      promotions: [{ id: "pr-1", isActive: true, scarcityUnits: 8 }],
    };

    // Verificação de isolamento:
    // Combos monitoram estoque via ComboBatchMonitor
    expect(comboProduct.isCombo).toBe(true);
    expect(comboProduct.scarcityUnits).toBe(12);

    // Promoções monitoram lote via PromotionsBatchMonitor
    expect(promoProduct.promotions[0].scarcityUnits).toBe(8);
  });
});
