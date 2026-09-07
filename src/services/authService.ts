export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: "client" | "admin";
  fullName?: string | null;
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
    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao sair.");
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const res = await fetch("/api/auth/me");
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
};
