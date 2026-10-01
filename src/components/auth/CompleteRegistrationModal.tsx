"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2,
  Loader2,
  TicketPercent,
  Smile,
  Award,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompleteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function CompleteRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Completar meu Cadastro",
  subtitle = "Adicione e-mail e senha para desbloquear seus cupons, personalizar seu avatar e evoluir seus selos de fidelidade na loja.",
}: CompleteRegistrationModalProps) {
  const { user, completeProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Por favor, informe um endereço de e-mail válido com domínio (ex: seu@email.com).");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password.length > 32) {
      setError("A senha deve ter no máximo 32 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem. Digite novamente.");
      return;
    }

    setLoading(true);
    try {
      await completeProfile(cleanEmail, password);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Erro ao completar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              Cadastro Completo!
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Cupons exclusivos, personalização de avatares e selos de fidelidade liberados com sucesso!
            </p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-primary text-white shadow-md mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Badges de Benefícios */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/60 text-center flex flex-col items-center justify-center transition-colors">
                <TicketPercent className="w-4 h-4 text-primary shrink-0 mb-1" />
                <p className="text-[11px] sm:text-xs font-bold text-foreground leading-tight">Cupons</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5">Descontos exclusivos</p>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/60 text-center flex flex-col items-center justify-center transition-colors">
                <Smile className="w-4 h-4 text-primary shrink-0 mb-1" />
                <p className="text-[11px] sm:text-xs font-bold text-foreground leading-tight">Avatares</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5">Fotos de perfil</p>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/60 text-center flex flex-col items-center justify-center transition-colors">
                <Award className="w-4 h-4 text-primary shrink-0 mb-1" />
                <p className="text-[11px] sm:text-xs font-bold text-foreground leading-tight">Fidelidade</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight mt-0.5">+ Tempo, + vantagens</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="complete-email" className="text-xs font-semibold text-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="complete-email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="pl-9 text-sm h-10 rounded-xl"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="complete-password" className="text-xs font-semibold text-foreground">
                  Criar Senha (mínimo 6 caracteres)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="complete-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="pl-9 text-sm h-10 rounded-xl"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="complete-confirm-password" className="text-xs font-semibold text-foreground">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="complete-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className="pl-9 text-sm h-10 rounded-xl"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-bold gap-2 text-sm shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Completando cadastro...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar e Liberar Benefícios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
