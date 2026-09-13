"use client";

import { IceCream, Coffee, Zap, Utensils, Grid3X3, type LucideIcon } from "lucide-react";
import { Category } from "../../services/categoryService";

interface CategoryChipProps {
  category: Category;
  isActive?: boolean;
  onClick?: () => void;
}

function getCategoryMeta(name: string): { Icon: LucideIcon; emoji: string } {
  const l = name.toLowerCase();
  if (l.includes("açaí") || l.includes("acai")) return { Icon: IceCream, emoji: "🍇" };
  if (l.includes("sorvete")) return { Icon: IceCream, emoji: "🍦" };
  if (l.includes("shake") || l.includes("milk")) return { Icon: Coffee, emoji: "🥤" };
  if (l.includes("combo")) return { Icon: Zap, emoji: "⚡" };
  if (l.includes("adicional") || l.includes("topping")) return { Icon: Grid3X3, emoji: "✨" };
  return { Icon: Utensils, emoji: "🍴" };
}

export function CategoryChip({ category, isActive = false, onClick }: CategoryChipProps) {
  const { Icon, emoji } = getCategoryMeta(category.name);

  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={`
        chip-clay
        shrink-0 flex flex-col items-center justify-center
        min-w-[72px] px-3 py-2.5 rounded-2xl
        border transition-all duration-200 cursor-pointer
        text-xs font-semibold
        min-h-[56px]
        ${isActive
          ? "category-active border-transparent"
          : "bg-card border-border/40 text-foreground hover:text-brand-pop-shake hover:border-brand-pop-shake/30 hover:bg-muted"
        }
      `}
    >
      <span className="text-base leading-none mb-0.5" role="img" aria-hidden>
        {emoji}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
        {category.name}
      </span>
    </button>
  );
}
