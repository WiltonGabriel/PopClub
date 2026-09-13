"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "../../hooks/useCart";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, itemsTotal, discountTotal, updateQuantity, removeItem } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Trap body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(itemsTotal);

  const formattedDiscount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(discountTotal);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/30 backdrop-blur-sm
          transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        className={`
          fixed right-0 top-0 bottom-0 z-50
          w-full max-w-sm
          bg-white shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-pop-shake" />
            <h2 className="font-heading font-bold text-foreground text-lg">
              Carrinho
            </h2>
            {totalItems > 0 && (
              <span className="bg-brand-folha-acai text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-brand-surface-2 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Fechar carrinho"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto py-4 px-5 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-surface-2 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-heading font-semibold text-foreground text-base">
                  Carrinho vazio
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione delícias da Pop Shake!
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-sm font-semibold text-brand-pop-shake hover:underline"
              >
                Ver cardápio →
              </button>
            </div>
          ) : (
            items.map((item) => {
              const lineTotal = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(item.price * item.quantity);

              return (
                <article
                  key={item.id}
                  className="flex gap-3 bg-brand-surface-1 rounded-2xl p-3 border border-border/20"
                >
                  {/* Image */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-surface-2 shrink-0">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-heading font-black text-xl gradient-text-brand">
                          {item.name[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                    {item.promotionTitle && (
                      <span className="text-[10px] text-brand-folha-acai font-semibold">
                        {item.promotionTitle}
                      </span>
                    )}
                    <p className="font-heading font-black text-sm text-brand-pop-shake mt-0.5">
                      {lineTotal}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        aria-label="Diminuir quantidade"
                        className="w-7 h-7 rounded-full border border-border/50 flex items-center justify-center hover:bg-brand-surface-2 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm text-foreground w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label="Aumentar quantidade"
                        className="w-7 h-7 rounded-full bg-brand-folha-acai text-white flex items-center justify-center hover:bg-brand-folha-acai-dk transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remover ${item.name}`}
                    className="self-start p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </article>
              );
            })
          )}
        </div>

        {/* Footer — totals + CTA */}
        {items.length > 0 && (
          <div className="border-t border-border/30 px-5 py-4 space-y-3 bg-white">
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-brand-folha-acai font-semibold">−{formattedDiscount}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="font-heading font-black text-xl text-brand-pop-shake">
                {formattedTotal}
              </span>
            </div>

            <Link href="/carrinho" onClick={onClose}>
              <button className="
                btn-clay w-full
                bg-brand-folha-acai text-white
                font-heading font-bold text-base
                py-3.5 rounded-2xl
                flex items-center justify-center gap-2
                min-h-[52px]
              ">
                Finalizar Pedido
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
