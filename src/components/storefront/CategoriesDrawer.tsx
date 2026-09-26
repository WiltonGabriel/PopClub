"use client";

import { useEffect, useRef } from "react";
import { X, ChevronRight, Check, Grid3X3 } from "lucide-react";
import { Category } from "../../services/categoryService";
import { Product } from "../../services/productService";
import { parseCategoryEmojiAndName } from "./CategoryChip";

interface CategoriesDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  activeCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoriesDrawer({
  open,
  onClose,
  categories,
  products,
  activeCategory,
  onSelectCategory,
}: CategoriesDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fecha no ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Trava scroll do body enquanto aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Conta produtos por categoria
  const getProductCount = (cat: Category) => {
    return products.filter(
      (p) => p.category_id === cat.id || p.category === cat.name
    ).length;
  };

  const handleCategoryClick = (catId: string | null) => {
    onSelectCategory(catId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Gaveta de Categorias do Cardápio"
        className={`
          fixed bottom-0 left-0 right-0 z-50
          max-h-[82vh] md:max-h-[75vh] md:max-w-md md:left-auto md:right-4 md:bottom-4 md:rounded-3xl
          w-full rounded-t-3xl bg-background border-t md:border border-border/50
          shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full md:translate-y-[120%]"}
        `}
      >
        {/* Handle touch / barra superior no mobile */}
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
              <Grid3X3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading text-base sm:text-lg font-bold text-foreground">
                Categorias
              </h2>
              <p className="text-xs text-muted-foreground">
                {categories.length} {categories.length === 1 ? "categoria" : "categorias"} no cardápio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            aria-label="Fechar gaveta de categorias"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Categorias com Rolagem Suave */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2 no-scrollbar">
          {/* Opção "Todos os Produtos" */}
          <button
            type="button"
            onClick={() => handleCategoryClick(null)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
              !activeCategory || activeCategory === "all" || activeCategory === "todas"
                ? "bg-primary/10 border-primary/50 text-foreground font-semibold shadow-xs"
                : "bg-card hover:bg-muted/60 border-border/40 text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/95/60 flex items-center justify-center text-xl shrink-0">
                🏠
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Todos os Produtos</div>
                <div className="text-xs text-muted-foreground">
                  {products.length} {products.length === 1 ? "item disponível" : "itens disponíveis"}
                </div>
              </div>
            </div>

            {!activeCategory || activeCategory === "all" || activeCategory === "todas" ? (
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            )}
          </button>

          {/* Categorias cadastradas */}
          {categories.map((cat) => {
            const { emoji, cleanName } = parseCategoryEmojiAndName(cat.name);
            const count = getProductCount(cat);
            const isSelected = activeCategory === cat.id || (cat.slug && activeCategory === cat.slug);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-primary/50 text-foreground font-semibold shadow-xs"
                    : "bg-card hover:bg-muted/60 border-border/40 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/95/60 flex items-center justify-center text-xl shrink-0">
                    {emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {cleanName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "item" : "itens"}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
