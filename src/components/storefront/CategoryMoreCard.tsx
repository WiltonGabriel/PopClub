"use client";

import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Product } from "../../services/productService";
import { parseCategoryEmojiAndName } from "./CategoryChip";

interface CategoryMoreCardProps {
  categoryName: string;
  hiddenProducts: Product[];
  totalCount: number;
  onExplore: () => void;
}

/**
 * Card visual de prévia no final da grade/vitrine indicando que existem mais itens
 * na categoria sem expor o número de limite administrativo configurado.
 */
export function CategoryMoreCard({
  categoryName,
  hiddenProducts,
  totalCount,
  onExplore,
}: CategoryMoreCardProps) {
  const { cleanName } = parseCategoryEmojiAndName(categoryName);
  const previewItems = hiddenProducts.slice(0, 4);
  const remainingCount = hiddenProducts.length;

  return (
    <button
      type="button"
      onClick={onExplore}
      aria-label={`Ver todos os ${totalCount} itens em ${cleanName}`}
      className="
        group relative w-full text-left bg-card overflow-hidden cursor-pointer
        flex flex-row md:flex-col items-center md:items-stretch justify-between
        min-h-[105px] max-h-[125px] md:min-h-0 md:max-h-none
        py-3 px-2 sm:px-3 md:p-0
        border-b md:border border-primary/25 dark:border-primary/35 last:border-b-0 md:last:border-b md:rounded-2xl
        transition-all duration-200 hover:bg-muted/30 md:hover:bg-card md:hover:shadow-lg md:hover:border-primary/60 md:hover:-translate-y-0.5
      "
    >
      {/* Área visual com mosaico dos próximos produtos ocultos */}
      <div className="order-2 md:order-1 w-[35%] md:w-full flex justify-end shrink-0">
        <div
          className="
            relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/15 to-primary/25
            dark:from-[#26112B] dark:via-[#1E0C24] dark:to-[#32143B]
            w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-auto md:aspect-[4/3]
            rounded-2xl md:rounded-none md:rounded-t-2xl shrink-0
          "
        >
          <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full p-1.5 opacity-85 group-hover:scale-105 transition-transform duration-500">
            {Array.from({ length: 4 }).map((_, idx) => {
              const item = previewItems[idx];
              return (
                <div
                  key={item?.id ?? `empty-${idx}`}
                  className="relative w-full h-full rounded-lg overflow-hidden bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center"
                >
                  {item?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary/70 dark:text-violet-300/70">
                      🍨
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/15 flex flex-col items-center justify-center p-2 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/95 dark:bg-[#1E0A22]/95 text-primary dark:text-violet-200 font-heading font-black text-xs md:text-sm shadow-lg border border-primary/30 backdrop-blur-xs">
              +{remainingCount} {remainingCount === 1 ? "item" : "itens"}
            </span>
          </div>
        </div>
      </div>

      {/* Área de texto convidativa */}
      <div className="order-1 md:order-2 w-[65%] md:w-full pr-3 md:pr-0 md:p-3 flex flex-col justify-between h-full py-0.5 md:flex-1 gap-1.5">
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary dark:text-violet-300 mb-0.5">
            <Sparkles className="w-3 h-3" />
            Mais opções
          </span>
          <h3 className="font-heading font-bold text-zinc-900 dark:text-white text-sm leading-tight line-clamp-1 md:line-clamp-2">
            Ver todos de {cleanName}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed mt-0.5">
            Explore todos os {totalCount} itens disponíveis nesta seção.
          </p>
        </div>

        <div className="flex items-center justify-between pt-1.5 md:pt-2 border-t border-transparent md:border-border/30 mt-auto">
          <span className="text-xs font-bold text-primary dark:text-violet-300">
            Abrir lista completa
          </span>
          <span className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white flex items-center justify-center transition-colors shrink-0">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </button>
  );
}
