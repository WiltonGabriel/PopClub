"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  KeyRound,
  Mail,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storeSettingsService } from "@/services/storeSettingsService";

export interface PasswordRecoveryRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  onContinueWithoutPassword?: () => void;
  onSuccess?: (details: { email: string }) => void;
}

type Step = "email" | "code" | "new_password" | "success";

export function PasswordRecoveryRescueModal({
  isOpen,
  onClose,
  clientName = "",
  clientPhone = "",
  clientEmail = "",
  onContinueWithoutPassword,
  onSuccess,
}: PasswordRecoveryRescueModalProps) {
  // Step state
  const [step, setStep] = useState<Step>("email");

  // Step 1: Email
  const [email, setEmail] = useState(clientEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Step 2: Code
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Store WhatsApp for VIP Support
  const [storeWhatsapp, setStoreWhatsapp] = useState("5565992345678");

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setStep("email");
      if (clientEmail) setEmail(clientEmail);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setEmailError(null);
      setCodeError(null);
      setPasswordError(null);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Load WhatsApp settings
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
  }. Estou no site agora, podem me ajudar com meu acesso?`;

  const whatsappUrl = `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(
    formattedMsg
  )}`;

  // Validações de senha
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasLetterOrSpecial = /[A-Za-z!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasNumber && hasLetterOrSpecial && passwordsMatch;

  // PASSO 1: Enviar Código por E-mail
  const handleSendEmailCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      if (data.devCode) {
        setDevCode(data.devCode);
      }

      setResendCooldown(45);
      setStep("code");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao solicitar recuperação.";
      setEmailError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  // PASSO 2: Validar Código de 6 Dígitos
  const handleConfirmCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setCodeError("Digite o código completo de 6 dígitos enviado ao seu e-mail.");
      return;
    }

    setStep("new_password");
  };

  // PASSO 3: Salvar Nova Senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!isPasswordValid) {
      if (!hasMinLength) setPasswordError("A nova senha deve ter no mínimo 8 caracteres.");
      else if (!hasNumber) setPasswordError("A senha deve conter ao menos um número.");
      else if (!passwordsMatch) setPasswordError("As senhas não coincidem.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Código inválido ou expirado.");
      }

      setStep("success");

      // Auto-fechamento com feedback ao usuário
      setTimeout(() => {
        if (onSuccess) {
          onSuccess({ email: email.trim().toLowerCase() });
        }
        onClose();
      }, 2800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao redefinir a senha.";
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden text-card-foreground">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Indicador de Passos */}
        {step !== "success" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === "email" ? "w-8 bg-primary" : "w-3 bg-muted"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === "code" ? "w-8 bg-primary" : "w-3 bg-muted"
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === "new_password" ? "w-8 bg-primary" : "w-3 bg-muted"
              }`}
            />
          </div>
        )}

        {/* PASSO 1: CONFIRMAÇÃO DO E-MAIL */}
        {step === "email" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Esqueceu sua senha?
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Confirme seu e-mail cadastrado para receber um código temporário de verificação.
              </p>
            </div>

            {emailError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <form onSubmit={handleSendEmailCode} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="recoveryEmail" className="text-xs font-semibold">
                  E-mail cadastrado
                </Label>
                <div className="relative">
                  <Input
                    id="recoveryEmail"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10 text-xs rounded-xl bg-background"
                    disabled={emailLoading}
                    required
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={emailLoading}
                className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
              >
                {emailLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando código seguro...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enviar Código de Recuperação
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Alternativas: Atendente WhatsApp */}
            <div className="pt-2 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Prefere atendimento humano?</span>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Chamar no WhatsApp
                </a>
              </div>

              {onContinueWithoutPassword && (
                <div className="text-center pt-1">
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
        )}

        {/* PASSO 2: DIGITAÇÃO DO CÓDIGO DE 6 DÍGITOS */}
        {step === "code" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Verifique seu e-mail
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Enviamos um código de segurança de 6 dígitos para{" "}
                <strong className="text-foreground">{email}</strong>.
              </p>
            </div>

            {codeError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            {/* Dica para Modo de Desenvolvimento */}
            {devCode && (
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center justify-between gap-2">
                <span className="font-mono">
                  Código de Simulação: <strong>{devCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCode(devCode)}
                  className="text-[11px] font-bold underline cursor-pointer hover:opacity-80"
                >
                  Preencher
                </button>
              </div>
            )}

            <form onSubmit={handleConfirmCode} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <Label htmlFor="verificationCode" className="text-xs font-semibold block text-left">
                  Código de 6 dígitos
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 text-center font-mono font-bold text-2xl tracking-[0.4em] rounded-xl bg-background"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("email")}
                  className="h-11 px-4 rounded-xl text-xs font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={code.length !== 6 || codeLoading}
                  className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
                >
                  Confirmar Código
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
              <span className="text-muted-foreground">Não recebeu o código?</span>
              <button
                type="button"
                disabled={resendCooldown > 0 || emailLoading}
                onClick={() => handleSendEmailCode()}
                className="font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: DEFINIÇÃO DA NOVA SENHA */}
        {step === "new_password" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Crie sua nova senha
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Código verificado! Escolha uma nova senha forte para acessar sua conta.
              </p>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4 text-left">
              {/* Nova Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="newPasswordInput" className="text-xs font-semibold">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="newPasswordInput"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 pl-10 pr-10 text-xs rounded-xl bg-background"
                    disabled={passwordLoading}
                    required
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPasswordInput" className="text-xs font-semibold">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPasswordInput"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pl-10 pr-10 text-xs rounded-xl bg-background"
                    disabled={passwordLoading}
                    required
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Indicadores de Força da Senha */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasMinLength ? "bg-emerald-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className={hasMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                    Pelo menos 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasNumber ? "bg-emerald-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className={hasNumber ? "text-foreground font-medium" : "text-muted-foreground"}>
                    Pelo menos um número (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      passwordsMatch ? "bg-emerald-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className={passwordsMatch ? "text-foreground font-medium" : "text-muted-foreground"}>
                    As senhas coincidem
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isPasswordValid || passwordLoading}
                className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
              >
                {passwordLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando nova senha...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Salvar Nova Senha
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* PASSO 4: FEEDBACK DE SUCESSO E CONCLUSÃO */}
        {step === "success" && (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 mb-2">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Senha redefinida com sucesso!
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Sua nova credencial já está ativa. Você já pode entrar e aproveitar todas as delícias do PopClub!
            </p>
            <div className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  if (onSuccess) {
                    onSuccess({ email: email.trim().toLowerCase() });
                  }
                  onClose();
                }}
                className="h-10 px-6 rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
