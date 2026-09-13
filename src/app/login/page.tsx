"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Check,
  X,
} from "lucide-react";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

/* ─── Password requirement row ─── */
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

/* ─── Reusable styled input wrapper ─── */
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
}

function AuthInput({ id, type, value, onChange, placeholder, required, autoComplete, leftIcon, rightSlot }: AuthInputProps) {
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

/* ─── Eye toggle button ─── */
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

/* ─── Error banner ─── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
      <X className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ─── Main inner component (needs Suspense for useSearchParams) ─── */
function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const initialTab = searchParams?.get("tab") === "register" ? "register" : "login";
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab as "login" | "register");

  // Redirect authenticated users to home (/)
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  /* ── Login state ── */
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  /* ── Register state ── */
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  /* ── Password validation (unchanged logic) ── */
  const hasMinLen = regPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(regPassword);
  const hasLetterOrSpecial = hasLetter || hasSpecial;
  const passwordsMatch = regPassword && regConfirmPassword && regPassword === regConfirmPassword;

  /* ── Handlers (unchanged logic) ── */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await authService.signIn(loginId.trim(), loginPassword);
      window.location.href = "/";
    } catch (err: any) {
      setLoginError(err.message || "Credenciais inválidas.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (!hasMinLen || !hasNumber || !hasLetterOrSpecial) {
      setRegError("A senha não atende a todos os requisitos.");
      return;
    }
    if (!passwordsMatch) {
      setRegError("As senhas não coincidem.");
      return;
    }
    setRegLoading(true);
    try {
      await authService.signUp(regUsername.trim().toLowerCase(), regEmail.trim(), regPassword);
      alert("Conta criada com sucesso! Faça o login agora.");
      setLoginId(regUsername.trim().toLowerCase());
      setActiveTab("login");
    } catch (err: any) {
      setRegError(err.message || "Erro ao criar conta.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setLoginError(err.message || "Erro ao conectar com Google");
      setRegError(err.message || "Erro ao conectar com Google");
    }
  };

  /* ── Loading / redirect guard ── */
  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#9306CF] border-t-transparent animate-spin" />
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] flex flex-col items-center justify-center p-4 relative">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#9306CF]/5 dark:bg-[#9306CF]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#940068]/5 dark:bg-[#940068]/10 blur-3xl" />
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[#7A587D] dark:text-[#C7A9C9] hover:text-[#4C264F] dark:hover:text-[#F9F5F9] transition-colors text-sm font-medium group"
        aria-label="Voltar à loja"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar à loja
      </Link>

      {/* ── Auth Card ── */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 rounded-3xl shadow-2xl p-6 sm:p-8">

          {/* Logo / Brand */}
          <Link
            href="/"
            className="flex flex-col items-center mb-6 cursor-pointer hover:opacity-85 transition-opacity duration-200"
            aria-label="Pop Shake — Início"
          >
            <span className="font-heading font-black text-3xl tracking-tight">
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
            <span className="text-[#7A587D] dark:text-[#957498] text-xs font-medium mt-0.5 tracking-wide">
              Açaí • Sorvetes • Shakes
            </span>
          </Link>

          {/* ── Segmented Control (tab selector) ── */}
          <div className="flex p-1 bg-[#F8F9FA] dark:bg-[#190B1A] rounded-2xl mb-6 border border-gray-100 dark:border-transparent" role="tablist" aria-label="Modo de autenticação">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 h-10 rounded-xl text-sm font-semibold
                  transition-all duration-200
                  ${activeTab === tab
                    ? "bg-gradient-to-r from-[#9306CF] to-[#940068] text-white shadow-lg shadow-[#9306CF]/30"
                    : "text-[#7A587D] dark:text-[#957498] hover:text-[#4C264F] dark:hover:text-[#C7A9C9]"
                  }
                `}
              >
                {tab === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {/* ── LOGIN TAB ── */}
          {activeTab === "login" && (
            <div className="space-y-5" role="tabpanel" aria-label="Entrar">
              {loginError && <ErrorBanner message={loginError} />}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* User/Email field */}
                <div className="space-y-1.5">
                  <label htmlFor="loginId" className="block text-sm font-medium text-[#7A587D] dark:text-[#E2D2E4]">
                    Usuário ou e-mail
                  </label>
                  <AuthInput
                    id="loginId"
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="seunome ou seu@email.com"
                    required
                    autoComplete="username"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="loginPassword" className="block text-sm font-medium text-[#7A587D] dark:text-[#E2D2E4]">
                      Senha
                    </label>
                    <Link
                      href="/recuperar-senha"
                      className="text-xs text-[#9306CF] hover:text-[#940068] dark:hover:text-[#C7A9C9] hover:underline transition-colors"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <AuthInput
                    id="loginPassword"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightSlot={
                      <EyeToggle
                        show={showLoginPassword}
                        onToggle={() => setShowLoginPassword((v) => !v)}
                      />
                    }
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="
                    w-full h-12 rounded-xl mt-2
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
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#512B54]/50" />
                <span className="text-[#7A587D] dark:text-[#957498] text-xs font-medium">OU</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#512B54]/50" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="
                  w-full h-12 rounded-xl
                  flex items-center justify-center gap-3
                  border border-gray-200 dark:border-[#512B54]/60
                  bg-transparent hover:bg-black/5 dark:hover:bg-white/5
                  text-[#4C264F] dark:text-[#E2D2E4] text-sm font-medium
                  transition-all duration-200
                  active:scale-[0.98]
                "
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              {/* Switch tab */}
              <p className="text-center text-sm text-[#7A587D] dark:text-[#957498] pt-1">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-[#9306CF] hover:text-[#940068] dark:hover:text-[#C7A9C9] font-semibold hover:underline transition-colors"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER TAB ── */}
          {activeTab === "register" && (
            <div className="space-y-4" role="tabpanel" aria-label="Cadastrar">
              {regError && <ErrorBanner message={regError} />}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="regUsername" className="block text-sm font-medium text-[#7A587D] dark:text-[#E2D2E4]">
                    Nome de usuário
                  </label>
                  <AuthInput
                    id="regUsername"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.replace(/\s+/g, ""))}
                    placeholder="seunome (sem espaços)"
                    required
                    autoComplete="username"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="regEmail" className="block text-sm font-medium text-[#7A587D] dark:text-[#E2D2E4]">
                    E-mail
                  </label>
                  <AuthInput
                    id="regEmail"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="regPassword" className="block text-sm font-medium text-[#7A587D] dark:text-[#E2D2E4]">
                    Senha
                  </label>
                  <AuthInput
                    id="regPassword"
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightSlot={
                      <EyeToggle
                        show={showRegPassword}
                        onToggle={() => setShowRegPassword((v) => !v)}
                      />
                    }
                  />

                  {/* Password requirements */}
                  {regPassword.length > 0 && (
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

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label htmlFor="regConfirmPassword" className="block text-sm font-medium text-[#7A587D] dark:text-[#E2D2E4]">
                    Confirmar senha
                  </label>
                  <AuthInput
                    id="regConfirmPassword"
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                  {regConfirmPassword.length > 0 && (
                    <div className="pt-1">
                      <ValidationItem
                        isValid={Boolean(passwordsMatch)}
                        label={passwordsMatch ? "Senhas coincidem ✓" : "Senhas não coincidem"}
                      />
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={regLoading || !hasMinLen || !hasNumber || !hasLetterOrSpecial || !passwordsMatch}
                  className="
                    w-full h-12 rounded-xl mt-2
                    font-semibold text-sm text-white
                    bg-gradient-to-r from-[#9306CF] to-[#940068]
                    hover:from-[#a30de8] hover:to-[#b0007c]
                    active:scale-[0.98]
                    transition-all duration-200
                    shadow-lg shadow-[#9306CF]/30
                    disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2
                  "
                >
                  {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#512B54]/50" />
                <span className="text-[#7A587D] dark:text-[#957498] text-xs font-medium">OU</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-[#512B54]/50" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="
                  w-full h-12 rounded-xl
                  flex items-center justify-center gap-3
                  border border-gray-200 dark:border-[#512B54]/60
                  bg-transparent hover:bg-black/5 dark:hover:bg-white/5
                  text-[#4C264F] dark:text-[#E2D2E4] text-sm font-medium
                  transition-all duration-200
                  active:scale-[0.98]
                "
              >
                <GoogleIcon />
                Continuar com Google
              </button>

              {/* Switch tab */}
              <p className="text-center text-sm text-[#7A587D] dark:text-[#957498] pt-1">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="text-[#9306CF] hover:text-[#940068] dark:hover:text-[#C7A9C9] font-semibold hover:underline transition-colors"
                >
                  Entrar
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Google SVG icon ─── */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ─── Page export with Suspense for useSearchParams ─── */
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#9306CF] border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
