"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  KeyRound,
  Mail,
  MessageCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storeSettingsService } from "@/services/storeSettingsService";

interface PasswordRecoveryRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  onContinueWithoutPassword?: () => void;
}

export function PasswordRecoveryRescueModal({
  isOpen,
  onClose,
  clientName = "",
  clientPhone = "",
  clientEmail = "",
  onContinueWithoutPassword,
}: PasswordRecoveryRescueModalProps) {
  const [email, setEmail] = useState(clientEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [storeWhatsapp, setStoreWhatsapp] = useState("5565999999999");

  useEffect(() => {
    if (clientEmail && !email) {
      setEmail(clientEmail);
    }
  }, [clientEmail, email]);

  useEffect(() => {
    storeSettingsService
      .getSettings()
      .then((settings) => {
        if (settings.whatsappNumber) {
          const clean = settings.whatsappNumber.replace(/\D/g, "");
          if (clean) setStoreWhatsapp(clean);
        }
      })
      .catch((err) => console.error("Erro ao carregar WhatsApp da loja:", err));
  }, []);

  if (!isOpen) return null;

  const cleanStorePhone = storeWhatsapp.startsWith("55")
    ? storeWhatsapp
    : `55${storeWhatsapp}`;

  const formattedMsg = `Olá Pop Shake! Esqueci minha senha no PopClub. Meu nome é ${
    clientName.trim() || "Cliente"
  } e meu telefone é ${
    clientPhone.trim() || "não informado"
  }. Estou montando meu pedido agora, podem me ajudar a redefinir?`;

  const whatsappUrl = `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(
    formattedMsg
  )}`;

  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setEmailError("Informe um endereço de e-mail válido.");
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível enviar o código.");
      }

      setEmailSent(true);
    } catch (err: any) {
      setEmailError(err.message || "Erro ao solicitar recuperação.");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Esqueceu sua senha?
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Notamos tentativas incorretas. Não se preocupe! Escolha como deseja
            recuperar seu acesso para continuar seu pedido.
          </p>
        </div>

        {/* Opções de Resgate */}
        <div className="space-y-4">
          {/* Opção 1: Receber Código por E-mail */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Opção 1: Código Rápido por E-mail
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Enviaremos um código temporário de 6 dígitos para o seu e-mail.
                </p>
              </div>
            </div>

            {emailSent ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Código enviado para <strong>{email}</strong>!</span>
                </div>
                <a
                  href={`/recuperar-senha?email=${encodeURIComponent(email)}`}
                  className="font-bold underline text-xs shrink-0"
                >
                  Inserir Código →
                </a>
              </div>
            ) : (
              <form onSubmit={handleSendEmailCode} className="space-y-2.5">
                {emailError && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-background"
                    disabled={emailLoading}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={emailLoading}
                    className="h-10 px-4 rounded-xl text-xs font-bold shrink-0"
                  >
                    {emailLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Enviar Código"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Opção 2: Atendente via WhatsApp */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Opção 2: Suporte VIP no WhatsApp
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Fale com a equipe da loja para auxílio imediato na redefinição.
                </p>
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.99]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chamar Atendente no WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto" />
            </a>
          </div>

          {/* Opção 3: Emergência - Concluir Pedido Sem Senha */}
          {onContinueWithoutPassword && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onContinueWithoutPassword();
                }}
                className="text-xs font-semibold text-primary hover:underline transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Concluir pedido sem senha desta vez
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
