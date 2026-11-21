"use client";

import React, { createContext, useEffect, useState, ReactNode, useCallback } from "react";
import { authService } from "../services/authService";
import { hasPermission, isUserAdmin, isUserEditor } from "../lib/permissions";

export interface AppUser {
  id: string;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  cpf?: string | null;
  role: "client" | "admin" | "editor";
  permissions?: string[];
  customRoleId?: string | null;
  customRole?: {
    id: string;
    name: string;
    permissions: string[];
  } | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  isRegistered?: boolean;
  emailVerified?: boolean;
  hasGoogleLinked?: boolean;
  hasPassword?: boolean;
  isActive?: boolean;
  isBlocked?: boolean;
  accessibilitySettings?: Record<string, unknown> | null;
  defaultPaymentMethod?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  defaultChangeFor?: number | null;
  default_payment_method?: "pix_entrega" | "cartao_maquininha" | "dinheiro" | null;
  default_change_for?: number | null;
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
  lastNameChangedAt?: string | null;
  lastEmailChangedAt?: string | null;
  lastPasswordChangedAt?: string | null;
  passwordUpdatedAt?: string | null;
  user_metadata?: {
    username?: string;
    full_name?: string;
  };
}

export interface FastAccessResult {
  status?: "authenticated" | "new_device_detected" | string;
  user?: AppUser;
  maskedAddress?: {
    addressId?: string;
    maskedStreet?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
  } | null;
  [key: string]: unknown;
}

export interface VerifyDeviceResult {
  status?: "authenticated" | string;
  verifiedAddress?: unknown;
  user?: AppUser;
  [key: string]: unknown;
}

export interface CompleteProfileResult {
  success?: boolean;
  user?: AppUser;
  [key: string]: unknown;
}

interface AuthContextType {
  user: AppUser | null;
  session: { user: AppUser } | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  canAccess: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  fastAccess: (name: string, phone: string) => Promise<FastAccessResult>;
  verifyDevice: (payload: {
    phone: string;
    houseNumber?: string;
    addressId?: string;
    isNoNumber?: boolean;
    updatedName?: string;
    newAddress?: unknown;
  }) => Promise<VerifyDeviceResult>;
  completeProfile: (email: string, password: string) => Promise<CompleteProfileResult>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isEditor: false,
  canAccess: () => false,
  refreshUser: async () => {},
  signOut: async () => {},
  fastAccess: async () => ({}),
  verifyDevice: async () => ({}),
  completeProfile: async () => ({}),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authService.getCurrentUser();
      if (current) {
        const defaultAvatar = current.isRegistered === false ? "/avatars/avatar-guest-user.svg" : "/avatars/avatar-sorvete.svg";
        const avatar = current.avatar || current.avatarUrl || defaultAvatar;

        const appUser: AppUser = {
          id: current.id,
          email: current.email || null,
          username: current.username || null,
          phone: current.phone || null,
          cpf: current.cpf || null,
          role: current.role,
          permissions: current.permissions || [],
          customRoleId: current.customRoleId || null,
          customRole: current.customRole || null,
          fullName: current.fullName,
          avatarUrl: avatar,
          avatar: avatar,
          isRegistered: Boolean(current.isRegistered),
          emailVerified:
            typeof current.emailVerified === "boolean" ? current.emailVerified : undefined,
          hasGoogleLinked:
            typeof current.hasGoogleLinked === "boolean" ? current.hasGoogleLinked : undefined,
          hasPassword:
            typeof current.hasPassword === "boolean" ? current.hasPassword : undefined,
          isActive: current.isActive !== false,
          isBlocked: Boolean(current.isBlocked),
          accessibilitySettings: current.accessibilitySettings,
          defaultPaymentMethod: current.defaultPaymentMethod || current.default_payment_method || null,
          defaultChangeFor: current.defaultChangeFor !== undefined ? current.defaultChangeFor : (current.default_change_for !== undefined ? current.default_change_for : null),
          default_payment_method: current.defaultPaymentMethod || current.default_payment_method || null,
          default_change_for: current.defaultChangeFor !== undefined ? current.defaultChangeFor : (current.default_change_for !== undefined ? current.default_change_for : null),
          user_metadata: {
            username: current.username || "",
            full_name: current.fullName || current.username || "",
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

  const fastAccess = useCallback(async (name: string, phone: string) => {
    const result = await authService.fastAccess(name, phone);
    if (result.status === "authenticated") {
      if (result.user) {
        const u = result.user as AppUser;
        const defaultAvatar = u.isRegistered === false ? "/avatars/avatar-guest-user.svg" : "/avatars/avatar-sorvete.svg";
        const avatar = u.avatar || u.avatarUrl || defaultAvatar;
        setUser({
          id: u.id,
          email: u.email || null,
          username: u.username || null,
          phone: u.phone || null,
          cpf: u.cpf || null,
          role: u.role || "client",
          permissions: u.permissions || [],
          fullName: u.fullName || name,
          avatarUrl: avatar,
          avatar: avatar,
          isRegistered: Boolean(u.isRegistered),
          emailVerified:
            typeof u.emailVerified === "boolean" ? u.emailVerified : undefined,
          hasGoogleLinked:
            typeof u.hasGoogleLinked === "boolean" ? u.hasGoogleLinked : undefined,
          hasPassword:
            typeof u.hasPassword === "boolean" ? u.hasPassword : undefined,
          isActive: u.isActive !== false,
          isBlocked: Boolean(u.isBlocked),
          accessibilitySettings: u.accessibilitySettings || null,
          defaultPaymentMethod: u.defaultPaymentMethod || null,
          defaultChangeFor: u.defaultChangeFor !== undefined ? u.defaultChangeFor : null,
          user_metadata: {
            username: u.username || "",
            full_name: u.fullName || name,
          },
        });
      }
      await refreshUser();
    }
    return result;
  }, [refreshUser]);

  const verifyDevice = useCallback(async (payload: {
    phone: string;
    houseNumber?: string;
    addressId?: string;
    isNoNumber?: boolean;
    updatedName?: string;
    newAddress?: unknown;
  }) => {
    const result = await authService.verifyDevice(payload);
    if (result.status === "authenticated") {
      await refreshUser();
    }
    return result;
  }, [refreshUser]);

  const completeProfile = useCallback(async (email: string, password: string) => {
    const result = await authService.completeProfile(email, password);
    if (result.success) {
      await refreshUser();
    }
    return result;
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    setUser(null);
    await authService.signOut();
  }, []);

  useEffect(() => {
    refreshUser();

    const handleSignOutEvent = () => {
      setUser(null);
    };

    window.addEventListener("popshake:signout", handleSignOutEvent);
    return () => {
      window.removeEventListener("popshake:signout", handleSignOutEvent);
    };
  }, [refreshUser]);

  const isAdmin = isUserAdmin(user);
  const isEditor = isUserEditor(user);

  const canAccess = useCallback((permission: string) => {
    return hasPermission(user, permission);
  }, [user]);

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isEditor,
        canAccess,
        refreshUser,
        signOut,
        fastAccess,
        verifyDevice,
        completeProfile,
      }}
    >
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
