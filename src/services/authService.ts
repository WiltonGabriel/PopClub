import { sanitizeSafeInternalRoute } from "./navigationHistoryService";

export interface AuthUser {
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
  createdAt?: string | null;
  created_at?: string | null;
}

export interface AuthProvidersStatus {
  googleEnabled: boolean;
  emailConfigured: boolean;
}

export interface EmailVerificationResponse {
  success: boolean;
  alreadyVerified?: boolean;
  message: string;
}

export const authService = {
  async fastAccess(name: string, phone: string) {
    const res = await fetch("/api/auth/fast-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fullName: name, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao processar Acesso Rápido.");
    }
    return data;
  },

  async verifyDevice(payload: {
    phone: string;
    houseNumber?: string;
    addressId?: string;
    isNoNumber?: boolean;
    updatedName?: string;
    newAddress?: unknown;
  }) {
    const res = await fetch("/api/auth/verify-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao verificar identificação do aparelho.");
    }
    return data;
  },

  async completeProfile(email: string, password: string) {
    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao completar cadastro.");
    }
    return data;
  },

  async signUp(
    usernameOrData: string | { username?: string; email: string; password: string; fullName?: string; phone?: string; cpf?: string; acceptedTerms?: boolean },
    email?: string,
    password?: string,
    fullName?: string,
    phone?: string,
    cpf?: string,
    acceptedTerms?: boolean
  ) {
    let payload: {
      username?: string;
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      cpf?: string;
      acceptedTerms?: boolean;
    };
    if (typeof usernameOrData === "object") {
      payload = usernameOrData;
    } else {
      payload = {
        username: usernameOrData,
        email,
        password,
        fullName,
        phone,
        cpf,
        acceptedTerms,
      };
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro no cadastro.");
    }
    return data;
  },

  async signIn(identifier: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Credenciais inválidas.");
    }
    return data;
  },

  async signOut() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error("Erro ao chamar endpoint de logout:", err);
    }

    if (typeof window !== "undefined") {
      try {
        // Limpa carrinho
        localStorage.removeItem("popclub_cart_v1");
        // Limpa chaves legadas e chaves de guest
        localStorage.removeItem("popshake_addresses");
        localStorage.removeItem("popshake_active_address");
        localStorage.removeItem("popshake_guest_addresses");
        localStorage.removeItem("popshake_guest_active_address");
        localStorage.removeItem("popshake_guest_order_ids");
        localStorage.removeItem("popclub-admin-edit-mode");
        localStorage.removeItem("popshake_kanban_compact_columns");

        // Remove todas as chaves dinâmicas vinculadas a usuários
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            (k.startsWith("popshake_addresses_") ||
              k.startsWith("popshake_active_address_") ||
              k.startsWith("popshake_orders_") ||
              k.startsWith("popshake_user_"))
          ) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // Limpa qualquer dado efêmero em sessionStorage
        sessionStorage.clear();
      } catch (err) {
        console.warn("Erro ao higienizar storage no logout:", err);
      }

      // Notifica contextos ativos para reset imediato em memória
      window.dispatchEvent(new Event("popshake:signout"));
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const res = await fetch("/api/auth/me", {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async getSession() {
    const user = await this.getCurrentUser();
    return user ? { user } : null;
  },

  async getAuthProviders(): Promise<AuthProvidersStatus> {
    try {
      const res = await fetch("/api/auth/providers", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        return { googleEnabled: false, emailConfigured: false };
      }
      const data = await res.json();
      return {
        googleEnabled: Boolean(data?.googleEnabled),
        emailConfigured: Boolean(data?.emailConfigured),
      };
    } catch {
      return { googleEnabled: false, emailConfigured: false };
    }
  },

  async signInWithGoogle(redirect?: string) {
    if (typeof window === "undefined") {
      throw new Error("O login via Google requer um navegador ativo.");
    }
    const safeRedirect = sanitizeSafeInternalRoute(redirect) || "/";
    // OAuth requer navegação completa do navegador para permitir o redirect externo ao Google
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/google?redirect=${encodeURIComponent(safeRedirect)}`);
  },

  async verifyEmail(code: string, email?: string): Promise<EmailVerificationResponse> {
    const payload: { code: string; email?: string } = {
      code: code.trim(),
    };
    if (email?.trim()) {
      payload.email = email.trim().toLowerCase();
    }

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Não foi possível confirmar o e-mail.") as Error & {
        code?: string;
      };
      if (typeof data.code === "string") {
        err.code = data.code;
      }
      throw err;
    }
    return data as EmailVerificationResponse;
  },

  async resendVerificationEmail(email?: string): Promise<EmailVerificationResponse> {
    const payload: { email?: string } = {};
    if (email?.trim()) {
      payload.email = email.trim().toLowerCase();
    }

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Não foi possível reenviar o código de verificação.");
    }
    return data as EmailVerificationResponse;
  },

  async requestPasswordReset(email: string) {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao solicitar recuperação.");
    }
    return data;
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao redefinir a senha.");
    }
    return data;
  },
};
