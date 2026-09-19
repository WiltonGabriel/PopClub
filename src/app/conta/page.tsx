"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ChevronLeft, 
  User, 
  MapPin, 
  Package, 
  Star, 
  CreditCard, 
  Settings, 
  LogOut, 
  Loader2, 
  Map, 
  Sun, 
  Moon, 
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
  Accessibility
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { 
  useAccessibility, 
  FontSizeOption, 
  ColorBlindModeOption 
} from "../../contexts/AccessibilityContext";
import { useToast } from "../../components/ui/ToastNotification";
import { authService } from "../../services/authService";
import { userService, UserProfile, UserLocation } from "../../services/userService";
import { useAddress } from "../../contexts/AddressContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { playDingSound } from "../../lib/sound";

interface AvatarPresetItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
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
  { id: "chef", name: "Mestre Gelateiro", imageUrl: "/avatars/avatar-chef.svg", description: "Toque profissional de confeitaria" },
];

export default function AccountPage() {
  const { user, loading, refreshUser } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { 
    addresses, 
    activeAddressId, 
    setActiveAddressId, 
    openAddressModal, 
    deleteAddress: deleteAddressCtx,
    refreshAddresses 
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
  
  const [activeSection, setActiveSection] = useState("perfil");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [fetching, setFetching] = useState(true);

  // Edit profile state
  const [fullName, setFullName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("/avatars/avatar-sorvete.svg");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Modal de Avatar
  const [avatarPresets, setAvatarPresets] = useState<AvatarPresetItem[]>(DEFAULT_AVATAR_PRESETS);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [modalAvatarChoice, setModalAvatarChoice] = useState("/avatars/avatar-sorvete.svg");

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

  // Location state
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [locAddress, setLocAddress] = useState("");

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [prof, locs] = await Promise.all([
        userService.getProfile(user.id),
        userService.getLocations(user.id)
      ]);
      if (prof) {
        setProfile(prof);
        setFullName(prof.full_name || "");
        const userAvatar = prof.avatar || prof.avatar_url || user.avatar || user.avatarUrl || "/avatars/avatar-sorvete.svg";
        setSelectedAvatar(userAvatar);
        setModalAvatarChoice(userAvatar);
      }
      setLocations(locs);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, [user]);

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
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Erro ao atualizar",
        message: err?.message || "Não foi possível salvar os dados do perfil.",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Confirmar escolha de avatar no modal
  const handleConfirmAvatarModal = () => {
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
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Erro ao salvar preferências",
        message: err?.message || "Falha ao salvar preferências de acessibilidade.",
      });
    }
  };

  const handleSignOut = async () => {
    resetToDefaults();
    await authService.signOut();
    router.push("/");
  };

  const simulateGetLocation = () => {
    alert("Iniciando captura de localização via GPS...");
    setTimeout(() => {
      setLocAddress("Rua Fictícia, 123 - Bairro Mock, Cidade");
    }, 1500);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await userService.addLocation({
        user_id: user.id,
        name: null,
        address_line: locAddress,
        latitude: -23.5505,
        longitude: -46.6333,
        accuracy: null,
        is_default: locations.length === 0
      });
      setIsAddingLocation(false);
      setLocAddress("");
      loadUserData();
      showToast({
        type: "success",
        title: "Endereço Salvo",
        message: "Seu endereço foi cadastrado com sucesso.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Erro ao salvar",
        message: "Não foi possível cadastrar o endereço.",
      });
    }
  };

  if (loading || (fetching && !profile)) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9306CF]" />
      </div>
    );
  }

  const sections = [
    { id: "perfil", label: "Meu Perfil", icon: <User className="w-4 h-4" /> },
    { id: "enderecos", label: "Endereços", icon: <MapPin className="w-4 h-4" /> },
    { id: "pagamentos", label: "Pagamentos", icon: <CreditCard className="w-4 h-4" /> },
    { id: "avaliacoes", label: "Avaliações", icon: <Star className="w-4 h-4" /> },
    { id: "preferencias", label: "Preferências", icon: <Settings className="w-4 h-4" /> },
    { id: "acessibilidade", label: "Acessibilidade", icon: <Accessibility className="w-4 h-4" /> },
  ];

  const currentDisplayAvatar = selectedAvatar || profile?.avatar || profile?.avatar_url || user?.avatar || "/avatars/avatar-sorvete.svg";

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Header com contraste dinâmico */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#190B1A]/80 border-b border-gray-200 dark:border-[#512B54]/40 px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 p-2 rounded-xl border border-gray-200 dark:border-[#512B54]/40 hover:bg-gray-100 dark:hover:bg-white/5 text-[#4C264F] dark:text-[#F9F5F9] font-medium text-sm transition-colors group"
          aria-label="Voltar para a loja"
        >
          <ChevronLeft className="w-5 h-5 text-[#9306CF] dark:text-[#C7A9C9] group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-heading font-bold uppercase tracking-wider text-xs sm:text-sm text-[#4C264F] dark:text-[#F9F5F9]">
            Minha Conta
          </span>
        </Link>

        {/* Botão de Alternância Rápida de Tema */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#512B54]/40 bg-white/70 dark:bg-[#230E26]/70 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-[#4C264F] dark:text-[#F9F5F9] transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9] shrink-0" />
          )}
          <span className="hidden xs:inline">Tema:</span>
          <span className="font-bold text-[#9306CF] dark:text-[#C7A9C9]">
            {theme === "dark" ? "Escuro" : "Claro"}
          </span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Menu */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-4 mb-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-12 h-12 rounded-full border-2 border-[#9306CF]/40 overflow-hidden bg-purple-50 dark:bg-[#190B1A] shrink-0">
                <Image
                  src={currentDisplayAvatar}
                  alt="Avatar do usuário"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 dark:text-gray-400">Olá,</p>
                <p className="font-heading font-bold text-base text-[#4C264F] dark:text-[#F9F5F9] truncate">
                  {profile?.full_name || user?.username || user?.email}
                </p>
              </div>
            </div>

            {/* Quick theme switcher on mobile & desktop */}
            <div className="mt-2 pt-2.5 border-t border-gray-100 dark:border-[#512B54]/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                {theme === "dark" ? <Moon className="w-3.5 h-3.5 text-[#9306CF]" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                Aparência
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-[#9306CF]/10 hover:text-[#9306CF] transition-colors border border-border/40 cursor-pointer"
              >
                {theme === "dark" ? "🌙 Escuro" : "☀️ Claro"}
              </button>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {sections.map(sec => (
              <button 
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-colors border cursor-pointer ${
                  activeSection === sec.id 
                    ? "bg-gradient-to-r from-[#9306CF] to-[#940068] text-white border-transparent shadow-md shadow-[#9306CF]/20" 
                    : "bg-white dark:bg-[#230E26] border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50 text-gray-600 dark:text-gray-300 hover:text-[#4C264F] dark:hover:text-[#F9F5F9]"
                }`}
              >
                {sec.icon}
                {sec.label}
              </button>
            ))}

            <Link 
              href="/pedidos" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-colors border bg-white dark:bg-[#230E26] border-gray-200 dark:border-[#512B54]/40 hover:border-[#9306CF]/50 text-gray-600 dark:text-gray-300 hover:text-[#4C264F] dark:hover:text-[#F9F5F9] mt-2 shadow-sm"
            >
              <Package className="w-4 h-4 text-[#9306CF] dark:text-[#C7A9C9]" />
              Ver Meus Pedidos
            </Link>

            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-colors border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 mt-6 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">

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

          {/* ================= ABA: ACESSIBILIDADE ================= */}
          {activeSection === "acessibilidade" && (
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] text-xs font-bold uppercase tracking-wider mb-2 border border-[#9306CF]/20">
                  <span className="text-base">♿</span> Inclusão e Conforto Visual
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
            </div>
          )}

          {/* Placeholders for other sections */}
          {(activeSection === "pagamentos" || activeSection === "avaliacoes") && (
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
                const avatarPath = avatar.imageUrl || (avatar as any).path;
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
                      {avatar.description || (avatar as any).desc}
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
    </div>
  );
}
