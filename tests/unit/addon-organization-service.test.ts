import { describe, it, expect } from "vitest";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";

describe("AddonOrganizationService (Auditoria, Ordenação e Combos)", () => {
  describe("Detecção e Ordenação de Talheres / Descartáveis", () => {
    it("identifica corretamente grupos de talheres/descartáveis sem falsos positivos", () => {
      expect(AddonOrganizationService.isCutleryGroupName("Talheres / Descartáveis")).toBe(true);
      expect(AddonOrganizationService.isCutleryGroupName("Talheres do Combo Casal (0 a 2 colheres)")).toBe(true);
      expect(AddonOrganizationService.isCutleryGroupName("Talheres e Canudos (Combo Shake & Açaí)")).toBe(true);
      expect(AddonOrganizationService.isCutleryGroupName("Utensílios descartáveis")).toBe(true);
      expect(AddonOrganizationService.isCutleryGroupName("Escolha o Recipiente")).toBe(false);
      expect(AddonOrganizationService.isCutleryGroupName("Cremes Nobres & Frutas Especiais")).toBe(false);
      expect(AddonOrganizationService.isCutleryGroupName("Acompanhamentos Tradicionais (4 Grátis)")).toBe(false);
    });

    it("ordena grupos mantendo Talheres / Descartáveis sempre no final mesmo com sortOrder menor", () => {
      const unsorted = [
        { id: "g-talheres", name: "Talheres / Descartáveis", sortOrder: 0 },
        { id: "g-caldas", name: "Caldas & Coberturas", sortOrder: 3 },
        { id: "g-trad", name: "Acompanhamentos Tradicionais", sortOrder: 1 },
        { id: "g-cremes", name: "Cremes Nobres", sortOrder: 2 },
      ];

      const sorted = AddonOrganizationService.sortAddonGroups(unsorted);
      expect(sorted.map((g) => g.id)).toEqual(["g-trad", "g-cremes", "g-caldas", "g-talheres"]);
    });

    it("ordena e deduplica addonGroupIds para persistência mantendo talheres ao final", () => {
      const groupsById = new Map([
        ["g-talheres", { name: "Talheres / Descartáveis", sortOrder: 1 }],
        ["g-trad", { name: "Adicionais Tradicionais", sortOrder: 1 }],
        ["g-cremes", { name: "Cremes Nobres", sortOrder: 2 }],
      ]);

      const ordered = AddonOrganizationService.sortAddonGroupIds(
        ["g-talheres", "g-cremes", "g-trad", "g-talheres"],
        groupsById
      );
      expect(ordered).toEqual(["g-trad", "g-cremes", "g-talheres"]);
    });
  });

  describe("Particionamento e Pertinência de Combos", () => {
    const groupTrad4 = { id: "g-trad4", name: "Acompanhamentos Tradicionais (4 Grátis)", sortOrder: 1 };
    const groupCremes = { id: "g-cremes", name: "Cremes Nobres", sortOrder: 2 };
    const groupChildTalheres = { id: "g-talheres", name: "Talheres / Descartáveis", sortOrder: 99 };
    const groupComboTalheres = { id: "g-combo-talheres", name: "Talheres do Combo Casal (0 a 2 colheres)", sortOrder: 99 };
    const groupLegacyCopo1 = { id: "g-legacy-1", name: "Copo 1 (400ml) - Adicionais Tradicionais", sortOrder: 1 };

    it("remove talheres repetidos de cada copo, descarta legados duplicados e consolida talheres no final do combo", () => {
      const result = AddonOrganizationService.partitionComboGroups({
        comboAddonGroups: [groupLegacyCopo1, groupComboTalheres],
        comboUnits: [
          {
            key: "copo_0",
            title: "Copo 400ml #1",
            groups: [groupChildTalheres, groupCremes, groupTrad4],
          },
          {
            key: "copo_1",
            title: "Copo 400ml #2",
            groups: [groupChildTalheres, groupCremes, groupTrad4],
          },
        ],
      });

      expect(result.units[0].groups.map((g) => g.id)).toEqual(["g-trad4", "g-cremes"]);
      expect(result.units[1].groups.map((g) => g.id)).toEqual(["g-trad4", "g-cremes"]);
      // O grupo legado "Copo 1 (400ml) - ..." não deve duplicar; apenas talheres do combo ficam no final
      expect(result.comboTrailingGroups.map((g) => g.id)).toEqual(["g-combo-talheres"]);
    });

    it("promove exatamente um grupo de talheres dos filhos ao final quando o combo pai não possui grupo próprio", () => {
      const result = AddonOrganizationService.partitionComboGroups({
        comboAddonGroups: [],
        comboUnits: [
          { key: "u1", title: "Copo #1", groups: [groupTrad4, groupChildTalheres] },
          { key: "u2", title: "Copo #2", groups: [groupTrad4, groupChildTalheres] },
        ],
      });

      expect(result.units[0].groups.map((g) => g.id)).toEqual(["g-trad4"]);
      expect(result.units[1].groups.map((g) => g.id)).toEqual(["g-trad4"]);
      expect(result.comboTrailingGroups.map((g) => g.id)).toEqual(["g-talheres"]);
    });
  });

  describe("Organização de Complementos do Pedido e Recibo", () => {
    it("limpa sufixo (Nx), consolida duplicados preservando faixa gratuita/paga e move talheres para o final", () => {
      const organized = AddonOrganizationService.organizeOrderAddons([
        { id: "cut-1", name: "Quero colher descartável", groupName: "Talheres / Descartáveis", price: 0.98, quantity: 1 },
        { id: "add-ban", name: "Banana (2x)", groupName: "Copo 400ml #1 • Frutas", price: 0, quantity: 1 },
        { id: "add-ban", name: "Banana", groupName: "Copo 400ml #1 • Frutas", price: 0, quantity: 1 },
        { id: "add-ban", name: "Banana", groupName: "Copo 400ml #1 • Frutas", price: 1.5, quantity: 1 },
      ]);

      expect(organized.sections.map((s) => s.groupName)).toEqual([
        "Copo 400ml #1 • Frutas",
        "Talheres / Descartáveis",
      ]);
      expect(organized.sections[0].items).toEqual([
        { id: "add-ban", name: "Banana", groupName: "Copo 400ml #1 • Frutas", price: 0, quantity: 2 },
        { id: "add-ban", name: "Banana", groupName: "Copo 400ml #1 • Frutas", price: 1.5, quantity: 1 },
      ]);
      expect(organized.flatSorted[organized.flatSorted.length - 1].name).toBe("Quero colher descartável");
    });
  });

  describe("Auditoria do Catálogo no Painel Operacional", () => {
    it("detecta grupos duplicados, itens repetidos, quantidade bloqueada, ordem de talheres e combo legado redundante", () => {
      const issues = AddonOrganizationService.auditAddonCatalog(
        [
          {
            id: "g1",
            name: "Talheres / Descartáveis",
            sortOrder: 1,
            productsCount: 2,
            items: [{ name: "Colher" }],
          },
          {
            id: "g2",
            name: "Cremes",
            sortOrder: 5,
            productsCount: 1,
            items: [{ name: "Nutella" }, { name: "nutella" }],
          },
          {
            id: "g3",
            name: "Cremes",
            sortOrder: 6,
            productsCount: 0,
            items: [{ name: "Pistache" }],
          },
          {
            id: "g4",
            name: "Colheres Combo",
            sortOrder: 99,
            maxQuantity: 3,
            allowItemQuantity: false,
            productsCount: 1,
            items: [{ name: "Colher" }],
          },
        ],
        [
          {
            id: "combo-1",
            name: "Combo Casal",
            isCombo: true,
            comboItems: [{ productId: "copo-1", quantity: 2 }],
            addonGroups: [
              { groupId: "g1", sortOrder: 0, group: { id: "g1", name: "Talheres / Descartáveis" } },
              { groupId: "g2", sortOrder: 1, group: { id: "g2", name: "Copo 1 (400ml) - Cremes" } },
            ],
          },
        ]
      );

      const codes = issues.map((i) => i.code);
      expect(codes).toContain("DUPLICATE_GROUP");
      expect(codes).toContain("DUPLICATE_ITEM");
      expect(codes).toContain("EMPTY_OR_ORPHAN_GROUP");
      expect(codes).toContain("CUTLERY_NOT_LAST");
      expect(codes).toContain("MISSING_ITEM_QUANTITY_SUPPORT");
      expect(codes).toContain("REDUNDANT_COMBO_GROUP");
    });
  });
});
