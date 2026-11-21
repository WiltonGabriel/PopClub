"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ChevronLeft, 
  ChevronRight,
  Home,
  User, 
  MapPin, 
  Package, 
  CreditCard, 
  Settings, 
  LogOut, 
  Loader2, 
  Check, 
  Eye, 
  Bell, 
  Type, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  X,
  Volume2,
  ShieldCheck,
  Clock,
  Bike,
  Accessibility,
  Laptop,
  Sun,
  Moon,
  Banknote,
  QrCode,
  Wallet,
  Copy,
  CheckCheck,
  Inbox,
  LayoutDashboard,
  ClipboardList,
  History,
  Pencil,
  Users,
  Lock,
  AlertCircle,
  AtSign,
  KeyRound,
  EyeOff,
  Download,
  Cookie,
  ShieldAlert,
  Trash2,
  Smartphone,
  Boxes,
} from "lucide-react";
import { getVisibleAdminGroups } from "../../lib/adminNavigation";
import { privacyService, CookieConsentPreferences } from "@/services/privacyService";
import { pwaInstallService } from "@/services/pwaInstallService";
import { navigationHistoryService } from "@/services/navigationHistoryService";
import { notificationService, AppNotification } from "../../services/notificationService";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { 
  useAccessibility, 
  FontSizeOption, 
  ColorBlindModeOption 
} from "../../contexts/AccessibilityContext";
import { LogoutConfirmModal } from "@/components/ui/LogoutConfirmModal";
import { CompleteRegistrationModal } from "@/components/auth/CompleteRegistrationModal";
import { PasswordRecoveryRescueModal } from "@/components/auth/PasswordRecoveryRescueModal";
import { formatPhoneInput } from "@/components/auth/FastAccessModal";
import { BottomNav } from "../../components/storefront/BottomNav";
import { useToast } from "../../components/ui/ToastNotification";
import { userService, UserProfile } from "../../services/userService";
import { useAddress } from "../../contexts/AddressContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { playDingSound } from "../../lib/sound";
import { 
  LoyaltyBadgeConfig, 
  DEFAULT_LOYALTY_BADGES, 
  loyaltyBadgeService 
} from "../../services/loyaltyBadgeService";

interface AvatarPresetItem {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  path?: string;
  desc?: string;
  category?: string | null;
  order?: number;
  minMonths?: number;
  minOrders?: number;
  isUnlocked?: boolean;
}

const DEFAULT_AVATAR_PRESETS: AvatarPresetItem[] = [
  { id: "sorvete", name: "Sundae Amora", imageUrl: "/avatars/avatar-sorvete.svg", description: "Clássico sundae com calda de amora" },
  { id: "acai", name: "Tigela de Açaí", imageUrl: "/avatars/avatar-acai.svg", description: "Açaí cremoso com banana e morango" },
  { id: "shake", name: "Milk Shake", imageUrl: "/avatars/avatar-shake.svg", description: "Milk shake cremoso refrescante" },
  { id: "picole", name: "Picolé Frutas", imageUrl: "/avatars/avatar-picole.svg", description: "Picolé artesanal de frutas tropicais" },
  { id: "morango", name: "Morango Pop", imageUrl: "/avatars/avatar-morango.svg", description: "Morango doce e selecionado" },
  { id: "banana", name: "Banana Split", imageUrl: "/avatars/avatar-banana.svg", description: "Banana ouro com toque especial" },
  { id: "cookie", name: "Cookie Choco", imageUrl: "/avatars/avatar-cookie.svg", description: "Cookie crocante com gotas de chocolate" },
  { id: "cereja", name: "Cereja Pop", imageUrl: "/avatars/avatar-cereja.svg", description: "Toque final irresistível" },
  { id: "casquinha", name: "Casquinha Dupla", imageUrl: "/avatars/avatar-casquinha.svg", description: "Casquinha crocante com dois sabores" },
];

function formatFullDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} de ${month} às ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

function getDaysRemaining(changedAt?: string | null): number {
  if (!changedAt) return 0;
  const changedTime = new Date(changedAt).getTime();
  if (isNaN(changedTime)) return 0;
  const diffMs = Date.now() - changedTime;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  if (diffMs >= fourteenDaysMs) return 0;
  return Math.max(1, Math.ceil((fourteenDaysMs - diffMs) / (24 * 60 * 60 * 1000)));
}

interface ProfileBadgeInfo {
  label: string;
  badgeClass: string;
  icon: string;
  isStaffBadge?: boolean;
}

function computeProfileBadge(
  userRole: string | undefined | null,
  isRegistered: boolean | undefined | null,
  createdAtDate: string | Date | null | undefined,
  loyaltyBadges: LoyaltyBadgeConfig[] = DEFAULT_LOYALTY_BADGES
): ProfileBadgeInfo | null {
  const normalizedRole = String(userRole || "").toUpperCase();

  // 1. Regra de Prioridade por Cargo (Admin / Editor)
  if (normalizedRole === "ADMIN") {
    return {
      label: "Administrador",
      icon: "👑",
      badgeClass: "bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-violet-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40 shadow-xs font-bold",
      isStaffBadge: true,
    };
  }

  if (normalizedRole === "EDITOR" || normalizedRole === "OPERATOR") {
    return {
      label: "Editor / Operação",
      icon: "🛡️",
      badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 shadow-xs font-bold",
      isStaffBadge: true,
    };
  }

  // 2. Se for Acesso Rápido (não registrado), omite o selo de fidelidade
  if (!isRegistered) {
    return null;
  }

  // 3. Regra para Clientes Cadastrados: calcular a partir de createdAt e da régua dinâmica
  if (!createdAtDate) {
    const defaultBadge = loyaltyBadges[0] || DEFAULT_LOYALTY_BADGES[0];
    return {
      label: defaultBadge.name,
      icon: defaultBadge.icon || "🌟",
      badgeClass: defaultBadge.badgeClass || "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold",
    };
  }

  const created = new Date(createdAtDate);
  const now = new Date();
  let months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
  if (now.getDate() < created.getDate()) {
    months = Math.max(0, months - 1);
  }

  // Ordena os selos pelo minMonths crescente
  const sorted = [...(loyaltyBadges.length > 0 ? loyaltyBadges : DEFAULT_LOYALTY_BADGES)].sort(
    (a, b) => a.minMonths - b.minMonths
  );

  // Filtra os selos conquistados e pega o maior alcançado
  const qualifying = sorted.filter((b) => months >= (b.minMonths || 0));
  const activeBadge = qualifying.length > 0 ? qualifying[qualifying.length - 1] : sorted[0];

  // Formatação de tempo decorrido
  let tenureText = "";
  if (months >= 1) {
    if (months < 12) {
      tenureText = months === 1 ? "Há 1 mês" : `Há ${months} meses`;
    } else {
      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      if (years === 1 && remMonths === 0) tenureText = "Há 1 ano";
      else if (remMonths === 0) tenureText = `Há ${years} anos`;
      else tenureText = `Há ${years} ${years === 1 ? "ano" : "anos"}`;
    }
  }

  const label = tenureText ? `${activeBadge.name} • ${tenureText}` : activeBadge.name;

  return {
    label,
    icon: activeBadge.icon || "🌟",
    badgeClass: activeBadge.badgeClass || "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold",
  };
}

export default function AccountPage() {
  const { user, loading, refreshUser, isAdmin, isEditor, canAccess, signOut } = useAuth();
  const { theme, setTheme, systemTheme } = useTheme();
  const { 
    addresses, 
    activeAddressId, 
    setActiveAddressId, 
    openAddressModal, 
    deleteAddress: deleteAddressCtx,
  } = useAddress();
  const { 
    previewSettings, 
    updatePreview, 
    saveSettings, 
    isSaving: isSavingAccessibility, 
    triggerVisualAlert, 
    resetToDefaults,
    resetPreview
  } = useAccessibility();
  const { showToast } = useToast();
  const router = useRouter();
  
  type AccountView = "menu" | "perfil" | "notificacoes" | "enderecos" | "preferencias" | "acessibilidade" | "privacidade";

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [activeSection, setActiveSection] = useState("perfil");
  const [currentView, setCurrentView] = useState<AccountView>("menu");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loyaltyBadges, setLoyaltyBadges] = useState<LoyaltyBadgeConfig[]>(DEFAULT_LOYALTY_BADGES);

  useEffect(() => {
    loyaltyBadgeService.getBadges().then(setLoyaltyBadges).catch(() => null);
  }, []);

  const userRole = user?.role || profile?.role || (isAdmin ? "ADMIN" : "CLIENT");
  const userCreatedAt = profile?.created_at || user?.createdAt || user?.created_at;
  const profileBadge = computeProfileBadge(userRole, user?.isRegistered, userCreatedAt, loyaltyBadges);

  // Navegação Drill-down reativa
  const handleSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setCurrentView(sectionId as AccountView);
    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}?section=${encodeURIComponent(sectionId)}`;
      window.history.replaceState(window.history.state, "", nextUrl);
      navigationHistoryService.replaceCurrent(nextUrl);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const handleHeaderBack = () => {
    // No mobile dentro de qualquer sub-tela, volta imediatamente para o menu
    if (typeof window !== "undefined" && window.innerWidth < 768 && currentView !== "menu") {
      setCurrentView("menu");
      const baseUrl = window.location.pathname;
      window.history.replaceState(window.history.state, "", baseUrl);
      navigationHistoryService.replaceCurrent(baseUrl);
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      navigationHistoryService.goBack(router, "/");
    }
  };

  // Edit profile state
  const [fullName, setFullName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("/avatars/avatar-sorvete.svg");

  // Estados de Segurança e Edição de Perfil
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [namePasswordInput, setNamePasswordInput] = useState("");
  const [isSubmittingName, setIsSubmittingName] = useState(false);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailPasswordInput, setEmailPasswordInput] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showPasswordCurrent, setShowPasswordCurrent] = useState(false);
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [isRescueModalOpen, setIsRescueModalOpen] = useState(false);
  
  // Estados de Privacidade e LGPD (Art. 18)
  const [isExportingData, setIsExportingData] = useState(false);
  const [isAnonymizeModalOpen, setIsAnonymizeModalOpen] = useState(false);
  const [anonymizePassword, setAnonymizePassword] = useState("");
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const [anonymizeError, setAnonymizeError] = useState<string | null>(null);

  const handleExportLgpdData = async () => {
    try {
      setIsExportingData(true);
      const data = await privacyService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `popclub-dados-pessoais-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast({
        type: "success",
        title: "Exportação Concluída",
        message: "O arquivo JSON com seus dados pessoais foi baixado com sucesso (Art. 18, V da LGPD).",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível exportar seus dados no momento.";
      showToast({
        type: "error",
        title: "Falha na Exportação",
        message: msg,
      });
    } finally {
      setIsExportingData(false);
    }
  };

  const handleConfirmAnonymization = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnonymizeError(null);
    setIsAnonymizing(true);
    try {
      const res = await privacyService.requestAnonymization(anonymizePassword);
      showToast({
        type: "success",
        title: "Conta Anonimizada",
        message: res.message,
      });
      setIsAnonymizeModalOpen(false);
      await signOut();
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar anonimização.";
      setAnonymizeError(msg);
    } finally {
      setIsAnonymizing(false);
    }
  };

  // Carência de 14 Dias (2 Semanas) para Nome e E-mail
  const nameDaysRemaining = getDaysRemaining(profile?.lastNameChangedAt || user?.lastNameChangedAt);
  const emailDaysRemaining = getDaysRemaining(profile?.lastEmailChangedAt || user?.lastEmailChangedAt);

  // Política de Rotação e Segurança de Senha (Ciclo Recomendado de 90 Dias)
  const rawLastPasswordDate =
    profile?.passwordUpdatedAt ||
    profile?.lastPasswordChangedAt ||
    user?.passwordUpdatedAt ||
    user?.lastPasswordChangedAt ||
    profile?.created_at ||
    user?.createdAt;

  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  useEffect(() => {
    setCurrentTimestamp(Date.now());
  }, []);

  const passwordRotationInfo = useMemo(() => {
    const PASSWORD_ROTATION_DAYS = 90;
    if (!rawLastPasswordDate) {
      return {
        formattedDate: "Não informada",
        daysRemaining: PASSWORD_ROTATION_DAYS,
        isExpired: false,
        isWarning: false,
      };
    }
    const dateObj = new Date(rawLastPasswordDate);
    const isValidDate = !isNaN(dateObj.getTime());
    if (!isValidDate) {
      return {
        formattedDate: "Não informada",
        daysRemaining: PASSWORD_ROTATION_DAYS,
        isExpired: false,
        isWarning: false,
      };
    }
    const formattedDate = `${dateObj.toLocaleDateString("pt-BR")} às ${dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const expirationTime = dateObj.getTime() + PASSWORD_ROTATION_DAYS * 24 * 60 * 60 * 1000;
    const now = currentTimestamp > 0 ? currentTimestamp : dateObj.getTime();
    const diffMs = expirationTime - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    return {
      formattedDate,
      daysRemaining,
      isExpired: daysRemaining === 0,
      isWarning: daysRemaining > 0 && daysRemaining <= 15,
    };
  }, [rawLastPasswordDate, currentTimestamp]);

  // Preferências de Pagamento na Entrega
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<"pix_entrega" | "cartao_maquininha" | "dinheiro">("pix_entrega");
  const [preferredChangeFor, setPreferredChangeFor] = useState("");
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Notificações e Alertas
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);
  const [isSavingNotificationPref, setIsSavingNotificationPref] = useState(false);

  // Instalação do Aplicativo PopShake (PWA) e Consentimento de Cookies
  const [pwaAutoPrompt, setPwaAutoPrompt] = useState<boolean>(true);
  const [isPwaStandalone, setIsPwaStandalone] = useState<boolean>(false);
  const [isPwaDismissed, setIsPwaDismissed] = useState<boolean>(false);
  const [cookieConsent, setCookieConsent] = useState<CookieConsentPreferences | null>(null);

  // Modal de Avatar
  const [avatarPresets, setAvatarPresets] = useState<AvatarPresetItem[]>(DEFAULT_AVATAR_PRESETS);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [modalAvatarChoice, setModalAvatarChoice] = useState("/avatars/avatar-sorvete.svg");
  const [isCompleteRegModalOpen, setIsCompleteRegModalOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadNotificationsCount(data.unreadCount);
      setNotificationsEnabled(data.notificationsEnabled);
    } catch (err) {
      console.error("Erro ao carregar histórico de notificações:", err);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Detecta ?tab=... ou ?section=... na URL e sincroniza preferências PWA/Cookies
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || params.get("section");
      const validSections = ["perfil", "notificacoes", "enderecos", "preferencias", "acessibilidade", "privacidade"];
      if (tabParam && validSections.includes(tabParam)) {
        setActiveSection(tabParam);
        setCurrentView(tabParam as AccountView);
      }

      setPwaAutoPrompt(pwaInstallService.isAutoPromptEnabled());
      setIsPwaStandalone(pwaInstallService.isStandalone());
      setIsPwaDismissed(pwaInstallService.isDismissedActive());
      setCookieConsent(privacyService.getConsent());

      const handlePwaPref = (e: Event) => {
        const custom = e as CustomEvent<{ enabled: boolean }>;
        if (custom.detail) {
          setPwaAutoPrompt(custom.detail.enabled);
        }
      };

      const handlePwaDismissed = () => {
        setIsPwaDismissed(pwaInstallService.isDismissedActive());
      };

      const handleConsentUpdated = (e: Event) => {
        const custom = e as CustomEvent<CookieConsentPreferences>;
        if (custom.detail) {
          setCookieConsent(custom.detail);
        }
      };

      window.addEventListener("popshake:pwa-prompt-preference-changed", handlePwaPref as EventListener);
      window.addEventListener("popshake:pwa-prompt-dismissed", handlePwaDismissed as EventListener);
      window.addEventListener("popclub:cookie-consent-updated", handleConsentUpdated as EventListener);

      return () => {
        window.removeEventListener("popshake:pwa-prompt-preference-changed", handlePwaPref as EventListener);
        window.removeEventListener("popshake:pwa-prompt-dismissed", handlePwaDismissed as EventListener);
        window.removeEventListener("popclub:cookie-consent-updated", handleConsentUpdated as EventListener);
      };
    }
  }, []);

  const handleToggleNotificationPreference = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    setIsSavingNotificationPref(true);
    try {
      await notificationService.updatePreferences(enabled);
      showToast({
        type: "success",
        title: enabled ? "Notificações Ativadas" : "Alertas Silenciados",
        message: enabled
          ? "Você voltará a receber avisos e badges na tela inicial."
          : "Os avisos da tela inicial foram silenciados. As mensagens continuarão arquivadas aqui.",
      });
    } catch {
      setNotificationsEnabled(!enabled);
      showToast({
        type: "error",
        title: "Erro",
        message: "Não foi possível atualizar suas preferências no momento.",
      });
    } finally {
      setIsSavingNotificationPref(false);
    }
  };

  const handleMarkNotificationAsRead = async (notif: AppNotification) => {
    if (notif.isRead) return;
    try {
      await notificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadNotificationsCount(0);
      showToast({
        type: "success",
        title: "Histórico Atualizado",
        message: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCouponCode = (code: string, notif: AppNotification) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponId(notif.id);
    playDingSound();
    handleMarkNotificationAsRead(notif);
    showToast({
      type: "success",
      title: "Cupom Copiado!",
      message: `Código ${code} pronto para colar no carrinho.`,
    });
    setTimeout(() => setCopiedCouponId(null), 2500);
  };

  const handleApplyCouponToCart = (code: string, notif: AppNotification) => {
    handleMarkNotificationAsRead(notif);
    try {
      localStorage.setItem("popclub_applied_coupon", code);
      window.dispatchEvent(new CustomEvent("popclub_coupon_applied", { detail: { code } }));
    } catch {}
    showToast({
      type: "success",
      title: "Cupom Aplicado!",
      message: `O cupom ${code} foi adicionado ao seu pedido!`,
    });
    router.push("/carrinho");
  };

  useEffect(() => {
    fetch("/api/avatars")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvatarPresets(data);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar avatares oficiais:", err);
      });
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const prof = await userService.getProfile(user.id);
      if (prof) {
        setProfile(prof);
        setFullName(prof.full_name || "");
        const defaultAvatar = user.isRegistered === false ? "/avatars/avatar-guest-user.svg" : "/avatars/avatar-sorvete.svg";
        const userAvatar = prof.avatar || prof.avatar_url || user.avatar || user.avatarUrl || defaultAvatar;
        setSelectedAvatar(userAvatar);
        setModalAvatarChoice(userAvatar);

        const pMethod = prof.default_payment_method || prof.defaultPaymentMethod || user.defaultPaymentMethod || user.default_payment_method || "pix_entrega";
        if (pMethod === "dinheiro" || pMethod === "cartao_maquininha" || pMethod === "pix_entrega") {
          setPreferredPaymentMethod(pMethod);
        }
        const pChange = prof.default_change_for !== undefined && prof.default_change_for !== null
          ? String(prof.default_change_for)
          : (prof.defaultChangeFor !== undefined && prof.defaultChangeFor !== null
              ? String(prof.defaultChangeFor)
              : (user.defaultChangeFor !== undefined && user.defaultChangeFor !== null
                  ? String(user.defaultChangeFor)
                  : (user.default_change_for !== undefined && user.default_change_for !== null
                      ? String(user.default_change_for)
                      : "")));
        setPreferredChangeFor(pChange);
      }
      await loadNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, [user, loadNotifications]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      loadUserData();
    }
  }, [user, loading, router, loadUserData]);

  // Ação: Alterar Nome Completo com Confirmação de Senha e Carência
  const handleChangeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newNameInput.trim()) {
      showToast({ type: "error", title: "Nome Obrigatório", message: "Informe seu novo nome completo." });
      return;
    }
    if (user.isRegistered && !namePasswordInput) {
      showToast({ type: "error", title: "Senha Necessária", message: "Informe sua senha atual para confirmar a alteração." });
      return;
    }
    setIsSubmittingName(true);
    try {
      const updated = await userService.updateProfile(user.id, {
        full_name: newNameInput.trim(),
        current_password: namePasswordInput || undefined,
      });
      setProfile(updated);
      setFullName(updated.full_name || "");
      await refreshUser();
      setIsNameModalOpen(false);
      setNamePasswordInput("");
      showToast({
        type: "success",
        title: "Nome Atualizado!",
        message: "Seu nome foi alterado com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível alterar o nome.";
      showToast({
        type: "error",
        title: "Erro ao alterar nome",
        message,
      });
    } finally {
      setIsSubmittingName(false);
    }
  };

  // Ação: Alterar E-mail com Confirmação de Senha e Carência
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newEmailInput.trim() || !newEmailInput.includes("@")) {
      showToast({ type: "error", title: "E-mail Inválido", message: "Informe um e-mail válido." });
      return;
    }
    if (user.isRegistered && !emailPasswordInput) {
      showToast({ type: "error", title: "Senha Necessária", message: "Informe sua senha atual para confirmar a alteração." });
      return;
    }
    setIsSubmittingEmail(true);
    try {
      const updated = await userService.updateProfile(user.id, {
        email: newEmailInput.trim().toLowerCase(),
        current_password: emailPasswordInput || undefined,
      });
      setProfile(updated);
      await refreshUser();
      setIsEmailModalOpen(false);
      setEmailPasswordInput("");
      showToast({
        type: "success",
        title: "E-mail Atualizado!",
        message: "Seu e-mail de acesso foi alterado com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível alterar o e-mail.";
      showToast({
        type: "error",
        title: "Erro ao alterar e-mail",
        message,
      });
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  // Ação: Redefinir Senha com Senha Atual e Nova Senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!currentPasswordInput) {
      showToast({ type: "error", title: "Senha Atual", message: "Informe sua senha atual." });
      return;
    }
    if (newPasswordInput.length < 8) {
      showToast({ type: "error", title: "Senha Curta", message: "A nova senha deve ter no mínimo 8 caracteres." });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showToast({ type: "error", title: "Senhas Divergentes", message: "A confirmação da nova senha não confere." });
      return;
    }
    setIsSubmittingPassword(true);
    try {
      const updated = await userService.updateProfile(user.id, {
        new_password: newPasswordInput,
        current_password: currentPasswordInput,
      });
      setProfile(updated);
      await refreshUser();
      setIsPasswordModalOpen(false);
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      showToast({
        type: "success",
        title: "Senha Redefinida!",
        message: "Sua senha de acesso foi redefinida com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível redefinir a senha.";
      showToast({
        type: "error",
        title: "Erro ao redefinir senha",
        message,
      });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Confirmar escolha de avatar no modal
  const handleConfirmAvatarModal = async () => {
    if (!user || user.isRegistered === false) {
      showToast({
        type: "warning",
        title: "Recurso Exclusivo",
        message: "Personalização de avatar disponível após completar o cadastro.",
      });
      setIsAvatarModalOpen(false);
      setIsCompleteRegModalOpen(true);
      return;
    }
    setSelectedAvatar(modalAvatarChoice);
    setIsAvatarModalOpen(false);

    try {
      await userService.updateProfile(user.id, {
        avatar: modalAvatarChoice,
        avatar_url: modalAvatarChoice,
      });
      await refreshUser();
      showToast({
        type: "success",
        title: "Avatar Atualizado!",
        message: "Seu novo avatar foi salvo com sucesso.",
      });
    } catch (err: unknown) {
      console.error("Erro ao sincronizar avatar imediatamente:", err);
    }
  };

  // Salvar configurações de acessibilidade
  const handleSaveAccessibility = async () => {
    try {
      await saveSettings();
      showToast({
        type: "success",
        title: "Acessibilidade Salva!",
        message: "Suas preferências foram aplicadas e persistidas na sua conta.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao salvar preferências de acessibilidade.";
      showToast({
        type: "error",
        title: "Erro ao salvar preferências",
        message,
      });
    }
  };

  // Salvar preferências gerais e de pagamento
  const handleSavePreferences = async () => {
    if (!user) return;
    setIsSavingPreferences(true);
    try {
      const changeVal = preferredPaymentMethod === "dinheiro" && preferredChangeFor ? parseFloat(preferredChangeFor) : null;
      const updated = await userService.updateProfile(user.id, {
        default_payment_method: preferredPaymentMethod,
        default_change_for: changeVal,
      });
      setProfile(updated);
      await refreshUser();
      showToast({
        type: "success",
        title: "Preferências salvas!",
        message: "Sua forma de pagamento preferencial e configurações foram atualizadas com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar suas preferências.";
      showToast({
        type: "error",
        title: "Erro ao salvar preferências",
        message,
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      resetToDefaults();
      showToast({
        type: "success",
        title: user?.isRegistered ? "Sessão encerrada" : "Acesso rápido encerrado",
        message: "Você saiu com sucesso.",
      });
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
      showToast({
        type: "error",
        title: "Erro ao sair",
        message: "Ocorreu um erro ao encerrar a sessão.",
      });
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  };

  if (loading || (fetching && !profile)) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9306CF]" />
      </div>
    );
  }

  const sections = [
    { 
      id: "perfil", 
      label: "Meu Perfil", 
      desc: "Nome, avatar e dados cadastrais",
      icon: <User className="w-4 h-4" /> 
    },
    { 
      id: "notificacoes", 
      label: "Notificações", 
      desc: "Histórico de avisos, cupons e preferências",
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { 
      id: "enderecos", 
      label: "Endereços", 
      desc: "Locais salvos para entrega rápida",
      icon: <MapPin className="w-4 h-4" /> 
    },
    { 
      id: "preferencias", 
      label: "Preferências", 
      desc: "Tema, aplicativo PopShake e pagamentos",
      icon: <Settings className="w-4 h-4" /> 
    },
    { 
      id: "acessibilidade", 
      label: "Acessibilidade", 
      desc: "Tamanho de fontes, cores e contraste",
      icon: <Accessibility className="w-4 h-4" /> 
    },
    { 
      id: "privacidade", 
      label: "Privacidade e dados", 
      desc: "Políticas, cookies, consentimento e direitos LGPD",
      icon: <ShieldCheck className="w-4 h-4" /> 
    },
  ];

  const currentSectionConfig = sections.find(
    (s) => s.id === (currentView !== "menu" ? currentView : activeSection)
  );

  const defaultAvatar = user?.isRegistered === false ? "/avatars/avatar-guest-user.svg" : "/avatars/avatar-sorvete.svg";
  const currentDisplayAvatar = selectedAvatar || profile?.avatar || profile?.avatar_url || user?.avatar || defaultAvatar;

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Header com navegação reativa e suporte a Drill-Down */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/80 border-b border-border/40 px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            type="button"
            onClick={handleHeaderBack}
            className="flex items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-foreground transition-colors group cursor-pointer shrink-0 active:scale-95"
            aria-label={currentView !== "menu" ? "Voltar para o menu principal" : "Voltar para a loja"}
          >
            <ChevronLeft className="w-5 h-5 text-foreground/80 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Atalho 1-clique para Página Inicial */}
          <Link
            href="/"
            className="flex items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5 text-[#9306CF] dark:text-[#C7A9C9] transition-colors shrink-0 active:scale-98"
            title="Ir para a Página Inicial"
            aria-label="Página Inicial"
          >
            <Home className="w-5 h-5" />
          </Link>

          {/* Breadcrumb da sub-tela ativa */}
          <div 
            className={`items-center gap-1.5 min-w-0 text-xs sm:text-sm font-semibold animate-in fade-in duration-200 ${
              currentView !== "menu" ? "flex" : "hidden md:flex"
            }`}
          >
            <span className="text-gray-300 dark:text-gray-600 select-none">/</span>
            <div className="font-heading font-bold uppercase tracking-wider text-[#9306CF] dark:text-[#C7A9C9] truncate flex items-center gap-1.5">
              <span className="shrink-0">{currentSectionConfig?.icon}</span>
              <span className="truncate">{currentSectionConfig?.label}</span>
            </div>
          </div>
        </div>

        {/* Atalho para notificações pendentes */}
        {unreadNotificationsCount > 0 && currentView !== "notificacoes" && (
          <button
            type="button"
            onClick={() => handleSelectSection("notificacoes")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 text-xs font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer shrink-0 shadow-xs"
            title="Você tem notificações não lidas"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="font-sans">{unreadNotificationsCount} {unreadNotificationsCount === 1 ? "nova" : "novas"}</span>
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-8 pb-32 sm:pb-36 flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* ================= ESTADO 1: VISÃO DO MENU PRINCIPAL ================= */}
        {/* No mobile: visível exclusivamente quando currentView === 'menu' */}
        {/* No desktop: sempre visível como sidebar na coluna esquerda */}
        <aside 
          className={`w-full md:w-72 lg:w-80 shrink-0 ${
            currentView === "menu" ? "block" : "hidden md:block"
          }`}
        >
          {/* Card com Avatar e Saudação */}
          <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 p-4 mb-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-full border-2 border-primary/40 overflow-hidden bg-purple-50 dark:bg-[#1E2538] shrink-0">
                <Image
                  src={currentDisplayAvatar}
                  alt="Avatar do usuário"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400">Olá,</p>
                <p className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">
                  {profile?.full_name || user?.username || user?.email}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Badge de Cargo ou Selo de Fidelidade */}
            {profileBadge && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${profileBadge.badgeClass}`}
                >
                  <span>{profileBadge.icon}</span>
                  <span>{profileBadge.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* ================= SEÇÃO GESTÃO DA LOJA (EXCLUSIVO ADMIN / OPERADOR) ================= */}
          {isAdmin ? (
            <div className="mb-4 p-3.5 bg-gradient-to-br from-[#9306CF]/10 via-purple-500/5 to-[#940068]/10 dark:from-[#9306CF]/20 dark:via-[#1E2538] dark:to-[#940068]/20 border border-[#9306CF]/30 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary dark:text-violet-400" />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Gestão da Loja
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-xs">
                  Acesso Admin
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {/* 1. Painel Operacional / PDV */}
                <Link
                  href="/admin"
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-primary dark:text-violet-400 group-hover:scale-105 transition-transform shrink-0">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        Painel Operacional / PDV
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Dashboard, métricas e cardápio
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                {/* 2. Gerenciar Pedidos */}
                <Link
                  href="/admin/pedidos"
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-[#940068] dark:text-pink-300 group-hover:scale-105 transition-transform shrink-0">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        Gerenciar Pedidos
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Fila ao vivo, cozinha e despacho
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#940068] group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                {/* 3. Histórico de Pedidos da Loja */}
                <Link
                  href="/admin/historico"
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        Histórico de Vendas
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Relatório geral de pedidos da loja
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                {/* 4. Gestão de Usuários & Equipe */}
                <Link
                  href="/admin/usuarios"
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                         Usuários & Equipe
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Controle de acessos, RBAC e permissões
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </div>
            </div>
          ) : isEditor ? (() => {
            const hasOperationalPanel = getVisibleAdminGroups(user).length > 0;
            const canManageKanban = canAccess("ORDERS_KANBAN");
            const canManageStock = canAccess("STOCK_CONTROL");
            const canManageOrdersOrStock = canManageKanban || canManageStock;
            const canViewHistory = canAccess("ORDERS_HISTORY");
            const canManageUsers = canAccess("users_manage");

            if (!hasOperationalPanel && !canManageOrdersOrStock && !canViewHistory && !canManageUsers) {
              return null;
            }

            return (
              <div className="mb-4 p-3.5 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-indigo-500/10 dark:from-indigo-950/40 dark:via-[#1E2538] dark:to-indigo-950/40 border border-indigo-500/30 dark:border-zinc-800 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                      Gestão da Loja
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                    Acesso Editor
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {/* 1. Painel Operacional / PDV (se houver abas liberadas) */}
                  {hasOperationalPanel && (
                    <Link
                      href="/admin"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                          <LayoutDashboard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            Painel Operacional
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Acesso aos módulos liberados
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  )}

                  {/* 2. Gerenciar Pedidos / Controle de Estoque */}
                  {canManageOrdersOrStock && (
                    <Link
                      href="/admin/pedidos"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-[#940068] dark:text-pink-300 group-hover:scale-105 transition-transform shrink-0">
                          {canManageKanban ? <ClipboardList className="w-4 h-4" /> : <Boxes className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {canManageKanban ? "Gerenciar Pedidos" : "Controle de Estoque"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {canManageKanban ? "Fila ao vivo, cozinha e despacho" : "Pausar itens e ajustar estoque em tempo real"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#940068] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  )}

                  {/* 3. Histórico de Pedidos (se permitido) */}
                  {canViewHistory && (
                    <Link
                      href="/admin/historico"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                          <History className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            Histórico de Vendas
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Relatório geral de pedidos da loja
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  )}

                  {/* 4. Moderação de Clientes (se permitido via users_manage) */}
                  {canManageUsers && (
                    <Link
                      href="/admin/usuarios"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            Moderação de Clientes
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Consultar histórico e moderar contas de clientes
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })() : null}

          {/* Banner de Incentivo para Completar Cadastro */}
          {user && !user.isRegistered && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 via-purple-600/10 to-pink-600/10 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-violet-200 dark:border-violet-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/15 text-primary dark:text-violet-400 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Desbloqueie benefícios VIP</h4>
                  <p className="text-xs text-muted-foreground dark:text-zinc-300 mt-0.5 leading-relaxed">
                    Complete seu cadastro para desbloquear seu selo de cliente VIP, cupons exclusivos e histórico detalhado.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCompleteRegModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0 cursor-pointer shadow-xs"
              >
                Completar Cadastro
              </Button>
            </div>
          )}

          {/* Lista de Opções do Menu */}
          <nav className="flex flex-col gap-2">
            {sections.map((sec) => {
              const isSelectedOnDesktop = activeSection === sec.id;
              return (
                <button 
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec.id)}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-all border cursor-pointer active:scale-98 ${
                    isSelectedOnDesktop 
                      ? "bg-gradient-to-r from-[#9306CF] to-[#940068] text-white border-transparent shadow-md shadow-[#9306CF]/20" 
                      : "bg-white dark:bg-[#181D2D] border-gray-200 dark:border-zinc-800 hover:border-primary/50 text-gray-700 dark:text-gray-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-50/80 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`p-2 rounded-lg transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isSelectedOnDesktop 
                      ? "bg-white/20 text-white" 
                      : "bg-purple-50 dark:bg-[#1E2538] text-primary dark:text-violet-400"
                  }`}>
                    {sec.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm truncate">{sec.label}</span>
                      {sec.badge !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black leading-none ${
                          isSelectedOnDesktop ? "bg-white text-[#9306CF]" : "bg-pink-600 text-white"
                        }`}>
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-1 ${
                      isSelectedOnDesktop ? "text-white/80" : "text-muted-foreground"
                    }`}>
                      {sec.desc}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 md:hidden shrink-0 ${
                    isSelectedOnDesktop ? "text-white/80" : "text-gray-400 dark:text-gray-500"
                  }`} />
                </button>
              );
            })}

            <div className="pt-2 hidden max-md:flex">
              <Link 
                href="/pedidos" 
                className="w-full group flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-all border bg-white dark:bg-[#181D2D] border-gray-200 dark:border-zinc-800 hover:border-primary/50 text-gray-700 dark:text-gray-300 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm hover:bg-gray-50/80 dark:hover:bg-white/5"
              >
                <span className="p-2 rounded-lg bg-purple-50 dark:bg-[#1E2538] text-primary dark:text-violet-400 group-hover:scale-110 transition-transform shrink-0">
                  <Package className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-heading font-bold text-sm truncate block text-zinc-900 dark:text-zinc-100">Ver Meus Pedidos</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Acompanhe entregas e pedidos anteriores</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            </div>

            {/* Botão Claro e Visível de Logout / Encerrar Sessão (Mobile e Desktop) */}
            <div className="pt-2">
              <button 
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl font-sans text-sm font-semibold tracking-wide transition-all border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40 mt-3 mb-10 cursor-pointer active:scale-98 shadow-xs group"
                aria-label={user?.isRegistered ? "Sair da conta" : "Encerrar sessão de acesso rápido"}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 group-hover:scale-105 transition-transform shrink-0">
                    <LogOut className="w-4 h-4" />
                  </span>
                  <div className="text-left min-w-0">
                    <span className="font-heading font-bold text-sm block truncate">
                      {user?.isRegistered ? "Sair da Conta" : "Encerrar Sessão"}
                    </span>
                    <p className="text-xs text-red-500/80 dark:text-red-400/80 font-normal truncate">
                      {user?.isRegistered ? "Desconectar suas credenciais" : "Finalizar acesso rápido temporário"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          </nav>
        </aside>

        {/* ================= ESTADO 2: VISÃO DA CONFIGURAÇÃO SELECIONADA ================= */}
        {/* No mobile: renderiza exclusivamente a sub-tela selecionada com 100% de largura */}
        {/* No desktop: renderiza no painel direito ao lado do menu lateral */}
        <div 
          className={`flex-1 min-w-0 ${
            currentView === "menu" ? "hidden md:block" : "block"
          }`}
        >
          {/* Sub-tela com animação suave de entrada */}
          <div key={activeSection} className="animate-in fade-in-50 slide-in-from-right-2 duration-200">

          {/* ================= ABA: MEU PERFIL ================= */}
          {activeSection === "perfil" && (
            <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <User className="w-6 h-6 text-primary dark:text-violet-400" /> Meu Perfil
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Gerencie sua identidade, avatar oficial e dados cadastrais.
                  </p>
                </div>
                {profileBadge && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border self-start sm:self-auto ${profileBadge.badgeClass}`}
                  >
                    <span>{profileBadge.icon}</span>
                    <span>{profileBadge.label}</span>
                  </div>
                )}
              </div>

              {/* Seletor de Avatar em Destaque Circular */}
              <div className="p-6 rounded-2xl bg-gray-50/80 dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-primary/40 p-1.5 bg-white dark:bg-[#181D2D] shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                    <Image
                      src={currentDisplayAvatar}
                      alt="Avatar Atual Selecionado"
                      width={128}
                      height={128}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Botão circular sobreposto com sparkles apenas para cadastrados */}
                  {user?.isRegistered !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalAvatarChoice(selectedAvatar);
                        setIsAvatarModalOpen(true);
                      }}
                      title="Escolher Avatar"
                      aria-label="Escolher Avatar"
                      className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#181D2D] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  {user?.isRegistered === false ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                        <Lock className="w-3.5 h-3.5" /> Acesso Rápido
                      </div>
                      <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                        Avatar Padrão do Usuário
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        A personalização com ilustrações oficiais é exclusiva para clientes cadastrados. Crie sua senha para escolher seu avatar exclusivo.
                      </p>
                      <div>
                        <Button
                          type="button"
                          onClick={() => setIsCompleteRegModalOpen(true)}
                          className="h-9 px-4 rounded-xl font-heading font-bold uppercase tracking-wider text-xs bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white shadow-md shadow-[#9306CF]/20 flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Completar Cadastro e Personalizar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] text-xs font-bold uppercase tracking-wider border border-[#9306CF]/20">
                        <Sparkles className="w-3.5 h-3.5" /> Avatar Exclusivo Pop Shake
                      </div>
                      <h3 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                        Ilustração do Seu Perfil
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Escolha um dos avatares oficiais disponíveis para personalizar sua conta e pedidos.
                      </p>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setModalAvatarChoice(selectedAvatar);
                            setIsAvatarModalOpen(true);
                          }}
                          className="h-9 px-4 rounded-xl border-[#9306CF]/30 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-[#9306CF]/10 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Escolher Avatar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {/* 1. Nome Completo */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 shadow-xs transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" /> Nome Completo
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Identificação em pedidos, notas e programa de vantagens.
                      </p>
                    </div>

                    {nameDaysRemaining > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Próxima alteração em {nameDaysRemaining} {nameDaysRemaining === 1 ? "dia" : "dias"}</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewNameInput(profile?.full_name || user?.fullName || fullName || "");
                          setNamePasswordInput("");
                          setIsNameModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-xl border-gray-200 dark:border-zinc-700 hover:border-primary text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-primary transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Pencil className="w-3 h-3" /> Alterar Nome
                      </Button>
                    )}
                  </div>

                  <Input
                    value={profile?.full_name || user?.fullName || fullName || "Não informado"}
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-gray-50/80 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium cursor-default"
                  />
                  {nameDaysRemaining > 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Dado alterado recentemente. Próxima alteração permitida em {nameDaysRemaining} {nameDaysRemaining === 1 ? "dia" : "dias"}.
                    </p>
                  )}
                </div>

                {/* 2. E-mail */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 shadow-xs transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <AtSign className="w-3.5 h-3.5 text-primary" /> E-mail
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Utilizado para acesso ao PopClub e avisos transacionais.
                      </p>
                    </div>

                    {emailDaysRemaining > 0 ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold w-fit">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Próxima alteração em {emailDaysRemaining} {emailDaysRemaining === 1 ? "dia" : "dias"}</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewEmailInput(user?.email || profile?.email || "");
                          setEmailPasswordInput("");
                          setIsEmailModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-xl border-gray-200 dark:border-zinc-700 hover:border-primary text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-primary transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Pencil className="w-3 h-3" /> Alterar E-mail
                      </Button>
                    )}
                  </div>

                  <Input
                    value={user?.email || profile?.email || "Não informado"}
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-gray-50/80 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium cursor-default"
                  />
                  {emailDaysRemaining > 0 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Dado alterado recentemente. Próxima alteração permitida em {emailDaysRemaining} {emailDaysRemaining === 1 ? "dia" : "dias"}.
                    </p>
                  )}
                </div>

                {/* 3. WhatsApp / Celular (Largura Total - Permanente sem CPF) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 shadow-xs transition-all">
                  <div className="mb-2.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp / Celular
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Número para confirmação de entrega e comunicação rápida.
                    </p>
                  </div>

                  <Input
                    value={user?.phone ? formatPhoneInput(user.phone) : (profile?.phone ? formatPhoneInput(profile.phone) : "Não informado")}
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-gray-50/80 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-medium cursor-default"
                  />
                </div>

                {/* 4. Senha e Redefinição */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 shadow-xs transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-primary" /> Senha de Acesso
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Protege sua conta e valida operações administrativas e sensíveis.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {passwordRotationInfo.isExpired ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Rotação recomendada (+90 dias)</span>
                        </div>
                      ) : passwordRotationInfo.isWarning ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Rotação recomendada em {passwordRotationInfo.daysRemaining}{" "}
                            {passwordRotationInfo.daysRemaining === 1 ? "dia" : "dias"}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>
                            Senha em dia • Rotação em {passwordRotationInfo.daysRemaining}{" "}
                            {passwordRotationInfo.daysRemaining === 1 ? "dia" : "dias"}
                          </span>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentPasswordInput("");
                          setNewPasswordInput("");
                          setConfirmPasswordInput("");
                          setIsPasswordModalOpen(true);
                        }}
                        className="h-8 px-3 rounded-xl border-gray-200 dark:border-zinc-700 hover:border-primary text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-primary transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3 h-3" /> Redefinir Senha
                      </Button>

                      <button
                        type="button"
                        onClick={() => setIsRescueModalOpen(true)}
                        className="text-xs font-bold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline cursor-pointer px-2 py-1"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  </div>

                  <Input
                    type="password"
                    value="••••••••••••"
                    readOnly
                    disabled
                    className="h-11 rounded-xl bg-gray-50/80 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 tracking-widest font-mono cursor-default"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-2.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>
                        Última alteração de senha:{" "}
                        <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
                          {passwordRotationInfo.formattedDate}
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Ciclo de segurança com rotação periódica de 90 dias
                    </span>
                  </div>

                  {passwordRotationInfo.isExpired && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Sua senha foi definida há mais de 90 dias. Para manter sua conta protegida, recomendamos redefini-la.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA: NOTIFICAÇÕES & ALERTAS ================= */}
          {activeSection === "notificacoes" && (
            <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-primary dark:text-violet-400" /> Notificações & Alertas
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Histórico completo de comunicados, presentes e preferências de avisos da loja.
                  </p>
                </div>

                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsAsRead}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/70 dark:bg-purple-950/40 text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all cursor-pointer w-fit"
                  >
                    <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* 1. Gerenciamento de Preferências de Alerta */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9]">
                      Notificações da Loja (Alertas e Novidades)
                    </span>
                    {isSavingNotificationPref && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9306CF]" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Quando ativado, exibe o contador numérico de mensagens não lidas no cabeçalho da página inicial. Se desativado, os avisos intrusivos são suprimidos na Home, mas suas mensagens continuam sendo arquivadas normalmente aqui.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    disabled={isSavingNotificationPref}
                    onChange={(e) => handleToggleNotificationPreference(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#35A340]"></div>
                </label>
              </div>

              {/* 2. Histórico Geral de Mensagens */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Histórico de Mensagens ({notifications.length})
                  </h3>
                  {unreadNotificationsCount > 0 && (
                    <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                      {unreadNotificationsCount} não lida(s)
                    </span>
                  )}
                </div>

                {notificationsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-7 h-7 animate-spin text-[#9306CF] mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando histórico...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-[#512B54]/40 bg-gray-50/50 dark:bg-[#190B1A]/40 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/30 text-[#9306CF] flex items-center justify-center mx-auto">
                      <Inbox className="w-6 h-6 opacity-60" />
                    </div>
                    <p className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9]">
                      Nenhuma notificação por aqui ainda
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Quando enviarmos cupons especiais, novidades do cardápio ou avisos sobre seu pedido, eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkNotificationAsRead(notif)}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          !notif.isRead
                            ? "bg-purple-50/60 dark:bg-purple-950/20 border-[#9306CF]/40 shadow-xs"
                            : "bg-gray-50/60 dark:bg-[#190B1A]/60 border-gray-200 dark:border-[#512B54]/30"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {!notif.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-600 text-white">
                                Nova
                              </span>
                            )}
                            <h4 className="font-heading font-bold text-sm sm:text-base text-[#4C264F] dark:text-[#F9F5F9]">
                              {notif.title}
                            </h4>
                          </div>

                          {/* Registro Obrigatório de Data e Hora */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono shrink-0">
                            <Clock className="w-3.5 h-3.5 text-[#9306CF]" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {formatFullDateTime(notif.createdAt)}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              ({formatRelativeTime(notif.createdAt)})
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Card Promocional com Cupom Anexado */}
                        {notif.coupon && (
                          <div className="mt-3.5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/30 border border-[#9306CF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm sm:text-base tracking-wider text-[#9306CF] dark:text-[#F9F5F9] bg-white dark:bg-[#1C0920] px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/60 shadow-2xs">
                                  {notif.coupon.code}
                                </span>
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                                  {notif.coupon.discountType === "percentage"
                                    ? `${notif.coupon.discountValue}% OFF`
                                    : `R$ ${notif.coupon.discountValue.toFixed(2).replace(".", ",")} OFF`}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {notif.coupon.oncePerUser && "Uso único por cliente • "}
                                {notif.coupon.minOrderValue > 0 && `Pedido mínimo de R$ ${notif.coupon.minOrderValue.toFixed(2).replace(".", ",")} • `}
                                {notif.coupon.expiresAt ? `Válido até ${new Date(notif.coupon.expiresAt).toLocaleDateString("pt-BR")}` : "Sem expiração"}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyCouponCode(notif.coupon!.code, notif)}
                                className="px-3 py-2 rounded-xl bg-white dark:bg-[#200B22] border border-purple-200 dark:border-purple-800/50 text-xs font-bold text-[#4C264F] dark:text-[#F9F5F9] hover:bg-purple-100 dark:hover:bg-purple-900/40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              >
                                {copiedCouponId === notif.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-[#9306CF]" /> Copiar Código
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApplyCouponToCart(notif.coupon!.code, notif)}
                                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] text-xs font-bold text-white hover:opacity-95 flex items-center gap-1.5 shadow-sm shadow-[#9306CF]/30 transition-opacity cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Aplicar no Carrinho
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= ABA: ACESSIBILIDADE ================= */}
          {activeSection === "acessibilidade" && (
            <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary dark:text-violet-400 text-xs font-bold uppercase tracking-wider mb-2 border border-primary/20">
                  <Accessibility className="w-3.5 h-3.5" /> Inclusão e Conforto Visual
                </div>
                <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Acessibilidade
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  Ajuste a visualização, contraste, fontes e alertas de notificação. Suas escolhas são sincronizadas com a sua conta e preservadas em qualquer dispositivo.
                </p>
              </div>

              {/* 1. MODO PARA DALTÔNICOS */}
              <div className="space-y-4 p-5 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-heading font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                      Modo para Daltônicos (Filtros de Cor)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aplica filtros de matriz de cores para diferenciar vermelhos, verdes, azuis ou escala de cinza.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <select
                    value={previewSettings.colorBlindMode}
                    onChange={(e) => updatePreview({ colorBlindMode: e.target.value as ColorBlindModeOption })}
                    aria-label="Selecione o filtro para daltonismo"
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#181D2D] text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer"
                  >
                    <option value="none">Padrão (Desativado)</option>
                    <option value="protanopia">Protanopia (Baixa sensibilidade ao vermelho)</option>
                    <option value="deuteranopia">Deuteranopia (Baixa sensibilidade ao verde)</option>
                    <option value="tritanopia">Tritanopia (Baixa sensibilidade ao azul/amarelo)</option>
                    <option value="monochrome">Acromatopsia / Monocromia (Tons de cinza)</option>
                  </select>
                </div>

                {/* Semântica Visual Garantida */}
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-[#2A1030]/60 border border-[#9306CF]/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    Semântica Visual Garantida (WCAG 2.1)
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Na Pop Shake, nenhum botão crítico ou status de pedido depende unicamente de cor. Ícones e textos descritivos acompanham cada etapa:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5" /> ⏳ Em preparo
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                      <Bike className="w-3.5 h-3.5" /> 🛵 Saiu para entrega
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Check className="w-3.5 h-3.5" /> ✔ Entregue
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                      <X className="w-3.5 h-3.5" /> ✖ Cancelado
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. TAMANHO DO TEXTO (ESCALA DE FONTE) */}
              <div className="space-y-4 p-5 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40">
                <div>
                  <Label className="text-sm font-heading font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                    Tamanho do Texto (Escala Tipográfica)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ajuste dinâmico das variáveis base de tipografia sem comprometer tabelas ou cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "normal", label: "Padrão", pct: "100%", desc: "Tamanho original" },
                    { id: "large", label: "Grande", pct: "115%", desc: "Mais legibilidade" },
                    { id: "xlarge", label: "Extra Grande", pct: "130%", desc: "Máxima clareza" },
                  ].map((option) => {
                    const isSelected = previewSettings.fontSize === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updatePreview({ fontSize: option.id as FontSizeOption })}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#9306CF] bg-[#9306CF]/10 dark:bg-[#9306CF]/20 shadow-md shadow-[#9306CF]/10"
                            : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-[#181D2D]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-heading font-bold text-sm text-gray-900 dark:text-white">
                            {option.label}
                          </span>
                          <span className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9]">
                            {option.pct}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Exemplo dinâmico de texto */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800">
                  <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-1">
                    Exemplo de Leitura:
                  </p>
                  <p className="text-foreground leading-relaxed">
                    Sabor irresistível de açaí artesanal e sorvetes premium preparados com ingredientes frescos.
                  </p>
                </div>
              </div>

              {/* 3. MODO DE ALTO CONTRASTE */}
              <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-heading font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                    Modo de Alto Contraste (WCAG AAA)
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Aplica bordas sólidas de 2px em botões, campos e cartões, além de reforço visual para evitar elementos tênues.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={previewSettings.highContrast}
                  onClick={() => updatePreview({ highContrast: !previewSettings.highContrast })}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9306CF] ${
                    previewSettings.highContrast ? "bg-[#9306CF]" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      previewSettings.highContrast ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 4. REDUÇÃO DE MOVIMENTO */}
              <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-heading font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                    Redução de Movimento
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Desativa animações e transições intensas para evitar desconforto visual e sobrecarga sensorial.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={previewSettings.reduceMotion}
                  onClick={() => updatePreview({ reduceMotion: !previewSettings.reduceMotion })}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9306CF] ${
                    previewSettings.reduceMotion ? "bg-[#9306CF]" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      previewSettings.reduceMotion ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 5. ALERTAS VISUAIS PARA NOTIFICAÇÕES */}
              <div className="space-y-4 p-5 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-heading font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                      Alertas Visuais para Notificações Sonoras
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pisca uma barra luminosa colorida no topo da tela sempre que sons de pedidos ou campainhas tocarem (suporte a pessoas com deficiência auditiva).
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={previewSettings.visualAlerts}
                    onClick={() => updatePreview({ visualAlerts: !previewSettings.visualAlerts })}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9306CF] ${
                      previewSettings.visualAlerts ? "bg-[#9306CF]" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        previewSettings.visualAlerts ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      triggerVisualAlert();
                      playDingSound();
                    }}
                    className="h-10 px-4 rounded-xl border-[#9306CF]/30 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-[#9306CF]/10 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-amber-500 animate-pulse" />
                    Testar Alerta Visual no Topo
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Clique para disparar a barra luminosa instantaneamente.
                  </span>
                </div>
              </div>

              {/* 6. FONTE AMIGÁVEL PARA DISLEXIA */}
              <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-heading font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                    Fonte Amigável para Dislexia
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Substitui a fonte principal por caracteres com maior peso na base e espaçamento ampliado para evitar inversão ou confusão de letras.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={previewSettings.dyslexicFont}
                  onClick={() => updatePreview({ dyslexicFont: !previewSettings.dyslexicFont })}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9306CF] ${
                    previewSettings.dyslexicFont ? "bg-[#9306CF]" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      previewSettings.dyslexicFont ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* RODAPÉ DE AÇÃO EXPLÍCITO */}
              <div className="pt-4 border-t border-gray-200 dark:border-[#512B54]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  As opções acima estão ativas em pré-visualização. Clique abaixo para salvar na sua conta.
                </p>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPreview}
                    className="flex-1 sm:flex-none h-12 px-5 rounded-xl border-gray-300 dark:border-[#512B54]/60 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Restaurar
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSaveAccessibility}
                    disabled={isSavingAccessibility}
                    className="flex-1 sm:flex-none h-12 px-6 rounded-xl font-heading font-bold uppercase tracking-widest text-sm bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white shadow-lg shadow-[#9306CF]/20 transition-opacity cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSavingAccessibility ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Salvar Preferências de Acessibilidade
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA: ENDEREÇOS ================= */}
          {activeSection === "enderecos" && (
            <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                  <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-primary dark:text-violet-400" /> Meus Endereços
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Gerencie seus endereços de entrega cadastrados na conta.
                  </p>
                </div>
                <Button 
                  onClick={openAddressModal}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white font-heading uppercase tracking-wider text-xs font-bold shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" /> + Novo Endereço
                </Button>
              </div>

              <div className="space-y-3.5">
                {addresses.length > 0 ? (
                  addresses.map((addr) => {
                    const isDefault = addr.id === activeAddressId;
                    return (
                      <div 
                        key={addr.id} 
                        className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${
                          isDefault 
                            ? "border-[#9306CF]/50 bg-[#9306CF]/5 dark:bg-[#9306CF]/10 shadow-xs" 
                            : "border-gray-200 dark:border-[#512B54]/40 bg-gray-50/70 dark:bg-[#190B1A]/80 hover:border-[#9306CF]/30"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-bold text-sm text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#9306CF]" /> {addr.label || "Endereço"}
                            </span>
                            {isDefault ? (
                              <span className="inline-flex items-center gap-1 bg-[#9306CF]/15 text-[#9306CF] dark:text-[#C7A9C9] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-[#9306CF]/30">
                                <Check className="w-3 h-3" /> Padrão / Ativo
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAddressId(addr.id);
                                  showToast({
                                    type: "success",
                                    title: "Endereço Definido",
                                    message: "Este endereço agora é seu padrão de entrega.",
                                  });
                                }}
                                className="text-[11px] text-[#9306CF] dark:text-[#C7A9C9] hover:underline font-semibold cursor-pointer"
                              >
                                Definir como padrão
                              </button>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                            {addr.street}, {addr.number}
                            {addr.complement ? ` (${addr.complement})` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bairro {addr.neighborhood} • {addr.city}
                            {addr.zip ? ` • CEP ${addr.zip}` : ""}
                            {addr.reference ? ` • Ref: ${addr.reference}` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button 
                            type="button"
                            onClick={() => openAddressModal(addr)}
                            className="inline-flex items-center gap-1 text-xs text-[#9306CF] dark:text-[#C7A9C9] hover:text-[#940068] font-semibold uppercase tracking-wider hover:underline cursor-pointer px-2 py-1"
                            title="Editar endereço"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              if (confirm("Tem certeza que deseja remover este endereço?")) {
                                await deleteAddressCtx(addr.id);
                                showToast({
                                  type: "info",
                                  title: "Endereço Removido",
                                  message: "O endereço foi excluído da sua conta com sucesso.",
                                });
                              }
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold uppercase tracking-wider hover:underline cursor-pointer px-2 py-1"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-gray-300 dark:border-[#512B54]/50 bg-gray-50/40 dark:bg-[#190B1A]/40 space-y-3">
                    <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                      Nenhum endereço salvo nesta conta ainda.
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Cadastre um endereço para receber entregas rápidas e calculadas em tempo real.
                    </p>
                    <div>
                      <Button 
                        onClick={openAddressModal}
                        className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] text-white font-heading text-xs uppercase tracking-wider font-bold shadow-sm cursor-pointer"
                      >
                        + Cadastrar Primeiro Endereço
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= ABA: PREFERÊNCIAS ================= */}
          {activeSection === "preferencias" && (
            <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-primary dark:text-violet-400" /> Preferências da Conta
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Personalize a aparência visual e sua experiência de uso na Pop Shake.
                </p>
              </div>

              {/* Seletor Visual de Tema */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Tema da Aplicação
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                  {/* Card 1: Automático Sistema */}
                  <button
                    type="button"
                    id="theme-card-system"
                    data-testid="theme-card-system"
                    onClick={() => setTheme("system")}
                    className={`flex flex-col h-full min-h-[160px] p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      theme === "system"
                        ? "border-[#9306CF] bg-purple-50/70 dark:bg-purple-950/40 shadow-md shadow-[#9306CF]/15 ring-1 ring-[#9306CF]/30"
                        : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-[#181D2D]/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                        <Laptop className="w-5 h-5" />
                      </div>
                      {theme === "system" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#9306CF] text-white shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Ativo
                        </span>
                      )}
                    </div>
                    <span className="font-heading font-bold text-sm text-gray-900 dark:text-white block">
                      Automático Sistema
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Acompanha o tema do seu aparelho em tempo real.
                    </p>
                    <p
                      data-testid="theme-system-status"
                      className="text-[11px] font-semibold text-foreground mt-2"
                    >
                      Status atual: {systemTheme === "dark" ? "🌙 Escuro" : "☀️ Claro"}
                    </p>
                  </button>

                  {/* Card 2: Sempre Claro */}
                  <button
                    type="button"
                    id="theme-card-light"
                    data-testid="theme-card-light"
                    onClick={() => setTheme("light")}
                    className={`flex flex-col h-full min-h-[160px] p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      theme === "light"
                        ? "border-[#9306CF] bg-purple-50/70 dark:bg-purple-950/40 shadow-md shadow-[#9306CF]/15 ring-1 ring-[#9306CF]/30"
                        : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-[#181D2D]/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                        <Sun className="w-5 h-5" />
                      </div>
                      {theme === "light" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#9306CF] text-white shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Ativo
                        </span>
                      )}
                    </div>
                    <span className="font-heading font-bold text-sm text-gray-900 dark:text-white block">
                      Sempre Claro
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Mantém fundo claro independente do horário ou sistema.
                    </p>
                  </button>

                  {/* Card 3: Sempre Escuro */}
                  <button
                    type="button"
                    id="theme-card-dark"
                    data-testid="theme-card-dark"
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col h-full min-h-[160px] p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      theme === "dark"
                        ? "border-[#9306CF] bg-purple-50/70 dark:bg-purple-950/40 shadow-md shadow-[#9306CF]/15 ring-1 ring-[#9306CF]/30"
                        : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-[#181D2D]/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                        <Moon className="w-5 h-5" />
                      </div>
                      {theme === "dark" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#9306CF] text-white shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Ativo
                        </span>
                      )}
                    </div>
                    <span className="font-heading font-bold text-sm text-gray-900 dark:text-white block">
                      Sempre Escuro
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Mantém fundo escuro contínuo.
                    </p>
                  </button>
                </div>
              </div>

              {/* Seção de Notificações */}
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-[#512B54]/40">
                <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                  Notificações de Pedido
                </Label>

                {/* Push Notifications */}
                <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-heading font-bold text-gray-900 dark:text-white">Notificações Push</p>
                    <p className="text-xs text-muted-foreground">
                      Receba alertas do navegador mesmo com a aba em segundo plano sobre status do seu pedido.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!("Notification" in window)) {
                        showToast({ type: "error", title: "Sem suporte", message: "Seu navegador não suporta notificações push." });
                        return;
                      }
                      const perm = await Notification.requestPermission();
                      if (perm === "granted") {
                        showToast({ type: "success", title: "Notificações ativadas!", message: "Você receberá alertas de atualização dos seus pedidos." });
                      } else {
                        showToast({ type: "error", title: "Permissão negada", message: "Ative as notificações nas configurações do navegador." });
                      }
                    }}
                    className="h-9 px-4 rounded-xl border-[#9306CF]/30 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-[#9306CF]/10 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 mr-1.5" />
                    Ativar
                  </Button>
                </div>

                {/* Som de Alerta */}
                <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-heading font-bold text-gray-900 dark:text-white">Som de Chegada de Pedido</p>
                    <p className="text-xs text-muted-foreground">
                      Toca um sinal sonoro suave quando o status do seu pedido for atualizado.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { playDingSound(); }}
                    className="h-9 px-4 rounded-xl border-[#9306CF]/30 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-[#9306CF]/10 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                    Testar
                  </Button>
                </div>
              </div>

              {/* ================= SEÇÃO: FORMA DE PAGAMENTO PREFERENCIAL NA ENTREGA ================= */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#512B54]/40">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                    Forma de Pagamento Preferencial na Entrega
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Como o Pop Shake opera exclusivamente com pagamento na entrega, escolha sua preferência habitual para que ela venha pré-selecionada no checkout.
                  </p>
                </div>

                {/* Cards de Métodos de Pagamento na Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Opção Pix */}
                  <button
                    type="button"
                    onClick={() => setPreferredPaymentMethod("pix_entrega")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      preferredPaymentMethod === "pix_entrega"
                        ? "border-[#9306CF] bg-purple-50/70 dark:bg-[#9306CF]/20 shadow-sm ring-1 ring-[#9306CF]/30"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                        <QrCode className="w-5 h-5" />
                      </div>
                      {preferredPaymentMethod === "pix_entrega" && (
                        <span className="w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-heading font-bold text-sm text-gray-900 dark:text-white block">
                        Pix na Entrega
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        QR Code gerado na hora pelo entregador ao receber seu pedido.
                      </p>
                    </div>
                  </button>

                  {/* Opção Cartão na Maquininha */}
                  <button
                    type="button"
                    onClick={() => setPreferredPaymentMethod("cartao_maquininha")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      preferredPaymentMethod === "cartao_maquininha"
                        ? "border-[#9306CF] bg-purple-50/70 dark:bg-[#9306CF]/20 shadow-sm ring-1 ring-[#9306CF]/30"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center shrink-0 shadow-xs">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      {preferredPaymentMethod === "cartao_maquininha" && (
                        <span className="w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-heading font-bold text-sm text-gray-900 dark:text-white block">
                        Cartão (Maquininha)
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        Débito, crédito ou aproximação levado pelo entregador.
                      </p>
                    </div>
                  </button>

                  {/* Opção Dinheiro */}
                  <button
                    type="button"
                    onClick={() => setPreferredPaymentMethod("dinheiro")}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      preferredPaymentMethod === "dinheiro"
                        ? "border-[#9306CF] bg-purple-50/70 dark:bg-[#9306CF]/20 shadow-sm ring-1 ring-[#9306CF]/30"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                        <Banknote className="w-5 h-5" />
                      </div>
                      {preferredPaymentMethod === "dinheiro" && (
                        <span className="w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-heading font-bold text-sm text-gray-900 dark:text-white block">
                        Dinheiro em Espécie
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        Pagamento em cédulas na entrega (com troco se necessário).
                      </p>
                    </div>
                  </button>
                </div>

                {/* Campo opcional de troco frequente para dinheiro */}
                {preferredPaymentMethod === "dinheiro" && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2 animate-in fade-in-50 duration-200">
                    <Label htmlFor="preferred-change" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Troco frequente para quanto? (Opcional)
                    </Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                        <Input
                          id="preferred-change"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 50.00"
                          value={preferredChangeFor}
                          onChange={(e) => setPreferredChangeFor(e.target.value)}
                          className="pl-9 h-10 rounded-xl bg-white dark:bg-[#190B1A] border-gray-300 dark:border-[#512B54]/60 text-sm font-mono"
                        />
                      </div>
                      {preferredChangeFor && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreferredChangeFor("")}
                          className="text-xs text-muted-foreground hover:text-foreground h-9 px-2 cursor-pointer"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Esse valor virá pré-preenchido no campo de troco ao finalizar pedidos em dinheiro.
                    </p>
                  </div>
                )}
              </div>

              {/* ================= SEÇÃO: INSTALAÇÃO DO APLICATIVO POPSHAKE (PWA) ================= */}
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#512B54]/40">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                    Instalação do Aplicativo PopShake
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Instale o aplicativo na tela inicial para pedidos mais rápidos e controle se o aviso automático deve aparecer.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Instalar aplicativo manualmente (sempre acessível independentemente de preferências) */}
                  <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Download className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                        Instalar aplicativo
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Inicie manualmente o processo de instalação do PopShake no seu dispositivo, mesmo que tenha dispensado ou desativado o aviso automático.
                      </p>
                    </div>
                    {isPwaStandalone ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shrink-0">
                        <Check className="w-4 h-4" />
                        Aplicativo Instalado
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          pwaInstallService.openManualInstall();
                          showToast({
                            type: "info",
                            title: "Instalação Manual do App",
                            message: "O guia de instalação do PopShake foi aberto para você concluir.",
                          });
                        }}
                        className="h-9 px-4 rounded-xl border-[#9306CF]/30 text-[#9306CF] dark:text-[#C7A9C9] hover:bg-[#9306CF]/10 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Instalar Aplicativo
                      </Button>
                    )}
                  </div>

                  {/* Controle independente do Aviso de instalação automático */}
                  <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                        Aviso de instalação
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {pwaAutoPrompt
                          ? isPwaDismissed
                            ? "Ativado nas configurações (popup silenciado temporariamente por até 4 meses após dispensa)."
                            : "Ativado nas configurações (o aviso automático pode aparecer quando aplicável)."
                          : "Desativado (o popup automático não voltará a aparecer, mas a instalação manual acima continua disponível)."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const next = !pwaAutoPrompt;
                        pwaInstallService.setAutoPromptEnabled(next);
                        setPwaAutoPrompt(next);
                        showToast({
                          type: "success",
                          title: next ? "Aviso de instalação ativado" : "Aviso de instalação desativado",
                          message: next
                            ? "A exibição automática foi habilitada."
                            : "O aviso automático não será mais exibido.",
                        });
                      }}
                      className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors ${
                        pwaAutoPrompt
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70"
                          : "border-zinc-300 dark:border-zinc-700 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {pwaAutoPrompt ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                          Ativado
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 mr-1.5" />
                          Desativado
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Rodapé com Salvar */}
              <div className="pt-4 border-t border-gray-200 dark:border-[#512B54]/40 flex items-center justify-end">
                <Button
                  type="button"
                  disabled={isSavingPreferences}
                  onClick={handleSavePreferences}
                  className="h-11 px-6 rounded-xl font-heading font-bold uppercase tracking-widest text-xs bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white shadow-md shadow-[#9306CF]/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPreferences ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {isSavingPreferences ? "Salvando..." : "Salvar Preferências"}
                </Button>
              </div>
            </div>
          )}

          {/* ================= SEÇÃO: PRIVACIDADE E DADOS (LGPD & COOKIES) ================= */}
          {activeSection === "privacidade" && (
            <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-zinc-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    LGPD (Lei nº 13.709/2018) • Art. 18
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
                    Privacidade e Dados
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consulte políticas, personalize seu consentimento de cookies e exerça seus direitos como titular de dados.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold shrink-0">
                  <Link
                    href="/privacidade"
                    className="text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    Política de Privacidade →
                  </Link>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <Link
                    href="/cookies"
                    className="text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    Política de Cookies →
                  </Link>
                </div>
              </div>

              {/* Bloco 1: Governança de Cookies, Escolhas Atuais e Consentimento (Guia da ANPD) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-amber-500" />
                      Gerenciamento de Consentimento e Cookies
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Consulte suas escolhas atuais salvas no navegador ou altere-as a qualquer momento sem depender da reaparição do aviso.
                    </p>
                  </div>
                </div>

                {/* Resumo transparente das preferências atuais */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Necessários</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Sempre Ativo</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Preferências Locais</span>
                    <span className={`text-[11px] font-medium ${cookieConsent?.preferences ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
                      {cookieConsent?.preferences ? "Autorizado" : "Desativado"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
                    <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Métricas & Desempenho</span>
                    <span className={`text-[11px] font-medium ${cookieConsent?.analytics ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
                      {cookieConsent?.analytics ? "Autorizado" : "Desativado"}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {cookieConsent?.timestamp
                      ? `Última escolha registrada em ${new Date(cookieConsent.timestamp).toLocaleDateString("pt-BR")}`
                      : "Consentimento padrão ativo (Apenas Estritamente Necessários)"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href="/cookies"
                      className="inline-flex items-center px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      Consultar Política de Cookies
                    </Link>
                    <Button
                      type="button"
                      onClick={() => privacyService.openPreferencesModal()}
                      variant="outline"
                      className="h-9 px-4 text-xs font-semibold rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-2"
                    >
                      <Cookie className="w-4 h-4 text-amber-500" />
                      <span>Gerenciar Preferências</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Portabilidade de Dados (Art. 18, V) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Download className="w-4 h-4 text-primary dark:text-violet-400" />
                      Portabilidade de Dados Pessoais (JSON)
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Faça o download de todos os seus dados cadastrais, histórico de locais e resumo de pedidos em formato estruturado e legível por máquina, em conformidade com o Art. 18, inciso V da LGPD.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleExportLgpdData}
                    disabled={isExportingData}
                    variant="outline"
                    className="h-10 px-4 text-xs font-semibold rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-2"
                  >
                    {isExportingData ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                        <span>Gerando Arquivo...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-pink-600" />
                        <span>Exportar Meus Dados (JSON)</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bloco 3: Canal Oficial do Encarregado (DPO - Art. 41) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <h4 className="font-heading font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Canal de Atendimento do Encarregado de Dados (DPO)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para dúvidas, revogação expressa de consentimento ou solicitações formais sobre o tratamento de seus dados pessoais, você pode contatar diretamente nosso encarregado de privacidade pelo e-mail:
                </p>
                <div className="pt-1">
                  <a
                    href="mailto:privacidade@popshake.com.br"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    privacidade@popshake.com.br
                  </a>
                </div>
              </div>

              {/* Bloco 4: Zona de Exclusão / Anonimização de Dados (Art. 18, VI) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-xl shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-heading font-bold text-sm text-red-700 dark:text-red-300">
                      Anonimização e Exclusão de Conta (Art. 18, VI)
                    </h4>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                      Ao solicitar a anonimização, seu nome, telefone, e-mail, senhas, locais salvos e dados de entrega serão destruídos de forma irreversível. Seus registros financeiros de pedidos serão preservados desidentificados para cumprimento de obrigação legal e fiscal (Art. 16, I da LGPD).
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setAnonymizePassword("");
                      setAnonymizeError(null);
                      setIsAnonymizeModalOpen(true);
                    }}
                    className="h-10 px-4 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Solicitar Anonimização da Conta</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* ================= MODAL DE SELEÇÃO DE AVATARES ================= */}
      {isAvatarModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] text-xs font-bold uppercase tracking-wider border border-[#9306CF]/20 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Coleção Pop Shake
                </div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
                  Escolha seu Avatar
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Selecione uma das ilustrações oficiais abaixo para o seu perfil e pedidos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid dos Avatares Oficiais */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {avatarPresets.map((avatar) => {
                const avatarPath = avatar.imageUrl || avatar.path || "";
                const isSelected = modalAvatarChoice === avatarPath;
                const isLocked = avatar.isUnlocked === false;
                const minMonths = avatar.minMonths ?? 0;
                const minOrders = avatar.minOrders ?? 0;

                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        const req =
                          minOrders > 0 && minMonths > 0
                            ? `${minOrders} pedidos concluídos ou ${minMonths} meses de conta`
                            : minMonths > 0
                            ? `${minMonths} meses de conta`
                            : `${minOrders} pedidos concluídos`;
                        alert(`Avatar bloqueado! Requisito para desbloquear: ${req}.`);
                        return;
                      }
                      setModalAvatarChoice(avatarPath);
                    }}
                    className={`relative p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer group ${
                      isLocked
                        ? "border-gray-200 dark:border-[#512B54]/20 bg-gray-100/60 dark:bg-black/40 opacity-60 hover:opacity-80"
                        : isSelected
                        ? "border-[#9306CF] bg-[#9306CF]/10 dark:bg-[#9306CF]/20 ring-2 ring-[#9306CF]/30 shadow-md shadow-[#9306CF]/20 scale-102"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50 bg-gray-50/50 dark:bg-[#190B1A]/60 hover:scale-102"
                    }`}
                  >
                    {/* Badge de Bloqueio */}
                    {isLocked && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                        🔒 Bloqueado
                      </span>
                    )}

                    {/* Badge de Selecionado */}
                    {isSelected && !isLocked && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white dark:bg-[#2A1030] p-1 shadow-inner border border-gray-100 dark:border-[#512B54]/30 mb-2">
                      <Image
                        src={avatarPath}
                        alt={avatar.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-heading font-bold text-xs text-gray-900 dark:text-white leading-tight">
                      {avatar.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      {isLocked
                        ? (minOrders > 0 && minMonths > 0 ? `${minOrders} compras ou ${minMonths}m` : minOrders > 0 ? `${minOrders} compras` : `${minMonths} meses`)
                        : (avatar.description || avatar.desc || "")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Rodapé do Modal */}
            <div className="pt-2 border-t border-gray-100 dark:border-[#512B54]/30 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAvatarModalOpen(false)}
                className="h-11 px-5 rounded-xl border-gray-300 dark:border-[#512B54]/60 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAvatarModal}
                className="h-11 px-6 rounded-xl font-heading font-bold uppercase tracking-widest text-xs bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white shadow-md shadow-[#9306CF]/20 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirmar Escolha
              </Button>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
        isLoggingOut={isLoggingOut}
        isGuest={user?.isRegistered === false}
      />

      <CompleteRegistrationModal
        isOpen={isCompleteRegModalOpen}
        onClose={() => setIsCompleteRegModalOpen(false)}
        onSuccess={() => refreshUser()}
      />

      {/* ================= MODAL: ALTERAR NOME ================= */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Alterar Nome Completo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Carência de segurança de 14 dias após salvar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNameModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeName} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Novo Nome Completo
                </Label>
                <Input
                  type="text"
                  required
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm"
                />
              </div>

              {user?.isRegistered && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Sua Senha Atual
                  </Label>
                  <Input
                    type="password"
                    required
                    value={namePasswordInput}
                    onChange={(e) => setNamePasswordInput(e.target.value)}
                    placeholder="Digite sua senha para confirmar"
                    className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Exigido para proteger sua conta contra alterações indevidas.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNameModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingName || !newNameInput.trim()}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSubmittingName ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>Salvar Nome</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ALTERAR E-MAIL ================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-primary">
                  <AtSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Alterar E-mail de Acesso
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Carência de segurança de 14 dias após salvar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Novo E-mail
                </Label>
                <Input
                  type="email"
                  required
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm"
                />
              </div>

              {user?.isRegistered && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Sua Senha Atual
                  </Label>
                  <Input
                    type="password"
                    required
                    value={emailPasswordInput}
                    onChange={(e) => setEmailPasswordInput(e.target.value)}
                    placeholder="Digite sua senha para confirmar"
                    className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Exigido para garantir a titularidade da conta.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEmail || !newEmailInput.trim()}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSubmittingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>Salvar E-mail</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REDEFINIR SENHA ================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1E2538] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-primary">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Redefinir Senha
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Exige sua senha atual e nova senha de 8+ caracteres.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Senha Atual
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordModalOpen(false);
                      setIsRescueModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPasswordCurrent ? "text" : "password"}
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="Sua senha atual"
                    className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordCurrent(!showPasswordCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showPasswordCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswordNew ? "text" : "password"}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordNew(!showPasswordNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showPasswordNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Confirmar Nova Senha
                </Label>
                <Input
                  type={showPasswordNew ? "text" : "password"}
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="h-11 rounded-xl bg-gray-50 dark:bg-[#151A28] border-gray-200 dark:border-zinc-800 text-sm"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPassword || !currentPasswordInput || newPasswordInput.length < 8}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atualizando...
                    </>
                  ) : (
                    <>Confirmar Nova Senha</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE RESGATE: ESQUECI MINHA SENHA ================= */}
      <PasswordRecoveryRescueModal
        isOpen={isRescueModalOpen}
        onClose={() => setIsRescueModalOpen(false)}
        clientPhone={user?.phone || profile?.phone || ""}
        clientName={profile?.full_name || user?.fullName || fullName || ""}
        clientEmail={user?.email || profile?.email || ""}
      />

      {/* ================= MODAL DE ANONIMIZAÇÃO / EXCLUSÃO LGPD ================= */}
      {isAnonymizeModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isAnonymizing && setIsAnonymizeModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                  Confirmar Anonimização
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Esta ação é irreversível e desvinculará todos os seus dados pessoais (Art. 18, VI da LGPD).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 space-y-1">
              <p className="font-semibold">O que acontecerá:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-600 dark:text-red-400">
                <li>Nome, telefone, e-mail e endereços serão removidos;</li>
                <li>Você será desconectado de todos os dispositivos;</li>
                <li>Registros de vendas anteriores serão mantidos anonimizados para obrigação contábil/fiscal (Art. 16, I).</li>
              </ul>
            </div>

            {anonymizeError && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">
                {anonymizeError}
              </div>
            )}

            <form onSubmit={handleConfirmAnonymization} className="space-y-4">
              {user?.isRegistered && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Confirme sua senha de acesso *
                  </Label>
                  <Input
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={anonymizePassword}
                    onChange={(e) => setAnonymizePassword(e.target.value)}
                    required
                    className="h-10 text-xs rounded-xl"
                    disabled={isAnonymizing}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAnonymizeModalOpen(false)}
                  disabled={isAnonymizing}
                  className="h-10 px-4 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isAnonymizing}
                  className="h-10 px-4 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
                >
                  {isAnonymizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Anonimizando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar Exclusão</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          BOTTOM NAV (mobile only - Padrão iFood)
      ───────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
