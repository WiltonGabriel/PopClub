"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.signIn(identifier.trim(), password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com Google");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative font-sans">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-5 h-5" />
        <span className="font-mono text-sm uppercase tracking-widest">Voltar à loja</span>
      </Link>

      <div className="w-full max-w-md bg-card border-2 border-border p-8 shadow-[8px_8px_0px_0px_rgba(255,42,109,0.2)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-black tracking-tighter uppercase text-foreground mb-2">
            Pop<span className="text-primary">Club</span>
          </h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
            Acesse sua conta para pedir
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-6 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="identifier" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Usuário ou e-mail</Label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                id="identifier"
                type="text" 
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="seunome ou seu@email.com" 
                className="pl-10 h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-primary bg-background font-mono"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
              <button type="button" className="text-xs text-primary hover:underline font-mono" onClick={() => alert('Fluxo de recuperação em construção.')}>
                Esqueceu sua senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="pl-10 pr-10 h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-primary bg-background font-mono"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 rounded-none font-heading uppercase tracking-widest text-lg bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 flex items-center">
          <div className="flex-grow border-t-2 border-border"></div>
          <span className="flex-shrink-0 mx-4 text-muted-foreground font-mono text-xs uppercase">OU</span>
          <div className="flex-grow border-t-2 border-border"></div>
        </div>

        <Button 
          type="button" 
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full h-12 rounded-none border-2 border-border bg-transparent hover:bg-white/5 mt-6 font-mono text-xs uppercase tracking-wider text-foreground"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar com Google
        </Button>

        <p className="text-center mt-8 text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Novo por aqui?{" "}
          <Link href="/cadastro" className="text-primary hover:underline font-bold">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
