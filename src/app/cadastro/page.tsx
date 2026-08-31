"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Lock, User, Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function CadastroPage() {
  const router = useRouter();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validação em tempo real
  const hasMinLen = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasLetterOrSpecial = hasLetter || hasSpecial;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!hasMinLen || !hasNumber || !hasLetterOrSpecial) {
      setError("A senha não atende a todos os requisitos.");
      return;
    }
    if (!passwordsMatch) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      await authService.signUp(username.trim().toLowerCase(), email.trim(), password);
      alert("Conta criada com sucesso! Faça o login.");
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const ValidationItem = ({ isValid, label }: { isValid: boolean, label: string }) => (
    <div className={`flex items-center gap-2 text-xs font-mono tracking-wider ${isValid ? 'text-green-500' : 'text-muted-foreground'}`}>
      {isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative font-sans">
      <Link href="/login" className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-5 h-5" />
        <span className="font-mono text-sm uppercase tracking-widest">Voltar ao Login</span>
      </Link>

      <div className="w-full max-w-md bg-card border-2 border-border p-8 shadow-[8px_8px_0px_0px_rgba(5,217,232,0.2)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-black tracking-tighter uppercase text-foreground mb-2">
            Pop<span className="text-secondary">Club</span>
          </h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
            Crie sua conta
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-4 mb-6 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nome de Usuário</Label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                id="username"
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value.replace(/\s+/g, ''))} // sem espaços
                placeholder="seunome" 
                className="pl-10 h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-secondary bg-background font-mono"
                required
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">Sem espaços. Ex: wilton</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                id="email"
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" 
                className="pl-10 h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-secondary bg-background font-mono"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                id="password"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="pl-10 pr-10 h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-secondary bg-background font-mono"
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

          <div className="bg-background border border-border p-3 space-y-1 my-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2 border-b border-border pb-1">Requisitos de Senha</p>
            <ValidationItem isValid={hasMinLen} label="Mínimo 8 caracteres" />
            <ValidationItem isValid={hasNumber} label="Pelo menos 1 número" />
            <ValidationItem isValid={hasLetterOrSpecial} label="Pelo menos 1 letra OU caractere especial" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                id="confirmPassword"
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                className="pl-10 h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-secondary bg-background font-mono"
                required
              />
            </div>
            {confirmPassword.length > 0 && (
               <ValidationItem isValid={passwordsMatch} label={passwordsMatch ? "Senhas coincidem" : "Senhas não coincidem"} />
            )}
          </div>

          <Button 
            type="submit" 
            disabled={loading || !hasMinLen || !hasNumber || !hasLetterOrSpecial || !passwordsMatch}
            className="w-full h-12 rounded-none font-heading uppercase tracking-widest text-lg bg-secondary hover:bg-secondary/90 text-background mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Conta"}
          </Button>
        </form>

      </div>
    </div>
  );
}
