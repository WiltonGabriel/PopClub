"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { CategoryChip, parseCategoryEmojiAndName } from "../components/storefront/CategoryChip";
import { BottomNav } from "../components/storefront/BottomNav";
import { CartDrawer } from "../components/storefront/CartDrawer";
import { SearchAutocomplete } from "../components/storefront/SearchAutocomplete";
import { Footer } from "../components/storefront/Footer";
import { ProductDetailModal } from "../components/storefront/ProductDetailModal";
import { HeaderAddressButton } from "../components/storefront/HeaderAddressButton";
import { CategoriesDrawer } from "../components/storefront/CategoriesDrawer";

// Admin components (unchanged)
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";
import { EditBannerModal } from "../components/admin/EditBannerModal";
import { AdminEditModeToggle } from "../components/admin/AdminEditModeToggle";
import { bannerService, HighlightBannerData } from "../services/bannerService";
import { useEditMode } from "../contexts/EditModeContext";
import { storeSettingsService, StoreSettings } from "../services/storeSettingsService";

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
  ChevronLeft,
  LogOut,
  ShieldCheck,
  Crown,
  Pencil,
  Trash2,
  ReceiptText,
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowUpDown,
  History,
  Clock,
} from "lucide-react";

export type HomeSectionId = "promo_banners" | "highlight_banner" | "products_catalog";

const DEFAULT_SECTIONS_ORDER: HomeSectionId[] = [
  "promo_banners",
  "highlight_banner",
  "products_catalog",
];

const SECTION_LABELS: Record<HomeSectionId, string> = {
  promo_banners: "Banners Promocionais",
  highlight_banner: "Faixa Comercial de Destaque",
  products_catalog: "Catálogo de Produtos & Categorias",
};

function SectionPositionControlBar({
  title,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  title: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex justify-end mb-2.5">
      <div className="inline-flex items-center gap-2 bg-white/95 dark:bg-[#200D22]/95 backdrop-blur-md border border-purple-300/80 dark:border-purple-700/80 rounded-xl px-3 py-1.5 shadow-sm text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#9306CF] dark:text-[#C7A9C9]">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{title}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            ({index + 1}/{total})
          </span>
        </div>
        <div className="h-3.5 w-px bg-purple-200 dark:bg-purple-800" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-purple-100/70 dark:bg-purple-900/40 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-purple-200 dark:hover:bg-purple-800/60 active:scale-95 cursor-pointer disabled:hover:scale-100"
            title={index === 0 ? "Primeira seção da vitrine" : "Subir seção"}
            aria-label={`Subir seção ${title}`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Subir</span>
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-purple-100/70 dark:bg-purple-900/40 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-purple-200 dark:hover:bg-purple-800/60 active:scale-95 cursor-pointer disabled:hover:scale-100"
            title={index === total - 1 ? "Última seção da vitrine" : "Descer seção"}
            aria-label={`Descer seção ${title}`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Descer</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Storefront() {
  const { isAdmin, user, refreshUser } = useAuth();
  const { isEditMode } = useEditMode();
  const canEdit = isAdmin && isEditMode;
  const { addItem, totalItems, itemsTotal } = useCart();
  const { theme, toggleTheme } = useTheme();

  const [sectionsOrder, setSectionsOrder] = useState<HomeSectionId[]>(DEFAULT_SECTIONS_ORDER);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Modal de Detalhes e Personalização do Produto (estilo iFood)
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  const handleOpenProductModal = useCallback((product: Product) => {
    if (
      product.isAvailable === false ||
      (product.stock !== undefined && product.stock !== null && product.stock <= 0)
    ) {
      return;
    }
    setSelectedProductForModal(product);
    setProductModalOpen(true);
  }, []);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const [catsRes, prodsRes, bannerRes, settingsRes] = await Promise.allSettled([
        categoryService.getCategories(),
        productService.getProducts(),
        bannerService.getHighlightBanner(),
        storeSettingsService.getSettings(),
      ]);

      if (settingsRes.status === "fulfilled") {
        setStoreSettings(settingsRes.value);
      }

      let hasData = false;

      if (catsRes.status === "fulfilled") {
        let loadedCats = catsRes.value;
        try {
          const savedOrderStr = localStorage.getItem("popshake_category_order");
          if (savedOrderStr) {
            const savedOrder: string[] = JSON.parse(savedOrderStr);
            loadedCats = [...loadedCats].sort((a, b) => {
              const idxA = savedOrder.indexOf(a.id);
              const idxB = savedOrder.indexOf(b.id);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          }
        } catch {}
        setCategories(loadedCats);
        if (loadedCats.length > 0) hasData = true;
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
    } catch (err: unknown) {
      console.error("Erro geral no fetchData:", err);
      setFetchError("Erro ao carregar dados do cardápio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    try {
      const savedOrderStr = localStorage.getItem("popshake_home_sections_order");
      if (savedOrderStr) {
        const savedOrder: HomeSectionId[] = JSON.parse(savedOrderStr);
        if (Array.isArray(savedOrder)) {
          const valid = savedOrder.filter((id) => DEFAULT_SECTIONS_ORDER.includes(id));
          for (const defId of DEFAULT_SECTIONS_ORDER) {
            if (!valid.includes(defId)) {
              valid.push(defId);
            }
          }
          if (valid.length === DEFAULT_SECTIONS_ORDER.length) {
            setSectionsOrder(valid);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao carregar popshake_home_sections_order:", err);
    }
  }, [fetchData]);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  // State for drag & drop category reordering
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);

  // Sincronização em Tempo Real (Single Source of Truth) ao salvar categoria
  const handleCategorySaved = (savedCat: Category) => {
    // 1. Atualiza imediatamente o estado de categorias em memória (0ms latency)
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === savedCat.id);
      let updatedList: Category[];
      if (exists) {
        updatedList = prev.map((c) => (c.id === savedCat.id ? { ...c, ...savedCat } : c));
      } else {
        updatedList = [...prev, savedCat];
      }
      try {
        localStorage.setItem("popshake_category_order", JSON.stringify(updatedList.map((c) => c.id)));
      } catch {}
      return updatedList;
    });

    // 2. Se o nome da categoria foi alterado, sincroniza em tempo real os produtos em memória
    setProducts((prev) =>
      prev.map((p) => {
        if (
          (p as any).categoryId === savedCat.id ||
          (p as any).category_id === savedCat.id ||
          (editingCategory && p.category === editingCategory.name)
        ) {
          return { ...p, category: savedCat.name, categoryId: savedCat.id, category_id: savedCat.id };
        }
        return p;
      })
    );

    // 3. Sincroniza em background com o backend
    fetchData();
  };

  // Reordenação de seções da vitrine (Home) no Modo Edição
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sectionsOrder.length) return;

    setSectionsOrder((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      try {
        localStorage.setItem("popshake_home_sections_order", JSON.stringify(next));
      } catch (err) {
        console.error("Erro ao salvar ordem das seções:", err);
      }
      return next;
    });
  };

  // Reordenação de categorias via botões de seta
  const handleMoveCategory = (index: number, direction: "left" | "right" | "up" | "down") => {
    const isBackward = direction === "left" || direction === "up";
    const targetIndex = isBackward ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    setCategories((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      try {
        localStorage.setItem("popshake_category_order", JSON.stringify(next.map((c) => c.id)));
      } catch {}
      return next;
    });
  };

  // Drag & drop de categorias
  const handleDragStart = (index: number) => {
    setDraggedCatIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) return;
    setCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedCatIndex, 1);
      next.splice(targetIndex, 0, moved);
      try {
        localStorage.setItem("popshake_category_order", JSON.stringify(next.map((c) => c.id)));
      } catch {}
      return next;
    });
    setDraggedCatIndex(null);
  };

  // Admin handlers
  const handleDeleteCategory = async (id: string) => {
    if (confirm("Deletar esta categoria? Produtos associados perderão o vínculo.")) {
      await categoryService.deleteCategory(id);
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        try {
          localStorage.setItem("popshake_category_order", JSON.stringify(next.map((c) => c.id)));
        } catch {}
        return next;
      });
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

  // Salva posição de scroll da vitrine para restaurar ao voltar da categoria dedicada no mobile
  const savedScrollYRef = useRef<number>(0);
  const [mobileCategoryView, setMobileCategoryView] = useState<Category | null>(null);

  // Escuta o botão voltar do celular/navegador para fechar a visualização dedicada suavemente
  useEffect(() => {
    const handlePopState = () => {
      if (mobileCategoryView) {
        setMobileCategoryView(null);
        setActiveCategory(null);
        const targetScroll = savedScrollYRef.current || 0;
        setTimeout(() => {
          window.scrollTo({ top: targetScroll, behavior: "instant" });
        }, 20);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobileCategoryView]);

  const handleCloseMobileCategoryView = useCallback(() => {
    setMobileCategoryView(null);
    setActiveCategory(null);
    if (typeof window !== "undefined" && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.delete("categoria");
      url.searchParams.delete("category");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
    const targetScroll = savedScrollYRef.current || 0;
    setTimeout(() => {
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    }, 20);
  }, []);

  const handleSelectCategory = useCallback(
    (catId: string | null) => {
      if (!catId || catId === "all" || catId === "todas") {
        if (mobileCategoryView) {
          handleCloseMobileCategoryView();
        } else {
          setActiveCategory(null);
          if (typeof window !== "undefined" && window.history) {
            const url = new URL(window.location.href);
            url.searchParams.delete("categoria");
            url.searchParams.delete("category");
            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      const cat = categories.find(
        (c) => c.id === catId || (c.slug && c.slug === catId) || c.name.toLowerCase() === catId.toLowerCase()
      );
      const effectiveId = cat ? cat.id : catId;

      if (typeof window !== "undefined" && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.set("categoria", cat?.slug || effectiveId);
        window.history.replaceState({ categoryId: effectiveId }, "", url.pathname + url.search);
      }

      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

      if (isMobile && cat) {
        if (!mobileCategoryView) {
          savedScrollYRef.current = window.scrollY;
        }
        setActiveCategory(cat.id);
        setMobileCategoryView(cat);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 30);
        return;
      }

      // Desktop / Tablet: rola suavemente até o container da categoria
      setActiveCategory(effectiveId);
      setTimeout(() => {
        const el = document.getElementById(`category-${effectiveId}`);
        if (el) {
          const offset = 140; // header + category bar height
          const top = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 50);
    },
    [categories, mobileCategoryView, handleCloseMobileCategoryView]
  );

  // Sincroniza categoria inicial via URL (?categoria=... ou ?category=...)
  useEffect(() => {
    if (typeof window === "undefined" || categories.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get("categoria") || urlParams.get("category");
    if (catParam && catParam !== "all" && catParam !== "todas") {
      const matched = categories.find(
        (c) => c.id === catParam || (c.slug && c.slug === catParam) || c.name.toLowerCase() === catParam.toLowerCase()
      );
      if (matched && activeCategory !== matched.id) {
        handleSelectCategory(matched.id);
      }
    }
  }, [categories, handleSelectCategory, activeCategory]);

  const scrollToCategory = handleSelectCategory;

  // Produtos filtrados para a visualização dedicada de categoria no mobile
  const dedicatedCategoryProducts = useMemo(() => {
    if (!mobileCategoryView) return [];
    return products.filter(
      (p) =>
        p.category_id === mobileCategoryView.id ||
        (p as any).categoryId === mobileCategoryView.id ||
        p.category === mobileCategoryView.name
    );
  }, [products, mobileCategoryView]);

  const { emoji: dedicatedCategoryEmoji, cleanName: dedicatedCategoryName } = useMemo(() => {
    if (!mobileCategoryView) return { emoji: "🍧", cleanName: "" };
    return parseCategoryEmojiAndName(mobileCategoryView.name);
  }, [mobileCategoryView]);

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
      {/* ─────────────────────────────────────────
          HEADER COMPACTO & PROFISSIONAL
          Mobile: Logo + Endereço + Menu/Avatar (Sem cortes)
          Desktop: Logo + Endereço + Busca + Pedidos + AdminToggle + Carrinho + Perfil + Tema
      ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full glass-header">
        {/* Single contained row — max-w-7xl keeps it from stretching */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 w-full">

          {/* ── 1. ESQUERDA: Logotipo tipográfico PopShake + Chip de Endereço no Mobile ── */}
          <div className="flex items-center gap-2 min-w-0 shrink">
            <Link
              href="/"
              onClick={() => {
                if (mobileCategoryView) {
                  handleCloseMobileCategoryView();
                }
              }}
              className="flex items-center select-none cursor-pointer hover:opacity-85 transition-opacity duration-200 shrink-0"
              aria-label="Pop Shake — Início"
            >
              <span className="font-heading font-black text-lg xs:text-xl sm:text-2xl tracking-tight text-foreground flex items-center shrink-0">
                Pop<span className="gradient-text-brand">Shake</span>
              </span>
            </Link>

            {/* Chip de endereço agrupado à esquerda no Mobile (< md) */}
            <div className="flex md:hidden items-center min-w-0">
              <HeaderAddressButton
                isMobile
                className="max-w-[110px] truncate text-xs px-2 py-1 rounded-full border-border/40"
              />
            </div>
          </div>

          {/* ── 2. CENTRO: Busca Centralizada no Mobile (< md) ── */}
          <div className="flex md:hidden flex-1 justify-center max-w-[160px] mx-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border/50 hover:border-[#9306CF]/50 bg-white/60 dark:bg-[#230E26]/60 hover:bg-muted/80 text-foreground transition-all shadow-xs active:scale-95 cursor-pointer"
              aria-label="Buscar produtos no cardápio"
              title="Buscar produtos"
            >
              <Search className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
            </button>
          </div>

          {/* ── CENTRO-DESKTOP: Endereço + Busca com Autocomplete (md+) ── */}
          <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl mx-4 min-w-0">
            <HeaderAddressButton className="shrink-0" />
            <div className="flex-1 min-w-[180px]">
              <SearchAutocomplete
                products={products}
                initialValue={search}
                placeholder="Buscar produtos, sabores..."
                onSelectProduct={handleOpenProductModal}
              />
            </div>
          </div>

          {/* ── 3. DIREITA: Actions (No mobile: apenas Avatar na extrema direita) ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* 1. [ Meus Pedidos ] — Desktop only */}
            <Link
              href="/pedidos"
              className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4C264F] dark:text-[#F9F5F9] border border-border/50 hover:border-[#9306CF]/50 bg-white/60 dark:bg-[#230E26]/60 hover:bg-muted/80 rounded-full px-3 sm:px-3.5 py-2 transition-all shrink-0 shadow-xs group cursor-pointer"
              title="Acompanhar Meus Pedidos"
              aria-label="Ver meus pedidos"
            >
              <ReceiptText className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] group-hover:scale-110 transition-transform shrink-0" />
              <span>Meus Pedidos</span>
            </Link>

            {/* 2. [ Modo de Edição / Visualizar ] — exclusivo para Administrador no Desktop */}
            {isAdmin && <AdminEditModeToggle />}

            {/* 3. [ Ícone do Carrinho ] — Compacto (apenas ícone), imediatamente à esquerda do Perfil */}
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

            {/* 4. [ Menu de Perfil / Administrador / Visitante ] */}
            {!user ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 sm:gap-2 border border-border/50 hover:border-[#9306CF]/50 bg-white/60 dark:bg-[#230E26]/60 hover:bg-muted/80 rounded-full p-1.5 md:px-3.5 md:py-2 transition-all shrink-0 group shadow-xs cursor-pointer"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="Menu de perfil e entrada"
                >
                  <UserIcon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0" />
                  <span className="hidden md:inline text-xs sm:text-sm font-semibold text-[#4C264F] dark:text-[#F9F5F9]">
                    Entrar
                  </span>
                  <ChevronDown
                    className={`hidden md:inline-flex w-3.5 h-3.5 text-muted-foreground group-hover:text-[#9306CF] transition-transform duration-200 shrink-0 ${
                      userMenuOpen ? "rotate-180 text-[#9306CF]" : ""
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 sm:w-60 rounded-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/50 shadow-2xl py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-[#512B54]/30">
                      <p className="text-xs font-semibold text-[#4C264F] dark:text-[#F9F5F9]">
                        Bem-vindo ao PopShake
                      </p>
                      <p className="text-[11px] text-muted-foreground">Identifique-se para fazer seu pedido</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                        Entrar na Conta
                      </Link>
                    </div>

                    <div className="border-t border-gray-100 dark:border-[#512B54]/30 my-1" />

                    {/* Alterar tema */}
                    <button
                      type="button"
                      onClick={() => toggleTheme()}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors text-left cursor-pointer"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0" />
                      )}
                      <span>Alterar tema</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 sm:gap-2 border border-border/50 hover:border-[#9306CF]/50 bg-white/60 dark:bg-[#230E26]/60 hover:bg-muted/80 rounded-full p-1 md:pl-1.5 md:pr-3 md:py-1 transition-all shrink-0 group shadow-xs cursor-pointer"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label={`Menu do usuário: ${userFirstName}`}
                >
                  {/* Avatar circular com moldura e micro-badge para Administrador */}
                  <div
                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#9306CF] to-[#940068] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 transition-all ${
                      isAdmin
                        ? "ring-2 ring-purple-600 dark:ring-purple-400 ring-offset-2 ring-offset-background"
                        : "ring-1 ring-white/20"
                    }`}
                  >
                    {user.avatar || user.avatarUrl ? (
                      <img
                        src={(user.avatar || user.avatarUrl) as string}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover p-0.5"
                      />
                    ) : (
                      userFirstName.charAt(0).toUpperCase() || <UserIcon className="w-3.5 h-3.5" />
                    )}

                    {/* Micro-tag/badge flutuante para Administrador */}
                    {isAdmin && (
                      <span
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs ring-1 ring-background"
                        title="Administrador"
                      >
                        <Crown className="w-2.5 h-2.5 fill-current" />
                      </span>
                    )}
                  </div>

                  {/* Nome do usuário truncado — Oculto no Mobile (< md) */}
                  <span className="hidden md:inline-flex text-xs sm:text-sm font-semibold text-[#4C264F] dark:text-[#F9F5F9] max-w-[120px] truncate shrink-0">
                    {userFirstName}
                  </span>

                  {/* Chevron — Oculto no Mobile (< md) */}
                  <ChevronDown
                    className={`hidden md:inline-flex w-3.5 h-3.5 text-muted-foreground group-hover:text-[#9306CF] transition-transform duration-200 shrink-0 ${
                      userMenuOpen ? "rotate-180 text-[#9306CF]" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu com z-[100] garantido acima de qualquer barra */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 sm:w-60 rounded-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/50 shadow-2xl py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
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
                            href="/admin/historico"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors"
                          >
                            <History className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                            Histórico de Pedidos
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

                    {/* 🌓 Alterar tema — Fixo logo acima de Sair */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#9306CF]/10 hover:text-[#9306CF] dark:hover:text-white transition-colors text-left cursor-pointer"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0" />
                      )}
                      <span>Alterar tema</span>
                    </button>

                    <div className="border-t border-gray-100 dark:border-[#512B54]/30 my-1" />

                    {/* Sair */}
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await authService.signOut();
                        await refreshUser();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Banner Informativo de Loja Fechada */}
      {storeSettings && !storeSettings.isOpen && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-[#940068] text-white px-4 py-2.5 text-center text-xs sm:text-sm font-semibold shadow-md sticky top-[65px] z-30 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            Estamos fechados no momento. Nosso atendimento abrirá em breve! Você pode explorar o cardápio e montar seu pedido.
          </span>
        </div>
      )}

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
                  setMobileSearchOpen(false);
                  handleOpenProductModal(p);
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
        className="hidden md:block sticky top-[55px] sm:top-[61px] z-30 bg-background/95 dark:bg-[#190B1A]/95 backdrop-blur-md border-b border-border/30"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/*
            Carrossel com rolagem suave, inércia nativa touch e scroll snap
          */}
          <div className="flex overflow-x-auto gap-2 no-scrollbar items-center py-2.5 px-0.5 snap-x snap-mandatory scroll-smooth touch-pan-x [-webkit-overflow-scrolling:touch]">
            {loading && categories.length === 0 ? (
              <>
                <div className="shrink-0 snap-start w-20 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 snap-start w-28 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 snap-start w-24 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 snap-start w-32 h-10 rounded-full skeleton-light" />
                <div className="shrink-0 snap-start w-24 h-10 rounded-full skeleton-light" />
              </>
            ) : (
              <>
                {/* “Todos” chip */}
                <button
                  onClick={() => handleSelectCategory(null)}
                  aria-pressed={!activeCategory || activeCategory === "all" || activeCategory === "todas"}
                  className={`
                    chip-clay shrink-0 snap-start
                    flex items-center gap-1.5
                    px-4 py-2 rounded-full
                    text-xs font-semibold
                    border transition-all duration-200 min-h-[40px]
                    ${
                      !activeCategory || activeCategory === "all" || activeCategory === "todas"
                        ? "category-active border-transparent"
                        : "bg-card border-border/40 text-foreground hover:text-brand-pop-shake hover:border-brand-pop-shake/40 hover:bg-muted"
                    }
                  `}
                >
                  🏠 Todos
                </button>

                {categories.map((cat, catIdx) => {
                  const isCatSelected = activeCategory === cat.id || (cat.slug ? activeCategory === cat.slug : false);
                  return (
                    <div
                      key={cat.id}
                      className={`relative group shrink-0 snap-start transition-transform ${
                        draggedCatIndex === catIdx ? "opacity-40 scale-95" : ""
                      }`}
                    >
                      <CategoryChip
                        category={cat}
                        isActive={isCatSelected}
                        onClick={() => handleSelectCategory(cat.id)}
                      onContextMenu={(e) => {
                        if (canEdit) {
                          e.preventDefault();
                          setEditingCategory(cat);
                          setCatDialogOpen(true);
                        }
                      }}
                      title={canEdit ? "Clique com o botão direito ou no lápis para editar" : undefined}
                      draggable={canEdit}
                      onDragStart={() => handleDragStart(catIdx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(catIdx)}
                    />
                    {/* Admin controls on chip */}
                    {canEdit && (
                      <div className="absolute -top-3 -right-2 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-[#2B132D] shadow-lg border border-purple-200 dark:border-purple-800 rounded-full p-1 z-30 transition-all scale-95">
                        {/* Mover para esquerda */}
                        {catIdx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCategory(catIdx, "left");
                            }}
                            className="text-gray-500 hover:text-[#9306CF] hover:bg-purple-100 dark:hover:bg-purple-900/40 p-1 rounded-full transition-colors"
                            title="Mover para a esquerda"
                            aria-label="Mover categoria para a esquerda"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        )}
                        {/* Editar */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setCatDialogOpen(true);
                          }}
                          className="text-[#9306CF] hover:text-[#940068] hover:bg-purple-100 dark:hover:bg-purple-900/40 p-1 rounded-full transition-colors"
                          title="Editar emoji e nome (ou botão direito)"
                          aria-label={`Editar categoria ${cat.name}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {/* Mover para direita */}
                        {catIdx < categories.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCategory(catIdx, "right");
                            }}
                            className="text-gray-500 hover:text-[#9306CF] hover:bg-purple-100 dark:hover:bg-purple-900/40 p-1 rounded-full transition-colors"
                            title="Mover para a direita"
                            aria-label="Mover categoria para a direita"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        {/* Deletar */}
                        <button
                          type="button"
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
                );
              })}

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
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* ── VISUALIZAÇÃO DEDICADA DE CATEGORIA NO MOBILE ── */}
        {mobileCategoryView ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Cabeçalho da Categoria Dedicada com Botão Voltar Destacado */}
            <div className="sticky top-[49px] sm:top-[53px] z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-xs flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseMobileCategoryView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#9306CF]/30 bg-[#9306CF]/10 hover:bg-[#9306CF]/20 text-[#9306CF] dark:text-[#C7A9C9] font-heading font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs"
                aria-label="Voltar para a vitrine principal"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Voltar</span>
              </button>

              {/* Título da categoria com emoji/ícone e contador total de itens */}
              <div className="text-right min-w-0 flex-1">
                <h1 className="font-heading font-bold text-sm xs:text-base text-foreground truncate">
                  {dedicatedCategoryEmoji} {dedicatedCategoryName}
                </h1>
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  ({dedicatedCategoryProducts.length} {dedicatedCategoryProducts.length === 1 ? "produto" : "produtos"})
                </span>
              </div>
            </div>

            {/* Listagem Completa de Produtos da Categoria (Sem Carrosséis Horizontais) */}
            {dedicatedCategoryProducts.length > 0 ? (
              <div className="flex flex-col bg-card/60 rounded-2xl border border-border/30 px-2 sm:px-3 divide-y divide-border/20">
                {dedicatedCategoryProducts.map((product: Product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleOpenProductModal}
                    onOpenDetails={handleOpenProductModal}
                    isAdmin={canEdit}
                    onEdit={(p) => { setEditingProduct(p); setProdDialogOpen(true); }}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center space-y-4 bg-card/40 rounded-2xl border border-dashed border-border/60 p-6">
                <p className="text-muted-foreground text-sm">
                  Nenhum produto cadastrado nesta categoria no momento.
                </p>
                <Button
                  type="button"
                  onClick={handleCloseMobileCategoryView}
                  variant="outline"
                  className="rounded-xl border-[#9306CF]/40 text-[#9306CF] hover:bg-[#9306CF]/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Cardápio
                </Button>
              </div>
            )}
          </div>
        ) : (
          sectionsOrder.map((sectionId, sectionIndex) => {
          if (sectionId === "promo_banners") {
            return (
              <section key="promo_banners" className="relative group/sec">
                {canEdit && (
                  <SectionPositionControlBar
                    title={SECTION_LABELS.promo_banners}
                    index={sectionIndex}
                    total={sectionsOrder.length}
                    onMoveUp={() => handleMoveSection(sectionIndex, "up")}
                    onMoveDown={() => handleMoveSection(sectionIndex, "down")}
                  />
                )}
                <PromoBanner />
              </section>
            );
          }

          if (sectionId === "highlight_banner") {
            return (
              <section key="highlight_banner" className="relative group/sec">
                {canEdit && (
                  <SectionPositionControlBar
                    title={SECTION_LABELS.highlight_banner}
                    index={sectionIndex}
                    total={sectionsOrder.length}
                    onMoveUp={() => handleMoveSection(sectionIndex, "up")}
                    onMoveDown={() => handleMoveSection(sectionIndex, "down")}
                  />
                )}
                {/* Banner Comercial de Destaque e Apelo de Sabor */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#9306CF]/10 via-[#940068]/10 to-[#10B981]/10 border border-[#9306CF]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm ${
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
              </section>
            );
          }

          if (sectionId === "products_catalog") {
            return (
              <section key="products_catalog" className="relative group/sec">
                {canEdit && (
                  <SectionPositionControlBar
                    title={SECTION_LABELS.products_catalog}
                    index={sectionIndex}
                    total={sectionsOrder.length}
                    onMoveUp={() => handleMoveSection(sectionIndex, "up")}
                    onMoveDown={() => handleMoveSection(sectionIndex, "down")}
                  />
                )}
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
                          <div className="flex items-center justify-between mb-4 px-1 flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <h2 className="font-heading text-lg sm:text-xl font-bold text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                                <span className="w-1 h-6 rounded-full bg-gradient-to-b from-brand-pop-shake to-brand-magenta inline-block" />
                                {cat.name}
                                <span className="text-sm font-normal text-muted-foreground">
                                  ({catProducts.length})
                                </span>
                              </h2>

                              {/* Controles de posição da seção da categoria no Modo Edição */}
                              {canEdit && !activeCategory && (
                                <div className="inline-flex items-center gap-1.5 bg-white/95 dark:bg-[#200D22]/95 backdrop-blur-md border border-purple-300/80 dark:border-purple-700/80 rounded-xl px-2.5 py-1 text-xs shadow-xs">
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {catIndex + 1}/{categories.length}
                                  </span>
                                  <div className="h-3 w-px bg-purple-200 dark:bg-purple-800" />
                                  <button
                                    type="button"
                                    disabled={catIndex === 0}
                                    onClick={() => handleMoveCategory(catIndex, "up")}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    title={catIndex === 0 ? "Primeira categoria" : "Subir categoria"}
                                    aria-label={`Subir categoria ${cat.name}`}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                    <span>Subir</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={catIndex === categories.length - 1}
                                    onClick={() => handleMoveCategory(catIndex, "down")}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    title={catIndex === categories.length - 1 ? "Última categoria" : "Descer categoria"}
                                    aria-label={`Descer categoria ${cat.name}`}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                    <span>Descer</span>
                                  </button>
                                </div>
                              )}
                            </div>

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

                          {/* ── Catálogo: Linhas Horizontais Compactas no Mobile / Grid Bento no Desktop ── */}
                          <div className="flex flex-col md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4 bg-card/60 md:bg-transparent rounded-2xl md:rounded-none border border-border/30 md:border-none px-2 sm:px-3 md:px-0">
                            {displayProducts.map((product, prodIndex) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={handleOpenProductModal}
                                onOpenDetails={handleOpenProductModal}
                                isAdmin={canEdit}
                                onEdit={(p) => { setEditingProduct(p); setProdDialogOpen(true); }}
                                onDelete={handleDeleteProduct}
                                featured={hasFeatured && prodIndex === 0}
                              />
                            ))}

                            {/* Admin: add product */}
                            {canEdit && (
                              <button
                                onClick={() => { setEditingProduct(null); setProdDialogOpen(true); }}
                                className="
                                  flex items-center md:flex-col justify-center gap-2
                                  border-2 border-dashed border-brand-pop-shake/25
                                  bg-brand-pop-shake/3 hover:bg-brand-pop-shake/8
                                  hover:border-brand-pop-shake/50
                                  rounded-2xl
                                  p-3 md:min-h-[200px]
                                  text-brand-pop-shake/70 hover:text-brand-pop-shake
                                  transition-all duration-200 my-2 md:my-0
                                "
                              >
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand-pop-shake/10 flex items-center justify-center">
                                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-wide">
                                  Novo Produto
                                </span>
                              </button>
                            )}
                          </div>
                        </section>
                      );
                    })
                  )}

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
              </section>
            );
          }

          return null;
        })
      )}
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
        isCategoryActive={Boolean(
          (activeCategory && activeCategory !== "all" && activeCategory !== "todas") ||
          mobileCategoryView ||
          categoriesDrawerOpen
        )}
        onCategoriesClick={() => setCategoriesDrawerOpen(true)}
        onHomeClick={() => {
          handleSelectCategory(null);
        }}
      />

      {/* ─────────────────────────────────────────
          CATEGORIES DRAWER / BOTTOM SHEET (mobile & quick access)
      ───────────────────────────────────────── */}
      <CategoriesDrawer
        open={categoriesDrawerOpen}
        onClose={() => setCategoriesDrawerOpen(false)}
        categories={categories}
        products={products}
        activeCategory={activeCategory}
        onSelectCategory={(catId) => scrollToCategory(catId)}
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
        onSaved={handleCategorySaved}
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

      {/* Modal de Detalhes & Personalização do Produto (estilo iFood) */}
      <ProductDetailModal
        product={selectedProductForModal}
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
      />
    </div>
  );
}
