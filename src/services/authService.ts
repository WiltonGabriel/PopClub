import { supabase } from "../lib/supabase";

export const authService = {
  // Now uses our backend API to ensure strict validation
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
    let email = identifier;

    // Se não for um email (não contém '@'), assumimos que é um username
    // Chamamos a RPC no Supabase para descobrir o e-mail correspondente de forma segura
    if (!identifier.includes('@')) {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
        p_username: identifier
      });

      if (rpcError || !resolvedEmail) {
        throw new Error("Credenciais inválidas ou usuário não encontrado.");
      }
      email = resolvedEmail;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        throw new Error("Credenciais inválidas.");
      }
      throw new Error(error.message);
    }
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },
};
