"use client";

import React from "react";
import { Users, Crown, Shield, ShoppingBag, Lock } from "lucide-react";
import { UsersSummary } from "@/services/adminUserService";

export type UsersSectionTab = "equipe" | "cargos" | "clientes";

export interface SummaryNavigateTarget {
  tab: UsersSectionTab;
  filter?: string;
  status?: string;
}

interface UsersSummaryCardsProps {
  summary?: UsersSummary | null;
  loading?: boolean;
  isAdmin: boolean;
  activeTab: UsersSectionTab;
  activeFilter: string;
  onNavigate: (target: SummaryNavigateTarget) => void;
}

interface KpiCardItem {
  id: string;
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBoxClass: string;
  isActive: boolean;
  target: SummaryNavigateTarget;
}

export function UsersSummaryCards({
  summary,
  loading = false,
  isAdmin,
  activeTab,
  activeFilter,
  onNavigate,
}: UsersSummaryCardsProps) {
  const showSkeleton = loading && !summary;

  const cards: KpiCardItem[] = isAdmin
    ? [
        {
          id: "team",
          label: "Equipe Ativa",
          value: summary ? summary.teamCount : "—",
          subtitle: "Admins e Editores",
          icon: Users,
          iconBoxClass: "bg-primary/10 text-primary dark:bg-primary/20",
          isActive: activeTab === "equipe" && activeFilter === "team",
          target: { tab: "equipe", filter: "team", status: "all" },
        },
        {
          id: "admins",
          label: "Admins",
          value: summary ? `${summary.activeAdminsCount}/${summary.maxAdmins}` : "—",
          subtitle: "Limite soberano",
          icon: Crown,
          iconBoxClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
          isActive: activeTab === "equipe" && activeFilter === "admin",
          target: { tab: "equipe", filter: "admin", status: "all" },
        },
        {
          id: "roles",
          label: "Cargos",
          value: summary
            ? summary.maxCustomRoles != null
              ? `${summary.customRolesCount}/${summary.maxCustomRoles}`
              : `${summary.customRolesCount}`
            : "—",
          subtitle: "Perfis reutilizáveis",
          icon: Shield,
          iconBoxClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
          isActive: activeTab === "cargos",
          target: { tab: "cargos" },
        },
        {
          id: "clients",
          label: "Clientes",
          value: summary ? summary.clientsCount : "—",
          subtitle: "Base de consumo",
          icon: ShoppingBag,
          iconBoxClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          isActive: activeTab === "clientes" && activeFilter === "clients",
          target: { tab: "clientes", filter: "clients", status: "all" },
        },
        {
          id: "blocked",
          label: "Bloqueados",
          value: summary ? summary.blockedCount : "—",
          subtitle: "Acesso suspenso",
          icon: Lock,
          iconBoxClass: "bg-red-500/15 text-red-600 dark:text-red-400",
          isActive: activeTab === "clientes" && activeFilter === "blocked",
          target: { tab: "clientes", filter: "blocked", status: "all" },
        },
      ]
    : [
        {
          id: "clients",
          label: "Clientes na Base",
          value: summary ? summary.clientsCount : "—",
          subtitle: "Contas de consumo",
          icon: Users,
          iconBoxClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
          isActive: activeTab === "clientes" && activeFilter !== "blocked",
          target: { tab: "clientes", filter: "clients", status: "all" },
        },
        {
          id: "blocked",
          label: "Contas Bloqueadas",
          value: summary ? summary.blockedCount : "—",
          subtitle: "Acesso suspenso",
          icon: Lock,
          iconBoxClass: "bg-red-500/15 text-red-600 dark:text-red-400",
          isActive: activeTab === "clientes" && activeFilter === "blocked",
          target: { tab: "clientes", filter: "blocked", status: "all" },
        },
      ];

  return (
    <section
      aria-label="Resumo de usuários e acessos"
      className={`grid gap-3 ${
        isAdmin ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onNavigate(card.target)}
            className={`min-h-[44px] text-left rounded-2xl p-4 border transition-all cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              card.isActive
                ? "bg-primary/5 dark:bg-primary/15 border-primary/50 shadow-sm ring-1 ring-primary/25"
                : "bg-white dark:bg-[#230E26] border-gray-200 dark:border-border/40 hover:border-primary/40 hover:shadow-xs"
            }`}
          >
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                {card.label}
              </span>
              {showSkeleton ? (
                <span className="mt-1.5 block h-6 w-14 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse" />
              ) : (
                <span className="font-heading font-black text-xl sm:text-2xl text-foreground mt-0.5 block">
                  {card.value}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
                {card.subtitle}
              </span>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBoxClass}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </button>
        );
      })}
    </section>
  );
}
