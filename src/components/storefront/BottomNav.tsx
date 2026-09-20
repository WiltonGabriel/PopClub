"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ReceiptText, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

interface BottomNavProps {
  onSearchClick?: () => void;
  onHomeClick?: () => void;
  className?: string;
  // Mantidos como opcionais para total compatibilidade com chamadas existentes
  onCategoriesClick?: () => void;
  isCategoryActive?: boolean;
  categoryMode?: boolean;
  categoryName?: string;
  onBackToAll?: () => void;
}

export function BottomNav({
  onSearchClick,
  onHomeClick,
  className = "",
}: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      id: "home",
      label: "Início",
      icon: Home,
      href: "/",
    },
    {
      id: "search",
      label: "Busca",
      icon: Search,
      href: "/busca",
    },
    {
      id: "orders",
      label: "Pedidos",
      icon: ReceiptText,
      href: "/pedidos",
    },
    {
      id: "profile",
      label: "Perfil",
      icon: User,
      href: "/conta",
    },
  ];

  return (
    <nav
      className={`
        md:hidden fixed bottom-0 left-0 right-0 z-50
        bg-background/90 backdrop-blur-md border-t border-border/50
        pb-safe transition-all duration-300 shadow-lg
        ${className}
      `}
      role="navigation"
      aria-label="Navegação inferior mobile padrão iFood"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map(({ id, label, icon: Icon, href }) => {
          const isActive =
            id === "home"
              ? pathname === "/"
              : id === "search"
              ? pathname === "/busca" || pathname.startsWith("/busca/")
              : id === "orders"
              ? pathname === "/pedidos" ||
                pathname.startsWith("/pedidos/") ||
                pathname.startsWith("/rastreamento")
              : id === "profile"
              ? pathname === "/perfil" ||
                pathname === "/conta" ||
                pathname.startsWith("/conta/") ||
                pathname.startsWith("/login")
              : false;

          const isProfile = id === "profile";
          const hasCustomAvatar = isProfile && (user?.avatar || user?.avatarUrl);

          return (
            <Link
              key={id}
              href={href}
              onClick={(e) => {
                if (id === "home" && pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  if (onHomeClick) onHomeClick();
                } else if (id === "search" && onSearchClick && pathname === "/") {
                  // Se fornecido um modal de busca na home, pode abrir o modal
                  // ou navegar diretamente para /busca
                }
              }}
              className={`
                group relative flex-1 flex flex-col items-center justify-center
                h-full py-1 rounded-xl transition-all duration-200
                active:scale-95 cursor-pointer select-none
                ${isActive ? "text-brand-pop-shake" : "text-muted-foreground hover:text-foreground"}
              `}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Ícone ou Foto de Perfil */}
              <div className="relative flex items-center justify-center w-7 h-7 mb-0.5">
                {hasCustomAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={(user.avatar || user.avatarUrl) as string}
                    alt="Perfil"
                    className={`w-6 h-6 rounded-full object-cover transition-all ${
                      isActive
                        ? "ring-2 ring-brand-pop-shake ring-offset-1 ring-offset-background"
                        : "ring-1 ring-border"
                    }`}
                  />
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive
                        ? "text-brand-pop-shake stroke-[2.4]"
                        : "text-muted-foreground group-hover:text-foreground stroke-[1.8]"
                    }`}
                  />
                )}
              </div>

              {/* Rótulo da Aba */}
              <span
                className={`text-[10px] leading-tight transition-colors ${
                  isActive
                    ? "font-bold text-brand-pop-shake"
                    : "font-medium text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {label}
              </span>

              {/* Indicador Ativo (Ponto estilizado no padrão iFood) */}
              {isActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-pop-shake" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
