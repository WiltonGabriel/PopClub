"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ChevronLeft, 
  ChevronRight,
  User, 
  MapPin, 
  Package, 
  Star, 
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
} from "lucide-react";
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
import { BottomNav } from "../../components/storefront/BottomNav";
import { useToast } from "../../components/ui/ToastNotification";
import { authService } from "../../services/authService";
import { userService, UserProfile } from "../../services/userService";
import { useAddress } from "../../contexts/AddressContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { playDingSound } from "../../lib/sound";

interface AvatarPresetItem {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  path?: string;
  desc?: string;
  category?: string | null;
  order?: number;
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

export default function AccountPage() {
  const { user, loading, refreshUser, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
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
  
  type AccountView = "menu" | "perfil" | "notificacoes" | "enderecos" | "avaliacoes" | "preferencias" | "acessibilidade";

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [activeSection, setActiveSection] = useState("perfil");
  const [currentView, setCurrentView] = useState<AccountView>("menu");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fetching, setFetching] = useState(true);

  // Navegação Drill-down reativa
  const handleSelectSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setCurrentView(sectionId as AccountView);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const handleHeaderBack = () => {
    // No mobile dentro de qualquer sub-tela, volta imediatamente para o menu
    if (typeof window !== "undefined" && window.innerWidth < 768 && currentView !== "menu") {
      setCurrentView("menu");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else {
      router.push("/");
    }
  };

  // Edit profile state
  const [fullName, setFullName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("/avatars/avatar-sorvete.svg");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

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

  // Detecta ?tab=... ou ?section=... na URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || params.get("section");
      const validSections = ["perfil", "notificacoes", "enderecos", "avaliacoes", "preferencias", "acessibilidade"];
      if (tabParam && validSections.includes(tabParam)) {
        setActiveSection(tabParam);
        setCurrentView(tabParam as AccountView);
      }
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
        const userAvatar = prof.avatar || prof.avatar_url || user.avatar || user.avatarUrl || "/avatars/avatar-sorvete.svg";
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

  // Atualizar dados de perfil (Nome e Avatar)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const updated = await userService.updateProfile(user.id, { 
        full_name: fullName,
        avatar: selectedAvatar,
        avatar_url: selectedAvatar
      });
      setProfile(updated);
      await refreshUser();
      showToast({
        type: "success",
        title: "Perfil Atualizado!",
        message: "Suas informações e avatar foram salvos com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar os dados do perfil.";
      showToast({
        type: "error",
        title: "Erro ao atualizar",
        message,
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Confirmar escolha de avatar no modal
  const handleConfirmAvatarModal = () => {
    if (modalAvatarChoice !== "/avatars/avatar-sorvete.svg" && (!user || !user.isRegistered)) {
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
      await authService.signOut();
      router.push("/");
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
      id: "avaliacoes", 
      label: "Avaliações", 
      desc: "Suas avaliações e opiniões dos pedidos",
      icon: <Star className="w-4 h-4" /> 
    },
    { 
      id: "preferencias", 
      label: "Preferências", 
      desc: "Forma de pagamento e troco na entrega",
      icon: <Settings className="w-4 h-4" /> 
    },
    { 
      id: "acessibilidade", 
      label: "Acessibilidade", 
      desc: "Tamanho de fontes, cores e contraste",
      icon: <Accessibility className="w-4 h-4" /> 
    },
  ];

  const currentSectionConfig = sections.find(
    (s) => s.id === (currentView !== "menu" ? currentView : activeSection)
  );

  const currentDisplayAvatar = selectedAvatar || profile?.avatar || profile?.avatar_url || user?.avatar || "/avatars/avatar-sorvete.svg";

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Header com navegação reativa e suporte a Drill-Down */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/80 border-b border-border/40 px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            type="button"
            onClick={handleHeaderBack}
            className="flex items-center gap-1.5 p-2 rounded-xl border border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5 text-[#4C264F] dark:text-[#F9F5F9] font-medium text-sm transition-colors group cursor-pointer shrink-0 active:scale-98"
            aria-label={currentView !== "menu" ? "Voltar para o menu principal" : "Voltar para a loja"}
          >
            <ChevronLeft className="w-5 h-5 text-[#9306CF] dark:text-[#C7A9C9] group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-heading font-bold uppercase tracking-wider text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9]">
              {currentView !== "menu" ? (
                <>
                  <span className="md:hidden">Voltar</span>
                  <span className="hidden md:inline">Minha Conta</span>
                </>
              ) : (
                "Minha Conta"
              )}
            </span>
          </button>

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
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-4 mb-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-full border-2 border-[#9306CF]/40 overflow-hidden bg-purple-50 dark:bg-[#190B1A] shrink-0">
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
                <p className="font-heading font-bold text-base text-[#4C264F] dark:text-[#F9F5F9] truncate">
                  {profile?.full_name || user?.username || user?.email}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* ================= SEÇÃO GESTÃO DA LOJA (EXCLUSIVO ADMIN / OPERADOR) ================= */}
          {(isAdmin || user?.role === "admin") && (
            <div className="mb-4 p-3.5 bg-gradient-to-br from-[#9306CF]/10 via-purple-500/5 to-[#940068]/10 dark:from-[#9306CF]/20 dark:via-[#512B54]/20 dark:to-[#940068]/20 border border-[#9306CF]/30 dark:border-[#9306CF]/40 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#4C264F] dark:text-[#F9F5F9]">
                    Gestão da Loja
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#9306CF] text-white shadow-xs">
                  Acesso Admin
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {/* 1. Painel Operacional / PDV */}
                <Link
                  href="/admin"
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/60 hover:border-[#9306CF] dark:hover:border-[#9306CF] hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-[#9306CF] dark:text-[#C7A9C9] group-hover:scale-105 transition-transform shrink-0">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9] truncate">
                        Painel Operacional / PDV
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Dashboard, caixas e configurações
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#9306CF] group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>

                {/* 2. Gerenciar Pedidos */}
                <Link
                  href="/admin/pedidos"
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/60 hover:border-[#9306CF] dark:hover:border-[#9306CF] hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-[#940068] dark:text-pink-300 group-hover:scale-105 transition-transform shrink-0">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9] truncate">
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
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/60 hover:border-[#9306CF] dark:hover:border-[#9306CF] hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9] truncate">
                        Histórico de Vendas
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Relatório geral de pedidos da loja
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {/* Banner de Incentivo para Completar Cadastro */}
          {user && !user.isRegistered && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#9306CF] to-[#940068] text-white shadow-md shadow-[#9306CF]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/20 text-white shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Complete seu cadastro</h4>
                  <p className="text-xs text-purple-100 mt-0.5 leading-relaxed">
                    Adicione e-mail e senha para liberar cupons de desconto, personalizar seu avatar e acessar seus pedidos em outros aparelhos.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsCompleteRegModalOpen(true)}
                className="bg-white hover:bg-gray-100 text-[#9306CF] font-bold text-xs h-9 px-4 rounded-xl shrink-0 cursor-pointer shadow"
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
                      : "bg-white dark:bg-[#230E26] border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50 text-gray-700 dark:text-gray-300 hover:text-[#4C264F] dark:hover:text-[#F9F5F9] hover:bg-gray-50/80 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`p-2 rounded-lg transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isSelectedOnDesktop 
                      ? "bg-white/20 text-white" 
                      : "bg-purple-50 dark:bg-[#190B1A] text-[#9306CF] dark:text-[#C7A9C9]"
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

            <div className="pt-2">
              <Link 
                href="/pedidos" 
                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-all border bg-white dark:bg-[#230E26] border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50 text-gray-700 dark:text-gray-300 hover:text-[#4C264F] dark:hover:text-[#F9F5F9] shadow-sm hover:bg-gray-50/80 dark:hover:bg-white/5"
              >
                <span className="p-2 rounded-lg bg-purple-50 dark:bg-[#190B1A] text-[#9306CF] dark:text-[#C7A9C9] group-hover:scale-110 transition-transform shrink-0">
                  <Package className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-heading font-bold text-sm truncate block text-[#4C264F] dark:text-[#F9F5F9]">Ver Meus Pedidos</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Acompanhe entregas e pedidos anteriores</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            </div>

            <button 
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-colors border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 mt-4 mb-8 cursor-pointer active:scale-98 shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
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
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                  <User className="w-6 h-6 text-[#9306CF] dark:text-[#C7A9C9]" /> Meu Perfil
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Gerencie sua identidade, avatar oficial e dados cadastrais.
                </p>
              </div>

              {/* Seletor de Avatar em Destaque Circular */}
              <div className="p-6 rounded-2xl bg-gray-50/80 dark:bg-[#190B1A]/80 border border-gray-200 dark:border-[#512B54]/40 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[#9306CF]/40 p-1.5 bg-white dark:bg-[#230E26] shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                    <Image
                      src={selectedAvatar}
                      alt="Avatar Atual Selecionado"
                      width={128}
                      height={128}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Botão circular sobreposto com sparkles */}
                  <button
                    type="button"
                    onClick={() => {
                      setModalAvatarChoice(selectedAvatar);
                      setIsAvatarModalOpen(true);
                    }}
                    title="Escolher Avatar"
                    aria-label="Escolher Avatar"
                    className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-gradient-to-r from-[#9306CF] to-[#940068] text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#230E26] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
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
                </div>
              </div>
              
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Nome Completo
                  </Label>
                  <Input 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-12 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-[#1F0B22] dark:border-[#512B54]/50 dark:text-white focus-visible:ring-2 focus-visible:ring-[#9306CF]/20 focus-visible:border-[#9306CF]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Email
                  </Label>
                  <Input 
                    value={user?.email || ""}
                    disabled
                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-gray-500 dark:bg-[#190B1A]/80 dark:border-[#512B54]/30 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">O e-mail é o identificador de login da sua conta.</p>
                </div>

                <Button 
                  type="submit" 
                  disabled={isUpdatingProfile}
                  className="h-12 px-6 rounded-xl font-heading font-bold uppercase tracking-widest text-sm bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white shadow-lg shadow-[#9306CF]/20 transition-opacity cursor-pointer flex items-center gap-2"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>Salvar Alterações</>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* ================= ABA: NOTIFICAÇÕES & ALERTAS ================= */}
          {activeSection === "notificacoes" && (
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-[#512B54]/30 pb-4">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                    <Bell className="w-6 h-6 text-[#9306CF] dark:text-[#C7A9C9]" /> Notificações & Alertas
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
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] text-xs font-bold uppercase tracking-wider mb-2 border border-[#9306CF]/20">
                  <Accessibility className="w-3.5 h-3.5" /> Inclusão e Conforto Visual
                </div>
                <h2 className="font-heading text-2xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
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
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-[#512B54]/60 bg-white dark:bg-[#230E26] text-gray-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#9306CF] transition-colors cursor-pointer"
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
                            : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#230E26]"
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
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40">
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
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                  <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-[#9306CF] dark:text-[#C7A9C9]" /> Meus Endereços
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

                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <button 
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
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#9306CF] dark:text-[#C7A9C9]" /> Preferências da Conta
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card Modo Claro */}
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      theme === "light"
                        ? "border-[#9306CF] bg-purple-50/60 shadow-md shadow-[#9306CF]/10"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-gray-900 dark:text-white">Modo Claro</span>
                        {theme === "light" && <Check className="w-4 h-4 text-[#9306CF]" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Fundo branco, tons neutros e visual solar.
                      </p>
                    </div>
                  </button>

                  {/* Card Modo Escuro */}
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      theme === "dark"
                        ? "border-[#9306CF] bg-[#2A1030] shadow-md shadow-[#9306CF]/20"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm text-gray-900 dark:text-white">Modo Escuro</span>
                        {theme === "dark" && <Check className="w-4 h-4 text-[#9306CF]" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Roxo escuro (#190B1A) perfeito para conforto visual à noite.
                      </p>
                    </div>
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

          {/* Placeholders for other sections */}
          {activeSection === "avaliacoes" && (
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 text-center">
              <Settings className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-2 text-[#4C264F] dark:text-[#F9F5F9]">
                Em Construção
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm max-w-sm">
                Esta funcionalidade está sendo implementada e será conectada aos serviços em breve.
              </p>
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
            className="w-full max-w-2xl bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/50 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
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
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setModalAvatarChoice(avatarPath)}
                    className={`relative p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer group ${
                      isSelected
                        ? "border-[#9306CF] bg-[#9306CF]/10 dark:bg-[#9306CF]/20 ring-2 ring-[#9306CF]/30 shadow-md shadow-[#9306CF]/20 scale-102"
                        : "border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50 bg-gray-50/50 dark:bg-[#190B1A]/60 hover:scale-102"
                    }`}
                  >
                    {/* Badge de Selecionado */}
                    {isSelected && (
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
                      {avatar.description || avatar.desc || ""}
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
      />

      <CompleteRegistrationModal
        isOpen={isCompleteRegModalOpen}
        onClose={() => setIsCompleteRegModalOpen(false)}
        onSuccess={() => refreshUser()}
      />

      {/* ─────────────────────────────────────────
          BOTTOM NAV (mobile only - Padrão iFood)
      ───────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
