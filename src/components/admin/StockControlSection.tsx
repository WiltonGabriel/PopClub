"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

import {
  Search,
  Filter,
  Package,
  Flame,
  Check,
  X,
  Infinity as InfinityIcon,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  Plus,
  Minus,
  UtensilsCrossed,
  Pencil,
} from "lucide-react";
import { productService, Product } from "../../services/productService";
import { categoryService, Category } from "../../services/categoryService";
import { ProductFormDialog } from "./ProductFormDialog";
import { useToast } from "../ui/ToastNotification";

interface StockControlSectionProps {
  /**
   * Mapa de ID do produto para quantidade em preparo/ativos no quadro de pedidos Kanban
   */
  activeDemandMap?: Record<string, number>;
}

export function StockControlSection({ activeDemandMap = {} }: StockControlSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "unavailable">("all");

  // Edição completa de produto via modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Debounce timers para inputs numéricos por produto
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const { showToast } = useToast();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [prodsData, catsData] = await Promise.allSettled([
        productService.getProducts(),
        categoryService.getCategories(),
      ]);

      if (prodsData.status === "fulfilled") {
        setProducts(prodsData.value);
      }
      if (catsData.status === "fulfilled") {
        setCategories(catsData.value);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de estoque:", err);
      showToast({
        title: "Erro ao carregar estoque",
        message: "Não foi possível carregar os produtos.",
        type: "error",
      });
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
    return () => {
      // Limpa debounces pendentes ao desmontar
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [loadData]);

  // Atualização de Disponibilidade (Switch Imediato)
  const handleToggleAvailability = async (product: Product) => {
    const newStatus = product.isAvailable === false ? true : false;

    // Atualização otimista local
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isAvailable: newStatus } : p))
    );

    try {
      await productService.updateProductStock(product.id, { isAvailable: newStatus });
      showToast({
        title: `Estoque de ${product.name} atualizado!`,
        message: newStatus ? "Produto ativado para venda na loja." : "Produto pausado/esgotado na loja.",
        type: "success",
      });
    } catch (err: any) {
      console.error("Erro ao atualizar disponibilidade:", err);
      // Reverte em caso de erro
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isAvailable: !newStatus } : p))
      );
      showToast({
        title: "Erro na atualização",
        message: err.message || "Falha ao atualizar disponibilidade.",
        type: "error",
      });
    }
  };

  // Alternar Estoque Infinito / Fixo
  const handleToggleInfiniteStock = async (product: Product, isInfinite: boolean) => {
    const newStock = isInfinite ? null : 10; // se desmarcar infinito, inicia com 10 un.

    // Otimista
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: newStock } : p))
    );

    try {
      await productService.updateProductStock(product.id, { stock: newStock });
      showToast({
        title: `Estoque de ${product.name} atualizado!`,
        message: isInfinite ? "Configurado como Sob Demanda / Infinito." : "Configurado com controle de unidades.",
        type: "success",
      });
    } catch (err: any) {
      console.error("Erro ao atualizar modo de estoque:", err);
      // Reverte
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock: product.stock } : p))
      );
      showToast({
        title: "Erro na atualização",
        message: err.message || "Falha ao alternar modo de estoque.",
        type: "error",
      });
    }
  };

  // Alterar Quantidade de Estoque (com debounce)
  const handleStockChange = (product: Product, newQuantity: number) => {
    const validQty = Math.max(0, isNaN(newQuantity) ? 0 : newQuantity);

    // Otimista no estado local
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: validQty } : p))
    );

    if (debounceTimers.current[product.id]) {
      clearTimeout(debounceTimers.current[product.id]);
    }

    debounceTimers.current[product.id] = setTimeout(async () => {
      try {
        await productService.updateProductStock(product.id, { stock: validQty });
        showToast({
          title: `Estoque de ${product.name} atualizado!`,
          message: `Quantidade definida para ${validQty} un.`,
          type: "success",
        });
      } catch (err: any) {
        console.error("Erro ao persistir estoque:", err);
        showToast({
          title: "Erro ao salvar estoque",
          message: err.message || "Não foi possível sincronizar o estoque.",
          type: "error",
        });
      }
    }, 500);
  };

  // Botões rápidos de + / -
  const handleStepStock = (product: Product, delta: number) => {
    const current = product.stock ?? 0;
    const nextVal = Math.max(0, current + delta);
    handleStockChange(product, nextVal);
  };

  // Filtragem dos produtos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = (p.description || "").toLowerCase().includes(query);
        const matchesCat = (p.category || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      // 2. Filtro de Categoria
      if (selectedCategory !== "all") {
        const matchesCatId = p.category_id === selectedCategory;
        const matchesCatName = p.category?.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchesCatId && !matchesCatName) return false;
      }

      // 3. Filtro de Status
      const isAvailable =
        p.isAvailable !== false &&
        (p.stock === null || p.stock === undefined || p.stock > 0);

      if (statusFilter === "available" && !isAvailable) return false;
      if (statusFilter === "unavailable" && isAvailable) return false;

      return true;
    });
  }, [products, searchTerm, selectedCategory, statusFilter]);

  // Estatísticas rápidas
  const totalItems = products.length;
  const unavailableCount = products.filter(
    (p) => p.isAvailable === false || (p.stock !== null && p.stock !== undefined && p.stock <= 0)
  ).length;
  const totalInKitchen = Object.values(activeDemandMap).reduce((acc, qty) => acc + qty, 0);

  return (
    <section className="bg-white dark:bg-[#1E0B22] border border-gray-200 dark:border-border/40 rounded-3xl p-5 sm:p-7 shadow-sm transition-colors duration-200 space-y-6">
      {/* ─── CABEÇALHO DA SEÇÃO ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-border/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center text-primary dark:text-[#E288F7] border border-primary/20 shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl sm:text-2xl text-foreground dark:text-foreground tracking-tight">
                Controle de Estoque & Disponibilidade
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Pause itens que acabaram na cozinha ou ajuste as quantidades disponíveis em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Badges de Resumo e Botão Recarregar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-border/40 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <Layers className="w-3.5 h-3.5 text-gray-500" />
            <span>{totalItems} itens no total</span>
          </div>

          {unavailableCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{unavailableCount} pausado{unavailableCount > 1 ? "s" : ""}</span>
            </div>
          )}

          {totalInKitchen > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>{totalInKitchen} un. em preparo</span>
            </div>
          )}

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Recarregar catálogo de produtos"
            className="p-2 rounded-xl border border-gray-200 dark:border-border/40 text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── BARRA DE BUSCA E FILTROS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Campo de Busca Rápida */}
        <div className="sm:col-span-6 lg:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-[#150718] border border-gray-200 dark:border-border/40 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro por Categoria */}
        <div className="sm:col-span-3 lg:col-span-4 relative">
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-gray-50 dark:bg-[#150718] border border-gray-200 dark:border-border/40 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Filtro por Status */}
        <div className="sm:col-span-3 lg:col-span-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-gray-50 dark:bg-[#150718] border border-gray-200 dark:border-border/40 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="available">🟢 Apenas Disponíveis</option>
              <option value="unavailable">🔴 Esgotados / Pausados</option>
            </select>
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── TABELA / GRID DE PRODUTOS ─── */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="w-7 h-7 animate-spin text-primary" />
          <span className="text-sm font-medium">Carregando catálogo de produtos...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-12 border border-dashed border-gray-200 dark:border-border/40 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-500">
          <UtensilsCrossed className="w-10 h-10 text-gray-400 mb-2" />
          <p className="font-bold text-base text-foreground">Nenhum produto encontrado</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Nenhum item corresponde aos critérios de busca ou filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-border/40">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#18071B] border-b border-gray-200 dark:border-border/40 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Preço de Venda</th>
                <th className="py-3.5 px-4 min-w-[260px]">Controle de Estoque</th>
                <th className="py-3.5 px-4 text-center">Saídas no Quadro</th>
                <th className="py-3.5 px-4 text-right">Disponibilidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-border/30 bg-white dark:bg-[#1E0B22]">
              {filteredProducts.map((product) => {
                const isInfinite = product.stock === null || product.stock === undefined;
                const isAvailable =
                  product.isAvailable !== false && (isInfinite || (product.stock ?? 0) > 0);
                const activeDemand = activeDemandMap[product.id] || 0;
                const formattedPrice = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(product.price);

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02] ${
                      !isAvailable ? "bg-red-50/20 dark:bg-red-950/10" : ""
                    }`}
                  >
                    {/* Item: Foto + Nome + Categoria */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 relative border border-gray-200/80 dark:border-white/10 shadow-sm flex items-center justify-center">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className={`w-full h-full object-cover transition-opacity ${
                                !isAvailable ? "grayscale-[40%] opacity-70" : ""
                              }`}
                            />
                          ) : (
                            <UtensilsCrossed className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-foreground text-sm truncate">
                              {product.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                              title="Editar dados cadastrais do produto (Foto, Nome, Descrição, Preço, Categoria, Selo)"
                              className="p-1 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {!isAvailable && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                                Esgotado
                              </span>
                            )}
                            {product.cardBadge && (
                              <span
                                style={{
                                  backgroundColor: product.cardBadge.bgColor,
                                  color: product.cardBadge.textColor,
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs inline-flex items-center gap-1"
                              >
                                {product.cardBadge.icon && <span>{product.cardBadge.icon}</span>}
                                <span>{product.cardBadge.text}</span>
                              </span>
                            )}
                          </div>
                          {product.category && (
                            <span className="inline-block text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md mt-1 border border-gray-200/60 dark:border-white/5">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Preço de Venda */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-heading font-black text-sm text-foreground dark:text-[#E288F7]">
                        {formattedPrice}
                      </span>
                    </td>

                    {/* Controle de Estoque */}
                    <td className="py-3 px-4">
                      <div className="space-y-2">
                        {/* Checkbox: Estoque Infinito / Sob Demanda */}
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-[#E288F7] transition-colors">
                          <input
                            type="checkbox"
                            checked={isInfinite}
                            onChange={(e) => handleToggleInfiniteStock(product, e.target.checked)}
                            className="w-4 h-4 rounded text-primary border-gray-300 dark:border-gray-600 focus:ring-primary accent-[hsl(var(--primary))]"
                          />
                          <span className="flex items-center gap-1">
                            <InfinityIcon className="w-3.5 h-3.5 text-primary" />
                            <span>Estoque Infinito / Sob Demanda</span>
                          </span>
                        </label>

                        {/* Input Numérico com Steppers (+ / -) */}
                        {isInfinite ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic pl-6">
                            <span>Sempre disponível conforme pedidos</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 pl-6">
                            <button
                              type="button"
                              onClick={() => handleStepStock(product, -1)}
                              className="w-7 h-7 rounded-lg border border-gray-300 dark:border-border/50 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200 active:scale-95 transition-transform"
                              title="Diminuir 1 un."
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                value={product.stock ?? 0}
                                onChange={(e) =>
                                  handleStockChange(product, parseInt(e.target.value, 10))
                                }
                                className="w-20 px-2.5 py-1 text-center font-bold text-sm bg-white dark:bg-[#150718] border border-gray-300 dark:border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              />
                              <span className="ml-1.5 text-xs text-gray-500 font-medium">un.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStepStock(product, 1)}
                              className="w-7 h-7 rounded-lg border border-gray-300 dark:border-border/50 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200 active:scale-95 transition-transform"
                              title="Aumentar 1 un."
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Saídas Recentes no Quadro */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {activeDemand > 0 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs animate-pulse">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{activeDemand} un. em preparo</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">
                          0 un. ativas
                        </span>
                      )}
                    </td>

                    {/* Disponibilidade Imediata (Switch de Ativação) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex flex-col items-end gap-1">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.isAvailable !== false}
                          onClick={() => handleToggleAvailability(product)}
                          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                            product.isAvailable !== false
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          <span className="sr-only">Alternar disponibilidade</span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              product.isAvailable !== false
                                ? "translate-x-7 text-emerald-600"
                                : "translate-x-0 text-red-600"
                            }`}
                          >
                            {product.isAvailable !== false ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </span>
                        </button>

                        <span
                          className={`text-[11px] font-bold tracking-tight ${
                            product.isAvailable !== false
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {product.isAvailable !== false ? "Disponível" : "Pausado / Off"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edição Completa do Produto */}
      {isEditDialogOpen && (
        <ProductFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          productToEdit={editingProduct}
          categories={categories}
          onSaved={(updatedProduct) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
            );
            setIsEditDialogOpen(false);
            setEditingProduct(null);
            showToast({
              title: "Produto atualizado!",
              message: `${updatedProduct.name} foi atualizado com sucesso.`,
              type: "success",
            });
            loadData(true);
          }}
        />
      )}
    </section>
  );
}
