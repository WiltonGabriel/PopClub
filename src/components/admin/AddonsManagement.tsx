"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  IceCream,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Layers,
  Utensils,
  Power,
  X,
  Upload,
  Package,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  GripVertical,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  addonService,
  AddonGroup,
  AddonItem,
  CreateAddonGroupInput,
} from "@/services/addonService";
import { Product, productService } from "@/services/productService";
import {
  AddonAuditIssue,
  AddonOrganizationService,
} from "@/domain/services/AddonOrganizationService";
import {
  AddonDraftState,
  cloneAddonDraftState,
  computeAddonDraftDiff,
  createInitialAddonDraft,
  deleteGroupInDraft,
  deleteItemInDraft,
  extractProductAddonGroupIds,
  moveItemInDraft,
  setProductAddonGroupsInDraft,
  toggleItemAvailabilityInDraft,
  toggleProductAddonGroupInDraft,
  upsertGroupInDraft,
  upsertItemInDraft,
} from "@/lib/addonDraftReducer";
import { persistAddonDraftDiff } from "@/services/addonDraftPersistenceService";
import { Button } from "@/components/ui/button";
import { formatCurrency, parseSafeNumber } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/ToastNotification";
import { ImageCropperDialog } from "./ImageCropperDialog";
import {
  AddonAuditReviewModal,
  isFixableAddonAuditIssue,
} from "./addons/AddonAuditReviewModal";
import { ProductAddonLinksTab } from "./addons/ProductAddonLinksTab";

const DRAG_ITEM_MIME = "application/x-popshake-addon-item";

const EMPTY_DRAFT: AddonDraftState = {
  groups: [],
  productLinks: {},
};

export function AddonsManagement() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"addons" | "products">("addons");
  const [products, setProducts] = useState<Product[]>([]);
  const [initialDraft, setInitialDraft] = useState<AddonDraftState>(EMPTY_DRAFT);
  const [draft, setDraft] = useState<AddonDraftState>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auditoria
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [fixingAudit, setFixingAudit] = useState(false);

  // Drag-and-drop de complementos
  const [draggingItem, setDraggingItem] = useState<{ id: string; groupId: string } | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Modais de Grupo e Opção
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [groupForm, setGroupForm] = useState<CreateAddonGroupInput>({
    name: "",
    description: "",
    minQuantity: 0,
    maxQuantity: 1,
    freeQuantity: 0,
    isRequired: false,
    allowItemQuantity: false,
    isActive: true,
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<AddonItem | null>(null);
  const [itemForm, setItemForm] = useState<{
    name: string;
    price: string;
    imageUrl: string;
  }>({
    name: "",
    price: "0.00",
    imageUrl: "",
  });

  // Recorte + Upload WebP de miniatura
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const revokeCropperSrc = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cropperSrc) {
        URL.revokeObjectURL(cropperSrc);
      }
    };
  }, [cropperSrc]);

  const draftDiff = useMemo(
    () => computeAddonDraftDiff(initialDraft, draft),
    [initialDraft, draft]
  );

  const baseProductsCount = useMemo(
    () => products.filter((p) => !p.isCombo).length,
    [products]
  );

  const auditIssues = useMemo(
    () => AddonOrganizationService.auditAddonCatalog(draft.groups, products),
    [draft.groups, products]
  );

  const fixableAuditIssuesCount = useMemo(
    () => auditIssues.filter(isFixableAddonAuditIssue).length,
    [auditIssues]
  );

  useEffect(() => {
    if (!draftDiff.isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftDiff.isDirty]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsData, productsData] = await Promise.all([
        addonService.getGroups(),
        productService.getProducts().catch(() => [] as Product[]),
      ]);
      const sortedGroups = AddonOrganizationService.sortAddonGroups(groupsData);
      const nextInitial = createInitialAddonDraft(sortedGroups, productsData);
      setProducts(productsData);
      setInitialDraft(nextInitial);
      setDraft(cloneAddonDraftState(nextInitial));

      setExpandedGroups((prev) => {
        const nextExpanded: Record<string, boolean> = {};
        sortedGroups.forEach((g) => {
          nextExpanded[g.id] = prev[g.id] ?? true;
        });
        return nextExpanded;
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Carregar",
        message:
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os grupos de complementos.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const getGroupLinkedProductsCount = useCallback(
    (groupId: string): number => {
      let count = 0;
      for (const ids of Object.values(draft.productLinks)) {
        if (ids.includes(groupId)) count += 1;
      }
      for (const p of products) {
        if (p.isCombo && extractProductAddonGroupIds(p).includes(groupId)) {
          count += 1;
        }
      }
      return count;
    },
    [draft.productLinks, products]
  );

  const handleSaveAllDraft = async () => {
    if (!draftDiff.isDirty || savingAll) return;
    setSavingAll(true);
    try {
      const result = await persistAddonDraftDiff(draftDiff);
      await loadGroups();
      showToast({
        type: "success",
        title: "Alterações Publicadas",
        message: `${result.appliedOperations} alteração(ões) em complementos e vínculos salva(s) com sucesso.`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Salvar Tudo",
        message:
          err instanceof Error
            ? err.message
            : "Algumas alterações não puderam ser salvas. Tente novamente.",
      });
    } finally {
      setSavingAll(false);
    }
  };

  const handleDiscardDraft = () => {
    if (!draftDiff.isDirty || savingAll) return;
    setDraft(cloneAddonDraftState(initialDraft));
    showToast({
      type: "info",
      title: "Alterações Descartadas",
      message: "Os grupos, complementos e vínculos voltaram ao último estado salvo.",
    });
  };

  const handleApplySelectedAuditIssues = async (selectedIssues: AddonAuditIssue[]) => {
    setFixingAudit(true);
    try {
      let fixedCount = 0;
      const groupsById = new Map(
        initialDraft.groups.map((g) => [g.id, { name: g.name, sortOrder: g.sortOrder }])
      );

      for (const issue of selectedIssues) {
        if (issue.code === "CUTLERY_NOT_LAST" && issue.groupId) {
          await addonService.updateGroup(issue.groupId, { sortOrder: 99 });
          fixedCount += 1;
        } else if (issue.code === "MISSING_ITEM_QUANTITY_SUPPORT" && issue.groupId) {
          await addonService.updateGroup(issue.groupId, { allowItemQuantity: true });
          fixedCount += 1;
        } else if (issue.code === "CUTLERY_NOT_LAST" && issue.productId) {
          const prod = products.find((p) => p.id === issue.productId);
          const currentIds = prod ? extractProductAddonGroupIds(prod) : [];
          if (currentIds.length > 0) {
            const orderedIds = AddonOrganizationService.sortAddonGroupIds(currentIds, groupsById);
            await productService.updateProduct(issue.productId, { addonGroupIds: orderedIds });
            fixedCount += 1;
          }
        } else if (issue.code === "REDUNDANT_COMBO_GROUP" && issue.productId) {
          const combo = products.find((p) => p.id === issue.productId);
          if (combo) {
            const cleanedIds = extractProductAddonGroupIds(combo).filter((gid) => {
              const g = initialDraft.groups.find((grp) => grp.id === gid);
              if (!g) return false;
              if (AddonOrganizationService.isCutleryGroupName(g.name)) return true;
              return !/^(?:copo|marmita|milk\s*shake|shake|garrafa|pote|roleta)\s*(?:\d+\s*)?(?:\([^)]+\))?\s*[-•:]/i.test(
                g.name
              );
            });
            await productService.updateProduct(combo.id, {
              addonGroupIds: AddonOrganizationService.sortAddonGroupIds(cleanedIds, groupsById),
            });
            fixedCount += 1;
          }
        }
      }

      setIsAuditModalOpen(false);
      await loadGroups();
      showToast({
        type: "success",
        title: "Correções Aplicadas",
        message:
          fixedCount > 0
            ? `${fixedCount} ajuste(s) selecionado(s) aplicado(s) com segurança.`
            : "Nenhuma alteração foi necessária.",
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Corrigir",
        message: err instanceof Error ? err.message : "Falha ao aplicar correções selecionadas.",
      });
    } finally {
      setFixingAudit(false);
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Abrir Modal de Grupo
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      name: "",
      description: "",
      minQuantity: 0,
      maxQuantity: 1,
      freeQuantity: 0,
      isRequired: false,
      allowItemQuantity: false,
      isActive: true,
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: AddonGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || "",
      minQuantity: group.minQuantity,
      maxQuantity: group.maxQuantity,
      freeQuantity: group.freeQuantity,
      isRequired: group.isRequired,
      allowItemQuantity: Boolean(group.allowItemQuantity),
      isActive: group.isActive,
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      showToast({
        type: "error",
        title: "Nome obrigatório",
        message: "Informe o nome do grupo.",
      });
      return;
    }

    const { state: nextDraft, groupId } = upsertGroupInDraft(
      draft,
      {
        name: groupForm.name,
        description: groupForm.description,
        minQuantity: groupForm.minQuantity ?? 0,
        maxQuantity: groupForm.maxQuantity ?? 1,
        freeQuantity: groupForm.freeQuantity ?? 0,
        isRequired: Boolean(groupForm.isRequired),
        allowItemQuantity: Boolean(groupForm.allowItemQuantity),
        isActive: groupForm.isActive,
      },
      editingGroup?.id
    );

    setDraft(nextDraft);
    if (!editingGroup) {
      setExpandedGroups((prev) => ({ ...prev, [groupId]: true }));
    }
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (group: AddonGroup) => {
    if (!confirm(`Deseja remover o grupo "${group.name}" e todas as suas opções no rascunho?`)) {
      return;
    }
    setDraft((prev) => deleteGroupInDraft(prev, group.id));
  };

  // Abrir Modal de Item
  const handleOpenCreateItem = (groupId: string) => {
    setTargetGroupId(groupId);
    setEditingItem(null);
    setItemForm({
      name: "",
      price: "0.00",
      imageUrl: "",
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: AddonItem) => {
    setTargetGroupId(item.groupId);
    setEditingItem(item);
    setItemForm({
      name: item.name,
      price: parseSafeNumber(item.price).toFixed(2),
      imageUrl: item.imageUrl || "",
    });
    setIsItemModalOpen(true);
  };

  // Abre ImageCropperDialog antes de enviar miniatura para conversão automática WebP
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    revokeCropperSrc(cropperSrc);
    const objectUrl = URL.createObjectURL(file);
    setCropperSrc(objectUrl);
  };

  const handleCropCancel = () => {
    revokeCropperSrc(cropperSrc);
    setCropperSrc(null);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    revokeCropperSrc(cropperSrc);
    setCropperSrc(null);
    setUploadingImage(true);
    try {
      // Não envia oldImageUrl para não apagar a foto publicada antes do "Salvar Tudo"
      const url = await addonService.uploadThumb(croppedFile);
      setItemForm((prev) => ({ ...prev, imageUrl: url }));
      showToast({
        type: "success",
        title: "Miniatura Otimizada (WebP)",
        message: "Imagem recortada e convertida para WebP 160x160 px. Salve no topo ao concluir.",
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro no Upload",
        message: err instanceof Error ? err.message : "Falha ao enviar miniatura.",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showToast({
        type: "error",
        title: "Nome obrigatório",
        message: "Informe o nome do adicional.",
      });
      return;
    }

    const priceNum = Math.max(0, parseFloat(itemForm.price.replace(",", ".")) || 0);

    const { state: nextDraft } = upsertItemInDraft(
      draft,
      {
        name: itemForm.name.trim(),
        price: priceNum,
        imageUrl: itemForm.imageUrl || null,
        isAvailable: editingItem ? editingItem.isAvailable : true,
      },
      targetGroupId,
      editingItem?.id
    );

    setDraft(nextDraft);
    setExpandedGroups((prev) => ({ ...prev, [targetGroupId]: true }));
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (item: AddonItem) => {
    if (!confirm(`Deseja remover a opção "${item.name}" do rascunho?`)) return;
    setDraft((prev) => deleteItemInDraft(prev, item.id));
  };

  const handleToggleKitchenAvailability = (item: AddonItem) => {
    setDraft((prev) => toggleItemAvailabilityInDraft(prev, item.id));
  };

  // Drag-and-drop entre grupos e dentro do mesmo grupo
  const handleItemDragStart = (e: React.DragEvent, item: AddonItem) => {
    setDraggingItem({ id: item.id, groupId: item.groupId });
    e.dataTransfer.setData(DRAG_ITEM_MIME, item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragEnd = () => {
    setDraggingItem(null);
    setDragOverGroupId(null);
    setDragOverItemId(null);
  };

  const handleDropOnItem = (e: React.DragEvent, targetGroup: AddonGroup, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData(DRAG_ITEM_MIME) || draggingItem?.id;
    setDragOverGroupId(null);
    setDragOverItemId(null);
    setDraggingItem(null);

    if (!draggedId || draggedId === targetGroup.items[targetIndex]?.id) return;
    setDraft((prev) => moveItemInDraft(prev, draggedId, targetGroup.id, targetIndex));
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroupIdDrop: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData(DRAG_ITEM_MIME) || draggingItem?.id;
    setDragOverGroupId(null);
    setDragOverItemId(null);
    setDraggingItem(null);

    if (!draggedId) return;
    setDraft((prev) => moveItemInDraft(prev, draggedId, targetGroupIdDrop));
    setExpandedGroups((prev) => ({ ...prev, [targetGroupIdDrop]: true }));
  };

  return (
    <section className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-150">
      {/* Barra fixa no topo para salvar todas as alterações do rascunho */}
      {draftDiff.isDirty && (
        <div
          role="region"
          aria-label="Alterações não salvas em complementos"
          className="sticky top-3 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 rounded-2xl bg-amber-50/95 dark:bg-[#2A152C]/95 backdrop-blur-md border-2 border-primary/50 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                Você tem {draftDiff.totalChanges}{" "}
                {draftDiff.totalChanges === 1
                  ? "alteração não salva"
                  : "alterações não salvas"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Reorganizações, novos itens, edições e vínculos só vão ao ar ao clicar em &quot;Salvar Tudo&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingAll}
              onClick={handleDiscardDraft}
              className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white/80 dark:bg-zinc-900/70"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={handleSaveAllDraft}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white text-xs font-bold gap-1.5 shadow-md shadow-primary/25 cursor-pointer"
            >
              {savingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando Tudo...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar Tudo
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Seletor de Sub-Abas Internas de Complementos */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl w-fit border border-border/40 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab("addons")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "addons"
              ? "bg-white dark:bg-[#181D2D] text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IceCream className="w-4 h-4" />
          <span>🍨 Grupos de Complementos</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
            {draft.groups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("products")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "products"
              ? "bg-white dark:bg-[#181D2D] text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>📦 Produtos Base & Vínculos</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
            {baseProductsCount}
          </span>
        </button>
      </div>

      {activeSubTab === "products" ? (
        <ProductAddonLinksTab
          products={products}
          groups={draft.groups}
          productLinks={draft.productLinks}
          onToggleGroup={(productId, groupId) =>
            setDraft((prev) => toggleProductAddonGroupInDraft(prev, productId, groupId))
          }
          onSetProductGroups={(productId, groupIds) =>
            setDraft((prev) => setProductAddonGroupsInDraft(prev, productId, groupIds))
          }
        />
      ) : (
        <>
          {/* Cabeçalho da Seção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center font-bold">
                  <IceCream className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Grupos de Complementos & Adicionais
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Arraste complementos entre grupos para mover ou reordenar e clique em &quot;Salvar Tudo&quot; no topo para publicar.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleOpenCreateGroup}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Novo Grupo de Complementos
              </Button>
            </div>
          </div>

          {/* Painel de Auditoria Automática de Complementos */}
          {!loading &&
            draft.groups.length > 0 &&
            (auditIssues.length > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                        Auditoria de Complementos: {auditIssues.length} ponto(s) identificado(s)
                      </h4>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                        Apenas sugestões estruturais — seus grupos e itens personalizados nunca são excluídos automaticamente.
                      </p>
                    </div>
                  </div>
                  {fixableAuditIssuesCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={fixingAudit}
                      onClick={() => setIsAuditModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5 mr-1.5" />
                      Revisar Correções ({fixableAuditIssuesCount})
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {auditIssues.slice(0, 6).map((issue, idx) => (
                    <div
                      key={`${issue.code}-${idx}`}
                      className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-amber-200/70 dark:border-amber-800/30 text-[11px]"
                    >
                      <p className="font-bold text-amber-950 dark:text-amber-200">{issue.title}</p>
                      <p className="text-amber-800/85 dark:text-amber-300/80 mt-0.5 leading-snug">
                        {issue.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/30 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Auditoria aprovada: grupos sem duplicidades, combos limpos e descartáveis ao final.
                </span>
              </div>
            ))}

          {/* Lista de Grupos (Acordeões + Dropzones) */}
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">Carregando grupos de complementos...</p>
            </div>
          ) : draft.groups.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Nenhum grupo cadastrado ainda
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Crie seu primeiro grupo (ex: &quot;Escolha suas Frutas&quot;, &quot;Turbine seu Copo&quot;) para que os clientes personalizem os açaís e sorvetes.
              </p>
              <Button
                type="button"
                onClick={handleOpenCreateGroup}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 h-9 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar Primeiro Grupo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {draft.groups.map((group) => {
                const isExpanded = expandedGroups[group.id] ?? true;
                const linkedCount = getGroupLinkedProductsCount(group.id);
                const isGroupDropHighlight =
                  dragOverGroupId === group.id && draggingItem !== null;

                return (
                  <div
                    key={group.id}
                    onDragOver={(e) => {
                      if (draggingItem || e.dataTransfer.types.includes(DRAG_ITEM_MIME)) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverGroupId(group.id);
                        if (!isExpanded) {
                          setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
                        }
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        if (dragOverGroupId === group.id) {
                          setDragOverGroupId(null);
                        }
                      }
                    }}
                    onDrop={(e) => handleDropOnGroup(e, group.id)}
                    className={`border rounded-2xl overflow-hidden transition-all shadow-2xs ${
                      isGroupDropHighlight
                        ? "border-primary ring-2 ring-primary/35 bg-primary/5"
                        : "border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40"
                    }`}
                  >
                    {/* Cabeçalho do Card Acordeão */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#181D2D] border-b border-zinc-200/60 dark:border-zinc-800">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(group.id)}
                          className="p-1.5 mt-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title={isExpanded ? "Recolher grupo" : "Expandir grupo"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                              {group.name}
                            </h4>

                            {group.isRequired ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Obrigatório
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                                Opcional
                              </span>
                            )}

                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-violet-400 border border-primary/20">
                              Mín: {group.minQuantity} • Máx: {group.maxQuantity}
                            </span>

                            {group.freeQuantity > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Até {group.freeQuantity} grátis
                              </span>
                            )}

                            {group.allowItemQuantity && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Qtd múltipla (+/-)
                              </span>
                            )}

                            <span className="text-[10px] font-medium text-muted-foreground bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
                              {linkedCount} produto(s) vinculado(s)
                            </span>
                          </div>

                          {group.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ações do Grupo */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCreateItem(group.id)}
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1 text-primary" />
                          Nova Opção
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditGroup(group)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Editar Grupo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGroup(group)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Excluir Grupo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Conteúdo Expansível: Lista de Adicionais do Grupo */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-3">
                        {group.items.length === 0 ? (
                          <div
                            className={`p-6 text-center border border-dashed rounded-xl transition-colors ${
                              isGroupDropHighlight
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-border/60 bg-white/50 dark:bg-zinc-900/30"
                            }`}
                          >
                            <p className="text-xs text-muted-foreground">
                              {isGroupDropHighlight
                                ? "Solte aqui para mover o complemento para este grupo."
                                : "Nenhuma opção adicionada neste grupo."}
                            </p>
                            {!isGroupDropHighlight && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCreateItem(group.id)}
                                className="mt-2 h-8 text-xs rounded-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Adicionar Opção
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.items.map((item, itemIdx) => {
                              const isDraggingThis = draggingItem?.id === item.id;
                              const isDropOverThis =
                                dragOverItemId === item.id && draggingItem?.id !== item.id;

                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(e) => handleItemDragStart(e, item)}
                                  onDragEnd={handleItemDragEnd}
                                  onDragOver={(e) => {
                                    if (
                                      draggingItem ||
                                      e.dataTransfer.types.includes(DRAG_ITEM_MIME)
                                    ) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = "move";
                                      setDragOverGroupId(group.id);
                                      setDragOverItemId(item.id);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverItemId === item.id) {
                                      setDragOverItemId(null);
                                    }
                                  }}
                                  onDrop={(e) => handleDropOnItem(e, group, itemIdx)}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                    isDraggingThis
                                      ? "opacity-45 scale-[0.98] border-primary/50"
                                      : isDropOverThis
                                      ? "ring-2 ring-primary border-primary bg-primary/5"
                                      : item.isAvailable
                                      ? "bg-white dark:bg-[#181D2D] border-zinc-200/80 dark:border-zinc-800 shadow-2xs"
                                      : "bg-zinc-100/70 dark:bg-zinc-800/40 border-dashed border-zinc-300 dark:border-zinc-700/80 opacity-70"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className="text-muted-foreground/60 hover:text-primary cursor-grab active:cursor-grabbing shrink-0"
                                      title="Arraste para reordenar ou mover para outro grupo"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </span>

                                    {/* Miniatura 160x160 WebP (fundo escuro limpo quando sem imagem) */}
                                    <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-[#0D1017] border border-zinc-800/80 shrink-0 overflow-hidden flex items-center justify-center">
                                      {item.imageUrl ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                          key={item.imageUrl}
                                          src={item.imageUrl}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : null}
                                    </div>

                                    <div className="min-w-0">
                                      <h5 className="font-heading font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                        {item.name}
                                      </h5>
                                      <p className="text-[11px] font-semibold text-primary dark:text-violet-400">
                                        {parseSafeNumber(item.price) === 0
                                          ? "Grátis / Incluso"
                                          : `+ ${formatCurrency(item.price)}`}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Ações e Switch "Pausar na Cozinha" */}
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleKitchenAvailability(item)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                                        item.isAvailable
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                                      }`}
                                      title={
                                        item.isAvailable
                                          ? "Clique para pausar na cozinha"
                                          : "Clique para reativar"
                                      }
                                    >
                                      <Power className="w-3 h-3" />
                                      <span>{item.isAvailable ? "Ativo" : "Pausado"}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditItem(item)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                      title="Editar"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL: Criar / Editar Grupo de Complementos */}
      {isGroupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                {editingGroup ? "Editar Grupo de Complementos" : "Novo Grupo de Complementos"}
              </h4>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Nome do Grupo (ex: Escolha suas Frutas, Caldas Extras)
                </Label>
                <Input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Frutas Frescas"
                  className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Descrição / Instrução ao Cliente (Opcional)
                </Label>
                <Input
                  value={groupForm.description || ""}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Ex: Escolha até 3 opções para o seu copo"
                  className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qtd Mínima</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={groupForm.minQuantity ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setGroupForm((p) => ({
                        ...p,
                        minQuantity: val,
                        isRequired: val >= 1 ? true : p.isRequired,
                      }));
                    }}
                    className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    &ge; 1 torna obrigatório
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qtd Máxima</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={groupForm.maxQuantity ?? 1}
                    onChange={(e) =>
                      setGroupForm((p) => ({
                        ...p,
                        maxQuantity: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Limite total de escolhas
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qtd Inclusa (Grátis)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={groupForm.freeQuantity ?? 0}
                    onChange={(e) =>
                      setGroupForm((p) => ({
                        ...p,
                        freeQuantity: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  />
                  <span className="text-[10px] text-muted-foreground">Itens sem custo extra</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Grupo Obrigatório?
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    O cliente não poderá adicionar ao carrinho sem selecionar o mínimo.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={groupForm.isRequired}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, isRequired: e.target.checked }))
                  }
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div className="pr-3">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Permitir escolher mais de 1 unidade do mesmo item
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Permite ao cliente clicar em &apos;+&apos; e &apos;-&apos; para pedir, por exemplo, 2x Banana ou 3x Colheres.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(groupForm.allowItemQuantity)}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, allowItemQuantity: e.target.checked }))
                  }
                  className="w-5 h-5 accent-primary rounded cursor-pointer shrink-0"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="rounded-xl h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
                >
                  {editingGroup ? "Aplicar Alterações" : "Adicionar Grupo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Opção de Adicional */}
      {isItemModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsItemModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                {editingItem ? "Editar Opção de Adicional" : "Nova Opção de Adicional"}
              </h4>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Miniatura 160x160 WebP com Editor de Recorte + Upload Automático */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Miniatura do Ingrediente (160x160 WebP)
                </Label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-900 dark:bg-[#0D1017] border-2 border-zinc-800 overflow-hidden relative flex items-center justify-center shrink-0">
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : itemForm.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={itemForm.imageUrl}
                        src={itemForm.imageUrl}
                        alt="Miniatura"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex-1 rounded-xl text-xs h-9 font-semibold border-zinc-200 dark:border-zinc-700 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1 text-primary" />
                        {uploadingImage
                          ? "Processando..."
                          : itemForm.imageUrl
                          ? "Trocar & Recortar"
                          : "Enviar & Recortar"}
                      </Button>
                      {itemForm.imageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingImage}
                          onClick={() => setItemForm((prev) => ({ ...prev, imageUrl: "" }))}
                          title="Remover foto do complemento"
                          className="rounded-xl text-xs h-9 px-3 font-semibold border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Ao enviar, você recorta/gira a imagem e ela é convertida automaticamente para WebP leve. Sem foto, o fundo fica escuro.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grupo de destino (também permite mover em telas touch/mobile) */}
              <div className="space-y-1.5">
                <Label htmlFor="addon-item-group-select" className="text-xs font-semibold">
                  Grupo de Complementos
                </Label>
                <select
                  id="addon-item-group-select"
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                >
                  {draft.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome do Item */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Nome do Adicional (ex: Morango Picado, Nutella)
                </Label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Leite em Pó Ninho"
                  className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  maxLength={100}
                  required
                />
              </div>

              {/* Preço Unitário (R$) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Preço Unitário (R$)</Label>
                  <span className="text-[11px] text-muted-foreground">
                    0,00 para itens inclusos/grátis
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.price}
                    onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0.00"
                    className="pl-10 rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsItemModalOpen(false)}
                  className="rounded-xl h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingAll || uploadingImage}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
                >
                  {editingItem ? "Aplicar Opção" : "Adicionar ao Grupo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editor/Recorte de Imagem WebP */}
      <ImageCropperDialog
        open={Boolean(cropperSrc)}
        imageSrc={cropperSrc}
        aspectRatio={1}
        aspectLabel="1:1 (Miniatura 160x160 px)"
        maxDimension={512}
        onCropComplete={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      {/* Modal Transparente de Revisão de Auditoria */}
      <AddonAuditReviewModal
        open={isAuditModalOpen}
        issues={auditIssues}
        hasUnsavedDraft={draftDiff.isDirty}
        applying={fixingAudit}
        onClose={() => setIsAuditModalOpen(false)}
        onApplySelected={handleApplySelectedAuditIssues}
      />
    </section>
  );
}
