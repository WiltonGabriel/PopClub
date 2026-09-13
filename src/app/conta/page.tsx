"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, MapPin, Package, Star, CreditCard, Settings, LogOut, Loader2, Map } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import { userService, UserProfile, UserLocation } from "../../services/userService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [activeSection, setActiveSection] = useState("perfil");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [fetching, setFetching] = useState(true);

  // Edit profile state
  const [fullName, setFullName] = useState("");

  // Location state
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [locAddress, setLocAddress] = useState("");
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      loadUserData();
    }
  }, [user, loading, router]);

  const loadUserData = async () => {
    setFetching(true);
    try {
      const [prof, locs] = await Promise.all([
        userService.getProfile(user!.id),
        userService.getLocations(user!.id)
      ]);
      if (prof) {
        setProfile(prof);
        setFullName(prof.full_name || "");
      }
      setLocations(locs);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const updated = await userService.updateProfile(user.id, { full_name: fullName });
      setProfile(updated);
      alert("Perfil atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar perfil");
    }
  };

  const handleSignOut = async () => {
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
    } catch (err) {
      alert("Erro ao salvar endereço");
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
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#190B1A] text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Header com contraste dinâmico */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#190B1A]/80 border-b border-gray-200 dark:border-[#512B54]/40 px-4 py-4 flex items-center gap-3">
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
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Menu */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-4 mb-6 rounded-2xl shadow-sm">
            <p className="text-xs uppercase font-bold tracking-widest text-gray-600 dark:text-gray-300 mb-1">Olá,</p>
            <p className="font-heading font-bold text-lg text-[#4C264F] dark:text-[#F9F5F9] truncate">
              {profile?.full_name || user?.username || user?.email}
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {sections.map(sec => (
              <button 
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-colors border ${
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
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide text-left transition-colors border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 mt-6"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          {activeSection === "perfil" && (
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm">
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-[#9306CF] dark:text-[#C7A9C9]" /> Editar Perfil
              </h2>
              
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
                </div>

                <Button 
                  type="submit" 
                  className="h-12 rounded-xl font-heading font-bold uppercase tracking-widest text-sm bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white shadow-lg shadow-[#9306CF]/20 transition-opacity"
                >
                  Salvar Alterações
                </Button>
              </form>
            </div>
          )}

          {activeSection === "enderecos" && (
            <div className="bg-white dark:bg-[#230E26] border border-gray-200 dark:border-[#512B54]/40 p-6 sm:p-8 rounded-2xl shadow-sm">
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-[#4C264F] dark:text-[#F9F5F9] mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#9306CF] dark:text-[#C7A9C9]" /> Meus Endereços
              </h2>

              {!isAddingLocation ? (
                <>
                  <div className="space-y-4 mb-6">
                    {locations.length > 0 ? locations.map(loc => (
                      <div key={loc.id} className="border border-gray-200 dark:border-[#512B54]/40 rounded-xl p-4 flex justify-between items-center bg-gray-50/70 dark:bg-[#190B1A]/80">
                        <div>
                          <p className="font-sans text-sm font-medium text-[#4C264F] dark:text-[#F9F5F9] mb-1">{loc.address_line}</p>
                          {loc.is_default && (
                            <span className="bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border border-[#9306CF]/20">
                              Padrão
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => userService.deleteLocation(loc.id).then(loadUserData)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold uppercase"
                        >
                          Remover
                        </button>
                      </div>
                    )) : (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">Nenhum endereço salvo.</p>
                    )}
                  </div>
                  <Button 
                    onClick={() => setIsAddingLocation(true)}
                    className="w-full h-12 rounded-xl border border-dashed border-gray-300 dark:border-[#512B54]/60 bg-transparent text-[#4C264F] dark:text-[#F9F5F9] hover:bg-gray-100 dark:hover:bg-white/5 uppercase text-sm tracking-wider font-semibold"
                  >
                    + Novo Endereço
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSaveLocation} className="space-y-5 border border-gray-200 dark:border-[#512B54]/40 p-5 rounded-xl bg-gray-50/70 dark:bg-[#190B1A]/80">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Buscar no Mapa
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        value={locAddress}
                        onChange={e => setLocAddress(e.target.value)}
                        placeholder="Ex: Av. Paulista, 1000"
                        className="h-12 rounded-xl bg-white border-gray-200 text-gray-900 dark:bg-[#1F0B22] dark:border-[#512B54]/50 dark:text-white focus-visible:ring-2 focus-visible:ring-[#9306CF]/20 focus-visible:border-[#9306CF]"
                        required
                      />
                      <Button type="button" onClick={simulateGetLocation} className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white p-0 shadow-sm">
                        <Map className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      * Em produção, isso abrirá um modal do Google Maps para precisão &lt; 4m.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" onClick={() => setIsAddingLocation(false)} variant="outline" className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-[#512B54]/40 text-gray-700 dark:text-gray-300 uppercase tracking-widest text-xs font-semibold">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-90 text-white font-heading uppercase tracking-widest text-sm shadow-md">
                      Salvar Endereço
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Placeholders for other sections */}
          {(activeSection === "pagamentos" || activeSection === "avaliacoes" || activeSection === "preferencias") && (
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
    </div>
  );
}
