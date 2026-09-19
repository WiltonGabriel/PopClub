"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingBag, ReceiptText, ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "../../hooks/useCart";

interface BottomNavProps {
  onSearchClick?: () => void;
  onCategoriesClick?: () => void;
  onHomeClick?: () => void;
  isCategoryActive?: boolean;
  categoryMode?: boolean;
  categoryName?: string;
  onBackToAll?: () => void;
}

export function BottomNav({
  onSearchClick,
  onCategoriesClick,
  onHomeClick,
  isCategoryActive,
  categoryMode,
  categoryName,
  onBackToAll,
}: BottomNavProps) {
  const pathname = usePathname();
  const { totalItems, itemsTotal } = useCart();

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(itemsTotal);

  const navItems = [
    {
      id: "home",
      label: "Início",
      icon: Home,
      href: "/",
      action: undefined as (() => void) | undefined,
    },
    {
      id: "categories",
      label: "Categorias",
      icon: Grid3X3,
      href: undefined,
      action: onCategoriesClick,
    },
    {
      id: "orders",
      label: "Pedidos",
      icon: ReceiptText,
      href: "/pedidos",
      action: undefined as (() => void) | undefined,
    },
    {
      id: "cart",
      label: "Carrinho",
      icon: ShoppingBag,
      href: "/carrinho",
      action: undefined as (() => void) | undefined,
    },
  ];

  return (
    <nav
      className="
        md:hidden fixed bottom-0 left-0 right-0 z-50
        glass-header border-t border-border/20
        pb-safe transition-all duration-300
      "
      role="navigation"
      aria-label="Navegação mobile"
    >
      {categoryMode ? (
        /* ── MODO COMPACTO DE CATEGORIA: Otimização de Espaço Vertical ── */
        <div className="flex items-center justify-between h-14 px-3 gap-2 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={onBackToAll || onHomeClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card hover:bg-muted text-foreground active:scale-95 transition-all text-xs font-heading font-bold uppercase tracking-wider border border-border/50 shadow-xs cursor-pointer shrink-0"
            aria-label="Voltar para o cardápio geral"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9306CF] dark:text-[#C7A9C9] shrink-0" />
            <span className="truncate max-w-[130px] xs:max-w-[160px]">
              {categoryName ? `Todas` : "Todas"}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {totalItems > 0 ? (
              <Link
                href="/carrinho"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#9306CF] via-[#940068] to-[#9306CF] bg-[length:200%_auto] text-white font-heading font-bold text-xs shadow-md shadow-[#9306CF]/25 active:scale-95 transition-all cursor-pointer border border-white/20"
                aria-label={`Ver carrinho com ${totalItems} itens, total de R$ ${formattedTotal}`}
              >
                <div className="relative flex items-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="ml-1 bg-white text-[#9306CF] text-[10px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                    {totalItems}
                  </span>
                </div>
                <span className="font-mono text-xs font-black">
                  R$ {formattedTotal}
                </span>
                <ArrowRight className="w-3 h-3 opacity-80" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onCategoriesClick}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer border border-border/40 active:scale-95"
                aria-label="Abrir gaveta de categorias"
              >
                <Grid3X3 className="w-3.5 h-3.5 text-[#9306CF] dark:text-[#C7A9C9]" />
                <span>Trocar</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── MODO PADRÃO: 4 ABAS DA NAVEGAÇÃO INFERIOR ── */
        <div className="flex items-center justify-around h-16 px-2 animate-in fade-in duration-200">
          {navItems.map(({ id, label, icon: Icon, href, action }) => {
            const isActive =
              id === "categories"
                ? Boolean(isCategoryActive)
                : id === "home"
                ? pathname === "/" && !isCategoryActive
                : href
                ? pathname === href
                : false;
            const isCart = id === "cart";

            const buttonContent = (
              <span className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full">
                <span className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive
                        ? "text-brand-pop-shake"
                        : "text-muted-foreground group-hover:text-brand-pop-shake"
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {/* Cart item badge */}
                  {isCart && totalItems > 0 && (
                    <span className="
                      absolute -top-2 -right-2
                      bg-brand-folha-acai text-white
                      text-[9px] font-bold
                      min-w-[16px] h-4 px-1 rounded-full
                      flex items-center justify-center
                      leading-none
                      animate-bounce-subtle
                    ">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-semibold transition-colors ${
                  isActive ? "text-brand-pop-shake" : "text-muted-foreground group-hover:text-brand-pop-shake"
                }`}>
                  {label}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-pop-shake" />
                )}
              </span>
            );

            const baseClass = `
              group relative flex-1 flex items-center justify-center
              min-h-[44px] rounded-xl transition-all duration-200
              active:scale-90 cursor-pointer
              ${isActive ? "bg-brand-pop-shake/8" : "hover:bg-brand-surface-2"}
            `;

            if (href) {
              return (
                <Link
                  key={id}
                  href={href}
                  onClick={(e) => {
                    if (id === "home" && pathname === "/") {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      if (onHomeClick) onHomeClick();
                    }
                  }}
                  className={baseClass}
                  aria-label={label}
                >
                  {buttonContent}
                </Link>
              );
            }

            return (
              <button
                key={id}
                type="button"
                onClick={action}
                className={baseClass}
                aria-label={label}
              >
                {buttonContent}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

