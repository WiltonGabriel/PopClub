"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { CategoryChip } from "./CategoryChip";
import { Category } from "../../services/categoryService";

interface CategoryRailProps {
  categories: Category[];
  activeCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  loading?: boolean;
  canEdit?: boolean;
  onEditCategory?: (cat: Category) => void;
  onDeleteCategory?: (id: string) => void;
  onMoveCategory?: (index: number, direction: "left" | "right") => void;
  onAddCategory?: () => void;
  draggedCatIndex?: number | null;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (index: number) => void;
}

export function CategoryRail({
  categories,
  activeCategory,
  onSelectCategory,
  loading = false,
  canEdit = false,
  onEditCategory,
  onDeleteCategory,
  onMoveCategory,
  onAddCategory,
  draggedCatIndex = null,
  onDragStart,
  onDragOver,
  onDrop,
}: CategoryRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isOverflowing = scrollWidth > clientWidth + 2;
    setHasOverflow(isOverflowing);
    setCanScrollLeft(isOverflowing && scrollLeft > 2);
    setCanScrollRight(isOverflowing && scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    const handleScroll = () => checkScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => checkScroll());
      resizeObserver.observe(el);
    }

    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories]);

  const handleScrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      data-category-bar
      className="sticky top-[55px] sm:top-[61px] z-30 bg-background/95 dark:bg-background/95 backdrop-blur-md border-b border-border/30"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative">
        {/* Left fade mask */}
        {hasOverflow && canScrollLeft && (
          <div
            className="pointer-events-none absolute left-3 sm:left-6 lg:left-8 top-0 bottom-0 w-8 md:w-14 bg-gradient-to-r from-background via-background/80 to-transparent z-10 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}

        {/* Right fade mask */}
        {hasOverflow && canScrollRight && (
          <div
            className="pointer-events-none absolute right-3 sm:right-6 lg:right-8 top-0 bottom-0 w-8 md:w-14 bg-gradient-to-l from-background via-background/80 to-transparent z-10 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}

        {/* Left Chevron (Desktop only) */}
        {hasOverflow && canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScrollBy(-350)}
            aria-label="Rolar categorias para a esquerda"
            className="hidden md:flex absolute left-4 sm:left-7 lg:left-9 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-8 h-8 rounded-full bg-background/90 dark:bg-card/90 border border-border/60 shadow-md text-foreground/80 hover:text-foreground hover:bg-background transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Chevron (Desktop only) */}
        {hasOverflow && canScrollRight && (
          <button
            type="button"
            onClick={() => handleScrollBy(350)}
            aria-label="Rolar categorias para a direita"
            className="hidden md:flex absolute right-4 sm:right-7 lg:right-9 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-8 h-8 rounded-full bg-background/90 dark:bg-card/90 border border-border/60 shadow-md text-foreground/80 hover:text-foreground hover:bg-background transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Rail Container */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex overflow-x-auto gap-2 no-scrollbar items-center py-2.5 px-0.5 snap-x snap-mandatory scroll-smooth touch-pan-x overscroll-contain-x w-full min-w-0 [-webkit-overflow-scrolling:touch]"
        >
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
              {/* "Todos" chip */}
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                aria-pressed={!activeCategory || activeCategory === "all" || activeCategory === "todas"}
                className={`
                  shrink-0 snap-start
                  flex items-center justify-center gap-1.5
                  px-3.5 py-2 rounded-full
                  text-xs font-medium select-none
                  border transition-all duration-150 ease-out cursor-pointer
                  min-h-[38px] active:scale-95 transition-transform
                  ${
                    !activeCategory || activeCategory === "all" || activeCategory === "todas"
                      ? "bg-primary text-white font-medium shadow-sm border-transparent"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border-transparent hover:text-primary"
                  }
                `}
              >
                <span className="text-base leading-none" role="img" aria-hidden>✨</span>
                <span className="text-xs font-medium whitespace-nowrap">Todos</span>
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
                      onClick={() => onSelectCategory(cat.id)}
                      onContextMenu={(e) => {
                        if (canEdit && onEditCategory) {
                          e.preventDefault();
                          onEditCategory(cat);
                        }
                      }}
                      title={canEdit ? "Clique com o botão direito ou no lápis para editar" : undefined}
                      draggable={canEdit}
                      onDragStart={() => onDragStart?.(catIdx)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop?.(catIdx)}
                    />

                    {/* Admin controls on chip */}
                    {canEdit && (
                      <div className="absolute -top-3 -right-2 hidden group-hover:flex items-center gap-0.5 bg-white dark:bg-card shadow-lg border border-primary/20 dark:border-primary/80 rounded-full p-1 z-30 transition-all scale-95">
                        {/* Mover para esquerda */}
                        {catIdx > 0 && onMoveCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveCategory(catIdx, "left");
                            }}
                            className="text-gray-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/90/40 p-1 rounded-full transition-colors"
                            title="Mover para a esquerda"
                            aria-label="Mover categoria para a esquerda"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        )}
                        {/* Editar */}
                        {onEditCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCategory(cat);
                            }}
                            className="text-primary hover:text-accent hover:bg-primary/10 dark:hover:bg-primary/90/40 p-1 rounded-full transition-colors"
                            title="Editar emoji e nome (ou botão direito)"
                            aria-label={`Editar categoria ${cat.name}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {/* Mover para direita */}
                        {catIdx < categories.length - 1 && onMoveCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveCategory(catIdx, "right");
                            }}
                            className="text-gray-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/90/40 p-1 rounded-full transition-colors"
                            title="Mover para a direita"
                            aria-label="Mover categoria para a direita"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        {/* Deletar */}
                        {onDeleteCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCategory(cat.id);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 p-1 rounded-full transition-colors"
                            title="Deletar categoria"
                            aria-label={`Deletar categoria ${cat.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Admin: add category */}
              {canEdit && onAddCategory && (
                <Button
                  variant="outline"
                  onClick={onAddCategory}
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
  );
}
