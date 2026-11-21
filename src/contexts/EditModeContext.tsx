"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { hasPermission, isUserAdmin, PERMISSION_KEYS } from "../lib/permissions";

export interface EditModeUserLike {
  id?: string | null;
  role?: string | null;
  permissions?: string[] | null;
  customRole?: { permissions?: string[] } | null;
}

export interface EditModeCapabilities {
  canUseEditMode: boolean;
  canEditStorefront: boolean;
  canEditCatalog: boolean;
  canEditPromotions: boolean;
  canEditHighlightBanner: boolean;
  canReorderSections: boolean;
}

export function canUserAccessEditMode(
  user: EditModeUserLike | null | undefined
): boolean {
  if (!user) return false;
  return isUserAdmin(user) || hasPermission(user, PERMISSION_KEYS.storefront_edit);
}

export function resolveEditModeCapabilities(
  user: EditModeUserLike | null | undefined,
  isEditMode: boolean,
  isDesktop = true
): EditModeCapabilities {
  const canUseEditMode = Boolean(isDesktop && canUserAccessEditMode(user));
  const canEditStorefront = Boolean(canUseEditMode && isEditMode);
  const admin = isUserAdmin(user);

  return {
    canUseEditMode,
    canEditStorefront,
    canEditCatalog: canEditStorefront && (admin || hasPermission(user, PERMISSION_KEYS.menu_manage)),
    canEditPromotions:
      canEditStorefront && (admin || hasPermission(user, PERMISSION_KEYS.promotions_manage)),
    canEditHighlightBanner:
      canEditStorefront && (admin || hasPermission(user, PERMISSION_KEYS.theme_manage)),
    canReorderSections: canEditStorefront,
  };
}

interface EditModeContextType {
  isEditMode: boolean;
  isDesktop: boolean;
  canUseEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  isEditMode: false,
  isDesktop: false,
  canUseEditMode: false,
  toggleEditMode: () => {},
  setEditMode: () => {},
});

const STORAGE_KEY = "popclub-admin-edit-mode";

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isEditModeState, setIsEditModeState] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const hasEditPermission = canUserAccessEditMode(user);
  const canUseEditMode = isMounted && isDesktop && hasEditPermission;

  useEffect(() => {
    setIsMounted(true);

    const checkViewport = () => {
      const desktop = typeof window !== "undefined" && window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (!desktop) {
        setIsEditModeState(false);
      }
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    // Limpa qualquer persistência legada para garantir que a vitrine nunca abra em Modo Edição automaticamente
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    const handleSignOut = () => {
      setIsEditModeState(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    };

    window.addEventListener("popshake:signout", handleSignOut);

    return () => {
      window.removeEventListener("resize", checkViewport);
      window.removeEventListener("popshake:signout", handleSignOut);
    };
  }, []);

  // Todo login, troca de usuário, logout ou mudança de permissão inicia com Modo Edição DESATIVADO
  useEffect(() => {
    setIsEditModeState(false);
  }, [user?.id, hasEditPermission]);

  const setEditMode = (enabled: boolean) => {
    if (!canUseEditMode || (typeof window !== "undefined" && window.innerWidth < 768)) {
      setIsEditModeState(false);
      return;
    }
    setIsEditModeState(Boolean(enabled));
  };

  const toggleEditMode = () => {
    if (!canUseEditMode) {
      setIsEditModeState(false);
      return;
    }
    setIsEditModeState((prev) => !prev);
  };

  const effectiveEditMode = canUseEditMode ? isEditModeState : false;

  return (
    <EditModeContext.Provider
      value={{
        isEditMode: effectiveEditMode,
        isDesktop,
        canUseEditMode,
        toggleEditMode,
        setEditMode,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode deve ser usado dentro de um EditModeProvider");
  }
  return context;
}
