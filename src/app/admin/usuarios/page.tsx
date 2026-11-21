"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Store,
  History,
  Sun,
  Moon,
  User,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getAuthorizedAdminFallbackRoute, getVisibleAdminGroups } from "@/lib/adminNavigation";
import { UsersManagementSection } from "@/components/admin/UsersManagementSection";
import { MobileOrientationBanner } from "@/components/admin/MobileOrientationBanner";

export default function AdminUsuariosPage() {
  const { user, loading, isAdmin, canAccess } = useAuth();
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const router = useRouter();

  const canAccessUsers = isAdmin || canAccess("users_manage");
  const hasOperationalPanel = isAdmin || getVisibleAdminGroups(user).length > 0;
  const canViewHistory = isAdmin || canAccess("ORDERS_HISTORY");
  const canManageKanban = isAdmin || canAccess("ORDERS_KANBAN");
  const canManageStock = isAdmin || canAccess("STOCK_CONTROL") || canAccess("menu_manage");
  const canAccessPedidos = canManageKanban || canManageStock;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login?redirect=/admin/usuarios");
      } else if (!canAccessUsers) {
        router.push(getAuthorizedAdminFallbackRoute(user, "/admin/usuarios"));
      }
    }
  }, [user, loading, canAccessUsers, router]);

  if (loading || !user || !canAccessUsers) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Verificando permissões de acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-transparent text-foreground transition-colors duration-200">
      <MobileOrientationBanner />
      {/* Header do Painel */}
      <header className="bg-white/80 dark:bg-[#1F0B22]/90 backdrop-blur-xl border-b border-gray-200 dark:border-border/40 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={hasOperationalPanel ? "/admin" : "/"}
            className="font-heading font-black text-xl tracking-tight flex items-center gap-1.5 select-none hover:opacity-85 transition-opacity"
          >
            <div className="flex items-center gap-0.5 font-heading font-black text-xl tracking-tight">
              <span className="text-foreground">Pop</span>
              <span className="text-primary font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">Shake</span>
              <span className="ml-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {isAdmin ? "Gestão de Usuários" : "Clientes"}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {hasOperationalPanel && (
            <Link
              href="/admin"
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Painel Operacional</span>
            </Link>
          )}

          {canViewHistory && (
            <Link
              href="/admin/historico"
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Histórico</span>
            </Link>
          )}

          {canAccessPedidos && (
            <Link
              href="/admin/pedidos"
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-primary to-accent hover:opacity-95 rounded-xl px-3.5 py-2 shadow-xs shadow-primary/20 transition-all"
            >
              {canManageKanban ? <LayoutDashboard className="w-4 h-4" /> : <Boxes className="w-4 h-4" />}
              <span>{canManageKanban ? "Gerenciar Pedidos" : "Controle de Estoque"}</span>
            </Link>
          )}

          <Link
            href="/conta"
            className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <User className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Meu Perfil</span>
          </Link>

          <Link
            href="/"
            className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-muted-foreground border border-gray-200 dark:border-border/40 rounded-xl px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Store className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Página Inicial</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={(resolvedTheme || theme) === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={(resolvedTheme || theme) === "dark" ? "Modo claro" : "Modo escuro"}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border border-gray-200 dark:border-border/40 hover:bg-gray-100 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {(resolvedTheme || theme) === "dark" ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        <UsersManagementSection />
      </main>
    </div>
  );
}
