"use client";

import { Category } from "../../services/categoryService";

interface CategoryChipProps {
  category: Category;
  isActive?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  title?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

/**
 * Extrai o emoji inicial (se existir) e o nome limpo da categoria.
 * Caso não haja emoji explícito, utiliza fallbacks contextuais para cada tipo de produto.
 */
export function parseCategoryEmojiAndName(rawName: string): { emoji: string; cleanName: string } {
  const trimmed = (rawName || "").trim();
  // Regex Unicode para detectar emojis no início da string
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u2600-\u27BF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*(.*)$/u;
  const match = trimmed.match(emojiRegex);

  if (match) {
    return {
      emoji: match[1],
      cleanName: match[2].trim() || match[1],
    };
  }

  // Fallback baseado em palavras-chave
  const l = trimmed.toLowerCase();
  if (l.includes("açaí") || l.includes("acai")) return { emoji: "🥣", cleanName: trimmed };
  if (l.includes("sorvete")) return { emoji: "🍧", cleanName: trimmed };
  if (l.includes("shake") || l.includes("milk")) return { emoji: "🥤", cleanName: trimmed };
  if (l.includes("fruta") || l.includes("morango") || l.includes("banana")) return { emoji: "🍓", cleanName: trimmed };
  if (l.includes("combo")) return { emoji: "⚡", cleanName: trimmed };
  if (l.includes("picolé") || l.includes("picole")) return { emoji: "🍦", cleanName: trimmed };
  if (l.includes("copo")) return { emoji: "🥤", cleanName: trimmed };
  if (l.includes("adicional") || l.includes("topping")) return { emoji: "✨", cleanName: trimmed };
  if (l.includes("recheio")) return { emoji: "🍴", cleanName: trimmed };
  if (l.includes("destaque") || l.includes("novidade") || l.includes("promo")) return { emoji: "🔥", cleanName: trimmed };
  return { emoji: "🍧", cleanName: trimmed };
}

export function CategoryChip({
  category,
  isActive = false,
  onClick,
  onContextMenu,
  title,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: CategoryChipProps) {
  const { emoji, cleanName } = parseCategoryEmojiAndName(category.name);

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-pressed={isActive}
      className={`
        shrink-0 flex items-center justify-center gap-1.5
        px-3.5 py-2 rounded-full
        text-xs font-medium select-none
        border transition-all duration-150 ease-out cursor-pointer
        min-h-[38px] active:scale-95 transition-transform
        ${isActive
          ? "bg-primary text-white font-medium shadow-sm border-transparent"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 border-transparent hover:text-primary"
        }
      `}
    >
      <span className="text-base leading-none filter drop-shadow-xs" role="img" aria-hidden>
        {emoji}
      </span>
      <span className="text-xs font-medium whitespace-nowrap">
        {cleanName}
      </span>
    </button>
  );
}
