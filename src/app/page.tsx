"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { productService, Product } from "../services/productService";
import { categoryService, Category } from "../services/categoryService";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useTheme } from "../contexts/ThemeContext";

// Storefront components
import { PromoBanner } from "../components/storefront/PromoBanner";
import { ProductCard } from "../components/storefront/ProductCard";
import { CategoryChip } from "../components/storefront/CategoryChip";
import { BottomNav } from "../components/storefront/BottomNav";
import { CartDrawer } from "../components/storefront/CartDrawer";
import { SearchAutocomplete } from "../components/storefront/SearchAutocomplete";
import { Footer } from "../components/storefront/Footer";

// Admin components (unchanged)
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";
import { EditBannerModal } from "../components/admin/EditBannerModal";
import { AdminEditModeToggle } from "../components/admin/AdminEditModeToggle";
import { bannerService, HighlightBannerData } from "../services/bannerService";
import { useEditMode } from "../contexts/EditModeContext";

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
  ChevronRight,
  LogOut,
  ShieldCheck,
  Pencil,
  Trash2,
  ReceiptText,
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function Storefront() {
  const { isAdmin, user, refreshUser } = useAuth();
  const { isEditMode } = useEditMode();
  const canEdit = isAdmin && isEditMode;
  const { addItem, totalItems, itemsTotal } = useCart();
  const { theme, toggleTheme } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Admin modal state — unchanged
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Faixa de Destaque Promocional
  const [highlightBanner, setHighlightBanner] = useState<HighlightBannerData>({
    icon: "🥣",
    title: "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos",
    subtitle: "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha.",
    badge: "Refrescância Artesanal",
  });
  const [editBannerModalOpen, setEditBannerModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const userFirstName = user
    ? (user.fullName || user.user_metadata?.full_name || user.username || user.email.split("@")[0]).split(" ")[0]
    : "";

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
      setLoading(true);
      setFetchError(null);

      const [catsRes, prodsRes, bannerRes] = await Promise.allSettled([
        categoryService.getCategories(),
        productService.getProducts(),
        bannerService.getHighlightBanner(),
      ]);

      let hasData = false;

      if (catsRes.status === "fulfilled") {
        setCategories(catsRes.value);
        if (catsRes.value.length > 0) hasData = true;
      } else {
        console.error("Erro ao carregar categorias:", catsRes.reason);
      }

      if (prodsRes.status === "fulfilled") {
        setProducts(prodsRes.value);
        if (prodsRes.value.length > 0) hasData = true;
      } else {
        console.error("Erro ao carregar produtos:", prodsRes.reason);
      }

      if (bannerRes.status === "fulfilled" && bannerRes.value) {
        setHighlightBanner(bannerRes.value);
      }

      if (!hasData && (catsRes.status === "rejected" || prodsRes.status === "rejected")) {
        setFetchError("Não foi possível carregar os itens do cardápio. Verifique a conexão com a rede.");
      }
    } catch (err: any) {
      console.error("Erro geral no fetchData:", err);
      setFetchError("Erro ao carregar dados do cardápio.");
    } finally {
      setLoading(false);
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
    },
    [addItem]
  );

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    setTimeout(() => {
      const el = document.getElementById(`category-${catId}`);
      if (el) {
        const offset = 140; // header + category bar height
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }, 50);
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">

          {/* ── LEFT: Logo + Address ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 select-none cursor-pointer hover:opacity-85 transition-opacity duration-200 shrink-0"
              aria-label="Pop Shake — Início"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.png"
                alt="Logo Pop Shake"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain border border-[#9306CF]/30 shadow-xs shrink-0"
              />
              <span className="font-heading font-black text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-1.5 shrink-0">
                Pop<span className="gradient-text-brand">Shake</span>
                <span className="text-[11px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20 hidden sm:inline-block">
                  Sorveteria
                </span>
              </span>
            </Link>

            {/* Address selector — desktop only */}
            <button className="hidden xl:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border/40 rounded-xl px-3 py-2 hover:bg-muted shrink-0">
              <MapPin className="w-4 h-4 text-brand-pop-shake shrink-0" />
              <span className="font-medium max-w-[140px] truncate">Adicionar endereço</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          {/* ── CENTER: Search com Autocomplete Instantâneo ── */}
          <div className="flex-1 min-w-[180px] max-w-md mx-2 sm:mx-4">
            <SearchAutocomplete
              products={products}
              initialValue={search}
              placeholder="Buscar..."
            />
          </div>

          {/* ── RIGHT: Actions — all shrink-0, never wraps ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Cart button — opens drawer */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 bg-brand-folha-acai hover:bg-brand-folha-acai-dk text-white font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-colors shadow-sm shrink-0 cursor-pointer"
              aria-label={`Carrinho com ${totalItems} itens`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItems > 0 && (
                <span className="bg-white text-brand-folha-acai text-xs font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Meus Pedidos — visible to both clients and admin */}
            <Link
              href="/pedidos"
              className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4C264F] dark:text-[#F9F5F9] border border-border/50 hover:border-[#9306CF]/50 bg-white/60 dark:bg-[#230E26]/60 hover:bg-muted/80 rounded-full px-3 sm:px-3.5 py-1.5 sm:py-2 transition-all shrink-0 shadow-sm group"
              title="Acompanhar Meus Pedidos"
              aria-label="Ver meus pedidos"
            >
              <ReceiptText className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] group-hover:scale-110 transition-transform shrink-0" />
              <span className="hidden md:inline">Meus Pedidos</span>
            </Link>

            {/* Switch de Modo Edição — exclusivo para Administrador */}
            {isAdmin && <AdminEditModeToggle />}

            {/* Account / User Menu */}
            {!user ? (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4C264F] dark:text-[#F9F5F9] border border-border/40 rounded-full px-3 sm:px-3.5 py-1.5 hover:bg-muted transition-colors shrink-0"
                aria-label="Entrar na conta"
              >
                <UserIcon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            ) : (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 border border-border/50 hover:border-[#9306CF]/50 bg-white/60 dark:bg-[#230E26]/60 hover:bg-muted/80 rounded-full pl-1.5 pr-2.5 sm:pr-3 py-1 transition-all shrink-0 group shadow-sm"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label={`Menu do usuário: ${userFirstName}`}
                >
                  {/* Avatar circular */}
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#9306CF] to-[#940068] text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-white/20 shrink-0">
                    {userFirstName.charAt(0).toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
                  </div>

                  {/* Primeiro nome */}
                  <span className="text-xs sm:text-sm font-semibold text-[#4C264F] dark:text-[#F9F5F9] max-w-[80px] sm:max-w-[120px] truncate shrink-0">
                    {userFirstName}
                  </span>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-[#9306CF] transition-transform duration-200 shrink-0 ${
                      userMenuOpen ? "rotate-180 text-[#9306CF]" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/50 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Cabeçalho do Dropdown */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-[#512B54]/30">
                      <p className="text-xs font-semibold text-[#4C264F] dark:text-[#F9F5F9] truncate">
                        {user.fullName || user.username}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/30 px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>

                    {/* Links dinâmicos por tipo de usuário */}
                    <div className="py-1">
                      {isAdmin ? (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Painel Operacional
                          </Link>

                          <Link
                            href="/admin/pedidos"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <ClipboardList className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Gerenciar Pedidos
                          </Link>

                          <Link
                            href="/pedidos"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <ReceiptText className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Meus Pedidos
                          </Link>

                          <Link
                            href="/conta"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <UserIcon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Meu Perfil
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/pedidos"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <ShoppingBag className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Meus Pedidos
                          </Link>

                          <Link
                            href="/conta"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <UserIcon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Meu Perfil
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="border-t border-gray-100 dark:border-[#512B54]/30 my-1" />

                    {/* Sair */}
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await authService.signOut();
                        await refreshUser();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}

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
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md md:hidden flex flex-col p-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/30">
            <div className="flex-1">
              <SearchAutocomplete
                products={products}
                initialValue={search}
                placeholder="Buscar..."
                autoFocus
                onNavigateToResults={() => setMobileSearchOpen(false)}
                onSelectProduct={(p) => {
                  handleAddToCart(p);
                  setMobileSearchOpen(false);
                }}
              />
            </div>
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground"
              aria-label="Fechar busca"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
            {loading && categories.length === 0 ? (
              <>
                <div className="shrink-0 w-20 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 w-28 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 w-24 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 w-32 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 w-24 h-10 rounded-full skeleton-light" />
              </>
            ) : (
              <>
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
                    {canEdit && (
                      <div className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-[#2B132D] shadow-md border border-purple-200 dark:border-purple-800 rounded-full p-1 z-20 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setCatDialogOpen(true);
                          }}
                          className="text-[#9306CF] hover:text-[#940068] hover:bg-purple-100 dark:hover:bg-purple-900/40 p-1 rounded-full transition-colors"
                          title="Editar categoria"
                          aria-label={`Editar categoria ${cat.name}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 p-1 rounded-full transition-colors"
                          title="Deletar categoria"
                          aria-label={`Deletar categoria ${cat.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Admin: add category */}
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => { setEditingCategory(null); setCatDialogOpen(true); }}
                    className="shrink-0 rounded-full border-dashed border-brand-pop-shake/40 text-brand-pop-shake/60 hover:text-brand-pop-shake hover:border-brand-pop-shake hover:bg-brand-pop-shake/5 h-10 px-3 text-xs gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova
                  </Button>
                )}
              </>
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

        {/* Banner Comercial de Destaque e Apelo de Sabor */}
        <div
          className={`mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#9306CF]/10 via-[#940068]/10 to-[#10B981]/10 border border-[#9306CF]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm ${
            canEdit ? "group relative" : ""
          }`}
        >
          <div className="flex items-center gap-3.5">
            <span className="text-3xl shrink-0">{highlightBanner.icon || "🥣"}</span>
            <div>
              <p className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9]">
                {highlightBanner.title || "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {highlightBanner.subtitle || "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white dark:bg-[#1A0B1C] text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/25 shadow-sm">
              {highlightBanner.badge || "Refrescância Artesanal"}
            </span>

            {/* Botão flutuante para administradores editarem a faixa */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditBannerModalOpen(true)}
                className="bg-white dark:bg-[#2B132D] shadow-md border border-purple-300 dark:border-purple-700 p-2 rounded-full hover:scale-105 transition-all text-[#9306CF] dark:text-[#C7A9C9] hover:text-[#940068] dark:hover:text-white cursor-pointer ml-1"
                title="Editar Faixa Promocional"
                aria-label="Editar Faixa Promocional"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Product sections by category */}
        <div className="space-y-10">
          {loading && products.length === 0 ? (
            /* Skeleton Loading Grid */
            <div className="space-y-8" aria-label="Carregando cardápio">
              {[1, 2].map((sec) => (
                <div key={sec} className="space-y-4">
                  <div className="h-6 w-48 rounded-md skeleton-light" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-64 rounded-2xl skeleton-light" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError && products.length === 0 ? (
            /* Error Fallback with Retry Button */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground mb-1">
                Não foi possível carregar o cardápio
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                {fetchError}
              </p>
              <Button
                onClick={fetchData}
                className="bg-brand-folha-acai hover:bg-brand-folha-acai-dk text-white rounded-full px-6 py-2 gap-2 text-sm font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
            </div>
          ) : (
            categories.map((cat, catIndex) => {
            // Se tiver uma categoria ativa e não for essa, esconde
            if (activeCategory && activeCategory !== cat.id) return null;

            const catProducts = filteredProducts.filter(
              (p) => p.category_id === cat.id || p.category === cat.name
            );

            if (catProducts.length === 0 && !canEdit) return null;

            // Modo Prévia (na Home) vs Modo Completo
            const isPreview = !activeCategory && !search;
            const displayProducts = isPreview ? catProducts.slice(0, 4) : catProducts;
            const hasMore = catProducts.length > 4;

            // First category gets a featured (wide) card for the first product
            const hasFeatured = catIndex === 0 && !activeCategory && !search;

            return (
              <section
                key={cat.id}
                id={`category-${cat.id}`}
                className="scroll-mt-36"
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                    <span className="w-1 h-6 rounded-full bg-gradient-to-b from-brand-pop-shake to-brand-magenta inline-block" />
                    {cat.name}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({catProducts.length})
                    </span>
                  </h2>

                  {/* Botão Ver Mais (iFood style) */}
                  {isPreview && catProducts.length > 0 && (
                    <button
                      onClick={() => scrollToCategory(cat.id)}
                      className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Ver todos ({catProducts.length}) <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Voltar (Quando está no modo filtrado/completo) */}
                  {activeCategory && (
                    <button
                      onClick={() => {
                        setActiveCategory(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-sm font-semibold text-muted-foreground hover:text-[#4C264F] dark:hover:text-[#F9F5F9] hover:underline flex items-center gap-1 min-h-[44px] transition-colors"
                    >
                      Voltar
                    </button>
                  )}
                </div>

                {/* ── Bento Grid / Slider Mobile ── */}
                <div className={
                  isPreview
                    ? "flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:snap-none"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                }>
                  {displayProducts.map((product, prodIndex) => (
                    <div key={product.id} className={isPreview ? "min-w-[80%] sm:min-w-0 snap-start shrink-0" : ""}>
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        isAdmin={canEdit}
                        onEdit={(p) => { setEditingProduct(p); setProdDialogOpen(true); }}
                        onDelete={handleDeleteProduct}
                        featured={hasFeatured && prodIndex === 0}
                      />
                    </div>
                  ))}

                  {/* Admin: add product */}
                  {canEdit && (
                    <button
                      onClick={() => { setEditingProduct(null); setProdDialogOpen(true); }}
                      className={`
                        flex flex-col items-center justify-center gap-2
                        border-2 border-dashed border-brand-pop-shake/25
                        bg-brand-pop-shake/3 hover:bg-brand-pop-shake/8
                        hover:border-brand-pop-shake/50
                        rounded-2xl
                        min-h-[200px]
                        text-brand-pop-shake/50 hover:text-brand-pop-shake
                        transition-all duration-200
                        ${isPreview ? "min-w-[80%] sm:min-w-0 snap-start shrink-0" : ""}
                      `}
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
          }))}

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
          RODAPÉ INSTITUCIONAL
      ───────────────────────────────────────── */}
      <Footer />

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
      <EditBannerModal
        open={editBannerModalOpen}
        onOpenChange={setEditBannerModalOpen}
        currentBanner={highlightBanner}
        onSaved={(updated) => setHighlightBanner(updated)}
      />
    </div>
  );
}
