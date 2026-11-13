"use client";

import React from "react";
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  FolderTree,
  IceCream,
  Image as ImageIcon,
  Megaphone,
  MessageCircle,
  Palette,
  Settings,
  ShieldCheck,
  Store,
  Tag,
  Ticket,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { AdminGroupId, AdminGroupMeta, AdminTabId, AdminTabMeta } from "@/lib/adminNavigation";

const GROUP_ICONS: Record<AdminGroupMeta["iconKey"], React.ComponentType<{ className?: string }>> = {
  Activity,
  Store,
  Megaphone,
  Award,
  Settings,
};

const TAB_ICONS: Record<AdminTabMeta["iconKey"], React.ComponentType<{ className?: string }>> = {
  BarChart3,
  Truck,
  FolderTree,
  IceCream,
  Zap,
  Tag,
  ImageIcon,
  Ticket,
  Bell,
  Award,
  User,
  Palette,
  MessageCircle,
  ShieldCheck,
};

interface AdminNavigationShellProps {
  groups: AdminGroupMeta[];
  activeGroupId: AdminGroupId;
  activeTabId: AdminTabId;
  onSelectGroup: (groupId: AdminGroupId) => void;
  onSelectTab: (tabId: AdminTabId) => void;
  badgesByTab?: Partial<Record<AdminTabId, number>>;
}

/**
 * Navegação em 2 níveis do Painel Operacional:
 * Nível 1: 5 grupos de domínio (Operação, Catálogo, Marketing, Fidelidade, Sistema).
 * Nível 2: Sub-abas contextuais do grupo ativo, com touch targets >= 44px e zero corte lateral.
 */
export function AdminNavigationShell({
  groups,
  activeGroupId,
  activeTabId,
  onSelectGroup,
  onSelectTab,
  badgesByTab = {},
}: AdminNavigationShellProps) {
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  if (!activeGroup) return null;

  return (
    <nav aria-label="Navegação do Painel Operacional" className="space-y-3">
      {/* Nível 1: Grupos Principais */}
      <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-border/40 rounded-2xl p-1.5 shadow-xs">
        <div className="flex overflow-x-auto items-stretch gap-1.5 scrollbar-hide">
          {groups.map((group) => {
            const GroupIcon = GROUP_ICONS[group.iconKey];
            const isSelected = group.id === activeGroup.id;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelectGroup(group.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`whitespace-nowrap flex items-center justify-center gap-2 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold uppercase tracking-wide transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                }`}
              >
                <GroupIcon className="w-4 h-4 shrink-0" />
                <span>{group.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {group.tabs.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nível 2: Sub-abas Contextuais do Grupo Ativo */}
      <div className="bg-white/80 dark:bg-[#1D0B20]/90 border border-gray-200/80 dark:border-border/30 rounded-2xl p-2 sm:p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-2">
          <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
            <span className="font-bold text-foreground">{activeGroup.label}:</span>{" "}
            {activeGroup.description}
          </p>
        </div>

        <div className="flex overflow-x-auto items-center gap-1.5 scrollbar-hide pb-0.5">
          {activeGroup.tabs.map((tab) => {
            const TabIcon = TAB_ICONS[tab.iconKey];
            const isActive = tab.id === activeTabId;
            const badge = badgesByTab[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                title={tab.description}
                className={`whitespace-nowrap flex items-center gap-2 min-h-[44px] font-medium rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <TabIcon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {typeof badge === "number" && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
