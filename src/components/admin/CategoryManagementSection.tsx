"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  X,
  Tag,
} from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/ToastNotification";

export function CategoryManagementSection() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    order: 0,
    isDynamic: false,
    dynamicType: "HIGHLIGHTS",
    isActive: true,
  });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories?includeInactive=true", {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error("Erro ao buscar categorias.");
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setCategories(list);
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

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setForm({
      name: "",
      order: categories.length,
      isDynamic: false,
      dynamicType: "HIGHLIGHTS",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      order: cat.order ?? cat.order_index ?? 0,
      isDynamic: Boolean(cat.isDynamic),
      dynamicType: cat.dynamicType || "HIGHLIGHTS",
      isActive: cat.isActive !== undefined ? Boolean(cat.isActive) : true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast({ type: "warning", title: "Atenção", message: "Informe o nome da categoria." });
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, {
          name: form.name.trim(),
          order: Number(form.order),
          isDynamic: form.isDynamic,
          dynamicType: form.isDynamic ? form.dynamicType : null,
          isActive: form.isActive,
        });
        showToast({
          type: "success",
          title: "Categoria Atualizada",
          message: `"${form.name}" foi salva com sucesso.`,
        });
      } else {
        await categoryService.createCategory(
          form.name.trim(),
          Number(form.order),
          form.isDynamic,
          form.isDynamic ? form.dynamicType : null,
          form.isActive
        );
        showToast({
          type: "success",
          title: "Categoria Criada",
          message: `"${form.name}" foi adicionada ao cardápio.`,
        });
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Salvar",
        message: err instanceof Error ? err.message : "Falha na requisição.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    const nextState = !cat.isActive;
    try {
      await categoryService.updateCategory(cat.id, { isActive: nextState });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: nextState } : c))
      );
      showToast({
        type: nextState ? "success" : "warning",
        title: nextState ? "Categoria Ativada" : "Categoria Ocultada",
        message: `"${cat.name}" agora está ${nextState ? "visível" : "oculta"} na vitrine.`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro",
        message: err instanceof Error ? err.message : "Falha ao alternar visibilidade.",
      });
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Deseja excluir a categoria "${cat.name}"? Produtos vinculados serão desassociados.`)) {
      return;
    }

    try {
      await categoryService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast({
        type: "success",
        title: "Categoria Excluída",
        message: `"${cat.name}" foi removida com sucesso.`,
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Erro ao Excluir",
        message: err instanceof Error ? err.message : "Falha ao excluir categoria.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Topo com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <h4 className="font-heading text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-primary" />
            Categorias do Cardápio (Estáticas e Dinâmicas)
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize a ordem de exibição, crie categorias automáticas (Destaques da Casa) e gerencie a visibilidade.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreate}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Categoria
        </Button>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Carregando categorias...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <FolderTree className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            Nenhuma categoria cadastrada
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Crie categorias para organizar seus copos de açaí, combos, milk shakes e sorvetes.
          </p>
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-xl bg-primary text-white text-xs font-bold px-4 py-2"
          >
            Cadastrar Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`
                p-4 rounded-2xl border transition-all flex items-center justify-between gap-3
                ${
                  cat.isActive === false
                    ? "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                    : "bg-white dark:bg-[#151926] border-gray-200 dark:border-zinc-800 shadow-xs hover:border-primary/40"
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {cat.order ?? idx}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-bold text-sm text-foreground truncate">
                      {cat.name}
                    </span>

                    {cat.isDynamic && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        Dinâmica ({cat.dynamicType || "HIGHLIGHTS"})
                      </span>
                    )}

                    {cat.isActive === false && (
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        Oculta
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-foreground font-mono">
                    /{cat.slug || cat.id}
                  </span>
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleActive(cat)}
                  title={cat.isActive !== false ? "Ocultar na vitrine" : "Tornar visível"}
                  className={`p-2 rounded-xl transition-colors ${
                    cat.isActive !== false
                      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cat.isActive !== false ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  title="Editar categoria"
                  className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  title="Excluir categoria"
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#181D2D] rounded-3xl w-full max-w-md border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold">
                  Nome da Categoria (com emoji) *
                </Label>
                <Input
                  id="catName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: ⭐ Destaques da Casa, 🫐 Copos Tradicionais"
                  className="h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catOrder" className="text-xs font-semibold">
                  Ordem de Exibição
                </Label>
                <Input
                  id="catOrder"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Flag Dinâmica */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Categoria Dinâmica
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Agrupa produtos automaticamente com base em regras
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isDynamic}
                    onChange={(e) => setForm({ ...form, isDynamic: e.target.checked })}
                    className="w-4 h-4 text-primary rounded accent-primary cursor-pointer"
                  />
                </div>

                {form.isDynamic && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <Label className="text-[11px] font-semibold">Tipo de Agrupamento</Label>
                    <select
                      value={form.dynamicType}
                      onChange={(e) => setForm({ ...form, dynamicType: e.target.value })}
                      className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs"
                    >
                      <option value="HIGHLIGHTS">Destaques & Promoções Vigentes (HIGHLIGHTS)</option>
                      <option value="TOP_SELLERS">Mais Vendidos da Loja (TOP_SELLERS)</option>
                      <option value="PROMOTIONS">Apenas com Desconto Ativo (PROMOTIONS)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <Label className="text-xs font-medium cursor-pointer">
                  Visível no Cardápio (Ativa)
                </Label>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-10 text-xs rounded-xl bg-primary text-white font-bold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Categoria"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
