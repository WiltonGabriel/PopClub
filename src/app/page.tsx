"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { productService, Product } from "../services/productService";
import { categoryService, Category } from "../services/categoryService";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useTheme } from "../contexts/ThemeContext";
import { useOrders } from "../contexts/OrderContext";
import { calculateProductPrice } from "@/lib/pricing";

// Storefront components
import { ProductCard } from "../components/storefront/ProductCard";
import { parseCategoryEmojiAndName } from "../components/storefront/CategoryChip";
import { CategoryRail } from "../components/storefront/CategoryRail";
import { PromoBanner } from "../components/storefront/PromoBanner";
import { BottomNav } from "../components/storefront/BottomNav";
import { CartDrawer } from "../components/storefront/CartDrawer";
import { SearchAutocomplete } from "../components/storefront/SearchAutocomplete";
import { Footer } from "../components/storefront/Footer";
import { ProductDetailModal } from "../components/storefront/ProductDetailModal";
import { HeaderAddressButton } from "../components/storefront/HeaderAddressButton";
import { CategoriesDrawer } from "../components/storefront/CategoriesDrawer";
import { NotificationBell } from "../components/storefront/NotificationBell";
import { DraggableWhatsAppButton } from "../components/storefront/DraggableWhatsAppButton";
import { PopShakeLoading } from "../components/ui/PopShakeLoading";
import {
  loadingSettingsService,
  LoadingSettingsData,
  LOADING_UPDATED_EVENT,
} from "../services/loadingSettingsService";
import { LogoutConfirmModal } from "../components/ui/LogoutConfirmModal";

// Admin components (unchanged)
import { CategoryFormDialog } from "../components/admin/CategoryFormDialog";
import { ProductFormDialog } from "../components/admin/ProductFormDialog";
import { EditBannerModal } from "../components/admin/EditBannerModal";
import { AdminEditModeToggle } from "../components/admin/AdminEditModeToggle";
import { bannerService, HighlightBannerData } from "../services/bannerService";
import { useEditMode } from "../contexts/EditModeContext";
import { storeSettingsService, StoreSettings } from "../services/storeSettingsService";
import { useStoreStatus } from "../hooks/useStoreStatus";
import { StoreStatusBanner, StoreStatusBadge } from "../components/storefront/StoreStatusBanner";

// UI + Icons
import { Button } from "../components/ui/button";
import {
  ShoppingBag,
  ChevronDown,
  Plus,
  User as UserIcon,
  X,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Crown,
  Pencil,
  Trash2,
  ReceiptText,
  LayoutDashboard,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowUpDown,
  History,
  Clock,
  Users,
  ShieldCheck,
} from "lucide-react";

export type HomeSectionId = "highlight_banner" | "products_catalog";

const DEFAULT_SECTIONS_ORDER: HomeSectionId[] = [
  "highlight_banner",
  "products_catalog",
];

const SECTION_LABELS: Record<HomeSectionId, string> = {
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
      <div className="inline-flex items-center gap-2 bg-white/95 dark:bg-background/95 backdrop-blur-md border border-primary/30/80 dark:border-primary/80 rounded-xl px-3 py-1.5 shadow-sm text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-primary dark:text-muted-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{title}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            ({index + 1}/{total})
          </span>
        </div>
        <div className="h-3.5 w-px bg-primary/20 dark:bg-primary/80" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-primary/10/70 dark:bg-primary/90/40 text-primary dark:text-muted-foreground hover:bg-primary/20 dark:hover:bg-primary/80/60 active:scale-95 cursor-pointer disabled:hover:scale-100"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-primary/10/70 dark:bg-primary/90/40 text-primary dark:text-muted-foreground hover:bg-primary/20 dark:hover:bg-primary/80/60 active:scale-95 cursor-pointer disabled:hover:scale-100"
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
  const { isAdmin, isEditor, canAccess, user, refreshUser } = useAuth();
  const { isEditMode } = useEditMode();
  const canEdit = isAdmin && isEditMode;
  const { totalItems, itemsTotal } = useCart();
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const { activeOrders } = useOrders();

  // Pedidos ativos relevantes para o badge do cabeçalho (pending, accepted, preparing, delivering)
  const relevantActiveOrders = useMemo(() => {
    return (activeOrders || []).filter((o) =>
      ["pending", "accepted", "preparing", "delivering"].includes(o.status)
    );
  }, [activeOrders]);

  const activeOrdersBadgeColor = useMemo(() => {
    if (relevantActiveOrders.some((o) => o.status === "delivering")) {
      return "bg-emerald-500 text-white animate-pulse";
    }
    if (relevantActiveOrders.some((o) => o.status === "preparing")) {
      return "bg-primary text-white";
    }
    return "bg-amber-500 text-white";
  }, [relevantActiveOrders]);

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
  const storeStatus = useStoreStatus();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Identidade Visual Dinâmica (Fundo e Loading)
  const [, setVisualSettings] = useState<LoadingSettingsData>(() =>
    loadingSettingsService.getCachedLoadingSettings()
  );

  useEffect(() => {
    let mounted = true;
    loadingSettingsService.getLoadingSettings().then((res) => {
      if (mounted) setVisualSettings(res);
    });

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<LoadingSettingsData>;
      if (customEvent.detail) {
        setVisualSettings(customEvent.detail);
      }
    };

    window.addEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    return () => {
      mounted = false;
      window.removeEventListener(LOADING_UPDATED_EVENT, handleUpdated);
    };
  }, []);

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
    ? (user.fullName || user.user_metadata?.full_name || user.username || user.email?.split("@")[0] || "Cliente").split(" ")[0]
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
        const loadedCats = Array.isArray(catsRes.value) ? catsRes.value : [];
        setCategories(loadedCats);
        if (loadedCats.length > 0) hasData = true;
      } else {
        console.error("Erro ao carregar categorias:", catsRes.reason);
        setCategories((prev) => (Array.isArray(prev) ? prev : []));
      }

      if (prodsRes.status === "fulfilled") {
        const loadedProds = Array.isArray(prodsRes.value) ? prodsRes.value : [];
        setProducts(loadedProds);
        if (loadedProds.length > 0) hasData = true;
      } else {
        console.error("Erro ao carregar produtos:", prodsRes.reason);
        setProducts((prev) => (Array.isArray(prev) ? prev : []));
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
          (p as Product & { categoryId?: string; category_id?: string }).categoryId === savedCat.id ||
          (p as Product & { categoryId?: string; category_id?: string }).category_id === savedCat.id ||
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

  // Reordenação de categorias via botões de seta com persistência direta
  const handleMoveCategory = async (index: number, direction: "left" | "right" | "up" | "down") => {
    const isBackward = direction === "left" || direction === "up";
    const targetIndex = isBackward ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const next = [...categories];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    const payload = next.map((cat, idx) => ({ id: cat.id, order: idx }));
    setCategories(next.map((c, idx) => ({ ...c, order: idx })));

    try {
      await categoryService.reorderCategories(payload);
    } catch (err) {
      console.error("Erro ao persistir ordem de categorias:", err);
    }
  };

  // Drag & drop de categorias com persistência direta
  const handleDragStart = (index: number) => {
    setDraggedCatIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIndex: number) => {
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) return;
    const next = [...categories];
    const [moved] = next.splice(draggedCatIndex, 1);
    next.splice(targetIndex, 0, moved);

    const payload = next.map((cat, idx) => ({ id: cat.id, order: idx }));
    setCategories(next.map((c, idx) => ({ ...c, order: idx })));
    setDraggedCatIndex(null);

    try {
      await categoryService.reorderCategories(payload);
    } catch (err) {
      console.error("Erro ao persistir ordem de categorias:", err);
    }
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

  // Helper para verificar se categoria com janela de tempo está ativa
  const isTimeWindowActive = useCallback((cat: Category) => {
    if (cat.isDynamic && cat.dynamicType === "TIME_BASED" && cat.timeStart && cat.timeEnd) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = cat.timeStart.split(":").map(Number);
      const [endH, endM] = cat.timeEnd.split(":").map(Number);
      const startMinutes = (startH || 0) * 60 + (startM || 0);
      const endMinutes = (endH || 0) * 60 + (endM || 0);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    }
    return true;
  }, []);

  // Categorias ativas e válidas para a vitrine
  const visibleCategories = useMemo(() => {
    return categories.filter((c) => (c.isActive !== false) && isTimeWindowActive(c));
  }, [categories, isTimeWindowActive]);

  // Helper para obter produtos de uma categoria (estática ou dinâmica com 5 regras automatizadas)
  const getCategoryProducts = useCallback((cat: Category, prodsList: Product[]) => {
    if (cat.isDynamic) {
      switch (cat.dynamicType) {
        case "HIGHLIGHTS":
          return prodsList.filter((p) => {
            if (
              p.category_id === cat.id ||
              (p as Product & { categoryId?: string }).categoryId === cat.id ||
              p.category === cat.name
            ) {
              return true;
            }
            if (p.isHighlight) return true;
            const pricing = calculateProductPrice(p);
            return pricing.isPromotional;
          });

        case "ACTIVE_PROMOTIONS":
          return prodsList.filter((p) => {
            if (p.promotion) return true;
            const pricing = calculateProductPrice(p);
            return pricing.isPromotional;
          });

        case "COMBOS":
          return prodsList.filter((p) => {
            return p.isCombo || (p.comboItems && p.comboItems.length > 0);
          });

        case "SHAREABLE":
          return prodsList.filter((p) => {
            const serves = p.servesText || "";
            const isShareableRegex = /(?:[2-9]|\bdois|\bduas|\btres|\btrês|\bquatro|\bcinco|\bdupla|\btrio|\bfam[ií]lia|\bcompartilhar)/i;
            return (
              isShareableRegex.test(serves) ||
              isShareableRegex.test(p.name) ||
              isShareableRegex.test(p.description || "")
            );
          });

        case "TIME_BASED":
          return prodsList.filter((p) => {
            return (
              p.category_id === cat.id ||
              (p as Product & { categoryId?: string }).categoryId === cat.id ||
              p.category === cat.name
            );
          });

        default:
          return prodsList.filter((p) => {
            return (
              p.category_id === cat.id ||
              (p as Product & { categoryId?: string }).categoryId === cat.id ||
              p.category === cat.name ||
              p.isHighlight
            );
          });
      }
    }

    return prodsList.filter(
      (p) =>
        p.category_id === cat.id ||
        (p as Product & { categoryId?: string }).categoryId === cat.id ||
        p.category === cat.name
    );
  }, []);

  // Produtos filtrados para a visualização dedicada de categoria no mobile
  const dedicatedCategoryProducts = useMemo(() => {
    if (!mobileCategoryView) return [];
    return getCategoryProducts(mobileCategoryView, products);
  }, [products, mobileCategoryView, getCategoryProducts]);

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
    <div
      className="min-h-screen bg-transparent text-foreground flex flex-col font-sans pb-20 md:pb-0 transition-colors duration-200"
    >

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
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40 transition-colors duration-200">
        {/* ── 1. HEADER MOBILE EXCLUSIVO (Padrão iFood: Logo | Endereço | Notificações) ── */}
        <div className="flex md:hidden items-center justify-between gap-2 w-full px-3 py-2">
          {/* À Esquerda: Nome/Logo da loja (PopShake) com tipografia destacada */}
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
            <span className="font-heading font-black text-xl tracking-tight flex items-center shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] select-none">
              <span className="text-zinc-900 dark:text-white transition-colors">Pop</span>
              <span className="text-primary dark:text-violet-400 transition-colors">Shake</span>
            </span>
          </Link>

          {/* Ao Centro: Seletor de endereço centralizado e clicável */}
          <div className="flex-1 flex justify-center items-center min-w-0 px-1">
            <HeaderAddressButton
              isMobile
              className="min-h-[38px] sm:min-h-[40px] px-3.5 py-2 w-auto min-w-[150px] max-w-[200px] truncate text-xs font-semibold rounded-full border-border/50 bg-white/80 dark:bg-[#181D2D]/80 shadow-xs"
              spanClassName="w-auto max-w-[140px] truncate font-semibold"
            />
          </div>

          {/* À Direita: Apenas o ícone de Notificações com badge numérico */}
          <div className="flex items-center shrink-0">
            <NotificationBell />
          </div>
        </div>

        {/* ── 2. HEADER DESKTOP EXCLUSIVO (md+) ── */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 items-center justify-between gap-2 lg:gap-3 xl:gap-4 w-full">

          {/* ── ESQUERDA: Logotipo tipográfico PopShake ── */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
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
              <span className="font-heading font-black text-2xl tracking-tight flex items-center shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] select-none">
                <span className="text-zinc-900 dark:text-white transition-colors">Pop</span>
                <span className="text-primary dark:text-violet-400 transition-colors">Shake</span>
              </span>
            </Link>
            <StoreStatusBadge status={storeStatus.status} closingTime={storeStatus.closingTime} />
          </div>

          {/* ── CENTRO: Endereço + Busca com Autocomplete ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-3 flex-1 max-w-xl mx-1.5 lg:mx-3 xl:mx-4 min-w-0">
            <HeaderAddressButton className="shrink-0" />
            <div className="flex-1 min-w-0 max-w-[440px]">
              <SearchAutocomplete
                products={products}
                initialValue={search}
                placeholder="Buscar produtos, sabores..."
                onSelectProduct={handleOpenProductModal}
              />
            </div>
          </div>

          {/* ── DIREITA: Actions Desktop ── */}
          <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">

            {/* 1. [ Modo de Edição / Cliente ] — exclusivo para Administrador no Desktop (à esquerda de Pedidos) */}
            {isAdmin && <AdminEditModeToggle />}

            {/* 2. [ Meus Pedidos ] — Desktop only: Apenas ícone com badge dinâmico */}
            <Link
              href="/pedidos"
              className="hidden md:flex relative h-10 w-10 rounded-full items-center justify-center border border-border/50 hover:border-primary/50 bg-white/60 dark:bg-[#181D2D]/60 hover:bg-muted/80 text-foreground transition-all shrink-0 shadow-xs group cursor-pointer"
              title={
                relevantActiveOrders.length > 0
                  ? `Acompanhar Meus Pedidos (${relevantActiveOrders.length} ativo${relevantActiveOrders.length === 1 ? "" : "s"})`
                  : "Acompanhar Meus Pedidos"
              }
              aria-label={`Ver meus pedidos${relevantActiveOrders.length > 0 ? ` (${relevantActiveOrders.length} ativos)` : ""}`}
            >
              <ReceiptText className="w-5 h-5 text-primary dark:text-violet-400 group-hover:scale-110 transition-transform shrink-0" />
              {relevantActiveOrders.length > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full text-xs font-bold flex items-center justify-center leading-none shadow-xs border-2 border-background ${activeOrdersBadgeColor}`}>
                  {relevantActiveOrders.length > 99 ? "99+" : relevantActiveOrders.length}
                </span>
              )}
            </Link>

            {/* 3. [ Sino de Notificações ] */}
            <NotificationBell />

            {/* 4. [ Ícone do Carrinho / Sacola ] — Imediatamente à direita do Sino e antes do Avatar/Perfil */}
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
                  className="flex items-center gap-1.5 sm:gap-2 border border-border/50 hover:border-primary/50 bg-white/60 dark:bg-[#181D2D]/60 hover:bg-muted/80 rounded-full p-1.5 md:px-3.5 md:py-2 transition-all shrink-0 group shadow-xs cursor-pointer"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="Menu de perfil e entrada"
                >
                  <UserIcon className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                  <span className="hidden md:inline text-xs sm:text-sm font-semibold text-foreground dark:text-foreground">
                    Entrar
                  </span>
                  <ChevronDown
                    className={`hidden md:inline-flex w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200 shrink-0 ${
                      userMenuOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 sm:w-60 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-md p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-800/80 mb-1">
                      <p className="text-xs font-semibold text-foreground dark:text-foreground">
                        Bem-vindo ao PopShake
                      </p>
                      <p className="text-[11px] text-muted-foreground">Identifique-se para fazer seu pedido</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/login"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-primary dark:text-violet-400" />
                        Entrar na Conta
                      </Link>
                    </div>

                    <div className="border-t border-gray-100 dark:border-zinc-800/80 my-1" />

                    {/* Alterar tema */}
                    <button
                      type="button"
                      onClick={() => toggleTheme()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors text-left cursor-pointer"
                    >
                      {(resolvedTheme || theme) === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
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
                  className="flex items-center gap-1.5 sm:gap-2 border border-border/50 hover:border-primary/50 bg-white/60 dark:bg-[#181D2D]/60 hover:bg-muted/80 rounded-full p-1 md:pl-1.5 md:pr-3 md:py-1 transition-all shrink-0 group shadow-xs cursor-pointer"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label={`Menu do usuário: ${userFirstName}`}
                >
                  {/* Avatar circular com moldura e micro-badge para Administrador */}
                  <div
                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 transition-all ${
                      isAdmin
                        ? "ring-2 ring-primary dark:ring-violet-400 ring-offset-2 ring-offset-background"
                        : "ring-1 ring-white/20"
                    }`}
                  >
                    {user.avatar || user.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
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

                  {/* Nome do usuário truncado — Visível a partir de telas largas (xl+) para evitar sobreposição em monitores verticais */}
                  <span className="hidden xl:inline-flex text-xs sm:text-sm font-semibold text-foreground dark:text-foreground max-w-[120px] truncate shrink-0">
                    {userFirstName}
                  </span>

                  {/* Chevron — Apenas em telas largas (xl+) */}
                  <ChevronDown
                    className={`hidden xl:inline-flex w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200 shrink-0 ${
                      userMenuOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu com z-[100] garantido acima de qualquer barra */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 sm:w-64 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 shadow-md p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Cabeçalho do Dropdown */}
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-800/80 mb-2">
                      <p className="text-xs font-semibold text-foreground dark:text-foreground truncate">
                        {user.fullName || user.username}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-violet-400 border border-primary/30 px-2 py-0.5 rounded-full">
                          Acesso ADM
                        </span>
                      )}
                    </div>

                    {/* Links dinâmicos por tipo de usuário */}
                    <div className="space-y-1">
                      {isAdmin ? (
                        <div className="border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl p-1.5 shadow-xs space-y-0.5">
                          <div className="flex items-center justify-between px-2 py-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Gestão da Loja
                            </span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary dark:text-violet-400 border border-primary/20 px-1 py-0.2 rounded">
                              Acesso ADM
                            </span>
                          </div>
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                            <span>Painel Operacional</span>
                          </Link>

                          <Link
                            href="/admin/pedidos"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                          >
                            <ClipboardList className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                            <span>Gerenciar Pedidos</span>
                          </Link>

                          <Link
                            href="/admin/historico"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                          >
                            <History className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                            <span>Histórico de Pedidos</span>
                          </Link>

                          <Link
                            href="/admin/usuarios"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                          >
                            <Users className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                            <span>Gestão de Usuários</span>
                          </Link>
                        </div>
                      ) : isEditor ? (
                        <div className="border border-indigo-200/80 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-1.5 shadow-xs space-y-0.5">
                          <div className="flex items-center justify-between px-2 py-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Gestão da Loja
                            </span>
                            <span className="text-[8px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-1 py-0.2 rounded">
                              Editor
                            </span>
                          </div>
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span>Painel Operacional</span>
                          </Link>

                          {canAccess("ORDERS_KANBAN") && (
                            <Link
                              href="/admin/pedidos"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                            >
                              <ClipboardList className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span>Gerenciar Pedidos</span>
                            </Link>
                          )}

                          {canAccess("ORDERS_HISTORY") && (
                            <Link
                              href="/admin/historico"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                            >
                              <History className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span>Histórico de Pedidos</span>
                            </Link>
                          )}
                        </div>
                      ) : null}

                      {/* Seção Pessoal do Usuário */}
                      <div className="pt-1 space-y-0.5">
                        <Link
                          href="/pedidos"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                        >
                          <ReceiptText className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                          <span>Meus Pedidos</span>
                        </Link>

                        <Link
                          href="/conta"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                        >
                          <UserIcon className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                          <span>Meu Perfil</span>
                        </Link>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-zinc-800/80 my-1" />

                    {/* 🌓 Alterar tema — Fixo logo acima de Sair */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors text-left cursor-pointer"
                    >
                      {(resolvedTheme || theme) === "dark" ? (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-primary dark:text-violet-400 shrink-0" />
                      )}
                      <span>Alterar tema</span>
                    </button>

                    <div className="border-t border-gray-100 dark:border-zinc-800/80 my-1" />

                    {/* Sair */}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Banner Informativo Superior (Não Bloqueante) */}
      <StoreStatusBanner
        status={storeStatus.status}
        openingTime={storeStatus.openingTime}
        closingTime={storeStatus.closingTime}
      />

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
      {/* ─────────────────────────────────────────
          CATEGORY BAR — sticky below header with desktop navigation controls
      ───────────────────────────────────────── */}
      <CategoryRail
        categories={visibleCategories}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        loading={loading}
        canEdit={canEdit}
        onEditCategory={(cat) => {
          setEditingCategory(cat);
          setCatDialogOpen(true);
        }}
        onDeleteCategory={handleDeleteCategory}
        onMoveCategory={handleMoveCategory}
        onAddCategory={() => {
          setEditingCategory(null);
          setCatDialogOpen(true);
        }}
        draggedCatIndex={draggedCatIndex}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      {/* ─────────────────────────────────────────
          MAIN CONTENT
      ───────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-8 relative z-10">
        {/* ── VISUALIZAÇÃO DEDICADA DE CATEGORIA NO MOBILE ── */}
        {mobileCategoryView ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Cabeçalho da Categoria Dedicada com Botão Voltar Destacado */}
            <div className="sticky top-[49px] sm:top-[53px] z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-xs flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseMobileCategoryView}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary dark:text-muted-foreground font-heading font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs"
                aria-label="Voltar para a vitrine principal"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Voltar</span>
              </button>

              {/* Título da categoria com emoji/ícone e contador total de itens */}
              <div className="text-right min-w-0 flex-1">
                <h1 className="font-heading text-sm xs:text-base text-zinc-900 dark:text-zinc-100 font-bold truncate">
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
                  className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Cardápio
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Esteira de Banners Promocionais (Cards com Ofertas e Promoções) */}
            <PromoBanner />

            {sectionsOrder.map((sectionId, sectionIndex) => {


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
                  className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-[#10B981]/10 dark:from-[#181D2D] dark:via-[#181D2D] dark:to-[#1E2538] border border-primary/20 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm ${
                    canEdit ? "group relative" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl shrink-0">{highlightBanner.icon || "🥣"}</span>
                    <div>
                      <p className="font-heading text-sm sm:text-base text-foreground dark:text-zinc-100 font-semibold">
                        {highlightBanner.title || "Monte do seu jeito: escolha o tamanho e adicione seus acompanhamentos favoritos"}
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-zinc-300 mt-0.5">
                        {highlightBanner.subtitle || "Açaí puro batido na hora, cremoso e com acompanhamentos à sua escolha."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-primary dark:text-violet-400 border border-primary/25 dark:border-zinc-700 shadow-sm">
                      {highlightBanner.badge || "Refrescância Artesanal"}
                    </span>

                    {/* Botão flutuante para administradores editarem a faixa */}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditBannerModalOpen(true)}
                        className="bg-white dark:bg-card shadow-md border border-primary/30 dark:border-primary p-2 rounded-full hover:scale-105 transition-all text-primary dark:text-muted-foreground hover:text-accent dark:hover:text-white cursor-pointer ml-1"
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
                    <PopShakeLoading />
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
                    visibleCategories.map((cat, catIndex) => {
                      // Se tiver uma categoria ativa e não for essa, esconde
                      if (activeCategory && activeCategory !== cat.id) return null;

                      const catProducts = getCategoryProducts(cat, filteredProducts);

                      if (catProducts.length === 0 && !canEdit) return null;

                      // Modo Prévia (na Home) vs Modo Completo
                      const isPreview = !activeCategory && !search;
                      const displayProducts = isPreview ? catProducts.slice(0, 4) : catProducts;

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
                              {cat.imageUrl && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={cat.imageUrl} alt="" className="w-full h-full object-contain rounded-md" />
                                </div>
                              )}
                              <div>
                                <h2 className="font-heading text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                  <span className="w-1 h-6 rounded-full bg-gradient-to-b from-brand-pop-shake to-brand-magenta inline-block" />
                                  {cat.name}
                                  <span className="text-sm font-normal text-muted-foreground">
                                    ({catProducts.length})
                                  </span>
                                </h2>
                                {cat.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                                    {cat.description}
                                  </p>
                                )}
                              </div>

                              {/* Controles de posição da seção da categoria no Modo Edição */}
                              {canEdit && !activeCategory && (
                                <div className="inline-flex items-center gap-1.5 bg-white/95 dark:bg-background/95 backdrop-blur-md border border-primary/30/80 dark:border-primary/80 rounded-xl px-2.5 py-1 text-xs shadow-xs">
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {catIndex + 1}/{categories.length}
                                  </span>
                                  <div className="h-3 w-px bg-primary/20 dark:bg-primary/80" />
                                  <button
                                    type="button"
                                    disabled={catIndex === 0}
                                    onClick={() => handleMoveCategory(catIndex, "up")}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-primary dark:text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/90/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-primary dark:text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/90/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                                className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1 cursor-pointer"
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
                                className="text-sm font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:underline flex items-center gap-1 min-h-[44px] transition-colors"
                              >
                                Voltar
                              </button>
                            )}
                          </div>

                          {/* ── Catálogo: Linhas Horizontais Compactas no Mobile / Grid Adaptativo 1, 2, 3 ou 4 Colunas ── */}
                          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 bg-card/60 sm:bg-transparent rounded-2xl sm:rounded-none border border-border/30 sm:border-none p-2 sm:p-0">
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
                                  flex items-center sm:flex-col justify-center gap-2
                                  border-2 border-dashed border-brand-pop-shake/25
                                  bg-brand-pop-shake/3 hover:bg-brand-pop-shake/8
                                  hover:border-brand-pop-shake/50
                                  rounded-2xl
                                  p-3 sm:min-h-[220px]
                                  text-brand-pop-shake/70 hover:text-brand-pop-shake
                                  transition-all duration-200 my-2 sm:my-0 cursor-pointer
                                "
                              >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-pop-shake/10 flex items-center justify-center">
                                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
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
        })}
      </>
      )}
      </main>

      {/* ─────────────────────────────────────────
          MOBILE — Floating cart bar (when items > 0)
          Posicionada de forma fixa e suspensa logo ACIMA da Bottom Navigation Bar
      ───────────────────────────────────────── */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 md:hidden z-40 px-4 pb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Link href="/carrinho">
            <button className="
              btn-clay w-full
              bg-brand-folha-acai hover:bg-brand-folha-acai-dk text-white
              font-heading font-bold text-sm
              h-12 rounded-2xl
              flex items-center justify-between px-4
              shadow-green-clay shadow-lg
              cursor-pointer active:scale-[0.98] transition-all
            ">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Ver Carrinho ({totalItems})</span>
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
          BOTTOM NAV (mobile only - Padrão iFood)
      ───────────────────────────────────────── */}
      <BottomNav
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
        categories={visibleCategories}
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

      {/* Confirmação de Logout */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          setIsLoggingOut(true);
          try {
            await authService.signOut();
            await refreshUser();
          } finally {
            setIsLoggingOut(false);
            setIsLogoutModalOpen(false);
          }
        }}
        isLoggingOut={isLoggingOut}
      />

      {/* Botão flutuante do WhatsApp arrastável exclusivo da Home */}
      <DraggableWhatsAppButton />
    </div>
  );
}
