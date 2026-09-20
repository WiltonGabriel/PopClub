"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ShoppingBag,
  ReceiptText,
  RotateCcw,
  Sparkles,
  ChevronDown,
  X,
  Filter,
  Check,
  Store,
  IceCream,
  DollarSign,
} from "lucide-react";
import { productService, Product } from "../../services/productService";
import { categoryService, Category } from "../../services/categoryService";
import { ProductCard } from "../../components/storefront/ProductCard";
import { CartDrawer } from "../../components/storefront/CartDrawer";
import { SearchAutocomplete } from "../../components/storefront/SearchAutocomplete";
import { Footer } from "../../components/storefront/Footer";
import { BottomNav } from "../../components/storefront/BottomNav";
import { ProductDetailModal } from "../../components/storefront/ProductDetailModal";
import { useCart } from "../../hooks/useCart";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../../components/ui/button";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Detalhes e Personalização do Produto
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  const handleOpenProductModal = (product: Product) => {
    if (
      product.isAvailable === false ||
      (product.stock !== undefined && product.stock !== null && product.stock <= 0)
    ) {
      return;
    }
    setSelectedProductForModal(product);
    setProductModalOpen(true);
  };

  // Filtros
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<"relevance" | "price_asc" | "price_desc" | "alpha">("relevance");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const { addItem, totalItems, itemsTotal } = useCart();
  const { theme, toggleTheme } = useTheme();

  // Carrega produtos e categorias
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prods, cats] = await Promise.all([
          productService.getProducts(),
          categoryService.getCategories(),
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (err) {
        console.error("Erro ao carregar produtos na busca:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sincroniza query da URL
  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    setSearchTerm(qParam);
  }, [searchParams]);

  // Atualiza a URL suavemente ao buscar
  const handleUpdateSearchTerm = (newTerm: string) => {
    setSearchTerm(newTerm);
    const params = new URLSearchParams(searchParams.toString());
    if (newTerm.trim()) {
      params.set("q", newTerm.trim());
    } else {
      params.delete("q");
    }
    router.replace(`/busca?${params.toString()}`);
  };

  // Alterna seleção de categoria
  const toggleCategory = (catIdentifier: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catIdentifier)
        ? prev.filter((c) => c !== catIdentifier)
        : [...prev, catIdentifier]
    );
  };

  // Limpar todos os filtros
  const handleResetFilters = () => {
    setSelectedCategories([]);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
  };

  const activeFilterCount =
    selectedCategories.length +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (sortBy !== "relevance" ? 1 : 0);

  // Filtragem e Ordenação Reativa
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 1. Busca por termo
    if (searchTerm.trim()) {
      const cleanQ = searchTerm.trim().toLowerCase();
      list = list.filter((p) => {
        const name = p.name.toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        return name.includes(cleanQ) || desc.includes(cleanQ) || cat.includes(cleanQ);
      });
    }

    // 2. Filtro por Categoria
    if (selectedCategories.length > 0) {
      list = list.filter((p) => {
        return selectedCategories.some(
          (cId) => p.category_id === cId || p.category === cId
        );
      });
    }

    // 3. Faixa de Preço
    if (minPrice && !isNaN(Number(minPrice))) {
      list = list.filter((p) => p.price >= Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      list = list.filter((p) => p.price <= Number(maxPrice));
    }

    // 4. Ordenação
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (sortBy === "relevance" && searchTerm.trim()) {
      const cleanQ = searchTerm.trim().toLowerCase();
      list.sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(cleanQ);
        const bStarts = b.name.toLowerCase().startsWith(cleanQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    }

    return list;
  }, [products, searchTerm, selectedCategories, minPrice, maxPrice, sortBy]);

  const handleAddToCart = (product: Product) => {
    if (
      product.isAvailable === false ||
      (product.stock !== undefined && product.stock !== null && product.stock <= 0)
    ) {
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-transparent text-foreground transition-colors duration-200">
      {/* Header da Busca */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-4 sm:px-6 py-3.5 sticky top-0 z-50 shadow-sm w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo e Botão Voltar */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-2.5 sm:px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title="Voltar para a Página Inicial"
            >
              <ArrowLeft className="w-4 h-4 text-[#9306CF]" />
              <span className="hidden sm:inline">Início</span>
            </Link>

            <Link href="/" className="font-heading font-black text-xl tracking-tight hidden md:flex items-center gap-1">
              <span className="text-[#4C264F] dark:text-[#F9F5F9]">Pop</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #9306CF 0%, #940068 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Shake
              </span>
            </Link>
          </div>

          {/* Campo de Busca com Autocomplete Integrado */}
          <div className="flex-1 min-w-[180px] max-w-md mx-2 sm:mx-4">
            <SearchAutocomplete
              products={products}
              initialValue={searchTerm}
              onNavigateToResults={(q) => handleUpdateSearchTerm(q)}
              onSelectProduct={handleOpenProductModal}
              placeholder="Buscar..."
            />
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Meus Pedidos */}
            <Link
              href="/pedidos"
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-[#C7A9C9] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0"
            >
              <ReceiptText className="w-4 h-4 text-[#9306CF] shrink-0" />
              <span>Meus Pedidos</span>
            </Link>

            {/* Carrinho Compacto */}
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="hidden md:flex relative h-10 w-10 p-2.5 rounded-full items-center justify-center bg-brand-folha-acai hover:bg-brand-folha-acai-dk text-white transition-colors shadow-xs shrink-0 cursor-pointer"
              aria-label={`Carrinho com ${totalItems} itens`}
              title={totalItems > 0 ? `Carrinho (${totalItems} ${totalItems === 1 ? "item" : "itens"})` : "Carrinho vazio"}
            >
              <ShoppingBag className="w-5 h-5 shrink-0" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center leading-none shadow-xs border-2 border-background">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Cabeçalho de Resultados e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#512B54]/40 pb-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
              {searchTerm ? (
                <>
                  <span>Resultados para</span>
                  <span className="text-[#9306CF] dark:text-[#C7A9C9]">&ldquo;{searchTerm}&rdquo;</span>
                </>
              ) : (
                <span>Todos os Produtos do Cardápio</span>
              )}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {loading
                ? "Buscando no cardápio..."
                : `${filteredProducts.length} ${filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Botão de Filtro Mobile */}
            <Button
              variant="outline"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 h-10 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <Filter className="w-3.5 h-3.5 text-[#9306CF]" />
              <span>Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
            </Button>

            {/* Ordenação rápida */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
              <span className="hidden sm:inline font-semibold">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 text-xs font-semibold text-foreground outline-none focus:border-[#9306CF] transition-colors cursor-pointer"
              >
                <option value="relevance">Relevância</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="alpha">Ordem Alfabética (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout Principal: Sidebar de Filtros + Grid de Produtos */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar de Filtros (Desktop) / Sanfona (Mobile) */}
          <aside
            className={`
              lg:block bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-2xl p-5 shadow-sm space-y-6
              ${mobileFiltersOpen ? "block" : "hidden"}
            `}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#512B54]/30">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#9306CF]" />
                Filtros Avançados
              </h3>

              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>

            {/* 1. Categorias */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Categorias
              </span>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id) || selectedCategories.includes(cat.name);
                  const countInCat = products.filter(
                    (p) => p.category_id === cat.id || p.category === cat.name
                  ).length;

                  return (
                    <label
                      key={cat.id}
                      className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 hover:text-[#9306CF] dark:hover:text-white cursor-pointer select-none py-1"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat.id)}
                          className="w-4 h-4 rounded text-[#9306CF] focus:ring-[#9306CF]/30 border-gray-300 dark:border-[#512B54]"
                        />
                        <span>{cat.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-gray-400">({countInCat})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Faixa de Preço */}
            <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-[#512B54]/30">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                Faixa de Preço (R$)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="R$ 0"
                    className="w-full h-9 px-2.5 rounded-xl bg-gray-50 dark:bg-[#1A0B1C] border border-gray-200 dark:border-[#512B54]/40 text-xs font-mono outline-none focus:border-[#9306CF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Máximo</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="R$ 50"
                    className="w-full h-9 px-2.5 rounded-xl bg-gray-50 dark:bg-[#1A0B1C] border border-gray-200 dark:border-[#512B54]/40 text-xs font-mono outline-none focus:border-[#9306CF]"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Grid de Resultados */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-64 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              /* Estado Vazio (Empty State) */
              <div className="bg-white dark:bg-[#230E26] border border-dashed border-gray-200 dark:border-[#512B54]/40 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9306CF] flex items-center justify-center mx-auto shadow-inner text-2xl">
                  🥣
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="font-heading font-bold text-lg sm:text-xl text-[#4C264F] dark:text-[#F9F5F9]">
                    Nenhum produto encontrado {searchTerm ? `para "${searchTerm}"` : "com esses filtros"}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Que tal experimentar nosso Açaí Tradicional cremoso batido na hora ou conferir as promoções do dia?
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {activeFilterCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleResetFilters}
                      className="rounded-xl border-gray-200 dark:border-[#512B54]/40 text-xs font-bold uppercase tracking-wider h-10 px-4"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}

                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider h-10 px-5 shadow-md shadow-[#9306CF]/20 transition-all"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Voltar ao Início</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Grid de Cards */
              <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 bg-card/60 md:bg-transparent rounded-2xl md:rounded-none border border-border/30 md:border-none px-2 sm:px-3 md:px-0">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleOpenProductModal}
                    onOpenDetails={handleOpenProductModal}
                    isAdmin={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Rodapé Institucional */}
      <Footer />

      {/* ─────────────────────────────────────────
          MOBILE — Floating cart bar (when items > 0)
          Posicionada logo ACIMA da Bottom Navigation Bar
      ───────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 md:hidden z-40 px-4 pb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Link href="/carrinho">
            <button className="btn-clay w-full bg-brand-folha-acai hover:bg-brand-folha-acai-dk text-white font-heading font-bold text-sm h-12 rounded-2xl flex items-center justify-between px-4 shadow-green-clay shadow-lg cursor-pointer active:scale-[0.98] transition-all">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Carrinho ({totalItems})</span>
              </span>
              <span className="font-mono font-black text-base">
                R$ {new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(itemsTotal)}
              </span>
            </button>
          </Link>
        </div>
      )}

      {/* ─────────────────────────────────────────
          BOTTOM NAV (mobile only - Padrão iFood)
      ───────────────────────────────────────── */}
      <BottomNav />

      {/* Cart Drawer */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Modal de Detalhes & Personalização do Produto */}
      <ProductDetailModal
        product={selectedProductForModal}
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-transparent">
          <div className="w-8 h-8 rounded-full border-2 border-[#9306CF] border-t-transparent animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
