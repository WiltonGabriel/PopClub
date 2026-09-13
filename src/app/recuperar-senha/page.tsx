"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Lock, Loader2, Eye, EyeOff, Check, X, KeyRound } from "lucide-react";
import { authService } from "../../services/authService";

/* ─── Shared UI Components ─── */
function ValidationItem({ isValid, label }: { isValid: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-[#7A587D] dark:text-[#957498]"}`}>
      <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-colors ${isValid ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400" : "bg-black/5 text-[#7A587D] dark:bg-white/5 dark:text-[#957498]"}`}>
        {isValid ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : <X className="w-2.5 h-2.5" strokeWidth={3} />}
      </span>
      {label}
    </div>
  );
}

interface AuthInputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  leftIcon: React.ReactNode;
  rightSlot?: React.ReactNode;
  maxLength?: number;
}

function AuthInput({ id, type, value, onChange, placeholder, required, autoComplete, leftIcon, rightSlot, maxLength }: AuthInputProps) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A587D] dark:text-[#957498] pointer-events-none">
        {leftIcon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="
          w-full h-12 rounded-xl
          border border-gray-200 bg-white text-gray-900 
          dark:border-[#512B54]/50 dark:bg-[#1F0B22] dark:text-white
          pl-10 pr-10
          text-sm placeholder-[#7A587D] dark:placeholder-[#957498]
          outline-none
          focus:border-[#9306CF] dark:focus:border-[#9306CF]/70 focus:ring-2 focus:ring-[#9306CF]/20
          transition-all duration-200
        "
      />
      {rightSlot && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {rightSlot}
        </span>
      )}
    </div>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-[#7A587D] dark:text-[#957498] hover:text-[#4C264F] dark:hover:text-[#C7A9C9] transition-colors"
      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
      <X className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ─── Main Page ─── */
export default function RecuperarSenhaPage() {
  const router = useRouter();
  
  // Flow State: 1 = Request Code, 2 = Verify Code & Reset, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Password Validation
  const hasMinLen = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const hasLetterOrSpecial = hasLetter || hasSpecial;
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  
  const isPasswordValid = hasMinLen && hasNumber && hasLetterOrSpecial && passwordsMatch;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await authService.requestPasswordReset(email.trim());
      // Proceed to next step regardless to prevent email enumeration,
      // but the API will return success either way.
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar o código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!isPasswordValid) {
      setError("Verifique se a nova senha atende a todos os requisitos e se coincidem.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(email.trim(), code.trim(), newPassword);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] flex flex-col items-center justify-center p-4 relative">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#9306CF]/5 dark:bg-[#9306CF]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#940068]/5 dark:bg-[#940068]/10 blur-3xl" />
      </div>

      {/* Back link */}
      <Link
        href="/login"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[#7A587D] dark:text-[#C7A9C9] hover:text-[#4C264F] dark:hover:text-[#F9F5F9] transition-colors text-sm font-medium group"
        aria-label="Voltar para o login"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar para o login
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-3xl shadow-2xl p-6 sm:p-8">
          
          {/* Logo / Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <span className="font-heading font-black text-3xl tracking-tight mb-2">
              <span className="text-[#4C264F] dark:text-[#F9F5F9]">Pop</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #9306CF 0%, #940068 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Shake
              </span>
            </span>
            <h1 className="text-[#4C264F] dark:text-[#F9F5F9] text-xl font-bold tracking-tight">Recuperar Senha</h1>
            {step === 1 && <p className="text-[#7A587D] dark:text-[#957498] text-sm mt-1">Insira seu e-mail para receber um código de 6 dígitos.</p>}
            {step === 2 && <p className="text-[#7A587D] dark:text-[#957498] text-sm mt-1">Enviamos um código para {email}</p>}
            {step === 3 && <p className="text-[#35A340] text-sm mt-1">Sua senha foi alterada com sucesso!</p>}
          </div>

          {error && <ErrorBanner message={error} />}

          {/* STEP 1: Request Code */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-[#7A587D] dark:text-[#C7A9C9]">
                  E-mail
                </label>
                <AuthInput
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                  leftIcon={<Mail className="w-4 h-4" />}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="
                  w-full h-12 rounded-xl mt-4
                  font-semibold text-sm text-white
                  bg-gradient-to-r from-[#9306CF] to-[#940068]
                  hover:from-[#a30de8] hover:to-[#b0007c]
                  active:scale-[0.98]
                  transition-all duration-200
                  shadow-lg shadow-[#9306CF]/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar código"}
              </button>
            </form>
          )}

          {/* STEP 2: Verify & Reset */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="code" className="block text-sm font-medium text-[#7A587D] dark:text-[#C7A9C9]">
                  Código de 6 dígitos
                </label>
                <AuthInput
                  id="code"
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  required
                  leftIcon={<KeyRound className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#7A587D] dark:text-[#C7A9C9]">
                  Nova Senha
                </label>
                <AuthInput
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightSlot={
                    <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  }
                />
                
                {newPassword.length > 0 && (
                  <div className="bg-[#F8F9FA] dark:bg-[#190B1A] border border-gray-200 dark:border-[#512B54]/40 rounded-xl px-4 py-3 space-y-2 mt-2">
                    <p className="text-[10px] font-semibold text-[#7A587D] dark:text-[#957498] uppercase tracking-wider mb-1">
                      Requisitos
                    </p>
                    <ValidationItem isValid={hasMinLen} label="Mínimo 8 caracteres" />
                    <ValidationItem isValid={hasNumber} label="Pelo menos 1 número" />
                    <ValidationItem isValid={hasLetterOrSpecial} label="Pelo menos 1 letra ou caractere especial" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#7A587D] dark:text-[#C7A9C9]">
                  Confirmar Nova Senha
                </label>
                <AuthInput
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                />
                {confirmPassword.length > 0 && (
                  <div className="pt-1">
                    <ValidationItem
                      isValid={Boolean(passwordsMatch)}
                      label={passwordsMatch ? "Senhas coincidem ✓" : "Senhas não coincidem"}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid || code.length !== 6}
                className="
                  w-full h-12 rounded-xl mt-4
                  font-semibold text-sm text-white
                  bg-gradient-to-r from-[#9306CF] to-[#940068]
                  hover:from-[#a30de8] hover:to-[#b0007c]
                  active:scale-[0.98]
                  transition-all duration-200
                  shadow-lg shadow-[#9306CF]/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redefinir senha"}
              </button>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
              </div>
              
              <Link
                href="/login"
                className="
                  inline-flex w-full h-12 rounded-xl mt-4
                  font-semibold text-sm text-white
                  bg-gradient-to-r from-[#9306CF] to-[#940068]
                  hover:from-[#a30de8] hover:to-[#b0007c]
                  active:scale-[0.98]
                  transition-all duration-200
                  shadow-lg shadow-[#9306CF]/30
                  items-center justify-center gap-2
                "
              >
                Ir para o Login
              </Link>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
