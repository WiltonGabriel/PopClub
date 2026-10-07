"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IceCream,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Layers,
  Utensils,
  Power,
  X,
  Upload,
  FolderTree,
} from "lucide-react";
import {
  addonService,
  AddonGroup,
  AddonItem,
  CreateAddonGroupInput,
} from "@/services/addonService";
import { Button } from "@/components/ui/button";
import { formatCurrency, parseSafeNumber } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/ToastNotification";
import { CategoryManagementSection } from "./CategoryManagementSection";

export function AddonsManagement() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"addons" | "categories">("addons");
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Modais
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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await addonService.getGroups();
      setGroups(data);
      // Auto-expande todos os grupos inicialmente
      const initialExpanded: Record<string, boolean> = {};
      data.forEach((g) => {
        initialExpanded[g.id] = true;
      });
      setExpandedGroups(initialExpanded);
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Carregar",
        message: err instanceof Error ? err.message : "Não foi possível carregar os grupos de complementos.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      showToast({ type: "error", title: "Nome obrigatório", message: "Informe o nome do grupo." });
      return;
    }

    setSavingGroup(true);
    try {
      if (editingGroup) {
        const updated = await addonService.updateGroup(editingGroup.id, groupForm);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? { ...updated, productsCount: g.productsCount } : g)));
        showToast({ type: "success", title: "Grupo Atualizado", message: `"${updated.name}" foi salvo com sucesso.` });
      } else {
        const created = await addonService.createGroup(groupForm);
        setGroups((prev) => [created, ...prev]);
        setExpandedGroups((prev) => ({ ...prev, [created.id]: true }));
        showToast({ type: "success", title: "Grupo Criado", message: `"${created.name}" foi adicionado com sucesso.` });
      }
      setIsGroupModalOpen(false);
    } catch (err: unknown) {
      showToast({ type: "error", title: "Erro ao Salvar", message: err instanceof Error ? err.message : "Falha ao gravar grupo." });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: AddonGroup) => {
    if (!confirm(`Deseja realmente excluir o grupo "${group.name}" e todas as suas opções?`)) {
      return;
    }

    try {
      await addonService.deleteGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      showToast({ type: "success", title: "Grupo Excluído", message: `"${group.name}" foi removido com sucesso.` });
    } catch (err: unknown) {
      showToast({ type: "error", title: "Erro ao Excluir", message: err instanceof Error ? err.message : "Falha ao excluir grupo." });
    }
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

  // Upload de Imagem 160x160 WebP
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadingImage(true);
    try {
      const url = await addonService.uploadThumb(file, itemForm.imageUrl);
      setItemForm((prev) => ({ ...prev, imageUrl: url }));
      showToast({ type: "success", title: "Miniatura Otimizada", message: "Imagem convertida em WebP 160x160 px com sucesso." });
    } catch (err: unknown) {
      showToast({ type: "error", title: "Erro no Upload", message: err instanceof Error ? err.message : "Falha ao enviar miniatura." });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showToast({ type: "error", title: "Nome obrigatório", message: "Informe o nome do adicional." });
      return;
    }

    const priceNum = Math.max(0, parseFloat(itemForm.price.replace(",", ".")) || 0);

    setSavingItem(true);
    try {
      if (editingItem) {
        const updated = await addonService.updateItem(editingItem.id, {
          name: itemForm.name.trim(),
          price: priceNum,
          imageUrl: itemForm.imageUrl || null,
        });

        setGroups((prev) =>
          prev.map((g) =>
            g.id === updated.groupId
              ? {
                  ...g,
                  items: g.items.map((i) => (i.id === updated.id ? updated : i)),
                }
              : g
          )
        );
        showToast({ type: "success", title: "Opção Atualizada", message: `"${updated.name}" foi salva com sucesso.` });
      } else {
        const created = await addonService.createItem({
          groupId: targetGroupId,
          name: itemForm.name.trim(),
          price: priceNum,
          imageUrl: itemForm.imageUrl || null,
        });

        setGroups((prev) =>
          prev.map((g) =>
            g.id === targetGroupId
              ? { ...g, items: [...g.items, created] }
              : g
          )
        );
        showToast({ type: "success", title: "Opção Adicionada", message: `"${created.name}" foi adicionada ao grupo.` });
      }
      setIsItemModalOpen(false);
    } catch (err: unknown) {
      showToast({ type: "error", title: "Erro ao Salvar", message: err instanceof Error ? err.message : "Falha ao gravar item." });
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (item: AddonItem) => {
    if (!confirm(`Deseja excluir a opção "${item.name}"?`)) return;

    try {
      await addonService.deleteItem(item.id);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === item.groupId
            ? { ...g, items: g.items.filter((i) => i.id !== item.id) }
            : g
        )
      );
      showToast({ type: "success", title: "Opção Excluída", message: `"${item.name}" foi removida.` });
    } catch (err: unknown) {
      showToast({ type: "error", title: "Erro ao Excluir", message: err instanceof Error ? err.message : "Falha ao remover item." });
    }
  };

  // Switch Instantâneo "Pausar na Cozinha"
  const handleToggleKitchenAvailability = async (item: AddonItem) => {
    const nextState = !item.isAvailable;

    // Atualização otimista imediata na UI
    setGroups((prev) =>
      prev.map((g) =>
        g.id === item.groupId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.id === item.id ? { ...i, isAvailable: nextState } : i
              ),
            }
          : g
      )
    );

    try {
      const res = await addonService.toggleItemAvailability(item.id, nextState);
      showToast({
        type: nextState ? "success" : "warning",
        title: nextState ? "Ativado no Cardápio" : "Pausado na Cozinha",
        message: res.message,
      });
    } catch (err: unknown) {
      // Reverte em caso de erro
      setGroups((prev) =>
        prev.map((g) =>
          g.id === item.groupId
            ? {
                ...g,
                items: g.items.map((i) =>
                  i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i
                ),
              }
            : g
        )
      );
      showToast({
        type: "error",
        title: "Erro ao Alterar",
        message: err instanceof Error ? err.message : "Não foi possível atualizar o status do adicional.",
      });
    }
  };

  return (
    <section className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-150">
      {/* Seletor de Sub-Abas Internas do Cardápio */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl w-fit border border-border/40">
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
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "categories"
              ? "bg-white dark:bg-[#181D2D] text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>🗂️ Categorias do Cardápio</span>
        </button>
      </div>

      {activeSubTab === "categories" ? (
        <CategoryManagementSection />
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
                Crie grupos globais de adicionais (ex: Frutas, Caldas, Ponto da Base) e vincule a múltiplos produtos com cotas grátis e controle de estoque.
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

      {/* Lista de Grupos (Acordeões) */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Carregando grupos de complementos...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Nenhum grupo cadastrado ainda</h4>
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
          {groups.map((group) => {
            const isExpanded = expandedGroups[group.id] ?? true;

            return (
              <div
                key={group.id}
                className="border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 rounded-2xl overflow-hidden transition-all shadow-2xs"
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
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                          {group.name}
                        </h4>

                        {/* Badges de Regras */}
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
                          {group.productsCount || 0} produto(s) vinculado(s)
                        </span>
                      </div>

                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
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
                      <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-white/50 dark:bg-zinc-900/30">
                        <p className="text-xs text-muted-foreground">Nenhuma opção adicionada neste grupo.</p>
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
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              item.isAvailable
                                ? "bg-white dark:bg-[#181D2D] border-zinc-200/80 dark:border-zinc-800 shadow-2xs"
                                : "bg-zinc-100/70 dark:bg-zinc-800/40 border-dashed border-zinc-300 dark:border-zinc-700/80 opacity-70"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Miniatura 160x160 WebP (exibida em 44x44 na lista) */}
                              <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-border/50 shrink-0 overflow-hidden flex items-center justify-center">
                                {item.imageUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Utensils className="w-4 h-4 text-muted-foreground/60" />
                                )}
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
                              {/* Switch Instantâneo de Cozinha */}
                              <button
                                type="button"
                                onClick={() => handleToggleKitchenAvailability(item)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                                  item.isAvailable
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                                }`}
                                title={item.isAvailable ? "Clique para pausar na cozinha" : "Clique para reativar"}
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
                        ))}
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
                <Label className="text-xs font-semibold">Nome do Grupo (ex: Escolha suas Frutas, Caldas Extras)</Label>
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
                <Label className="text-xs font-semibold">Descrição / Instrução ao Cliente (Opcional)</Label>
                <Input
                  value={groupForm.description || ""}
                  onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
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
                  <span className="text-[10px] text-muted-foreground">&ge; 1 torna obrigatório</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qtd Máxima</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={groupForm.maxQuantity ?? 1}
                    onChange={(e) => setGroupForm((p) => ({ ...p, maxQuantity: parseInt(e.target.value, 10) || 1 }))}
                    className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  />
                  <span className="text-[10px] text-muted-foreground">Limite total de escolhas</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Qtd Inclusa (Grátis)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={groupForm.freeQuantity ?? 0}
                    onChange={(e) => setGroupForm((p) => ({ ...p, freeQuantity: parseInt(e.target.value, 10) || 0 }))}
                    className="rounded-xl h-10 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  />
                  <span className="text-[10px] text-muted-foreground">Itens sem custo extra</span>
                </div>
              </div>

              {/* Toggle de Obrigatoriedade */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Grupo Obrigatório?</p>
                  <p className="text-[11px] text-muted-foreground">O cliente não poderá adicionar ao carrinho sem selecionar o mínimo.</p>
                </div>
                <input
                  type="checkbox"
                  checked={groupForm.isRequired}
                  onChange={(e) => setGroupForm((p) => ({ ...p, isRequired: e.target.checked }))}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Toggle de Repetição / Quantidade (+ / -) */}
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
                  onChange={(e) => setGroupForm((p) => ({ ...p, allowItemQuantity: e.target.checked }))}
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
                  disabled={savingGroup}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
                >
                  {savingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  {editingGroup ? "Salvar Alterações" : "Criar Grupo"}
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
            className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
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
              {/* Miniatura 160x160 WebP com Upload Rápido */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Miniatura do Ingrediente (160x160 WebP)</Label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-border/60 overflow-hidden relative flex items-center justify-center shrink-0">
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : itemForm.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={itemForm.imageUrl}
                        alt="Miniatura"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full rounded-xl text-xs h-9 font-semibold border-zinc-200 dark:border-zinc-700 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1 text-primary" />
                      {uploadingImage ? "Processando..." : itemForm.imageUrl ? "Substituir Foto" : "Enviar Foto"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      PNG, JPG ou WebP até 2MB. Convertido e redimensionado automaticamente para WebP 160x160 px.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nome do Item */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Adicional (ex: Morango Picado, Nutella)</Label>
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
                  <span className="text-[11px] text-muted-foreground">0,00 para itens inclusos/grátis</span>
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
                  disabled={savingItem || uploadingImage}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
                >
                  {savingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  {editingItem ? "Salvar Opção" : "Adicionar Opção"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
