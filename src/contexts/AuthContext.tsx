"use client";

import React, { createContext, useEffect, useState, ReactNode, useCallback } from "react";
import { authService, AuthUser } from "../services/authService";

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: "client" | "admin";
  fullName?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  accessibilitySettings?: any;
  user_metadata?: {
    username?: string;
    full_name?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  session: { user: AppUser } | null;
  loading: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authService.getCurrentUser();
      if (current) {
        const defaultAvatar = "/avatars/avatar-sorvete.svg";
        const avatar = current.avatar || current.avatarUrl || defaultAvatar;

        const appUser: AppUser = {
          id: current.id,
          email: current.email,
          username: current.username,
          role: current.role,
          fullName: current.fullName,
          avatarUrl: avatar,
          avatar: avatar,
          accessibilitySettings: current.accessibilitySettings,
          user_metadata: {
            username: current.username,
            full_name: current.fullName || current.username,
          },
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Erro ao inicializar sessão local:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const isAdmin = user?.role === "admin";
  const session = user ? { user } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
