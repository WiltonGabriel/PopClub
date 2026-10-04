export interface AuthUser {
  id: string;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  cpf?: string | null;
  role: "client" | "admin" | "editor";
  permissions?: string[];
  fullName?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  isRegistered?: boolean;
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
    usernameOrData: string | { username?: string; email: string; password: string; fullName?: string; phone?: string; cpf?: string },
    email?: string,
    password?: string,
    fullName?: string,
    phone?: string,
    cpf?: string
  ) {
    let payload: Record<string, any>;
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

  async signInWithGoogle() {
    throw new Error("O login via Google não está disponível. Por favor, use seu usuário e senha.");
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
