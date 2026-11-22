"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Layers,
  Tag,
  Zap,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { productService, Product } from "@/services/productService";
import { CategoryDomainService } from "@/domain/services/CategoryDomainService";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/ToastNotification";
import { parseCategoryEmojiAndName } from "../storefront/CategoryChip";
import { CategoryFormDialog } from "./CategoryFormDialog";

export function CategoryManagement() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  // Modal de criação / edição e confirmação de exclusão
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const [list, prods] = await Promise.all([
        categoryService.getCategories(true),
        productService.getProducts().catch(() => [] as Product[]),
      ]);
      setCategories(list);
      setProducts(prods);
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Carregar",
        message: err instanceof Error ? err.message : "Falha ao listar categorias.",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Reordenação imediata (Subir / Descer)
  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    // Atualização otimista
    const newCategories = [...categories];
    const [moved] = newCategories.splice(index, 1);
    newCategories.splice(targetIndex, 0, moved);

    const reorderedPayload = newCategories.map((cat, idx) => ({
      id: cat.id,
      order: idx,
    }));

    setCategories(newCategories.map((c, idx) => ({ ...c, order: idx })));
    setReordering(true);

    try {
      const updated = await categoryService.reorderCategories(reorderedPayload);
      setCategories(updated);
      showToast({
        type: "success",
        title: "Ordem Atualizada",
        message: `Posição de "${parseCategoryEmojiAndName(moved.name).cleanName}" ajustada na vitrine.`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Reordenar",
        message: err instanceof Error ? err.message : "Não foi possível persistir a nova ordem.",
      });
      // Reverte em caso de erro
      loadCategories();
    } finally {
      setReordering(false);
    }
  };

  // Reordenação por número digitado
  const handleOrderChange = async (catId: string, newOrderVal: number) => {
    const catIndex = categories.findIndex((c) => c.id === catId);
    if (catIndex === -1) return;

    const clampedOrder = Math.max(0, Math.min(newOrderVal, categories.length - 1));
    if (clampedOrder === catIndex) return;

    const newCategories = [...categories];
    const [moved] = newCategories.splice(catIndex, 1);
    newCategories.splice(clampedOrder, 0, moved);

    const payload = newCategories.map((c, idx) => ({
      id: c.id,
      order: idx,
    }));

    setCategories(newCategories.map((c, idx) => ({ ...c, order: idx })));
    setReordering(true);

    try {
      const updated = await categoryService.reorderCategories(payload);
      setCategories(updated);
      showToast({
        type: "success",
        title: "Ordem Atualizada",
        message: "Nova sequência de exibição aplicada.",
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Reordenar",
        message: err instanceof Error ? err.message : "Falha ao atualizar ordem.",
      });
      loadCategories();
    } finally {
      setReordering(false);
    }
  };

  // Alternar ativação / desativação
  const handleToggleStatus = async (cat: Category) => {
    // Otimista
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
    );

    try {
      const updated = await categoryService.toggleCategoryStatus(cat.id);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: updated.isActive } : c))
      );
      showToast({
        type: "success",
        title: updated.isActive ? "Categoria Ativada" : "Categoria Pausada",
        message: `"${parseCategoryEmojiAndName(cat.name).cleanName}" ${
          updated.isActive ? "agora está visível na vitrine." : "foi ocultada da vitrine."
        }`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro",
        message: err instanceof Error ? err.message : "Falha ao alterar status.",
      });
      loadCategories();
    }
  };

  // Deletar categoria (abre modal seguro de confirmação sem window.confirm)
  const handleDelete = (cat: Category) => {
    setCategoryToDelete(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const { cleanName } = parseCategoryEmojiAndName(categoryToDelete.name);
    setDeletingCategory(true);
    try {
      await categoryService.deleteCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setCategoryToDelete(null);
      showToast({
        type: "success",
        title: "Categoria Excluída",
        message: `"${cleanName}" foi removida e eventuais produtos vinculados foram desassociados com segurança.`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Excluir",
        message: err instanceof Error ? err.message : "Falha ao deletar categoria.",
      });
    } finally {
      setDeletingCategory(false);
    }
  };

  const getDynamicBadge = (cat: Category) => {
    if (!cat.isDynamic) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
          <Layers className="w-3 h-3 text-muted-foreground" />
          Manual
        </span>
      );
    }

    switch (cat.dynamicType) {
      case "HIGHLIGHTS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sparkles className="w-3 h-3 text-amber-500" />
            ⭐ Destaques
          </span>
        );
      case "ACTIVE_PROMOTIONS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Tag className="w-3 h-3 text-rose-500" />
            🔥 Ofertas Ativas
          </span>
        );
      case "COMBOS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Zap className="w-3 h-3 text-purple-500" />
            ⚡ Combos
          </span>
        );
      case "SHAREABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Users className="w-3 h-3 text-blue-500" />
            👥 Para Compartilhar
          </span>
        );
      case "TIME_BASED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Clock className="w-3 h-3 text-emerald-500" />
            ⏰ {cat.timeStart || "14:00"} às {cat.timeEnd || "18:00"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3" />
            Dinâmica
          </span>
        );
    }
  };

  return (
    <section className="bg-white dark:bg-[#1E0B20] border border-gray-200 dark:border-border/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-border/30">
        <div>
          <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2 text-foreground">
            <FolderTree className="w-5 h-5 text-primary" />
            Gestão do Catálogo & Categorias
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Crie categorias manuais ou dinâmicas, suba imagens/ícones próprios, personalize descrições e reordene a esteira da vitrine em tempo real.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingCategory(null);
            setDialogOpen(true);
          }}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-md shadow-primary/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </Button>
      </div>

      {/* ESTADO DE CARREGAMENTO */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold">Carregando categorias do cardápio...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-gray-200 dark:border-border/40 rounded-2xl space-y-3 bg-gray-50/50 dark:bg-background/40">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl">
            🗂️
          </div>
          <h4 className="font-heading font-bold text-sm text-foreground">
            Nenhuma categoria cadastrada ainda
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Clique em &ldquo;Nova Categoria&rdquo; para criar suas seções do cardápio ou adicionar listas inteligentes dinâmicas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* BARRA INFORMATIVA DE REORDENAÇÃO */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Total: <strong>{categories.length}</strong> {categories.length === 1 ? "categoria" : "categorias"}
            </span>
            <span className="text-[11px] text-primary font-medium flex items-center gap-1">
              {reordering ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando nova sequência...
                </>
              ) : (
                "Ordem persistida instantaneamente na vitrine"
              )}
            </span>
          </div>

          {/* LISTAGEM DE CATEGORIAS */}
          <div className="grid grid-cols-1 gap-2.5">
            {categories.map((cat, index) => {
              const { emoji, cleanName } = parseCategoryEmojiAndName(cat.name);
              const productCount = cat.isDynamic
                ? CategoryDomainService.resolveStorefrontCategoryDisplay({
                    items: CategoryDomainService.filterProductsForCategory(cat, products),
                    maxProducts: cat.maxProducts,
                    isDynamic: true,
                    isPreview: false,
                  }).totalItems
                : cat.productCount ?? cat._count?.products ?? 0;
              const isFirst = index === 0;
              const isLast = index === categories.length - 1;

              return (
                <div
                  key={cat.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    cat.isActive
                      ? "bg-white dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-primary/40"
                      : "bg-zinc-50 dark:bg-zinc-950/40 border-dashed border-zinc-300 dark:border-zinc-800 opacity-75"
                  }`}
                >
                  {/* LADO ESQUERDO: CONTROLES DE POSIÇÃO + ÍCONE + TÍTULO & DESCRIÇÃO */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* BOTÕES RÁPIDOS DE SUBIR / DESCER + NÚMERO DE ORDEM */}
                    <div className="flex flex-col items-center justify-center shrink-0 gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                      <button
                        type="button"
                        disabled={isFirst || reordering}
                        onClick={() => handleMove(index, "up")}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Subir posição na vitrine"
                        aria-label={`Subir ${cleanName}`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min={0}
                        max={categories.length - 1}
                        value={index}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) handleOrderChange(cat.id, val);
                        }}
                        className="w-6 text-center text-[10px] font-mono font-bold bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
                        title="Posição de ordenação"
                      />

                      <button
                        type="button"
                        disabled={isLast || reordering}
                        onClick={() => handleMove(index, "down")}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Descer posição na vitrine"
                        aria-label={`Descer ${cleanName}`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* MINIATURA OU EMOJI (36x36px) */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 shrink-0 flex items-center justify-center overflow-hidden p-1 shadow-2xs">
                      {cat.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.imageUrl}
                          alt={cleanName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xl leading-none">{emoji}</span>
                      )}
                    </div>

                    {/* TEXTOS: TÍTULO, DESCRIÇÃO, BADGES */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                          {cat.name}
                        </h4>
                        {getDynamicBadge(cat)}
                        {!cat.isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <EyeOff className="w-3 h-3" />
                            Oculta
                          </span>
                        )}
                      </div>

                      {cat.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {cat.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-400 italic">
                          Sem descrição curta cadastrada.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* LADO DIREITO: CONTADOR DE PRODUTOS + SWITCH ATIVO + AÇÕES */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80 shrink-0">
                    {/* CONTADOR DE PRODUTOS */}
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-foreground block font-mono">
                        {productCount} / {cat.maxProducts ?? 20} {productCount === 1 ? "item" : "itens"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {cat.isDynamic ? "teto da seção" : "limite da categoria"}
                      </span>
                    </div>

                    {/* SWITCH LIGA / DESLIGA */}
                    <div className="flex items-center gap-2" title={cat.isActive ? "Desativar na vitrine" : "Ativar na vitrine"}>
                      <Switch
                        checked={cat.isActive}
                        onCheckedChange={() => handleToggleStatus(cat)}
                      />
                    </div>

                    {/* BOTÕES DE AÇÃO: EDITAR & EXCLUIR */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setDialogOpen(true);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
                        title="Editar Categoria"
                        aria-label={`Editar categoria ${cleanName}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                        title="Excluir Categoria"
                        aria-label={`Excluir categoria ${cleanName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CATEGORIA */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E0B22] border border-gray-200 dark:border-[#512B54]/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-gray-900 dark:text-gray-100">
                  Excluir Categoria
                </h3>
                <p className="text-xs text-muted-foreground">Confirmação de exclusão no catálogo</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                Tem certeza que deseja excluir{" "}
                <strong className="text-foreground">
                  &quot;{parseCategoryEmojiAndName(categoryToDelete.name).cleanName}&quot;
                </strong>
                ?
              </p>
              {(categoryToDelete.productCount ?? categoryToDelete._count?.products ?? 0) > 0 && (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  Existem{" "}
                  <strong>
                    {categoryToDelete.productCount ?? categoryToDelete._count?.products ?? 0} produto(s)
                  </strong>{" "}
                  associado(s) a esta categoria. Eles permanecerão no catálogo como{" "}
                  <strong>Sem Categoria</strong> para que você possa reorganizá-los depois.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={deletingCategory}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={deletingCategory}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {deletingCategory ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Excluir Categoria</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CRIAÇÃO E EDIÇÃO */}
      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoryToEdit={editingCategory}
        onSaved={() => {
          loadCategories();
          showToast({
            type: "success",
            title: "Sucesso!",
            message: editingCategory
              ? "Categoria atualizada com sucesso."
              : "Nova categoria criada no cardápio.",
          });
        }}
      />
    </section>
  );
}
