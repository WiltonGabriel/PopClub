"use client";

import { Edit2, Trash2, Plus, IceCream, Coffee, Zap } from "lucide-react";
import { Product } from "../../services/productService";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
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
  isAdmin,
  onEdit,
  onDelete,
  featured = false,
}: ProductCardProps) {
  const badge = getCategoryBadge(product.category ?? "");
  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.price);

  return (
    <article
      className={`
        product-card relative bg-card rounded-2xl overflow-hidden group
        flex flex-col border border-border/40
        ${featured ? "sm:col-span-2" : ""}
      `}
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-2 left-2 z-20 flex gap-1 bg-white/90 dark:bg-[#2B132D]/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit?.(product)}
            title="Editar produto"
            aria-label="Editar produto"
            className="p-1.5 text-brand-pop-shake hover:bg-brand-surface-2 dark:hover:bg-purple-900/30 rounded-md transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete?.(product.id)}
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
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <ProductPlaceholder name={product.name} />
        )}

        {/* Category badge overlay */}
        {badge && (
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
          <span className="font-heading font-black text-base text-brand-pop-shake">
            {formattedPrice}
          </span>

          <button
            onClick={() => onAddToCart(product)}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            className="
              btn-clay
              flex items-center justify-center gap-1
              bg-brand-folha-acai text-white
              w-9 h-9 rounded-full
              font-bold text-lg leading-none
              min-w-[44px] min-h-[44px] w-11 h-11
              active:scale-95
            "
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </article>
  );
}
