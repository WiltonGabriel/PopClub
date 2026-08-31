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
      alert("Perfil atualizado!");
    } catch (err) {
      alert("Erro ao atualizar perfil");
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/");
  };

  const simulateGetLocation = () => {
    // Na implementação real, usaríamos a API do Google Maps + Geolocation API do browser
    // navigator.geolocation.getCurrentPosition(...) e Google Maps Geocoding API para pegar o endereço exato.
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
        address_line: locAddress,
        latitude: -23.5505, // simulated
        longitude: -46.6333, // simulated
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-surface/80 border-b border-border px-4 py-4 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-white/5 rounded-none border-2 border-transparent hover:border-border transition-colors">
          <ChevronLeft className="w-6 h-6 text-primary" />
        </Link>
        <h1 className="text-xl font-heading font-bold uppercase tracking-wide text-white">Minha Conta</h1>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Menu */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-card border-2 border-border p-4 mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">Olá,</p>
            <p className="font-heading font-bold text-lg text-white truncate">{profile?.full_name || user?.email}</p>
          </div>

          <nav className="flex flex-col gap-2">
            {sections.map(sec => (
              <button 
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-3 px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-colors border-2 ${activeSection === sec.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-secondary hover:text-secondary text-muted-foreground"}`}
              >
                {sec.icon}
                {sec.label}
              </button>
            ))}

            <Link href="/pedidos" className="flex items-center gap-3 px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-colors border-2 bg-card border-border hover:border-secondary hover:text-secondary text-muted-foreground mt-4">
              <Package className="w-4 h-4" />
              Ver Meus Pedidos
            </Link>

            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 font-mono text-sm uppercase tracking-wider text-left transition-colors border-2 border-transparent text-destructive hover:bg-destructive/10 mt-8"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1">
          {activeSection === "perfil" && (
            <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(5,217,232,0.2)]">
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-white mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-primary" /> Editar Perfil
              </h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                  <Input 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-primary bg-background font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input 
                    value={user?.email || ""}
                    disabled
                    className="h-12 rounded-none border-2 border-border bg-muted/50 font-mono text-muted-foreground"
                  />
                </div>

                <Button type="submit" className="h-12 rounded-none font-heading uppercase tracking-widest text-base bg-primary hover:bg-primary/90">
                  Salvar Alterações
                </Button>
              </form>
            </div>
          )}

          {activeSection === "enderecos" && (
            <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(5,217,232,0.2)]">
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-white mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-secondary" /> Meus Endereços
              </h2>

              {!isAddingLocation ? (
                <>
                  <div className="space-y-4 mb-6">
                    {locations.length > 0 ? locations.map(loc => (
                      <div key={loc.id} className="border-2 border-border p-4 flex justify-between items-center bg-background">
                        <div>
                          <p className="font-sans text-sm text-white mb-1">{loc.address_line}</p>
                          {loc.is_default && <span className="bg-secondary/20 text-secondary text-[10px] font-mono uppercase px-2 py-1">Padrão</span>}
                        </div>
                        <button 
                          onClick={() => userService.deleteLocation(loc.id).then(loadUserData)}
                          className="text-xs text-destructive hover:underline font-mono uppercase"
                        >
                          Remover
                        </button>
                      </div>
                    )) : (
                      <p className="text-muted-foreground font-mono text-sm">Nenhum endereço salvo.</p>
                    )}
                  </div>
                  <Button 
                    onClick={() => setIsAddingLocation(true)}
                    className="w-full h-12 rounded-none border-2 border-dashed border-muted-foreground bg-transparent text-foreground hover:bg-white/5 hover:border-border font-mono uppercase text-sm tracking-wider"
                  >
                    + Novo Endereço
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSaveLocation} className="space-y-5 border-2 border-border p-4 bg-background">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Buscar no Mapa</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={locAddress}
                        onChange={e => setLocAddress(e.target.value)}
                        placeholder="Ex: Av. Paulista, 1000"
                        className="h-12 rounded-none border-2 border-border focus-visible:ring-0 focus-visible:border-secondary bg-background font-mono"
                        required
                      />
                      <Button type="button" onClick={simulateGetLocation} className="h-12 w-12 shrink-0 rounded-none bg-secondary hover:bg-secondary/90 text-background p-0">
                        <Map className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-2">
                      * Em produção, isso abrirá um modal do Google Maps para precisão &lt; 4m.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" onClick={() => setIsAddingLocation(false)} variant="outline" className="flex-1 h-12 rounded-none border-2 font-mono uppercase tracking-widest text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 h-12 rounded-none bg-secondary hover:bg-secondary/90 text-background font-heading uppercase tracking-widest text-sm">
                      Salvar Endereço
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Placeholders for other sections */}
          {(activeSection === "pagamentos" || activeSection === "avaliacoes" || activeSection === "preferencias") && (
            <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center py-20 text-center">
              <Settings className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-2">Em Construção</h3>
              <p className="text-muted-foreground font-mono text-sm max-w-sm">Esta funcionalidade está sendo implementada e será conectada aos serviços em breve.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
