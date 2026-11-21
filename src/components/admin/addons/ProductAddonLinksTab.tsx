"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Search,
  Filter,
  SlidersHorizontal,
  GripVertical,
  X,
  UtensilsCrossed,
  Layers,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { AddonGroup } from "@/services/addonService";
import { Product } from "@/services/productService";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";
import { Button } from "@/components/ui/button";

interface ProductAddonLinksTabProps {
  products: Product[];
  groups: AddonGroup[];
  productLinks: Record<string, string[]>;
  onToggleGroup: (productId: string, groupId: string) => void;
  onSetProductGroups: (productId: string, groupIds: string[]) => void;
}

const DRAG_GROUP_MIME = "application/x-popshake-addon-group";

export function ProductAddonLinksTab({
  products,
  groups,
  productLinks,
  onToggleGroup,
  onSetProductGroups,
}: ProductAddonLinksTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [linkFilter, setLinkFilter] = useState<"all" | "with_addons" | "without_addons">("all");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);

  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const groupsMetaMap = useMemo(
    () => new Map(groups.map((g) => [g.id, { name: g.name, sortOrder: g.sortOrder ?? 0 }])),
    [groups]
  );

  // Apenas produtos base (combos herdam complementos automaticamente)
  const baseProducts = useMemo(() => products.filter((p) => !p.isCombo), [products]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of baseProducts) {
      const catId = p.category_id || p.categoryId || p.category || "";
      const catLabel = p.category || catId;
      if (catId && catLabel && !map.has(catId)) {
        map.set(catId, catLabel);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [baseProducts]);

  const filteredProducts = useMemo(() => {
    return baseProducts.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = (p.description || "").toLowerCase().includes(q);
        const matchesCat = (p.category || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      if (selectedCategory !== "all") {
        const catId = p.category_id || p.categoryId || p.category || "";
        if (catId !== selectedCategory && p.category !== selectedCategory) return false;
      }

      const linkedCount = (productLinks[p.id] || []).length;
      if (linkFilter === "with_addons" && linkedCount === 0) return false;
      if (linkFilter === "without_addons" && linkedCount > 0) return false;

      return true;
    });
  }, [baseProducts, searchTerm, selectedCategory, linkFilter, productLinks]);

  const handleGroupChipDragStart = (e: React.DragEvent, groupId: string) => {
    setDraggingGroupId(groupId);
    e.dataTransfer.setData(DRAG_GROUP_MIME, groupId);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleGroupChipDragEnd = () => {
    setDraggingGroupId(null);
    setDragOverProductId(null);
  };

  const handleProductDrop = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    const transferredGroupId = e.dataTransfer.getData(DRAG_GROUP_MIME) || draggingGroupId;
    setDragOverProductId(null);
    setDraggingGroupId(null);

    if (!transferredGroupId || !groupsById.has(transferredGroupId)) return;
    const current = productLinks[productId] || [];
    if (!current.includes(transferredGroupId)) {
      onSetProductGroups(productId, [...current, transferredGroupId]);
    }
  };

  const otherProductsWithLinks = useMemo(
    () => baseProducts.filter((p) => (productLinks[p.id] || []).length > 0),
    [baseProducts, productLinks]
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho estilo Controle de Estoque (Apenas Produtos Base) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9306CF]/15 to-[#940068]/15 flex items-center justify-center text-[#9306CF] dark:text-[#E288F7] border border-[#9306CF]/20 shadow-xs shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                Produtos Base & Vínculos de Complementos
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Apenas Produtos Base
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina rapidamente quais grupos de complementos vão em cada produto base. Combos herdam automaticamente os complementos dos produtos vinculados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-border/50">
            {baseProducts.length} produto{baseProducts.length === 1 ? "" : "s"} base
          </span>
        </div>
      </div>

      {/* Paleta Rápida de Grupos Arrastáveis */}
      {groups.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Arraste um grupo até qualquer produto abaixo para vincular rapidamente:
            </p>
            <span className="text-[11px] text-muted-foreground">
              Ou clique em &quot;Gerenciar Grupos&quot; na linha do produto
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <div
                key={group.id}
                draggable
                onDragStart={(e) => handleGroupChipDragStart(e, group.id)}
                onDragEnd={handleGroupChipDragEnd}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#181D2D] border border-primary/30 text-xs font-semibold text-foreground shadow-2xs cursor-grab active:cursor-grabbing hover:border-primary transition-colors select-none"
                title="Arraste para vincular a um produto"
              >
                <GripVertical className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                <span>{group.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-muted-foreground font-mono">
                  {group.items.length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-6 lg:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar produto base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="sm:col-span-3 lg:col-span-4 relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-gray-50 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          >
            <option value="all">Todas as Categorias</option>
            {categoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="sm:col-span-3 lg:col-span-3 relative">
          <select
            value={linkFilter}
            onChange={(e) =>
              setLinkFilter(e.target.value as "all" | "with_addons" | "without_addons")
            }
            className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-gray-50 dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          >
            <option value="all">Todos os Vínculos</option>
            <option value="with_addons">Com complementos</option>
            <option value="without_addons">Sem complementos</option>
          </select>
          <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabela de Produtos Base */}
      {filteredProducts.length === 0 ? (
        <div className="py-12 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-500">
          <UtensilsCrossed className="w-10 h-10 text-gray-400 mb-2" />
          <p className="font-bold text-base text-foreground">Nenhum produto base encontrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Ajuste os critérios de busca ou filtros acima para visualizar os produtos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full min-w-0 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                <th className="py-3.5 px-4 min-w-[240px]">Produto Base</th>
                <th className="py-3.5 px-4 min-w-[300px]">Grupos de Complementos Vinculados</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-[#181D2D]">
              {filteredProducts.map((product) => {
                const rawLinkedIds = productLinks[product.id] || [];
                const orderedLinkedIds = AddonOrganizationService.sortAddonGroupIds(
                  rawLinkedIds,
                  groupsMetaMap
                );
                const linkedGroups = orderedLinkedIds
                  .map((id) => groupsById.get(id))
                  .filter((g): g is AddonGroup => Boolean(g));
                const isExpanded = expandedProductId === product.id;
                const isDropTarget = dragOverProductId === product.id;
                const formattedPrice = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(product.price);

                return (
                  <React.Fragment key={product.id}>
                    <tr
                      onDragOver={(e) => {
                        if (draggingGroupId || e.dataTransfer.types.includes(DRAG_GROUP_MIME)) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                          setDragOverProductId(product.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverProductId === product.id) {
                          setDragOverProductId(null);
                        }
                      }}
                      onDrop={(e) => handleProductDrop(e, product.id)}
                      className={`transition-colors ${
                        isDropTarget
                          ? "bg-primary/10 ring-2 ring-inset ring-primary/50"
                          : "hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Produto Base */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 border border-gray-200/80 dark:border-white/10 shadow-2xs flex items-center justify-center">
                            {product.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className={`w-full h-full object-cover ${
                                  product.isAvailable === false ? "grayscale-[40%] opacity-70" : ""
                                }`}
                              />
                            ) : (
                              <UtensilsCrossed className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground text-sm">
                                {product.name}
                              </span>
                              {product.isAvailable === false && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300">
                                  Pausado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {product.category && (
                                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-gray-200/60 dark:border-white/5">
                                  {product.category}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-primary dark:text-violet-300">
                                {formattedPrice}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grupos Vinculados */}
                      <td className="py-3 px-4 align-top">
                        {linkedGroups.length === 0 ? (
                          <div className="py-2 px-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700/80 text-xs text-muted-foreground">
                            {isDropTarget
                              ? "Solte aqui para vincular o grupo..."
                              : "Nenhum grupo vinculado."}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {linkedGroups.map((group) => (
                              <span
                                key={group.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700 text-xs font-medium text-foreground"
                              >
                                <span className="truncate max-w-[180px]">{group.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  ({group.items.length})
                                </span>
                                {group.freeQuantity > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    {group.freeQuantity} grátis
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onToggleGroup(product.id, group.id)}
                                  title={`Desvincular "${group.name}"`}
                                  className="ml-0.5 p-0.5 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                        <Button
                          type="button"
                          variant={isExpanded ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setExpandedProductId(isExpanded ? null : product.id)
                          }
                          className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Gerenciar ({linkedGroups.length})</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>

                    {/* Painel Inline Expansível para Escolher Grupos */}
                    {isExpanded && (
                      <tr className="bg-zinc-50/90 dark:bg-zinc-900/55">
                        <td colSpan={3} className="p-4 sm:p-5 border-t border-zinc-200/70 dark:border-zinc-800">
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground">
                                  Selecionar grupos de complementos para &quot;{product.name}&quot;
                                </h4>
                                <p className="text-[11px] text-muted-foreground">
                                  Marque ou desmarque abaixo e clique em &quot;Salvar Tudo&quot; no topo para publicar.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {otherProductsWithLinks.some((o) => o.id !== product.id) && (
                                  <div className="relative flex items-center gap-1">
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        const sourceId = e.target.value;
                                        if (!sourceId) return;
                                        onSetProductGroups(
                                          product.id,
                                          productLinks[sourceId] || []
                                        );
                                      }}
                                      className="h-8 pl-2 pr-6 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-semibold text-foreground cursor-pointer"
                                    >
                                      <option value="">Copiar vínculos de...</option>
                                      {otherProductsWithLinks
                                        .filter((o) => o.id !== product.id)
                                        .map((o) => (
                                          <option key={o.id} value={o.id}>
                                            {o.name} ({(productLinks[o.id] || []).length})
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    onSetProductGroups(
                                      product.id,
                                      groups.map((g) => g.id)
                                    )
                                  }
                                  className="h-8 text-[11px] rounded-lg cursor-pointer"
                                >
                                  Marcar todos
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onSetProductGroups(product.id, [])}
                                  className="h-8 text-[11px] rounded-lg cursor-pointer"
                                >
                                  Limpar
                                </Button>
                              </div>
                            </div>

                            {groups.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">
                                Nenhum grupo de complementos criado ainda.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {groups.map((group) => {
                                  const isLinked = rawLinkedIds.includes(group.id);
                                  const itemsPreview = group.items
                                    .slice(0, 3)
                                    .map((i) => i.name)
                                    .join(", ");

                                  return (
                                    <label
                                      key={group.id}
                                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                        isLinked
                                          ? "bg-white dark:bg-[#181D2D] border-primary/50 ring-1 ring-primary/20 shadow-2xs"
                                          : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isLinked}
                                        onChange={() => onToggleGroup(product.id, group.id)}
                                        className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                                      />
                                      <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-xs text-foreground truncate">
                                            {group.name}
                                          </span>
                                          {group.isRequired && (
                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                              Obrigatório
                                            </span>
                                          )}
                                          {group.freeQuantity > 0 && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                              Até {group.freeQuantity} grátis
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                          {group.items.length > 0
                                            ? `${group.items.length} opção(ões): ${itemsPreview}${
                                                group.items.length > 3 ? "..." : ""
                                              }`
                                            : "Grupo vazio (sem opções)"}
                                        </p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
