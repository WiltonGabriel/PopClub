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
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800/80 gap-2">
      <span className="text-4xl font-heading font-black text-primary dark:text-violet-400 select-none">
        {firstChar}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Pop Shake
      </span>
    </div>
  );
}

function getCategoryBadge(product: Product) {
  if (product.isCombo)
    return { icon: <Zap className="w-3 h-3" />, label: "Combo", color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300" };
    
  const l = (product.category ?? "").toLowerCase();
  if (l.includes("açaí") || l.includes("acai"))
    return { icon: <IceCream className="w-3 h-3" />, label: "Açaí", color: "bg-primary/10 text-primary dark:text-violet-400" };
  if (l.includes("sorvete"))
    return { icon: <IceCream className="w-3 h-3" />, label: "Sorvete", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" };
  if (l.includes("shake") || l.includes("milk"))
    return { icon: <Coffee className="w-3 h-3" />, label: "Shake", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" };
  if (l.includes("combo"))
    return { icon: <Zap className="w-3 h-3" />, label: "Combo", color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-300" };
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

  const isPromo = product.isCombo || (product.name || "").toLowerCase().includes("promo");
  const originalPrice = isPromo ? Number((product.price * 1.25).toFixed(2)) : undefined;
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : null;

  const badge = getCategoryBadge(product);
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
        product-card relative bg-card overflow-hidden group
        flex flex-row md:flex-col items-center md:items-stretch justify-between
        min-h-[105px] max-h-[125px] md:min-h-0 md:max-h-none
        py-3 px-2 sm:px-3 md:p-0
        border-b md:border border-border/40 dark:border-zinc-800 last:border-b-0 md:last:border-b md:rounded-2xl
        transition-all duration-200
        ${isOutOfStock ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:bg-muted/30 md:hover:bg-card md:hover:shadow-lg md:hover:border-primary/40 md:hover:-translate-y-0.5"}
        ${featured ? "md:col-span-2" : ""}
      `}
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-2 left-2 z-20 flex gap-1 bg-white/90 dark:bg-card/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-primary/20 dark:border-primary/80/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(product);
            }}
            title="Editar produto"
            aria-label="Editar produto"
            className="p-1.5 text-primary dark:text-violet-400 hover:bg-muted dark:hover:bg-zinc-800 rounded-md transition-colors"
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

      {/* ── LADO ESQUERDO NO MOBILE (65%) / INFERIOR NO DESKTOP: Conteúdo & Preço ── */}
      <div className="order-1 md:order-2 w-[65%] md:w-full pr-3 md:pr-0 md:p-3 flex flex-col justify-between h-full py-0.5 md:flex-1 gap-1">
        <div>
          <h3 className="font-heading font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight line-clamp-1 md:line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-0.5">
              {product.description}
            </p>
          )}
        </div>

        {/* Linha de Preço & Desconto */}
        <div className="flex items-center justify-between mt-auto pt-1.5 md:mt-2 md:pt-2 md:border-t md:border-border/30 dark:md:border-zinc-800">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className={`font-heading font-bold md:font-black text-sm md:text-base ${isOutOfStock ? "text-muted-foreground line-through" : "text-primary dark:text-violet-400"}`}>
              {formattedPrice}
            </span>

            {originalPrice && !isOutOfStock && (
              <>
                <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-medium">
                  R$ {originalPrice.toFixed(2).replace(".", ",")}
                </span>
                {discountPercent && discountPercent > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                    {discountPercent}% OFF
                  </span>
                )}
              </>
            )}
          </div>

          {/* Botão Desktop [ + ] */}
          <div className="hidden md:flex items-center">
            {isOutOfStock ? (
              <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-zinc-700">
                Off
              </span>
            ) : (
              <button
                type="button"
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
                  active:scale-95 cursor-pointer shadow-sm
                "
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── LADO DIREITO NO MOBILE (35%) / SUPERIOR NO DESKTOP: Imagem 1:1 e Botão [ + ] Flutuante ── */}
      <div className="order-2 md:order-1 w-[35%] md:w-full flex justify-end shrink-0">
        <div className={`
          relative overflow-hidden bg-zinc-100 dark:bg-zinc-800/80 shrink-0
          w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-auto
          ${featured ? "md:aspect-video" : "md:aspect-[4/3]"}
          rounded-2xl md:rounded-none md:rounded-t-2xl
        `}>
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
              <span className="bg-red-600/90 text-white font-bold text-[10px] md:text-xs uppercase px-2 py-0.5 md:px-3 md:py-1 rounded-full shadow-md tracking-wider border border-red-400/30">
                Esgotado
              </span>
            </div>
          )}

          {/* Selo do Card (Badge Flutuante Personalizado ou Categoria) */}
          {!isOutOfStock && (
            product.cardBadge ? (
              <span
                style={{
                  backgroundColor: product.cardBadge.bgColor,
                  color: product.cardBadge.textColor,
                }}
                className="absolute top-1.5 right-1.5 md:top-2 md:right-2 rounded-full px-1.5 py-0.5 md:px-2.5 md:py-0.5 text-[10px] md:text-xs font-semibold flex items-center gap-1 shadow-sm select-none z-10"
              >
                {product.cardBadge.icon && <span>{product.cardBadge.icon}</span>}
                <span>{product.cardBadge.text}</span>
              </span>
            ) : badge ? (
              <span className={`badge-clay absolute top-1.5 right-1.5 md:top-2 md:right-2 flex items-center gap-1 text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 md:px-2 md:py-1 rounded-full ${badge.color}`}>
                {badge.icon}
                {badge.label}
              </span>
            ) : null
          )}

          {/* Botão Flutuante Redondo [ + ] no Canto Inferior Direito da Imagem (Mobile Only) */}
          {!isOutOfStock && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              aria-label={`Personalizar e adicionar ${product.name} ao carrinho`}
              className="
                md:hidden absolute bottom-1.5 right-1.5 z-10
                w-8 h-8 rounded-full
                bg-brand-folha-acai text-white
                flex items-center justify-center
                shadow-md active:scale-90 cursor-pointer
                transition-transform
              "
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

