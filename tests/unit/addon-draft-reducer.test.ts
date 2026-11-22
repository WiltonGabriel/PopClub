import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cloneAddonDraftState,
  computeAddonDraftDiff,
  createInitialAddonDraft,
  deleteGroupInDraft,
  deleteItemInDraft,
  moveItemInDraft,
  reuseItemsIntoGroupInDraft,
  setProductAddonGroupsInDraft,
  syncSharedItemFieldsInDraft,
  toggleItemAvailabilityInDraft,
  toggleProductAddonGroupInDraft,
  upsertGroupInDraft,
  upsertItemInDraft,
} from "@/lib/addonDraftReducer";
import { persistAddonDraftDiff } from "@/services/addonDraftPersistenceService";
import { addonService, AddonGroup } from "@/services/addonService";
import { Product, productService } from "@/services/productService";

function makeBaseGroups(): AddonGroup[] {
  return [
    {
      id: "grp-frutas",
      name: "Frutas Frescas",
      description: "Escolha suas frutas",
      minQuantity: 0,
      maxQuantity: 3,
      freeQuantity: 2,
      isRequired: false,
      allowItemQuantity: false,
      sortOrder: 0,
      isActive: true,
      items: [
        {
          id: "item-morango",
          groupId: "grp-frutas",
          name: "Morango",
          price: 0,
          imageUrl: "/uploads/morango.webp",
          isAvailable: true,
          sortOrder: 0,
        },
        {
          id: "item-banana",
          groupId: "grp-frutas",
          name: "Banana",
          price: 1.5,
          imageUrl: null,
          isAvailable: true,
          sortOrder: 1,
        },
      ],
    },
    {
      id: "grp-caldas",
      name: "Caldas",
      description: null,
      minQuantity: 0,
      maxQuantity: 2,
      freeQuantity: 1,
      isRequired: false,
      allowItemQuantity: false,
      sortOrder: 1,
      isActive: true,
      items: [
        {
          id: "item-leite-cond",
          groupId: "grp-caldas",
          name: "Leite Condensado",
          price: 2.0,
          imageUrl: null,
          isAvailable: true,
          sortOrder: 0,
        },
      ],
    },
    {
      id: "grp-talheres",
      name: "Talheres e Descartáveis",
      description: null,
      minQuantity: 0,
      maxQuantity: 3,
      freeQuantity: 3,
      isRequired: false,
      allowItemQuantity: true,
      sortOrder: 99,
      isActive: true,
      items: [],
    },
  ];
}

function makeProducts(): Product[] {
  return [
    {
      id: "prod-copo-400",
      name: "Copo 400ml",
      description: "Açaí cremoso",
      price: 25,
      imageUrl: "/uploads/copo.webp",
      isCombo: false,
      addonGroupIds: ["grp-frutas", "grp-talheres"],
    },
    {
      id: "prod-combo-casal",
      name: "Combo Casal",
      description: "2 copos",
      price: 55,
      imageUrl: "/uploads/combo.webp",
      isCombo: true,
      addonGroupIds: ["grp-talheres"],
    },
  ];
}

describe("addonDraftReducer & persistAddonDraftDiff", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("inicializa rascunho apenas com vínculos de produtos base e detecta ausência de alterações", () => {
    const initial = createInitialAddonDraft(makeBaseGroups(), makeProducts());
    expect(Object.keys(initial.productLinks)).toEqual(["prod-copo-400"]);
    expect(initial.productLinks["prod-copo-400"]).toEqual(["grp-frutas", "grp-talheres"]);

    const cloned = cloneAddonDraftState(initial);
    const diff = computeAddonDraftDiff(initial, cloned);
    expect(diff.isDirty).toBe(false);
    expect(diff.totalChanges).toBe(0);
  });

  it("move complemento entre grupos e reordena dentro do mesmo grupo recalculando sortOrder", () => {
    const initial = createInitialAddonDraft(makeBaseGroups(), makeProducts());

    // Mover Banana (index 1 de grp-frutas) para index 0 de grp-caldas
    const movedBetween = moveItemInDraft(initial, "item-banana", "grp-caldas", 0);
    const caldasItems = movedBetween.groups.find((g) => g.id === "grp-caldas")!.items;
    const frutasItems = movedBetween.groups.find((g) => g.id === "grp-frutas")!.items;

    expect(frutasItems.map((i) => i.id)).toEqual(["item-morango"]);
    expect(caldasItems.map((i) => i.id)).toEqual(["item-banana", "item-leite-cond"]);
    expect(caldasItems.map((i) => i.sortOrder)).toEqual([0, 1]);
    expect(caldasItems[0]?.groupId).toBe("grp-caldas");

    // Reordenar dentro de grp-caldas (mover Leite Condensado para index 0)
    const reorderedSame = moveItemInDraft(movedBetween, "item-leite-cond", "grp-caldas", 0);
    const reorderedCaldas = reorderedSame.groups.find((g) => g.id === "grp-caldas")!.items;
    expect(reorderedCaldas.map((i) => i.id)).toEqual(["item-leite-cond", "item-banana"]);
    expect(reorderedCaldas.map((i) => i.sortOrder)).toEqual([0, 1]);

    // Drop no mesmo índice não altera estado
    const noOp = moveItemInDraft(reorderedSame, "item-leite-cond", "grp-caldas", 0);
    expect(noOp).toBe(reorderedSame);
  });

  it("permite criar, editar (incluindo mudança de grupo) e alternar disponibilidade no rascunho", () => {
    const initial = createInitialAddonDraft(makeBaseGroups(), makeProducts());

    const { state: s1, groupId: newGroupId } = upsertGroupInDraft(
      initial,
      {
        name: "Cremes Especiais",
        description: "Ninho e Nutella",
        minQuantity: 0,
        maxQuantity: 2,
        freeQuantity: 0,
        isRequired: false,
        allowItemQuantity: true,
      },
      null,
      "temp-group-cremes"
    );
    expect(newGroupId).toBe("temp-group-cremes");

    const { state: s2, itemId: newItemId } = upsertItemInDraft(
      s1,
      { name: "Creme Ninho", price: 4.5, imageUrl: "/uploads/addons/ninho.webp" },
      newGroupId,
      null,
      "temp-item-ninho"
    );
    expect(newItemId).toBe("temp-item-ninho");

    // Editar item existente mudando de grupo (Morango -> Cremes Especiais)
    const { state: s3 } = upsertItemInDraft(
      s2,
      { name: "Morango Selecionado", price: 2.0, imageUrl: "/uploads/morango.webp", isAvailable: true },
      newGroupId,
      "item-morango"
    );

    const s4 = toggleItemAvailabilityInDraft(s3, "item-leite-cond");
    const diff = computeAddonDraftDiff(initial, s4);

    expect(diff.groupsToCreate).toHaveLength(1);
    expect(diff.itemsToCreate).toHaveLength(1);
    expect(diff.itemsToUpdate.some((u) => u.id === "item-morango" && u.groupId === newGroupId)).toBe(true);
    expect(diff.itemsToUpdate.some((u) => u.id === "item-leite-cond" && !u.isAvailable)).toBe(true);
  });

  it("mantém talheres ao final ao vincular grupos em produtos base e limpa links ao excluir grupo", () => {
    const initial = createInitialAddonDraft(makeBaseGroups(), makeProducts());

    const withCaldas = toggleProductAddonGroupInDraft(initial, "prod-copo-400", "grp-caldas");
    expect(withCaldas.productLinks["prod-copo-400"]).toEqual([
      "grp-frutas",
      "grp-caldas",
      "grp-talheres",
    ]);

    const cleared = setProductAddonGroupsInDraft(withCaldas, "prod-copo-400", [
      "grp-talheres",
      "grp-caldas",
    ]);
    expect(cleared.productLinks["prod-copo-400"]).toEqual(["grp-caldas", "grp-talheres"]);

    const afterDelete = deleteGroupInDraft(cleared, "grp-caldas");
    expect(afterDelete.productLinks["prod-copo-400"]).toEqual(["grp-talheres"]);
    const diff = computeAddonDraftDiff(initial, afterDelete);
    expect(diff.groupsToDelete).toEqual(["grp-caldas"]);
    // Leite Condensado pertencia a grp-caldas excluído -> cascata no DB, não precisa delete separado
    expect(diff.itemsToDelete).toEqual([]);
  });

  it("retorna isDirty = false ao reverter um movimento ou edição de volta ao estado inicial", () => {
    const initial = createInitialAddonDraft(makeBaseGroups(), makeProducts());
    const paused = toggleItemAvailabilityInDraft(initial, "item-morango");
    expect(computeAddonDraftDiff(initial, paused).isDirty).toBe(true);

    const unpaused = toggleItemAvailabilityInDraft(paused, "item-morango");
    expect(computeAddonDraftDiff(initial, unpaused).isDirty).toBe(false);
  });

  it("persistAddonDraftDiff executa na ordem segura e resolve IDs temporários para itens e vínculos", async () => {
    const initial = createInitialAddonDraft(makeBaseGroups(), makeProducts());

    const { state: s1, groupId: tempGid } = upsertGroupInDraft(
      initial,
      {
        name: "Novo Grupo",
        minQuantity: 0,
        maxQuantity: 1,
        freeQuantity: 0,
        isRequired: false,
      },
      null,
      "temp-group-new"
    );

    const { state: s2 } = upsertItemInDraft(
      s1,
      { name: "Item Novo", price: 3 },
      tempGid,
      null,
      "temp-item-new"
    );

    // Move item existente para o grupo novo e vincula grupo novo no produto base
    const s3 = moveItemInDraft(s2, "item-morango", tempGid);
    const s4 = deleteItemInDraft(s3, "item-banana");
    const s5 = toggleProductAddonGroupInDraft(s4, "prod-copo-400", tempGid);

    const diff = computeAddonDraftDiff(initial, s5);

    const callOrder: string[] = [];
    vi.spyOn(addonService, "createGroup").mockImplementation(async (input) => {
      callOrder.push("createGroup");
      return {
        id: "real-group-uuid",
        name: input.name,
        minQuantity: input.minQuantity ?? 0,
        maxQuantity: input.maxQuantity ?? 1,
        freeQuantity: input.freeQuantity ?? 0,
        isRequired: Boolean(input.isRequired),
        sortOrder: input.sortOrder ?? 0,
        isActive: true,
        items: [],
      };
    });
    const createItemSpy = vi.spyOn(addonService, "createItem").mockImplementation(async (input) => {
      callOrder.push("createItem");
      return {
        id: "real-item-uuid",
        groupId: input.groupId,
        name: input.name,
        price: input.price,
        imageUrl: input.imageUrl ?? null,
        isAvailable: true,
        sortOrder: input.sortOrder ?? 0,
      };
    });
    const updateItemSpy = vi.spyOn(addonService, "updateItem").mockImplementation(async (id, input) => {
      callOrder.push("updateItem");
      return {
        id,
        groupId: input.groupId || "",
        name: input.name || "",
        price: input.price ?? 0,
        imageUrl: input.imageUrl ?? null,
        isAvailable: input.isAvailable ?? true,
        sortOrder: input.sortOrder ?? 0,
      };
    });
    const deleteItemSpy = vi.spyOn(addonService, "deleteItem").mockImplementation(async () => {
      callOrder.push("deleteItem");
    });
    const updateProductSpy = vi.spyOn(productService, "updateProduct").mockImplementation(async (id) => {
      callOrder.push("updateProduct");
      return {
        id,
        name: "Copo 400ml",
        description: "",
        price: 25,
        imageUrl: "",
      };
    });

    const result = await persistAddonDraftDiff(diff);

    expect(result.createdGroupIds[tempGid]).toBe("real-group-uuid");
    expect(callOrder[0]).toBe("createGroup");
    expect(callOrder[callOrder.length - 1]).toBe("updateProduct");

    expect(createItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "real-group-uuid",
        name: "Item Novo",
      })
    );
    expect(updateItemSpy).toHaveBeenCalledWith(
      "item-morango",
      expect.objectContaining({
        groupId: "real-group-uuid",
      })
    );
    expect(deleteItemSpy).toHaveBeenCalledWith("item-banana");
    expect(updateProductSpy).toHaveBeenCalledWith("prod-copo-400", {
      addonGroupIds: expect.arrayContaining(["grp-frutas", "real-group-uuid", "grp-talheres"]),
    });
  });

  it("reuseItemsIntoGroupInDraft compartilha catalogKey e foto sem apagar duplicados antigos e permite preço próprio", () => {
    const baseGroups = makeBaseGroups();
    // Grupo caldas já possui um item duplicado antigo sem catalogKey ("Morango Antigo") e receberá Banana reutilizada
    baseGroups[1].items.push({
      id: "item-morango-duplicado-antigo",
      groupId: "grp-caldas",
      name: "Morango Especial",
      price: 5.0,
      imageUrl: "/uploads/addons/antigo.webp",
      isAvailable: true,
      sortOrder: 1,
    });

    const initial = createInitialAddonDraft(baseGroups, makeProducts());
    const { state: afterReuse, createdItemIds } = reuseItemsIntoGroupInDraft(
      initial,
      "grp-caldas",
      [
        { sourceItemId: "item-morango", price: 3.5 },
        { sourceItemId: "item-leite-cond", price: 9.0 }, // já está em grp-caldas -> ignorado
      ]
    );

    expect(createdItemIds).toHaveLength(1);
    const caldasGroup = afterReuse.groups.find((g) => g.id === "grp-caldas")!;
    const frutasGroup = afterReuse.groups.find((g) => g.id === "grp-frutas")!;

    const origMorango = frutasGroup.items.find((i) => i.id === "item-morango")!;
    const reusedMorango = caldasGroup.items.find((i) => i.id === createdItemIds[0])!;
    const untouchedOldDup = caldasGroup.items.find(
      (i) => i.id === "item-morango-duplicado-antigo"
    );

    expect(untouchedOldDup).toBeDefined();
    expect(untouchedOldDup?.catalogKey).toBeNull();
    expect(origMorango.catalogKey).toBeTruthy();
    expect(reusedMorango.catalogKey).toBe(origMorango.catalogKey);
    expect(reusedMorango.imageUrl).toBe("/uploads/morango.webp");
    expect(reusedMorango.price).toBe(3.5);
    expect(origMorango.price).toBe(0);

    const diff = computeAddonDraftDiff(initial, afterReuse);
    expect(diff.itemsToUpdate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "item-morango",
          catalogKey: origMorango.catalogKey,
        }),
      ])
    );
    expect(diff.itemsToCreate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tempId: createdItemIds[0],
          input: expect.objectContaining({
            groupId: "grp-caldas",
            catalogKey: origMorango.catalogKey,
            price: 3.5,
          }),
        }),
      ])
    );

    // Sincronização opt-in atualiza foto e disponibilidade nos vinculados mantendo preços independentes
    const synced = syncSharedItemFieldsInDraft(
      afterReuse,
      origMorango.catalogKey!,
      { imageUrl: "/uploads/addons/morango-novo.webp", isAvailable: false },
      origMorango.id
    );
    const syncedTarget = synced.groups
      .find((g) => g.id === "grp-caldas")!
      .items.find((i) => i.id === createdItemIds[0])!;
    expect(syncedTarget.imageUrl).toBe("/uploads/addons/morango-novo.webp");
    expect(syncedTarget.isAvailable).toBe(false);
    expect(syncedTarget.price).toBe(3.5);
  });
});
