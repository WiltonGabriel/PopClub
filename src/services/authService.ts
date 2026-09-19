export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "client" | "admin";
  fullName?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  accessibilitySettings?: any;
}

export const authService = {
  async signUp(username: string, email: string, password: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
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
