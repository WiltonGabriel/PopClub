"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface EditModeContextType {
  isEditMode: boolean;
  isDesktop: boolean;
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  isEditMode: false,
  isDesktop: false,
  toggleEditMode: () => {},
  setEditMode: () => {},
});

const STORAGE_KEY = "popclub-admin-edit-mode";

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  // Padrão como true para administradores no Desktop
  const [isEditModeState, setIsEditModeState] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const checkViewport = () => {
      const desktop = typeof window !== "undefined" && window.innerWidth >= 768;
      setIsDesktop(desktop);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsEditModeState(saved === "true");
      }
    } catch (e) {
      console.error("Erro ao ler modo de edição do localStorage:", e);
    }

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

  const setEditMode = (enabled: boolean) => {
    // Se a tela for mobile (< 768px), o modo de edição não pode ser ativado
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsEditModeState(false);
      return;
    }

    setIsEditModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (e) {
      console.error("Erro ao salvar modo de edição no localStorage:", e);
    }
  };

  const toggleEditMode = () => {
    if (!isDesktop) return;
    setEditMode(!isEditModeState);
  };

  // Trava de segurança: somente ativo se montado no cliente E em tela Desktop (>= 768px)
  const effectiveEditMode = isMounted && isDesktop ? isEditModeState : false;

  return (
    <EditModeContext.Provider
      value={{
        isEditMode: effectiveEditMode,
        isDesktop,
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
