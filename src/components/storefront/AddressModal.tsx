"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  Search,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Home as HomeIcon,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  Crosshair,
} from "lucide-react";
import { useAddress, Address } from "@/contexts/AddressContext";

const LocationPickerMap = dynamic(
  () => import("@/components/logistics/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[190px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-[11px] font-medium">Carregando mapa interativo...</span>
      </div>
    ),
  }
);

export function AddressModal() {
  const {
    addresses,
    activeAddressId,
    isAddressModalOpen,
    editingAddress,
    closeAddressModal,
    setActiveAddressId,
    saveAddress,
    deleteAddress,
  } = useAddress();

  type ModalView = "list" | "selector" | "manual" | "gps_confirm";

  const [view, setView] = useState<ModalView>("list");

  // Form states
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Local");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [zip, setZip] = useState("");
  const [label, setLabel] = useState<string>("Casa");
  const [coords, setCoords] = useState<{ lat?: number; lon?: number }>({});
  const [showManualMap, setShowManualMap] = useState(false);

  // Loading & feedback states
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gpsAccuracyInfo, setGpsAccuracyInfo] = useState<string | null>(null);

  const numberInputRef = useRef<HTMLInputElement>(null);

  // Inicializa view com base na existência de endereços salvos ou edição
  useEffect(() => {
    if (isAddressModalOpen) {
      setErrorMessage(null);
      if (editingAddress) {
        setEditingAddressId(editingAddress.id);
        setStreet(editingAddress.street || "");
        setNumber(editingAddress.number || "");
        setNeighborhood(editingAddress.neighborhood || "");
        setCity(editingAddress.city || "Várzea Grande");
        setComplement(editingAddress.complement || "");
        setReference(editingAddress.reference || "");
        setZip(editingAddress.zip || "");
        setLabel(editingAddress.label || "Casa");
        setCoords({ lat: editingAddress.latitude, lon: editingAddress.longitude });
        setView("manual");
      } else {
        setEditingAddressId(null);
        if (addresses.length > 0) {
          setView("list");
        } else {
          setView("selector");
        }
      }
    }
  }, [isAddressModalOpen, editingAddress, addresses.length]);

  if (!isAddressModalOpen) return null;

  const resetForm = () => {
    setEditingAddressId(null);
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setCity("Local");
    setComplement("");
    setReference("");
    setZip("");
    setLabel("Casa");
    setCoords({});
    setShowManualMap(false);
    setErrorMessage(null);
    setGpsAccuracyInfo(null);
  };

  const handleStartEdit = (addr: Address) => {
    setEditingAddressId(addr.id);
    setStreet(addr.street || "");
    setNumber(addr.number || "");
    setNeighborhood(addr.neighborhood || "");
    setCity(addr.city || "Várzea Grande");
    setComplement(addr.complement || "");
    setReference(addr.reference || "");
    setZip(addr.zip || "");
    setLabel(addr.label || "Casa");
    setCoords({ lat: addr.latitude, lon: addr.longitude });
    setErrorMessage(null);
    setView("manual");
  };

  // 1. Geolocalização via GPS do Navegador
  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMessage("Seu dispositivo ou navegador não suporta geolocalização.");
      setView("manual");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);
    setGpsAccuracyInfo(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);

        setCoords({ lat, lon });
        setGpsAccuracyInfo(`Precisão do GPS: ~${accuracy}m`);

        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
          if (!res.ok) {
            throw new Error("Não foi possível converter as coordenadas em endereço.");
          }
          const data = await res.json();

          setStreet(data.road || data.displayName?.split(",")[0] || "");
          setNeighborhood(data.neighborhood || "");
          setCity(data.city || "Local");
          setZip(data.postcode || "");

          setView("gps_confirm");
          setTimeout(() => numberInputRef.current?.focus(), 150);
        } catch (err: unknown) {
          console.error("Erro no reverse geocoding:", err);
          setErrorMessage("Localização obtida, por favor complete os dados do logradouro.");
          setView("manual");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("Erro ao obter localização GPS:", err);
        setIsLocating(false);
        if (err.code === 1) {
          setErrorMessage("Permissão de localização negada. Preencha o endereço manualmente.");
        } else {
          setErrorMessage("Sinal de GPS fraco ou indisponível. Preencha o endereço manualmente.");
        }
        setView("manual");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // 2. Busca automática de CEP via ViaCEP
  const handleCepLookup = async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!res.ok) throw new Error("Erro na consulta do CEP");
      const data = await res.json();

      if (data.erro) {
        setErrorMessage("CEP não localizado. Preencha os campos da rua manualmente.");
        return;
      }

      if (data.logradouro) setStreet(data.logradouro);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.localidade && data.uf) {
        setCity(`${data.localidade} - ${data.uf}`);
      }

      // Tenta geocodificar o logradouro retornado pelo CEP para centralizar o mapa
      try {
        const queryTerm = `${data.logradouro || ""} ${data.bairro || ""} ${data.localidade || "Várzea Grande"} MT`;
        const searchRes = await fetch(`/api/geocode/search?q=${encodeURIComponent(queryTerm)}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            setCoords({
              lat: searchData.results[0].latitude,
              lon: searchData.results[0].longitude,
            });
            setShowManualMap(true);
          }
        }
      } catch (geoErr) {
        console.warn("Aviso ao buscar coordenadas para o CEP:", geoErr);
      }

      // Foca automaticamente no campo de número
      setTimeout(() => numberInputRef.current?.focus(), 150);
    } catch (err) {
      console.warn("Erro ao buscar ViaCEP:", err);
      setErrorMessage("Não foi possível consultar o CEP automaticamente.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val.replace(/\D/g, "").slice(0, 8);
    let formatted = clean;
    if (clean.length > 5) {
      formatted = `${clean.slice(0, 5)}-${clean.slice(5)}`;
    }
    setZip(formatted);
    if (clean.length === 8) {
      handleCepLookup(clean);
    }
  };

  // 3. Submissão do Endereço
  const handleSaveAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim()) {
      setErrorMessage("Por favor, informe o nome da rua/logradouro.");
      return;
    }
    if (!number.trim()) {
      setErrorMessage("Por favor, informe o número.");
      numberInputRef.current?.focus();
      return;
    }
    if (!neighborhood.trim()) {
      setErrorMessage("Por favor, informe o bairro.");
      return;
    }

    saveAddress(
      {
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim() || "Várzea Grande",
        complement: complement.trim().slice(0, 50) || undefined,
        reference: reference.trim() || undefined,
        zip: zip.trim() || undefined,
        label: (label.trim() || "Casa").slice(0, 30),
        latitude: coords.lat,
        longitude: coords.lon,
      },
      editingAddressId || undefined
    );

    closeAddressModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAddressModal();
      }}
    >
      <div className="bg-card text-card-foreground border border-border/70 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Mobile handle indicator */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            {view !== "list" && addresses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setView("list");
                }}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Voltar aos endereços salvos"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-muted-foreground flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg leading-tight text-foreground">
                  {view === "list" && "Endereços de Entrega"}
                  {view === "selector" && "Como deseja informar o endereço?"}
                  {view === "gps_confirm" && "Confirmar Número e Detalhes"}
                  {view === "manual" && (editingAddressId ? "Editar Endereço" : "Cadastrar Endereço")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {view === "list" && "Selecione o local de entrega para o seu pedido"}
                  {view === "selector" && "Localização automática ou preenchimento guiado"}
                  {view === "gps_confirm" && "Identificamos sua rua! Complete com o número"}
                  {view === "manual" && (editingAddressId ? "Atualize as informações do endereço" : "Preencha os campos para entrega rápida")}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAddressModal}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Fechar"
            aria-label="Fechar modal de endereço"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────
              VIEW: LISTA DE ENDEREÇOS SALVOS
          ───────────────────────────────────────── */}
          {view === "list" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {addresses.map((addr) => {
                  const isSelected = addr.id === activeAddressId;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setActiveAddressId(addr.id);
                        closeAddressModal();
                      }}
                      className={`group relative p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                          : "border-border/60 hover:border-primary/40 bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {addr.label === "Trabalho" ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <HomeIcon className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-sm text-foreground truncate">
                              {addr.street}, {addr.number}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-white shrink-0">
                                Selecionado
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground truncate">
                            {addr.complement ? `${addr.complement} • ` : ""}
                            {addr.neighborhood}, {addr.city}
                          </p>

                          {addr.reference && (
                            <p className="text-[11px] text-muted-foreground/80 font-mono italic truncate">
                              Ref: {addr.reference}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(addr);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[#9306CF] hover:bg-[#9306CF]/10 transition-colors"
                          title="Editar endereço"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Excluir o endereço "${addr.street}, ${addr.number}"?`)) {
                              deleteAddress(addr.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Excluir endereço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão de Adicionar Novo Endereço */}
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("selector");
                }}
                className="w-full py-3 px-4 border-2 border-dashed border-primary/40 hover:border-primary rounded-xl text-xs font-bold text-primary dark:text-muted-foreground hover:bg-primary/5 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar novo endereço</span>
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────
              VIEW: SELETOR DE AÇÃO (GPS OU MANUAL)
          ───────────────────────────────────────── */}
          {view === "selector" && (
            <div className="space-y-3.5 py-1">
              {/* Opção 1: Localização Atual via GPS */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="w-full p-4 rounded-2xl border-2 border-primary/30 hover:border-primary bg-gradient-to-r from-primary/10 via-accent/5 to-transparent hover:from-primary/15 transition-all text-left flex items-center justify-between gap-3 shadow-xs group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                    {isLocating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Navigation className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary dark:group-hover:text-muted-foreground transition-colors">
                      {isLocating ? "Obtendo sua localização..." : "Usar minha localização atual"}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Detecta automaticamente sua rua via GPS do aparelho
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline text-xs font-bold text-primary dark:text-muted-foreground shrink-0">
                  Rápido →
                </span>
              </button>

              {/* Opção 2: Digitar Endereço Manualmente */}
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("manual");
                }}
                className="w-full p-4 rounded-2xl border-2 border-border/80 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all text-left flex items-center justify-between gap-3 shadow-xs group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-muted text-muted-foreground group-hover:text-primary dark:group-hover:text-muted-foreground group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary dark:group-hover:text-muted-foreground transition-colors">
                      Digitar endereço manualmente
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Busca automática de CEP e preenchimento dos campos
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline text-xs font-bold text-muted-foreground group-hover:text-foreground shrink-0">
                  Digitar →
                </span>
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────
              VIEW: CONFIRMAÇÃO DO GPS (NÚMERO + COMPLEMENTO)
          ───────────────────────────────────────── */}
          {view === "gps_confirm" && (
            <form onSubmit={handleSaveAddressSubmit} className="space-y-4">
              {/* Badge de localização GPS */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5">
                <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    Localização detectada com sucesso!
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {street || "Rua identificada"}, {neighborhood || ""} - {city || ""}
                  </p>
                  {gpsAccuracyInfo && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 inline-block">
                      {gpsAccuracyInfo}
                    </span>
                  )}
                </div>
              </div>

              {/* Mapa com Alfinete Interativo para Ajuste Fino */}
              {coords.lat && coords.lon && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Ajuste Fino da Localização (Alfinete Interativo)</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Arraste até a sua porta
                    </span>
                  </div>
                  <LocationPickerMap
                    initialCoords={{ lat: coords.lat, lng: coords.lon }}
                    height="190px"
                    pinEmoji="📍"
                    onLocationSelect={(newCoords, details) => {
                      setCoords({ lat: newCoords.lat, lon: newCoords.lng });
                      if (details?.road) setStreet(details.road);
                      if (details?.neighborhood) setNeighborhood(details.neighborhood);
                      if (details?.city) setCity(details.city);
                      if (details?.postcode) setZip(details.postcode);
                    }}
                  />
                </div>
              )}

              {/* Campos principais de confirmação */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-foreground">Logradouro / Rua *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-hidden"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-bold text-primary dark:text-muted-foreground">
                    Número *
                  </label>
                  <input
                    ref={numberInputRef}
                    type="text"
                    required
                    placeholder="Ex: 123"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary/30 outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Bairro *</label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Complemento / Apto</label>
                    <span className="text-[10px] font-mono text-muted-foreground">{complement.length}/50</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Apto 102, Bloco B"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value.slice(0, 50))}
                    maxLength={50}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Ponto de Referência</label>
                <input
                  type="text"
                  placeholder="Próximo à padaria, portão branco..."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                />
              </div>

              {/* Rótulos: Casa, Trabalho, Outro */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Local:</label>
                <div className="flex gap-2">
                  {["Casa", "Trabalho", "Outro"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setLabel(lbl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        label === lbl || (lbl === "Outro" && label !== "Casa" && label !== "Trabalho")
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {lbl === "Casa" && "🏠 "}
                      {lbl === "Trabalho" && "💼 "}
                      {lbl === "Outro" && "📍 "}
                      {lbl}
                    </button>
                  ))}
                </div>
                {label !== "Casa" && label !== "Trabalho" && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-muted-foreground">Apelido do Endereço</label>
                      <span className="text-[10px] font-mono text-muted-foreground">{label === "Outro" ? 0 : label.length}/30</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: Casa da Vó, Academia..."
                      value={label === "Outro" ? "" : label}
                      onChange={(e) => setLabel(e.target.value.slice(0, 30))}
                      maxLength={30}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:border-primary outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("selector")}
                  className="w-1/3 py-2.5 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 px-4 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Endereço</span>
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────
              VIEW: DIGITAR ENDEREÇO MANUAL (VIACEP)
          ───────────────────────────────────────── */}
          {view === "manual" && (
            <form onSubmit={handleSaveAddressSubmit} className="space-y-3.5">
              {/* Campo de CEP com busca */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">CEP (Busca automática)</label>
                  {isSearchingCep && (
                    <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" /> Buscando no ViaCEP...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="00000-000"
                    value={zip}
                    onChange={handleCepInputChange}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-hidden font-mono"
                  />
                  <div className="absolute right-3 top-2.5 text-muted-foreground text-xs pointer-events-none">
                    ViaCEP
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-foreground">Rua / Logradouro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Av. Principal, Rua das Flores..."
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-xs font-bold text-primary dark:text-muted-foreground">
                    Número *
                  </label>
                  <input
                    ref={numberInputRef}
                    type="text"
                    required
                    placeholder="Ex: 100"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border-2 border-primary rounded-xl focus:ring-2 focus:ring-primary/30 outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Bairro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Centro, Jardim..."
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Cidade / UF</label>
                  <input
                    type="text"
                    placeholder="Cidade - UF"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Complemento / Apto</label>
                    <span className="text-[10px] font-mono text-muted-foreground">{complement.length}/50</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Casa, Apto 204..."
                    value={complement}
                    onChange={(e) => setComplement(e.target.value.slice(0, 50))}
                    maxLength={50}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Ponto de Referência</label>
                  <input
                    type="text"
                    placeholder="Em frente à praça..."
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:border-primary outline-hidden"
                  />
                </div>
              </div>

              {/* Ajuste Fino via Mapa Interativo com Alfinete */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Ponto Exato no Mapa (Ajuste Fino)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowManualMap(!showManualMap)}
                    className="text-[11px] font-bold text-primary dark:text-muted-foreground hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showManualMap ? "Ocultar Mapa ▲" : "Ajustar Alfinete no Mapa 📍"}</span>
                  </button>
                </div>

                {showManualMap && (
                  <div className="animate-in fade-in duration-200">
                    <LocationPickerMap
                      initialCoords={{
                        lat: coords.lat ?? -15.6536,
                        lng: coords.lon ?? -56.1322,
                      }}
                      height="190px"
                      pinEmoji="📍"
                      onLocationSelect={(newCoords, details) => {
                        setCoords({ lat: newCoords.lat, lon: newCoords.lng });
                        if (details?.road && !street) setStreet(details.road);
                        if (details?.neighborhood && !neighborhood) setNeighborhood(details.neighborhood);
                        if (details?.city && city === "Local") setCity(details.city);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Rótulo de Local */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-muted-foreground">Salvar como:</label>
                <div className="flex gap-2">
                  {["Casa", "Trabalho", "Outro"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setLabel(lbl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        label === lbl || (lbl === "Outro" && label !== "Casa" && label !== "Trabalho")
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {lbl === "Casa" && "🏠 "}
                      {lbl === "Trabalho" && "💼 "}
                      {lbl === "Outro" && "📍 "}
                      {lbl}
                    </button>
                  ))}
                </div>
                {label !== "Casa" && label !== "Trabalho" && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-muted-foreground">Apelido do Endereço</label>
                      <span className="text-[10px] font-mono text-muted-foreground">{label === "Outro" ? 0 : label.length}/30</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: Casa da Vó, Academia..."
                      value={label === "Outro" ? "" : label}
                      onChange={(e) => setLabel(e.target.value.slice(0, 30))}
                      maxLength={30}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:border-primary outline-hidden"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setView(addresses.length > 0 ? "list" : "selector")}
                  className="w-1/3 py-2.5 px-3 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 px-4 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAddressId ? "Atualizar Endereço" : "Salvar Endereço"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
