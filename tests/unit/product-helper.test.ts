import { describe, it, expect } from "vitest";
import { formatProduct } from "@/lib/productHelper";

describe("formatProduct (Mapeamento e Formatação de Produtos e Combos)", () => {
  it("formata produto simples com valores padrão e conversões numéricas", () => {
    const rawProduct = {
      id: "prod-1",
      name: "Açaí Tradicional 500ml",
      description: "Açaí cremoso batido na hora",
      price: "24.50",
      categoryId: "cat-acai",
      categoryRel: { name: "Açaí" },
      imageUrl: "/uploads/acai.png",
      stock: 15,
      isAvailable: true,
      cardBadgeId: null,
      cardBadge: null,
      isCombo: false,
      showScarcity: false,
    };

    const formatted = formatProduct(rawProduct);

    expect(formatted.id).toBe("prod-1");
    expect(formatted.name).toBe("Açaí Tradicional 500ml");
    expect(formatted.price).toBe(24.5);
    expect(formatted.category).toBe("Açaí");
    expect(formatted.isCombo).toBe(false);
    expect(formatted.promotions).toEqual([]);
    expect(formatted.promotion).toBeNull();
  });

  it("extrai categoria alternativa de category quando categoryRel não estiver presente", () => {
    const raw = {
      id: "prod-2",
      name: "Picolé de Frutas",
      price: 5,
      category: "Picolés",
    };

    const formatted = formatProduct(raw);
    expect(formatted.category).toBe("Picolés");
  });

  it("retorna 'Outros' quando não houver categoryRel nem category", () => {
    const raw = {
      id: "prod-3",
      name: "Item Sem Categoria",
      price: 10,
    };

    const formatted = formatProduct(raw);
    expect(formatted.category).toBe("Outros");
  });

  it("formata gatilhos de escassez e urgência corretamente", () => {
    const expiresDate = new Date("2026-12-31T23:59:59.000Z");
    const raw = {
      id: "prod-scarcity",
      name: "Copão Vulcão Exclusivo",
      price: 35,
      showScarcity: true,
      scarcityType: "real",
      scarcityUnits: 3,
      scarcityInitial: 20,
      scarcitySold: 17,
      showProgressBar: true,
      showDuration: true,
      urgencyType: "date",
      expiresAt: expiresDate,
      sessionMinutes: 45,
    };

    const formatted = formatProduct(raw);

    expect(formatted.showScarcity).toBe(true);
    expect(formatted.scarcityType).toBe("real");
    expect(formatted.scarcityUnits).toBe(3);
    expect(formatted.scarcityInitial).toBe(20);
    expect(formatted.scarcitySold).toBe(17);
    expect(formatted.showProgressBar).toBe(true);
    expect(formatted.urgencyType).toBe("date");
    expect(formatted.expiresAt).toBe("2026-12-31T23:59:59.000Z");
    expect(formatted.sessionMinutes).toBe(45);
  });

  it("identifica e mapeia a promoção ativa principal do produto", () => {
    const raw = {
      id: "prod-promo",
      name: "Açaí com Desconto",
      price: 30,
      promotions: [
        {
          id: "promo-inactive",
          title: "Promoção Expirada",
          badge: "Antiga",
          discountType: "percentage",
          discountValue: 10,
          isActive: false,
        },
        {
          id: "promo-active",
          title: "Festival de Açaí 20% OFF",
          badge: "OFERTA",
          discountType: "percentage",
          discountValue: 20,
          isActive: true,
          startsAt: new Date("2026-10-01T00:00:00Z"),
          expiresAt: new Date("2026-10-31T23:59:59Z"),
          showDuration: true,
          durationDisplay: ["Hoje"],
        },
      ],
    };

    const formatted = formatProduct(raw);

    expect(formatted.promotions).toHaveLength(2);
    expect(formatted.promotion).not.toBeNull();
    expect(formatted.promotion?.id).toBe("promo-active");
    expect(formatted.promotion?.title).toBe("Festival de Açaí 20% OFF");
    expect(formatted.promotion?.discountValue).toBe(20);
    expect(formatted.promotion?.isActive).toBe(true);
  });

  it("mapeia estrutura de combos com itens aninhados e adicionais", () => {
    const raw = {
      id: "combo-1",
      name: "Combo Casal Pop",
      price: 49.9,
      isCombo: true,
      comboItems: [
        {
          id: "ci-1",
          productId: "prod-acai",
          quantity: 2,
          product: {
            id: "prod-acai",
            name: "Açaí 400ml",
            description: "Açaí com 2 frutas",
            price: 20,
            imageUrl: "/acai.png",
            servesText: "1 pessoa",
            addonGroups: [
              {
                groupId: "grp-frutas",
                group: { id: "grp-frutas", name: "Frutas" },
              },
            ],
          },
        },
      ],
    };

    const formatted = formatProduct(raw);

    expect(formatted.isCombo).toBe(true);
    expect(formatted.comboItems).toHaveLength(1);
    expect(formatted.comboItems[0].quantity).toBe(2);
    expect(formatted.comboItems[0].product?.name).toBe("Açaí 400ml");
    expect(formatted.comboItems[0].product?.addonGroups).toHaveLength(1);
  });
});
