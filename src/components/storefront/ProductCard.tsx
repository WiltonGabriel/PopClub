"use client";

import { Edit2, Trash2, Plus, IceCream, Coffee, Zap } from "lucide-react";
import { Product } from "../../services/productService";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onOpenDetails?: (product: Product) => void;
  isAdmin?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  /** Coloca o card em modo "destaque" com col-span-2 */
  featured?: boolean;
}

function ProductPlaceholder({ name }: { name: string }) {
  const firstChar = name?.[0]?.toUpperCase() ?? "P";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-surface-2 to-brand-surface-3 gap-2">
      <span className="text-4xl font-heading font-black gradient-text-brand select-none">
        {firstChar}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Pop Shake
      </span>
    </div>
  );
}

function getCategoryBadge(name: string) {
  const l = name.toLowerCase();
  if (l.includes("açaí") || l.includes("acai"))
    return { icon: <IceCream className="w-3 h-3" />, label: "Açaí", color: "bg-brand-pop-shake/10 text-brand-pop-shake" };
  if (l.includes("sorvete"))
    return { icon: <IceCream className="w-3 h-3" />, label: "Sorvete", color: "bg-blue-50 text-blue-600" };
  if (l.includes("shake") || l.includes("milk"))
    return { icon: <Coffee className="w-3 h-3" />, label: "Shake", color: "bg-amber-50 text-amber-600" };
  if (l.includes("combo"))
    return { icon: <Zap className="w-3 h-3" />, label: "Combo", color: "bg-yellow-50 text-yellow-600" };
  return null;
}

export function ProductCard({
  product,
  onAddToCart,
  onOpenDetails,
  isAdmin,
  onEdit,
  onDelete,
  featured = false,
}: ProductCardProps) {
  const isOutOfStock =
    product.isAvailable === false ||
    (product.stock !== undefined && product.stock !== null && product.stock <= 0);

  const badge = getCategoryBadge(product.category ?? "");
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.price);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    if (onOpenDetails) {
      onOpenDetails(product);
    } else if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`
        product-card relative bg-card rounded-2xl overflow-hidden group
        flex flex-col border border-border/40 transition-all duration-200
        ${isOutOfStock ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:shadow-lg hover:border-[#9306CF]/40 hover:-translate-y-0.5"}
        ${featured ? "sm:col-span-2" : ""}
      `}
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-2 left-2 z-20 flex gap-1 bg-white/90 dark:bg-[#2B132D]/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(product);
            }}
            title="Editar produto"
            aria-label="Editar produto"
            className="p-1.5 text-brand-pop-shake hover:bg-brand-surface-2 dark:hover:bg-purple-900/30 rounded-md transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(product.id);
            }}
            title="Deletar produto"
            aria-label="Deletar produto"
            className="p-1.5 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image Area */}
      <div className={`relative overflow-hidden bg-brand-surface-2 ${featured ? "aspect-video" : "aspect-[4/3]"}`}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ${
              isOutOfStock ? "grayscale-[50%]" : ""
            }`}
          />
        ) : (
          <ProductPlaceholder name={product.name} />
        )}

        {/* Esgotado / Pausado Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
            <span className="bg-red-600/90 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-md tracking-wider border border-red-400/30">
              Esgotado
            </span>
          </div>
        )}

        {/* Category badge overlay */}
        {badge && !isOutOfStock && (
          <span className={`badge-clay absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${badge.color}`}>
            {badge.icon}
            {badge.label}
          </span>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <h3 className="font-heading font-bold text-foreground text-sm leading-tight line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {product.description}
          </p>
        )}

        {/* Price + Add button row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
          <span className={`font-heading font-black text-base ${isOutOfStock ? "text-muted-foreground line-through" : "text-brand-pop-shake"}`}>
            {formattedPrice}
          </span>

          {isOutOfStock ? (
            <button
              disabled
              aria-label="Produto esgotado"
              className="
                flex items-center justify-center
                bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500
                rounded-full cursor-not-allowed
                min-w-[44px] min-h-[44px] w-11 h-11
                border border-dashed border-gray-300 dark:border-zinc-700
              "
            >
              <span className="text-[10px] font-bold uppercase">Off</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              aria-label={`Personalizar e adicionar ${product.name} ao carrinho`}
              className="
                btn-clay
                flex items-center justify-center gap-1
                bg-brand-folha-acai text-white
                w-9 h-9 rounded-full
                font-bold text-lg leading-none
                min-w-[44px] min-h-[44px] w-11 h-11
                active:scale-95 cursor-pointer
              "
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
