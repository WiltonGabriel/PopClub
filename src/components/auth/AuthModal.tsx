"use client";

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AuthModal() {
  const { signIn, signUp, signInWithGoogle, user, isAdmin, signOut, loading: authLoading } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handler for form submission (Login)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await signIn(email, password);
      setOpen(false); // Close on success
    } catch (err: any) {
      setError("Falha ao entrar. Verifique seu email e senha.");
    } finally {
      setLoading(false);
    }
  };

  // Handler for form submission (Register)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await signUp(email, password);
      setSuccess("Conta criada com sucesso! Verifique seu email se necessário.");
      // Optional: Auto-login or close modal depending on flow. For Supabase, if email confirmation is disabled, user is logged in.
    } catch (err: any) {
      setError("Erro ao criar conta. Pode ser que o email já esteja em uso.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError("Erro ao conectar com Google.");
      setLoading(false);
    }
  };

  // If loading auth state, you could show a spinner or just don't show the button yet
  if (authLoading) {
    return <Button variant="ghost" disabled className="text-white/50">Carregando...</Button>;
  }

  // If user is logged in, show logout
  if (user) {
    return (
      <div className="flex items-center gap-4">
        {isAdmin && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full border border-primary/50">Admin</span>}
        <Button variant="outline" onClick={signOut} className="border-primary text-primary hover:bg-primary/20">
          Sair
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default" className="text-white bg-primary hover:bg-primary/80" />}>
        Entrar / Cadastrar
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md bg-card text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Acessar PopClub</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-white/10">
            <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Entrar</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Criar Conta</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-white/20"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-white/20"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                {error && <p className="text-destructive text-sm font-medium">{error}</p>}
                {success && <p className="text-green-500 text-sm font-medium">{success}</p>}
                
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
                  {loading ? "Processando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background border-white/20"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background border-white/20"
                    placeholder="No mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                
                {error && <p className="text-destructive text-sm font-medium">{error}</p>}
                {success && <p className="text-green-500 text-sm font-medium">{success}</p>}
                
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white" disabled={loading}>
                  {loading ? "Criando..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </div>
        </Tabs>

        {/* Modularizado para o Google Login futuramente */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center">
          <p className="text-sm text-white/50 mb-3">Ou continue com</p>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full bg-background border-white/20 hover:bg-white/5 hover:text-white flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
