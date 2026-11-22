"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Bike,
  DollarSign,
  Gift,
  Clock,
  MapPin,
  Store,
  Navigation,
  Search,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  Sparkles,
  Phone,
  Plus,
  Pencil,
  Trash2,
  X,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck,
  Compass,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  storeSettingsService,
  BusinessHourDay,
} from "@/services/storeSettingsService";
import {
  courierService,
  Courier,
  CourierStatus,
} from "@/services/courierService";
import type { ReverseGeocodeResult } from "@/components/logistics/LocationPickerMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/ToastNotification";

const LocationPickerMap = dynamic(
  () => import("@/components/logistics/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium font-mono">Carregando mapa da sede da loja...</span>
      </div>
    ),
  }
);

const DEFAULT_DAYS: BusinessHourDay[] = [
  { day: "monday", label: "Segunda-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "tuesday", label: "Terça-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "wednesday", label: "Quarta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "thursday", label: "Quinta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "friday", label: "Sexta-feira", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "saturday", label: "Sábado", isOpen: true, openTime: "13:00", closeTime: "23:30" },
  { day: "sunday", label: "Domingo", isOpen: true, openTime: "14:00", closeTime: "23:00" },
];

interface AddressSearchResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

export function LogisticsAndCouriersSection() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingRadius, setSavingRadius] = useState(false);

  // Regras de Frete
  const [deliveryFee, setDeliveryFee] = useState("5.00");
  const [enableFreeShipping, setEnableFreeShipping] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("60.00");
  const [maxDeliveryRadiusKm, setMaxDeliveryRadiusKm] = useState("10");

  // Ponto Geográfico e Sede
  const [storeLatitude, setStoreLatitude] = useState(-15.6536);
  const [storeLongitude, setStoreLongitude] = useState(-56.1322);
  const [storeAddress, setStoreAddress] = useState("Várzea Grande, MT");
  const [latInput, setLatInput] = useState("-15.653600");
  const [lngInput, setLngInput] = useState("-56.132200");
  const [isStoreSettingsLoaded, setIsStoreSettingsLoaded] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [isSearchingStore, setIsSearchingStore] = useState(false);
  const [storeSearchResults, setStoreSearchResults] = useState<AddressSearchResult[]>([]);
  const [isLocatingStore, setIsLocatingStore] = useState(false);

  // Horários e Dias da Semana
  const [businessHours, setBusinessHours] = useState<BusinessHourDay[]>(DEFAULT_DAYS);

  // Gestão de Entregadores (Motoboys)
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [courierStatusFilter, setCourierStatusFilter] = useState<"ALL" | CourierStatus>("ALL");

  // Modal de Entregador
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [courierForm, setCourierForm] = useState({
    name: "",
    phone: "",
    vehicle: "Moto",
    plate: "",
    pixKey: "",
    status: "available" as CourierStatus,
  });
  const [savingCourier, setSavingCourier] = useState(false);

  // Modal Crítico de Confirmação para Salvar Operação
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState("");
  const confirmInputRef = useRef<HTMLInputElement | null>(null);
  const [isStructuralExpanded, setIsStructuralExpanded] = useState(false);
  const [courierToDelete, setCourierToDelete] = useState<Courier | null>(null);
  const [deletingCourier, setDeletingCourier] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      storeSettingsService.getSettings(),
      courierService.getCouriers(),
    ])
      .then(([settings, couriersData]) => {
        setDeliveryFee(settings.deliveryFee.toFixed(2));
        if (settings.freeDeliveryThreshold !== null && settings.freeDeliveryThreshold !== undefined) {
          setEnableFreeShipping(true);
          setFreeShippingThreshold(settings.freeDeliveryThreshold.toFixed(2));
        } else {
          setEnableFreeShipping(false);
          setFreeShippingThreshold("60.00");
        }

        if (settings.maxDeliveryRadiusKm !== null && settings.maxDeliveryRadiusKm !== undefined) {
          setMaxDeliveryRadiusKm(String(settings.maxDeliveryRadiusKm));
        }

        const lat = settings.storeLatitude ?? -15.6536;
        const lng = settings.storeLongitude ?? -56.1322;
        const address = settings.storeAddress || "Várzea Grande, MT";

        setStoreLatitude(lat);
        setStoreLongitude(lng);
        setLatInput(lat.toFixed(6));
        setLngInput(lng.toFixed(6));
        setStoreAddress(address);
        setIsStoreSettingsLoaded(true);

        if (settings.businessHours && Array.isArray(settings.businessHours) && settings.businessHours.length === 7) {
          setBusinessHours(settings.businessHours);
        }

        setCouriers(couriersData);
      })
      .catch((err) => {
        console.error("Erro ao carregar dados de logística:", err);
        showToast({
          type: "error",
          title: "Erro de Carregamento",
          message: "Não foi possível carregar as configurações de logística.",
        });
      })
      .finally(() => {
        setLoading(false);
        setLoadingCouriers(false);
      });
  }, [showToast]);

  // Busca de Endereço via Geocode
  const handleSearchStoreAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!storeSearchQuery.trim() || storeSearchQuery.trim().length < 2) return;

    setIsSearchingStore(true);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(storeSearchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setStoreSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Erro ao buscar endereço da loja:", err);
    } finally {
      setIsSearchingStore(false);
    }
  };

  const handleSelectSearchResult = (res: AddressSearchResult) => {
    setStoreLatitude(res.latitude);
    setStoreLongitude(res.longitude);
    setLatInput(res.latitude.toFixed(6));
    setLngInput(res.longitude.toFixed(6));
    setStoreAddress(res.displayName);
    setStoreSearchResults([]);
    setStoreSearchQuery("");
  };

  const handleUseCurrentGpsAsStore = () => {
    if (!navigator.geolocation) {
      showToast({
        type: "error",
        title: "Geolocalização Indisponível",
        message: "Seu navegador não suporta captura de geolocalização.",
      });
      return;
    }

    setIsLocatingStore(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setStoreLatitude(latitude);
        setStoreLongitude(longitude);
        setLatInput(latitude.toFixed(6));
        setLngInput(longitude.toFixed(6));
        setIsLocatingStore(false);
        showToast({
          type: "success",
          title: "GPS Capturado",
          message: `Coordenadas atualizadas: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
      },
      (err) => {
        console.error(err);
        setIsLocatingStore(false);
        showToast({
          type: "error",
          title: "Falha no GPS",
          message: "Não foi possível obter sua localização atual via GPS.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationSelectFromMap = (
    coords: { lat: number; lng: number },
    addressDetails?: ReverseGeocodeResult
  ) => {
    setStoreLatitude(coords.lat);
    setStoreLongitude(coords.lng);
    setLatInput(coords.lat.toFixed(6));
    setLngInput(coords.lng.toFixed(6));
    if (addressDetails?.displayName) {
      setStoreAddress(addressDetails.displayName);
    }
  };

  // Replicar Horário de Segunda para todos os dias úteis (Seg-Sex)
  const handleReplicateWeekdayHours = () => {
    const monday = businessHours.find((d) => d.day === "monday");
    if (!monday) return;
    setBusinessHours((prev) =>
      prev.map((d) => {
        if (["monday", "tuesday", "wednesday", "thursday", "friday"].includes(d.day)) {
          return {
            ...d,
            isOpen: monday.isOpen,
            openTime: monday.openTime,
            closeTime: monday.closeTime,
          };
        }
        return d;
      })
    );
    showToast({
      type: "success",
      title: "Horários Sincronizados",
      message: "Horários de segunda-feira aplicados para toda a semana útil (Segunda a Sexta).",
    });
  };

  const handleUpdateDay = <K extends keyof BusinessHourDay>(
    index: number,
    field: K,
    value: BusinessHourDay[K]
  ) => {
    setBusinessHours((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Abertura do Modal de Confirmação com Trava de Digitação ("Sim")
  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmInputText("");
    setIsConfirmModalOpen(true);
    setTimeout(() => {
      confirmInputRef.current?.focus();
    }, 150);
  };

  const isConfirmed = confirmInputText.trim().toLowerCase() === "sim";

  // Salvar Rápido do Raio de Entrega
  const handleQuickSaveRadius = async () => {
    const radiusNum = parseFloat(maxDeliveryRadiusKm);
    if (isNaN(radiusNum) || radiusNum <= 0) {
      showToast({
        type: "error",
        title: "Raio Inválido",
        message: "Por favor, informe um raio de entrega maior que zero.",
      });
      return;
    }

    setSavingRadius(true);
    try {
      await storeSettingsService.updateSettings({
        maxDeliveryRadiusKm: radiusNum,
      });
      showToast({
        type: "success",
        title: "Raio Atualizado!",
        message: `Raio de atendimento configurado para ${radiusNum} km com sucesso.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao gravar raio de entrega.";
      showToast({
        type: "error",
        title: "Erro ao Salvar Raio",
        message: msg,
      });
    } finally {
      setSavingRadius(false);
    }
  };

  // Salvar Configurações da Operação
  const handleExecuteSaveSettings = async () => {
    if (!isConfirmed) return;

    setSavingSettings(true);
    try {
      const feeNum = parseFloat(deliveryFee) || 0;
      const thresholdNum = enableFreeShipping ? parseFloat(freeShippingThreshold) || 0 : null;
      const radiusNum = parseFloat(maxDeliveryRadiusKm) || 10;

      await storeSettingsService.updateSettings({
        deliveryFee: feeNum,
        freeDeliveryThreshold: thresholdNum,
        maxDeliveryRadiusKm: radiusNum,
        storeLatitude,
        storeLongitude,
        storeAddress,
        businessHours,
      });

      setIsConfirmModalOpen(false);
      showToast({
        type: "success",
        title: "Logística Atualizada!",
        message: "Sede física, regras de frete e horários de funcionamento salvos com sucesso.",
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Não foi possível gravar as configurações.";
      showToast({
        type: "error",
        title: "Erro ao Salvar",
        message: msg,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // CRUD DE ENTREGADORES
  const handleOpenCreateCourier = () => {
    setEditingCourier(null);
    setCourierForm({
      name: "",
      phone: "",
      vehicle: "Honda CG 160",
      plate: "",
      pixKey: "",
      status: "available",
    });
    setIsCourierModalOpen(true);
  };

  const handleOpenEditCourier = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierForm({
      name: courier.name,
      phone: courier.phone,
      vehicle: courier.vehicle || "Moto",
      plate: courier.plate || "",
      pixKey: courier.pixKey || "",
      status: courier.status,
    });
    setIsCourierModalOpen(true);
  };

  const handleSaveCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierForm.name.trim()) {
      showToast({ type: "error", title: "Nome obrigatório", message: "Informe o nome do entregador." });
      return;
    }
    if (!courierForm.phone.trim()) {
      showToast({ type: "error", title: "Telefone obrigatório", message: "Informe o WhatsApp com DDD." });
      return;
    }

    setSavingCourier(true);
    try {
      if (editingCourier) {
        const updated = await courierService.updateCourier(editingCourier.id, courierForm);
        setCouriers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast({
          type: "success",
          title: "Entregador Atualizado",
          message: `Cadastro de ${updated.name} foi atualizado com sucesso.`,
        });
      } else {
        const created = await courierService.createCourier(courierForm);
        setCouriers((prev) => [created, ...prev]);
        showToast({
          type: "success",
          title: "Entregador Cadastrado",
          message: `${created.name} está pronto para receber despachos de entrega.`,
        });
      }
      setIsCourierModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao gravar entregador.";
      showToast({ type: "error", title: "Erro ao Salvar", message: msg });
    } finally {
      setSavingCourier(false);
    }
  };

  const handleDeleteCourier = (courier: Courier) => {
    setCourierToDelete(courier);
  };

  const executeDeleteCourier = async () => {
    if (!courierToDelete) return;
    setDeletingCourier(true);
    try {
      await courierService.deleteCourier(courierToDelete.id);
      setCouriers((prev) => prev.filter((c) => c.id !== courierToDelete.id));
      showToast({
        type: "success",
        title: "Entregador Removido",
        message: `${courierToDelete.name} foi desvinculado da frota ativa.`,
      });
      setCourierToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao excluir entregador.";
      showToast({ type: "error", title: "Erro ao Remover", message: msg });
    } finally {
      setDeletingCourier(false);
    }
  };

  const handleToggleCourierStatus = async (courier: Courier, nextStatus: CourierStatus) => {
    // Atualização otimista
    setCouriers((prev) =>
      prev.map((c) => (c.id === courier.id ? { ...c, status: nextStatus } : c))
    );

    try {
      await courierService.toggleStatus(courier.id, nextStatus);
      showToast({
        type: "success",
        title: "Status Atualizado",
        message: `${courier.name} agora está marcado como "${getStatusLabel(nextStatus)}".`,
      });
    } catch (err: unknown) {
      setCouriers((prev) =>
        prev.map((c) => (c.id === courier.id ? { ...c, status: courier.status } : c))
      );
      const msg = err instanceof Error ? err.message : "Falha ao atualizar status.";
      showToast({ type: "error", title: "Erro ao Alterar", message: msg });
    }
  };

  const getStatusLabel = (status: CourierStatus) => {
    switch (status) {
      case "available":
        return "Disponível";
      case "in_transit":
        return "Em Rota";
      case "off_duty":
        return "Folga";
      case "unavailable":
        return "Indisponível";
      default:
        return status;
    }
  };

  const getStatusBadgeStyle = (status: CourierStatus) => {
    switch (status) {
      case "available":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "in_transit":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "off_duty":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "unavailable":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
  };

  const filteredCouriers = useMemo(() => {
    if (courierStatusFilter === "ALL") return couriers;
    return couriers.filter((c) => c.status === courierStatusFilter);
  }, [couriers, courierStatusFilter]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono">Carregando painel de logística e entregadores...</span>
      </div>
    );
  }

  const feePreview = parseFloat(deliveryFee) || 0;
  const thresholdPreview = parseFloat(freeShippingThreshold) || 0;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-150">
      {/* ─────────────────────────────────────────────────────────────
          BLOCO 1 (ESTRUTURAL / RETRÁTIL): OPERAÇÃO DA LOJA (SEDE, HORÁRIOS & REGRAS DE FRETE)
      ───────────────────────────────────────────────────────────── */}
      <section className="order-2 bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Cabeçalho com Toggle Retrátil */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                <Compass className="w-5 h-5" />
              </div>
              <span>Operação da Loja & Regras de Entrega</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Sede física, raio máximo, horários de atendimento e regras de frete ({`Taxa R$ ${feePreview.toFixed(2)}`} • {enableFreeShipping ? `Grátis acima de R$ ${thresholdPreview.toFixed(2)}` : "Sem frete grátis"} • Raio {maxDeliveryRadiusKm} km).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Logística Ativa
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStructuralExpanded((prev) => !prev)}
              aria-expanded={isStructuralExpanded}
              className="rounded-xl min-h-[44px] px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {isStructuralExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Recolher Regras
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Configurar Regras
                </>
              )}
            </Button>
          </div>
        </div>

        {isStructuralExpanded && (
          <form onSubmit={handleOpenConfirmModal} className="space-y-8 pt-2">
          {/* Grid: Regras de Frete e Raio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Taxa Padrão */}
            <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wide text-foreground">
                    Taxa Padrão de Entrega
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Valor base cobrado pelo frete</p>
                </div>
              </div>

              <div className="relative pt-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="5.00"
                  className="pl-11 font-mono font-bold text-base h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                  required
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Ex: 5.00 para cobrar R$ 5,00 ou 0 para frete gratuito irrestrito.
              </span>
            </div>

            {/* Card 2: Raio Máximo de Entrega */}
            <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wide text-foreground">
                    Raio Máximo de Atendimento
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Distância limite a partir da sede</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Input
                    id="input-max-delivery-radius"
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={maxDeliveryRadiusKm}
                    onChange={(e) => setMaxDeliveryRadiusKm(e.target.value)}
                    placeholder="10"
                    className="pr-12 font-mono font-bold text-base h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-muted-foreground">
                    km
                  </span>
                </div>
                <Button
                  type="button"
                  id="btn-save-delivery-radius"
                  size="sm"
                  onClick={handleQuickSaveRadius}
                  disabled={savingRadius}
                  className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm shadow-blue-500/20 cursor-pointer"
                  title="Salvar apenas o raio de atendimento"
                >
                  {savingRadius ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar</span>
                    </>
                  )}
                </Button>
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Endereços além deste raio serão alertados como fora da área de entrega.
              </span>
            </div>

            {/* Card 3: Frete Grátis */}
            <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-xs uppercase tracking-wide text-foreground">
                      Frete Grátis Acima de
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Incentivo ao ticket médio</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFreeShipping}
                    onChange={(e) => setEnableFreeShipping(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {enableFreeShipping ? (
                <div className="relative pt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="1.00"
                    min="1"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    placeholder="60.00"
                    className="pl-11 font-mono font-bold text-base h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                    required={enableFreeShipping}
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-muted/30 border border-dashed border-border/80 text-[11px] text-muted-foreground text-center">
                  Frete grátis desativado. Cobrança padrão mantida.
                </div>
              )}
              <span className="text-[10px] text-muted-foreground block">
                {enableFreeShipping ? `Pedidos &ge; R$ ${parseFloat(freeShippingThreshold || "0").toFixed(2)} terão frete R$ 0,00.` : "Nenhum frete grátis por valor."}
              </span>
            </div>
          </div>

          {/* Card de Simulação ao Vivo */}
          <div className="bg-gradient-to-r from-primary/10 via-pink-500/10 to-amber-500/10 border border-primary/20 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-primary dark:text-violet-400">
              <Sparkles className="w-4 h-4" />
              <h5 className="font-heading font-bold text-xs uppercase tracking-wider">
                Simulação em Tempo Real para o Cliente
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/80 dark:bg-zinc-800/80 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-700/80 space-y-1">
                <span className="font-bold text-foreground block">
                  Exemplo 1: Pedido menor (R$ {(thresholdPreview > 10 ? thresholdPreview - 15 : 30).toFixed(2).replace(".", ",")})
                </span>
                <p className="text-muted-foreground">
                  Taxa cobrada:{" "}
                  <strong className="text-primary dark:text-violet-400 font-mono">
                    R$ {feePreview.toFixed(2).replace(".", ",")}
                  </strong>
                </p>
              </div>

              <div className="bg-white/80 dark:bg-zinc-800/80 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-700/80 space-y-1">
                <span className="font-bold text-foreground block">
                  Exemplo 2: Pedido maior (R$ {(thresholdPreview + 10).toFixed(2).replace(".", ",")})
                </span>
                <p className="text-muted-foreground">
                  Taxa cobrada:{" "}
                  {enableFreeShipping && thresholdPreview > 0 ? (
                    <span className="px-2 py-0.5 rounded-md font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300/40">
                      GRÁTIS 🎉
                    </span>
                  ) : (
                    <strong className="text-primary dark:text-violet-400 font-mono">
                      R$ {feePreview.toFixed(2).replace(".", ",")}
                    </strong>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Horários e Dias da Semana de Funcionamento */}
          <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide">
                    Horários e Dias de Funcionamento
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Defina os horários de abertura e fechamento para cada dia, ou marque dias de folga/fechado.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReplicateWeekdayHours}
                className="h-8 text-xs font-semibold rounded-xl border-primary/30 text-primary dark:text-violet-300 hover:bg-primary/10 cursor-pointer self-start sm:self-auto"
              >
                Copiar 2ª-feira para Seg-Sex
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {businessHours.map((bh, idx) => (
                <div
                  key={bh.day}
                  className={`p-3.5 rounded-xl border transition-all ${
                    bh.isOpen
                      ? "bg-white dark:bg-[#181D2D] border-zinc-200/80 dark:border-zinc-800 shadow-2xs"
                      : "bg-zinc-100/60 dark:bg-zinc-800/30 border-dashed border-zinc-300 dark:border-zinc-700/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-foreground truncate">{bh.label}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={bh.isOpen}
                        onChange={(e) => handleUpdateDay(idx, "isOpen", e.target.checked)}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {bh.isOpen ? "Aberto" : "Folga"}
                      </span>
                    </label>
                  </div>

                  {bh.isOpen ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Abre</span>
                        <Input
                          type="time"
                          value={bh.openTime}
                          onChange={(e) => handleUpdateDay(idx, "openTime", e.target.value)}
                          className="h-8 text-xs font-mono rounded-lg px-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Fecha</span>
                        <Input
                          type="time"
                          value={bh.closeTime}
                          onChange={(e) => handleUpdateDay(idx, "closeTime", e.target.value)}
                          className="h-8 text-xs font-mono rounded-lg px-2"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                      Loja Fechada / Dia de Folga
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sede Física e Ponto Geográfico (Leaflet Map) */}
          <div className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-foreground uppercase tracking-wide flex items-center gap-2">
                    <span>Sede Física & Coordenadas da Loja</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-violet-400 border border-primary/20">
                      Ponto de Origem
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Posicione exatamente o ponto da loja física para cálculo de rotas no mapa e envio aos entregadores.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentGpsAsStore}
                disabled={isLocatingStore}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary dark:text-violet-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
                title="Capturar coordenadas do GPS deste dispositivo"
              >
                {isLocatingStore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                <span>Usar GPS do Dispositivo</span>
              </button>
            </div>

            {/* Barra de Busca de Endereço */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Buscar Endereço no Mapa
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchStoreAddress();
                      }
                    }}
                    placeholder="Ex: Av. Couto Magalhães, Centro, Várzea Grande"
                    className="pl-10 text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleSearchStoreAddress()}
                  disabled={isSearchingStore || !storeSearchQuery.trim()}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-11 px-5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingStore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Pesquisar</span>
                </Button>
              </div>

              {storeSearchResults.length > 0 && (
                <div className="p-2 bg-white dark:bg-[#181D2D] border border-border/80 rounded-xl shadow-lg space-y-1 animate-in fade-in">
                  <span className="text-[11px] font-bold text-muted-foreground px-2 py-1 block">
                    Selecione um resultado para posicionar o alfinete:
                  </span>
                  {storeSearchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-muted/80 text-xs text-foreground transition-colors flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{res.displayName}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {res.latitude.toFixed(5)}, {res.longitude.toFixed(5)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mapa Interativo com Raio de Cobertura */}
            <div id="admin-store-location-map" className="space-y-2">
              {isStoreSettingsLoaded ? (
                <LocationPickerMap
                  initialCoords={{ lat: storeLatitude, lng: storeLongitude }}
                  initialAddress={storeAddress}
                  height="340px"
                  pinEmoji="🍧"
                  pinLabel="Sede Pop Shake"
                  coverageRadiusKm={parseFloat(maxDeliveryRadiusKm) || 0}
                  showCoverageCircle={true}
                  onLocationSelect={handleLocationSelectFromMap}
                />
              ) : (
                <div className="w-full h-[340px] rounded-2xl bg-muted/40 border border-border/80 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs font-medium font-mono">Carregando mapa da sede e raio...</span>
                </div>
              )}
            </div>

            {/* Campos de Coordenadas e Endereço */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Endereço Oficial da Sede *
                </Label>
                <Input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Ex: Av. Filinto Müller, 1234 - Centro, Várzea Grande - MT"
                  className="text-sm h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Latitude
                  </Label>
                  <Input
                    type="text"
                    value={latInput}
                    onChange={(e) => {
                      setLatInput(e.target.value);
                      const num = parseFloat(e.target.value.replace(",", "."));
                      if (!isNaN(num) && num >= -90 && num <= 90) setStoreLatitude(num);
                    }}
                    className="font-mono text-xs h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Longitude
                  </Label>
                  <Input
                    type="text"
                    value={lngInput}
                    onChange={(e) => {
                      setLngInput(e.target.value);
                      const num = parseFloat(e.target.value.replace(",", "."));
                      if (!isNaN(num) && num >= -180 && num <= 180) setStoreLongitude(num);
                    }}
                    className="font-mono text-xs h-11 bg-white dark:bg-[#181D2D] rounded-xl"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Salvar Operação */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={savingSettings}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider rounded-xl font-bold h-12 px-8 shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Salvando Operação...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Operação & Logística
                </>
              )}
            </Button>
          </div>
          </form>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          BLOCO 2 (PRIORIDADE DIÁRIA NO TOPO): FROTA & ENTREGADORES (MOTOBOYS)
      ───────────────────────────────────────────────────────────── */}
      <section className="order-1 bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <span>Equipe de Entregadores (Motoboys)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-zinc-100 dark:bg-zinc-800 text-foreground font-mono">
                    {couriers.length} cadastrados
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gerencie motoboys, veículos, Pix e disponibilidade (&quot;Em Rota&quot; ativa automaticamente quando o entregador inicia a entrega).
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleOpenCreateCourier}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Entregador
          </Button>
        </div>

        {/* Barra de Filtros de Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Filtrar:</span>
          {(["ALL", "available", "in_transit", "off_duty", "unavailable"] as const).map((st) => {
            const isSelected = courierStatusFilter === st;
            const count = st === "ALL" ? couriers.length : couriers.filter((c) => c.status === st).length;
            const label = st === "ALL" ? "Todos" : getStatusLabel(st);

            return (
              <button
                key={st}
                type="button"
                onClick={() => setCourierStatusFilter(st)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs"
                    : "bg-zinc-100/70 dark:bg-zinc-800/60 text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                <span>{label}</span>
                <span className="ml-1.5 text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Grid de Cards de Entregadores */}
        {loadingCouriers ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs">Carregando lista de entregadores...</p>
          </div>
        ) : filteredCouriers.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-foreground">Nenhum entregador encontrado</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre os motoboys que realizam as entregas para disponibilizar o despacho automatizado com link de WhatsApp e rastreamento GPS.
            </p>
            <Button
              type="button"
              onClick={handleOpenCreateCourier}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 h-9 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              Cadastrar Primeiro Entregador
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCouriers.map((courier) => {
              const cleanPhone = courier.phone.replace(/\D/g, "");
              const waLink = `https://wa.me/55${cleanPhone.replace(/^55/, "")}`;

              return (
                <div
                  key={courier.id}
                  className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 hover:border-blue-500/40 transition-all space-y-4 shadow-2xs group"
                >
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        <Bike className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-heading font-bold text-sm text-foreground truncate">
                          {courier.name}
                        </h4>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors mt-0.5"
                          title="Abrir WhatsApp direto do entregador"
                        >
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{courier.phone}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${getStatusBadgeStyle(
                        courier.status
                      )}`}
                    >
                      {getStatusLabel(courier.status)}
                    </span>
                  </div>

                  {/* Informações de Veículo e Pix */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#181D2D] border border-zinc-200/60 dark:border-zinc-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Veículo / Placa:</span>
                      <span className="font-bold text-foreground">
                        {courier.vehicle || "Moto"} {courier.plate ? `• ${courier.plate}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-primary" />
                        Chave Pix:
                      </span>
                      {courier.pixKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(courier.pixKey || "");
                            showToast({
                              type: "success",
                              title: "Pix Copiado!",
                              message: `Chave Pix de ${courier.name} copiada para a área de transferência.`,
                            });
                          }}
                          className="font-mono font-bold text-primary dark:text-violet-400 hover:underline flex items-center gap-1 truncate max-w-[160px] cursor-pointer"
                          title="Clique para copiar a chave Pix"
                        >
                          <span className="truncate">{courier.pixKey}</span>
                          <Copy className="w-3 h-3 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Não informada</span>
                      )}
                    </div>
                  </div>

                  {/* Seletor Rápido de Status & Ações */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                    <div className="flex items-center gap-1 flex-wrap">
                      {courier.status === "in_transit" && (
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30"
                          title="Status Em Rota gerenciado automaticamente ao iniciar/concluir entrega"
                        >
                          Em Rota • Auto
                        </span>
                      )}
                      {(["available", "off_duty", "unavailable"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleToggleCourierStatus(courier, st)}
                          disabled={courier.status === st}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default ${
                            courier.status === st
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent"
                              : "bg-white dark:bg-zinc-800 text-muted-foreground hover:text-foreground border-zinc-200 dark:border-zinc-700"
                          }`}
                          title={`Marcar como ${getStatusLabel(st)}`}
                        >
                          {getStatusLabel(st)}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCourier(courier)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        title="Editar entregador"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourier(courier)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        title="Remover entregador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: CRIAR / EDITAR ENTREGADOR
      ───────────────────────────────────────────────────────────── */}
      {isCourierModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsCourierModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#181D2D] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h4 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                <Bike className="w-5 h-5 text-blue-600" />
                {editingCourier ? "Editar Entregador" : "Novo Entregador"}
              </h4>
              <button
                type="button"
                onClick={() => setIsCourierModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourier} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome Completo do Entregador *</Label>
                <Input
                  value={courierForm.name}
                  onChange={(e) => setCourierForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Carlos Silva (Motoboy 01)"
                  className="rounded-xl h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone WhatsApp com DDD *</Label>
                <Input
                  value={courierForm.phone}
                  onChange={(e) => setCourierForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(65) 99999-8888"
                  className="rounded-xl h-10 font-mono"
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  Usado para acionar o motoboy via WhatsApp nativo no despacho do pedido.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Veículo</Label>
                  <Input
                    value={courierForm.vehicle}
                    onChange={(e) => setCourierForm((p) => ({ ...p, vehicle: e.target.value }))}
                    placeholder="Ex: Honda Fan 160"
                    className="rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Placa (Opcional)</Label>
                  <Input
                    value={courierForm.plate}
                    onChange={(e) => setCourierForm((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                    placeholder="QBB-1234"
                    className="rounded-xl h-10 font-mono uppercase"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Chave Pix (Para Acerto de Corridas)</Label>
                <Input
                  value={courierForm.pixKey}
                  onChange={(e) => setCourierForm((p) => ({ ...p, pixKey: e.target.value }))}
                  placeholder="CPF, Telefone ou E-mail Pix do entregador"
                  className="rounded-xl h-10 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Operacional Inicial</Label>
                <select
                  value={courierForm.status}
                  onChange={(e) => setCourierForm((p) => ({ ...p, status: e.target.value as CourierStatus }))}
                  className="w-full h-10 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold px-3"
                >
                  <option value="available">🟢 Disponível para Entregas</option>
                  {courierForm.status === "in_transit" && (
                    <option value="in_transit" disabled>
                      🔵 Em Rota de Entrega (Automático)
                    </option>
                  )}
                  <option value="off_duty">🟡 Folga / Ausente</option>
                  <option value="unavailable">🔴 Indisponível</option>
                </select>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  O status &quot;Em Rota&quot; é ativado automaticamente quando o entregador aceita/inicia a corrida e volta para &quot;Disponível&quot; ao concluir.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCourierModalOpen(false)}
                  className="rounded-xl h-9 text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingCourier}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs font-bold cursor-pointer"
                >
                  {savingCourier && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  {editingCourier ? "Salvar Alterações" : "Cadastrar Entregador"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: CONFIRMAÇÃO COM DIGITAÇÃO ("Sim") PARA SALVAR OPERAÇÃO
      ───────────────────────────────────────────────────────────── */}
      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#1E091B] border border-gray-200 dark:border-border/60 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-foreground leading-snug">
                    Confirmar Alterações de Logística?
                  </h3>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 uppercase font-semibold">
                    Ação de impacto operacional na loja
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={savingSettings}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                As alterações na sede física, raio de atendimento ({maxDeliveryRadiusKm} km), regras de frete e horários de funcionamento entram em vigor imediatamente para todos os clientes ativos.
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-foreground block">
                Para confirmar, digite exatamente <strong className="text-primary font-black underline">Sim</strong> no campo abaixo:
              </Label>
              <div className="relative">
                <Input
                  ref={confirmInputRef}
                  type="text"
                  autoComplete="off"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (isConfirmed && !savingSettings) {
                        handleExecuteSaveSettings();
                      }
                    }
                  }}
                  placeholder="Digite Sim para confirmar"
                  className={`text-sm h-11 border-2 rounded-xl transition-all ${
                    isConfirmed
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold"
                      : "border-gray-300 dark:border-border/60"
                  }`}
                  disabled={savingSettings}
                />
                {isConfirmed && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2 animate-in zoom-in-50" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={savingSettings}
                className="h-11 px-5 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleExecuteSaveSettings}
                disabled={!isConfirmed || savingSettings}
                className={`h-11 px-6 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                  isConfirmed && !savingSettings
                    ? "bg-gradient-to-r from-primary to-accent text-white hover:opacity-95 shadow-primary/30"
                    : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed opacity-60 shadow-none"
                }`}
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!courierToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingCourier) setCourierToDelete(null);
        }}
        title="Remover Entregador"
        description={`Deseja realmente remover o entregador ${courierToDelete?.name || ""}? Essa ação desvinculará o entregador da frota ativa.`}
        confirmLabel="Remover Entregador"
        variant="danger"
        loading={deletingCourier}
        onConfirm={executeDeleteCourier}
      />
    </div>
  );
}
