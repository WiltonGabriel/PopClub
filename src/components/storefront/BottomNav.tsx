"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, Search, ShoppingBag } from "lucide-react";
import { useCart } from "../../hooks/useCart";

interface BottomNavProps {
  onSearchClick?: () => void;
  onCategoriesClick?: () => void;
}

export function BottomNav({ onSearchClick, onCategoriesClick }: BottomNavProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();

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
      id: "search",
      label: "Buscar",
      icon: Search,
      href: undefined,
      action: onSearchClick,
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
        pb-safe
      "
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ id, label, icon: Icon, href, action }) => {
          const isActive = href ? pathname === href : false;
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
            active:scale-90
            ${isActive ? "bg-brand-pop-shake/8" : "hover:bg-brand-surface-2"}
          `;

          if (href) {
            return (
              <Link key={id} href={href} className={baseClass} aria-label={label}>
                {buttonContent}
              </Link>
            );
          }

          return (
            <button
              key={id}
              onClick={action}
              className={baseClass}
              aria-label={label}
            >
              {buttonContent}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
