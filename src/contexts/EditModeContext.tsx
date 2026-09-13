"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType>({
  isEditMode: true,
  toggleEditMode: () => {},
  setEditMode: () => {},
});

const STORAGE_KEY = "popclub-admin-edit-mode";

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  // Padrão como true para administradores
  const [isEditMode, setIsEditModeState] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsEditModeState(saved === "true");
      }
    } catch (e) {
      console.error("Erro ao ler modo de edição do localStorage:", e);
    }
  }, []);

  const setEditMode = (enabled: boolean) => {
    setIsEditModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (e) {
      console.error("Erro ao salvar modo de edição no localStorage:", e);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!isEditMode);
  };

  return (
    <EditModeContext.Provider
      value={{
        isEditMode: isMounted ? isEditMode : true,
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
