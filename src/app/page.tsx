"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { productService, Product } from "../services/productService";
import { categoryService, Category } from "../services/categoryService";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useTheme } from "../contexts/ThemeContext";

// Storefront components
import { PromoBanner } from "../components/storefront/PromoBanner";
import { ProductCard } from "../components/storefront/ProductCard";
import { CategoryChip } from "../components/storefront/CategoryChip";
import { BottomNav } from "../components/storefront/BottomNav";
import { CartDrawer } from "../components/storefront/CartDrawer";

// Admin components (unchanged)
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";

// UI + Icons
import { Button } from "../components/ui/button";
import {
  Search,
  ShoppingBag,
  MapPin,
  ChevronDown,
  Plus,
  User as UserIcon,
  X,
  Sun,
  Moon,
} from "lucide-react";

export default function Storefront() {
  const { isAdmin, user } = useAuth();
  const { addItem, totalItems, itemsTotal } = useCart();
  const { theme, toggleTheme } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Admin modal state — unchanged
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  const fetchData = async () => {
    try {
      const [cats, prods] = await Promise.all([
        categoryService.getCategories(),
        productService.getProducts(),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  // Admin handlers — unchanged
  const handleDeleteCategory = async (id: string) => {
    if (confirm("Deletar esta categoria? Produtos associados perderão o vínculo.")) {
      await categoryService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este produto?")) {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      });
    },
    [addItem]
  );

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const el = document.getElementById(`category-${catId}`);
    if (el) {
      const offset = 140; // header + category bar height
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const filteredProducts = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const formattedTotal = itemsTotal.toFixed(2).replace(".", ",");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-20 md:pb-0">

      {/* ─────────────────────────────────────────
          HEADER — light/dark glassmorphism
          Layout: [Logo | Address] [Search→flex-1] [Actions | shrink-0]
          overflow-x is prevented by min-w-0 on the search wrapper.
      ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full glass-header">
        {/* Single contained row — max-w-7xl keeps it from stretching */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">

          {/* ── LEFT: Logo + Address ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center select-none cursor-pointer hover:opacity-85 transition-opacity duration-200"
              aria-label="Pop Shake — Início"
            >
              <span className="font-heading font-black text-2xl tracking-tight text-foreground">
                Pop<span className="gradient-text-brand">Shake</span>
              </span>
            </Link>

            {/* Address selector — desktop only, shrinks with the logo */}
            <button className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded-xl px-3 py-2 hover:bg-muted">
              <MapPin className="w-4 h-4 text-brand-pop-shake shrink-0" />
              <span className="font-medium max-w-[140px] truncate">Adicionar endereço</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          {/* ── CENTER: Search — flex-1 + min-w-0 = compresses before pushing buttons ── */}
          <div className="hidden md:flex flex-1 min-w-0 items-center">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar açaí, sorvetes, shakes..."
                className="
                  w-full bg-muted border border-border/50 rounded-full
                  pl-10 pr-4 py-2.5
                  text-sm text-foreground placeholder:text-muted-foreground
                  outline-none
                  focus:ring-2 focus:ring-brand-pop-shake/30
                  focus:border-brand-pop-shake/50
                  transition-all
                "
              />
            </div>
          </div>

          {/* ── RIGHT: Actions — all shrink-0, never wraps ── */}
          <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">

            {/* Cart button — desktop → opens drawer */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="hidden md:flex items-center gap-2 bg-brand-folha-acai hover:bg-brand-folha-acai-dk text-white font-semibold text-sm px-4 py-2.5 rounded-full transition-colors shadow-sm shrink-0"
              aria-label={`Carrinho com ${totalItems} itens`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden lg:inline">Carrinho</span>
              {totalItems > 0 && (
                <span className="bg-white text-brand-folha-acai text-xs font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Orders — desktop only */}
            <Link
              href="/pedidos"
              className="hidden lg:flex items-center text-sm text-muted-foreground hover:text-foreground border border-border/40 rounded-full px-3 py-2 hover:bg-muted transition-colors shrink-0"
            >
              Pedidos
            </Link>

            {/* Account */}
            <Link
              href={user ? "/conta" : "/login"}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border/40 rounded-full px-3 py-2 hover:bg-muted transition-colors shrink-0"
              aria-label={user ? "Minha conta" : "Entrar"}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{user ? "Conta" : "Entrar"}</span>
            </Link>

            {/* Theme toggle — Sun / Moon */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              className="
                flex items-center justify-center
                w-9 h-9 rounded-full
                border border-border/40
                text-muted-foreground hover:text-foreground
                hover:bg-muted
                transition-all duration-200
                shrink-0
              "
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md md:hidden flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar açaí, sorvetes..."
                className="
                  w-full bg-brand-surface-2 border border-border/40 rounded-full
                  pl-9 pr-4 py-2.5 text-sm outline-none
                  focus:ring-2 focus:ring-brand-pop-shake/30
                "
              />
            </div>
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 rounded-full hover:bg-brand-surface-2 text-muted-foreground"
              aria-label="Fechar busca"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search results preview */}
          {search && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum produto encontrado para &ldquo;{search}&rdquo;
                </p>
              ) : (
                filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      handleAddToCart(p);
                      setMobileSearchOpen(false);
                      setSearch("");
                    }}
                    className="w-full flex items-center gap-3 bg-card rounded-2xl p-3 border border-border/30 hover:border-brand-pop-shake/30 hover:shadow-sm transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-brand-surface-2 shrink-0">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                        : <div className="w-full h-full flex items-center justify-center"><span className="font-heading font-black gradient-text-brand">{p.name[0]}</span></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    </div>
                    <span className="font-heading font-black text-sm text-brand-pop-shake shrink-0">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────
          CATEGORY BAR — sticky below header
          py-3 (not py-2) gives chips room for their bottom shadow.
          The chips scroll container uses pb-3 so the claymorphic
          box-shadow isn’t clipped by the parent overflow-x.
      ───────────────────────────────────────── */}
      <div
        data-category-bar
        className="sticky top-[61px] z-30 bg-background/95 dark:bg-[#190B1A]/95 backdrop-blur-sm border-b border-border/30"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/*
            pt-3 pb-4: extra bottom padding lets chip shadows breathe.
            overflow-x-auto clipping is solved by NOT using overflow-hidden
            on any ancestor — only overflow-x-auto here.
          */}
          <div className="flex overflow-x-auto gap-2 no-scrollbar items-center pt-3 pb-4">

            {/* “Todos” chip */}
            <button
              onClick={() => setActiveCategory(null)}
              aria-pressed={activeCategory === null}
              className={`
                chip-clay shrink-0
                flex items-center gap-1.5
                px-4 py-2 rounded-full
                text-xs font-semibold
                border transition-all duration-200 min-h-[40px]
                ${
                  activeCategory === null
                    ? "category-active border-transparent"
                    : "bg-card border-border/40 text-foreground hover:text-brand-pop-shake hover:border-brand-pop-shake/40 hover:bg-muted"
                }
              `}
            >
              🏠 Todos
            </button>

            {categories.map((cat) => (
              <div key={cat.id} className="relative group shrink-0">
                <CategoryChip
                  category={cat}
                  isActive={activeCategory === cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                />
                {/* Admin controls on chip */}
                {isAdmin && (
                  <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1 bg-card/95 p-1 rounded-lg border border-border/30 shadow-sm z-10">
                    <button
                      onClick={() => { setEditingCategory(cat); setCatDialogOpen(true); }}
                      className="text-brand-pop-shake hover:bg-muted p-1 rounded-md transition-colors"
                      title="Editar categoria"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-destructive hover:bg-red-500/10 p-1 rounded-md transition-colors"
                      title="Deletar categoria"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Admin: add category */}
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => { setEditingCategory(null); setCatDialogOpen(true); }}
                className="shrink-0 rounded-full border-dashed border-brand-pop-shake/40 text-brand-pop-shake/60 hover:text-brand-pop-shake hover:border-brand-pop-shake hover:bg-brand-pop-shake/5 h-10 px-3 text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          MAIN CONTENT
      ───────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">

        {/* Promo banners */}
        <PromoBanner />

        {/* Product sections by category */}
        <div className="space-y-10">
          {categories.map((cat, catIndex) => {
            const catProducts = filteredProducts.filter(
              (p) => p.category_id === cat.id || p.category === cat.name
            );

            if (catProducts.length === 0 && !isAdmin) return null;

            // First category gets a featured (wide) card for the first product
            const hasFeatured = catIndex === 0 && catProducts.length >= 1;

            return (
              <section
                key={cat.id}
                id={`category-${cat.id}`}
                className="scroll-mt-36"
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-black text-foreground flex items-center gap-2">
                    <span className="w-1 h-6 rounded-full bg-gradient-to-b from-brand-pop-shake to-brand-magenta inline-block" />
                    {cat.name}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({catProducts.length})
                    </span>
                  </h2>
                </div>

                {/* ── Bento Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {catProducts.map((product, prodIndex) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      isAdmin={isAdmin}
                      onEdit={(p) => { setEditingProduct(p); setProdDialogOpen(true); }}
                      onDelete={handleDeleteProduct}
                      featured={hasFeatured && prodIndex === 0}
                    />
                  ))}

                  {/* Admin: add product */}
                  {isAdmin && (
                    <button
                      onClick={() => { setEditingProduct(null); setProdDialogOpen(true); }}
                      className="
                        flex flex-col items-center justify-center gap-2
                        border-2 border-dashed border-brand-pop-shake/25
                        bg-brand-pop-shake/3 hover:bg-brand-pop-shake/8
                        hover:border-brand-pop-shake/50
                        rounded-2xl
                        min-h-[200px]
                        text-brand-pop-shake/50 hover:text-brand-pop-shake
                        transition-all duration-200
                      "
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-pop-shake/10 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        Novo Produto
                      </span>
                    </button>
                  )}
                </div>
              </section>
            );
          })}

          {/* Empty state when searching */}
          {search && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center py-20 gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-brand-surface-2 flex items-center justify-center text-4xl">
                🔍
              </div>
              <div>
                <p className="font-heading font-bold text-foreground text-lg">
                  Nada encontrado
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Não encontramos resultados para &ldquo;{search}&rdquo;
                </p>
              </div>
              <button
                onClick={() => setSearch("")}
                className="text-sm font-semibold text-brand-pop-shake hover:underline"
              >
                Limpar busca
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────
          MOBILE — Floating cart bar (when items > 0)
          Shows above BottomNav
      ───────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 md:hidden z-40 px-4 pb-2">
          <Link href="/carrinho">
            <button className="
              btn-clay w-full
              bg-brand-folha-acai text-white
              font-heading font-bold text-sm
              h-12 rounded-2xl
              flex items-center justify-between px-4
              shadow-green-clay
            ">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Ver Carrinho ({totalItems})
              </span>
              <span className="font-mono font-black text-base">
                R$ {formattedTotal}
              </span>
            </button>
          </Link>
        </div>
      )}

      {/* ─────────────────────────────────────────
          BOTTOM NAV (mobile only)
      ───────────────────────────────────────── */}
      <BottomNav
        onSearchClick={() => setMobileSearchOpen(true)}
        onCategoriesClick={() => {
          const bar = document.querySelector("[data-category-bar]");
          bar?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* ─────────────────────────────────────────
          CART DRAWER (desktop)
      ───────────────────────────────────────── */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* ─────────────────────────────────────────
          ADMIN MODALS — unchanged logic
      ───────────────────────────────────────── */}
      <CategoryFormDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        categoryToEdit={editingCategory}
        onSaved={fetchData}
      />
      <ProductFormDialog
        open={prodDialogOpen}
        onOpenChange={setProdDialogOpen}
        productToEdit={editingProduct}
        categories={categories}
        onSaved={fetchData}
      />
    </div>
  );
}
