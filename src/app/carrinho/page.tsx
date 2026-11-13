"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Home,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Tag,
  AlertTriangle,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Crosshair,
  Sparkles,
  RefreshCw,
  Navigation,
  User,
  Lock,
  Eye,
  EyeOff,
  Store,
  Truck,
  Clock,
} from "lucide-react";
import { calculateDistanceKm } from "@/lib/geo";
import { AddonOrganizationService } from "@/domain/services/AddonOrganizationService";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { couponService, ValidatedCoupon } from "../../services/couponService";
import { orderService } from "../../services/orderService";
import { userService, UserLocation } from "../../services/userService";
import { storeSettingsService, StoreSettings } from "../../services/storeSettingsService";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCartFinancials } from "@/hooks/useCartFinancials";
import { useAddress } from "@/contexts/AddressContext";
import { useOrders } from "@/contexts/OrderContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { playDingSound, initAudioUnlock } from "../../lib/sound";
import { NotificationPermissionBanner } from "../../components/storefront/NotificationPermissionBanner";
import { formatCurrency, parseSafeNumber } from "@/lib/formatters";
import { ResilientErrorAlert } from "../../components/ui/ResilientErrorAlert";
import { AppApiError } from "@/lib/fetchClient";
import { FastAccessModal, formatPhoneInput, VerifiedAddressPayload } from "@/components/auth/FastAccessModal";
import { CompleteRegistrationModal } from "@/components/auth/CompleteRegistrationModal";
import { PasswordRecoveryRescueModal } from "@/components/auth/PasswordRecoveryRescueModal";
import { VALID_BRAZILIAN_DDDS } from "@/lib/validations/auth";
import { GpsInteractiveMapModal, GpsLocationConfirmedData } from "@/components/storefront/GpsInteractiveMapModal";

export default function CarrinhoPage() {
  const router = useRouter();
  const { user, fastAccess, signOut, refreshUser } = useAuth();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  const { trackGuestOrder } = useOrders();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    discountTotal: promoDiscount,
    itemsTotal,
    isLoaded,
  } = useCart();

  // Cupom de desconto
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponGatedMessage, setCouponGatedMessage] = useState<string | null>(null);
  const [pendingCoupon, setPendingCoupon] = useState<string | null>(null);

  // Modais de Autenticação Progressiva
  const [isFastAccessModalOpen, setIsFastAccessModalOpen] = useState(false);
  const [isCompleteRegModalOpen, setIsCompleteRegModalOpen] = useState(false);

  // Modal de Mapa Interativo no GPS
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);

  // Identificação Inline no Topo do Checkout (Acesso Rápido)
  const [inlineName, setInlineName] = useState("");
  const [inlinePhone, setInlinePhone] = useState("");
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [identificationSuccessMsg, setIdentificationSuccessMsg] = useState<string | null>(null);
  const identificationSectionRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Idempotência estrita de checkout: chave preservada entre retentativas da mesma tentativa
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);

  const getOrCreateCheckoutIdempotencyKey = useCallback(() => {
    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    return checkoutIdempotencyKeyRef.current;
  }, []);

  // Se os itens do carrinho mudarem, invalida a chave para que a nova composição gere sua própria chave
  useEffect(() => {
    checkoutIdempotencyKeyRef.current = null;
  }, [items]);

  // Reconhecimento de cliente cadastrado inline
  const [inlineRegisteredDetected, setInlineRegisteredDetected] = useState(false);
  const [inlinePassword, setInlinePassword] = useState("");
  const [inlineShowPassword, setInlineShowPassword] = useState(false);
  const [inlinePasswordLoading, setInlinePasswordLoading] = useState(false);
  const [inlineFailedAttempts, setInlineFailedAttempts] = useState(0);
  const [isInlineRescueOpen, setIsInlineRescueOpen] = useState(false);
  const [isInlineBypass, setIsInlineBypass] = useState(false);

  useEffect(() => {
    const raw = inlinePhone.replace(/\D/g, "");
    if (isInlineBypass) return;
    if (raw.length === 11) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/auth/check-phone?phone=${raw}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.isRegistered && data.hasPassword) {
              setInlineRegisteredDetected(true);
              if (data.fullName && !inlineName.trim()) {
                setInlineName(data.fullName);
              }
            } else {
              setInlineRegisteredDetected(false);
            }
          }
        } catch (err) {
          console.error("Erro na verificação de telefone no carrinho:", err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setInlineRegisteredDetected(false);
    }
  }, [inlinePhone, isInlineBypass, inlineName]);

  const handleInlinePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    const cleanPhone = inlinePhone.replace(/\D/g, "");

    if (!inlinePassword) {
      setInlineError("Informe sua senha de acesso.");
      return;
    }

    setInlinePasswordLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cleanPhone, password: inlinePassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        const nextFailures = inlineFailedAttempts + 1;
        setInlineFailedAttempts(nextFailures);
        if (nextFailures >= 2) {
          setIsInlineRescueOpen(true);
        }
        throw new Error(data.error || "Senha incorreta. Tente novamente.");
      }

      setInlineFailedAttempts(0);
      await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Senha incorreta. Tente novamente.";
      setInlineError(msg);
    } finally {
      setInlinePasswordLoading(false);
    }
  };

  // Configuração de entrega da loja
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const storeStatus = useStoreStatus();

  // Endereço estruturado (pronto para Google Maps / Entrega)
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Local");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [zip, setZip] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Modalidade de Atendimento (Entrega em Domicílio vs Retirada no Balcão)
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "retirada">("delivery");

  // Cotação e Verificação do Raio Geográfico em Tempo Real
  const [deliveryQuote, setDeliveryQuote] = useState<{
    isDeliverable: boolean;
    distanceKm: number;
    maxRadiusKm: number;
    reason?: string;
  } | null>(null);

  // Recálculo automático do raio ao atualizar coordenadas ou dados da loja
  useEffect(() => {
    if (!storeSettings) return;
    const storeLat = storeSettings.storeLatitude ?? -15.6536;
    const storeLng = storeSettings.storeLongitude ?? -56.1322;
    const maxRadius = storeSettings.maxDeliveryRadiusKm ?? 12;

    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      const dist = calculateDistanceKm(storeLat, storeLng, latitude, longitude);
      const isDeliverable = dist <= maxRadius;
      setDeliveryQuote({
        isDeliverable,
        distanceKm: Number(dist.toFixed(2)),
        maxRadiusKm: maxRadius,
        reason: isDeliverable
          ? undefined
          : `Identificamos que seu endereço fica a ${dist.toFixed(1)} km da nossa sede, e nosso raio máximo atual é de ${maxRadius} km.`,
      });
    } else {
      setDeliveryQuote(null);
    }
  }, [latitude, longitude, storeSettings]);

  // Se o usuário digitar Rua e Bairro mas ainda não tiver clicado no mapa/GPS, busca geolocalização automática
  useEffect(() => {
    if (latitude && longitude) return;
    if (!street.trim() || !neighborhood.trim() || street.trim().length < 3) return;

    const timer = setTimeout(async () => {
      try {
        const fullQuery = `${street}, ${number ? number + " - " : ""}${neighborhood}, ${city || "Várzea Grande"}, MT, Brasil`;
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(fullQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const first = data.results[0];
            if (first.latitude && first.longitude) {
              setLatitude(first.latitude);
              setLongitude(first.longitude);
            }
          }
        }
      } catch {}
    }, 1200);

    return () => clearTimeout(timer);
  }, [street, number, neighborhood, city, latitude, longitude]);

  // Integração com AddressContext global
  const {
    activeAddress,
    addresses,
    activeAddressId,
    setActiveAddressId,
    updateActiveAddressFields,
    openAddressModal,
  } = useAddress();

  // Sincroniza campos locais quando o activeAddress muda
  useEffect(() => {
    if (activeAddress) {
      if (activeAddress.street) setStreet(activeAddress.street);
      if (activeAddress.number) setNumber(activeAddress.number);
      if (activeAddress.neighborhood) setNeighborhood(activeAddress.neighborhood);
      if (activeAddress.city) setCity(activeAddress.city);
      if (activeAddress.complement !== undefined) setComplement(activeAddress.complement || "");
      if (activeAddress.reference !== undefined) setReference(activeAddress.reference || "");
      if (activeAddress.zip !== undefined) setZip(activeAddress.zip || "");
      if (activeAddress.latitude !== undefined) setLatitude(activeAddress.latitude || null);
      if (activeAddress.longitude !== undefined) setLongitude(activeAddress.longitude || null);
    }
  }, [activeAddress]);

  // Propaga alterações manuais de endereço em tempo real para o AddressContext (e Header)
  const handleStreetChange = (val: string) => {
    setStreet(val);
    updateActiveAddressFields({ street: val });
  };
  const handleNumberChange = (val: string) => {
    setNumber(val);
    updateActiveAddressFields({ number: val });
  };
  const handleNeighborhoodChange = (val: string) => {
    setNeighborhood(val);
    updateActiveAddressFields({ neighborhood: val });
  };
  const handleCityChange = (val: string) => {
    setCity(val);
    updateActiveAddressFields({ city: val });
  };
  const handleComplementChange = (val: string) => {
    setComplement(val);
    updateActiveAddressFields({ complement: val });
  };
  const handleReferenceChange = (val: string) => {
    setReference(val);
    updateActiveAddressFields({ reference: val });
  };
  const handleZipChange = (val: string) => {
    setZip(val);
    updateActiveAddressFields({ zip: val });
  };

  // Geolocalização
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [accuracyWarning, setAccuracyWarning] = useState<string | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoToast, setGeoToast] = useState<string | null>(null);

  const numberInputRef = useRef<HTMLInputElement>(null);

  // Endereços salvos do usuário autenticado
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Forma de pagamento
  const [paymentType, setPaymentType] = useState<"dinheiro" | "cartao_maquininha" | "pix_entrega">("dinheiro");
  const [changeFor, setChangeFor] = useState("");

  // Submissão do pedido
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutErrorObj, setCheckoutErrorObj] = useState<AppApiError | Error | null>(null);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Referências para feedback e navegação contextual resiliente
  const addressSectionRef = useRef<HTMLElement>(null);
  const errorAlertRef = useRef<HTMLDivElement>(null);

  // Carrega configurações da loja e inicializa desbloqueio de áudio
  useEffect(() => {
    initAudioUnlock();
    storeSettingsService.getSettings().then(setStoreSettings).catch(console.error);
  }, []);

  // Carrega endereços salvos e preferências de pagamento se estiver logado
  useEffect(() => {
    if (user?.id) {
      // Pré-seleciona forma de pagamento e troco preferencial do cliente
      const accessSettings = user.accessibilitySettings as Record<string, unknown> | null;
      const prefPayment =
        user.defaultPaymentMethod ||
        user.default_payment_method ||
        (accessSettings?.defaultPaymentMethod as string | undefined);
      if (prefPayment && (prefPayment === "pix_entrega" || prefPayment === "cartao_maquininha" || prefPayment === "dinheiro")) {
        setPaymentType(prefPayment);
      }
      const prefChange =
        user.defaultChangeFor !== undefined && user.defaultChangeFor !== null
          ? user.defaultChangeFor
          : user.default_change_for !== undefined && user.default_change_for !== null
          ? user.default_change_for
          : (accessSettings?.defaultChangeFor as number | string | undefined);
      if (prefChange !== undefined && prefChange !== null && prefChange !== "") {
        setChangeFor(String(prefChange));
      }

      userService
        .getLocations(user.id)
        .then((locs) => {
          setSavedLocations(locs);
          const def = locs.find((l) => l.is_default) || locs[0];
          if (def) {
            setSelectedLocationId(def.id);
            if (def.street) setStreet(def.street);
            else if (def.address_line) setStreet(def.address_line);
            if (def.number) setNumber(def.number);
            if (def.neighborhood) setNeighborhood(def.neighborhood);
            if (def.city) setCity(def.city);
            if (def.complement) setComplement(def.complement);
            if (def.reference) setReference(def.reference);
            if (def.zip) setZip(def.zip);
            if (def.latitude) setLatitude(def.latitude);
            if (def.longitude) setLongitude(def.longitude);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponError("");
    setCouponGatedMessage(null);

    // Gating: cupons exigem cadastro completo
    if (user && !user.isRegistered) {
      setPendingCoupon(couponInput.trim().toUpperCase());
      setCouponGatedMessage("🏷️ Cupom indisponível: Descontos e cupons são exclusivos para clientes com cadastro completo.");
      return;
    }

    if (!user) {
      setPendingCoupon(couponInput.trim().toUpperCase());
      setIsFastAccessModalOpen(true);
      return;
    }

    setValidatingCoupon(true);

    try {
      const cartProductIds = items.map((it) => it.productId);
      const res = await couponService.validateCoupon(couponInput.trim(), itemsTotal, cartProductIds);
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponInput("");
      } else if (res.code === "REQUIRES_REGISTRATION") {
        setPendingCoupon(couponInput.trim().toUpperCase());
        setCouponGatedMessage(res.message || "🏷️ Cupom indisponível: Descontos e cupons são exclusivos para clientes com cadastro completo.");
      } else {
        setCouponError(res.message || "Cupom inválido.");
      }
    } catch {
      setCouponError("Erro ao validar cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCompleteRegistrationSuccess = async () => {
    setCouponGatedMessage(null);
    if (pendingCoupon) {
      setValidatingCoupon(true);
      try {
        const cartProductIds = items.map((it) => it.productId);
        const res = await couponService.validateCoupon(pendingCoupon, itemsTotal, cartProductIds);
        if (res.valid && res.coupon) {
          setAppliedCoupon(res.coupon);
          setPendingCoupon(null);
        } else {
          setCouponError(res.message || "Não foi possível aplicar o cupom.");
        }
      } catch {
        setCouponError("Erro ao validar cupom após completar o cadastro.");
      } finally {
        setValidatingCoupon(false);
      }
    }
  };

  const handleFastAccessSuccess = (
    verifiedAddress?: VerifiedAddressPayload,
    clientInfo?: { name: string; phone: string }
  ) => {
    setIsFastAccessModalOpen(false);
    if (clientInfo) {
      if (clientInfo.name) setInlineName(clientInfo.name);
      if (clientInfo.phone) setInlinePhone(formatPhoneInput(clientInfo.phone));
    } else if (user) {
      if (user.fullName) setInlineName(user.fullName);
      if (user.phone) setInlinePhone(formatPhoneInput(user.phone));
    }
    if (verifiedAddress) {
      if (verifiedAddress.street) setStreet(verifiedAddress.street);
      if (verifiedAddress.number) setNumber(verifiedAddress.number);
      if (verifiedAddress.neighborhood) setNeighborhood(verifiedAddress.neighborhood);
      if (verifiedAddress.city) setCity(verifiedAddress.city);
      if (verifiedAddress.complement !== undefined) setComplement(verifiedAddress.complement || "");
      if (verifiedAddress.reference !== undefined) setReference(verifiedAddress.reference || "");
      if (verifiedAddress.zip !== undefined) setZip(verifiedAddress.zip || "");
      if (verifiedAddress.latitude !== undefined) setLatitude(verifiedAddress.latitude || null);
      if (verifiedAddress.longitude !== undefined) setLongitude(verifiedAddress.longitude || null);
    }
    setIdentificationSuccessMsg("Identificação confirmada com sucesso! Você já pode concluir seu pedido.");
    setCheckoutError("");
    setCheckoutErrorObj(null);
    setInlineError(null);
    setTimeout(() => setIdentificationSuccessMsg(null), 6000);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    setCouponGatedMessage(null);
  };

  // Cálculos de Entrega & Totais
  const isFreeDelivery = useMemo(() => {
    if (deliveryMode === "retirada") return true;
    if (!storeSettings) return false;
    if (storeSettings.freeDeliveryThreshold !== null && storeSettings.freeDeliveryThreshold !== undefined) {
      return itemsTotal >= storeSettings.freeDeliveryThreshold;
    }
    return storeSettings.deliveryFee === 0;
  }, [storeSettings, itemsTotal, deliveryMode]);

  const deliveryFee = useMemo(() => {
    if (deliveryMode === "retirada") return 0;
    if (!storeSettings) return 5.0;
    if (isFreeDelivery) return 0;
    return storeSettings.deliveryFee;
  }, [storeSettings, isFreeDelivery, deliveryMode]);

  const addressSummary = useMemo(() => {
    if (deliveryMode === "retirada") {
      return `Retirada no Balcão da Loja (${storeSettings?.storeAddress || "Sede Pop Shake"})`;
    }
    return street
      ? `${street}, ${number || "S/N"} - ${neighborhood || ""}${city ? `, ${city}` : ""}${complement ? ` (${complement})` : ""}`
      : "A combinar";
  }, [deliveryMode, storeSettings, street, number, neighborhood, city, complement]);

  const {
    couponDiscount,
    finalTotal,
    amountToFreeShipping,
    cartSummaryText: cartSummary,
  } = useCartFinancials({
    items,
    itemsTotal,
    promoDiscount,
    appliedCoupon,
    storeSettings,
    deliveryMode,
    deliveryFee,
    paymentType,
    changeFor,
    addressSummary,
  });

  const handleReviewAddress = () => {
    if (addressSectionRef.current) {
      addressSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = addressSectionRef.current.querySelector<HTMLInputElement>("input");
      if (input) {
        input.focus();
      }
    }
  };

  const handleReviewIdentification = () => {
    if (identificationSectionRef.current) {
      identificationSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => {
      const nameParts = inlineName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2) {
        nameInputRef.current?.focus();
      } else {
        phoneInputRef.current?.focus();
      }
    }, 250);
  };

  const handleConfirmInlineIdentification = async () => {
    setInlineError(null);
    setIdentificationSuccessMsg(null);
    const nameParts = inlineName.trim().split(/\s+/).filter(Boolean);
    const cleanPhone = inlinePhone.replace(/\D/g, "");

    if (nameParts.length < 2) {
      const err = "Por favor, informe seu nome completo (mínimo 2 palavras/sobrenome).";
      setInlineError(err);
      const bannerMsg = "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
      setCheckoutError(bannerMsg);
      setCheckoutErrorObj(new AppApiError(bannerMsg, "IDENTIFICATION_REQUIRED", 400));
      handleReviewIdentification();
      return;
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      const err = "Por favor, informe um WhatsApp válido com DDD (10 ou 11 dígitos).";
      setInlineError(err);
      const bannerMsg = "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
      setCheckoutError(bannerMsg);
      setCheckoutErrorObj(new AppApiError(bannerMsg, "IDENTIFICATION_REQUIRED", 400));
      phoneInputRef.current?.focus();
      return;
    }

    const ddd = parseInt(cleanPhone.slice(0, 2), 10);
    if (cleanPhone.length >= 2 && !VALID_BRAZILIAN_DDDS.has(ddd)) {
      const err = `O DDD (${cleanPhone.slice(0, 2)}) informado não é um DDD brasileiro válido.`;
      setInlineError(err);
      const bannerMsg = "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
      setCheckoutError(bannerMsg);
      setCheckoutErrorObj(new AppApiError(bannerMsg, "IDENTIFICATION_REQUIRED", 400));
      phoneInputRef.current?.focus();
      return;
    }

    setInlineLoading(true);
    try {
      const res = await fastAccess(inlineName.trim(), cleanPhone);
      if (res.status === "new_device_detected") {
        setIsFastAccessModalOpen(true);
      } else if (res.status === "authenticated") {
        setIdentificationSuccessMsg("Identificação confirmada com sucesso! Você já pode concluir seu pedido.");
        setCheckoutError("");
        setCheckoutErrorObj(null);
        setTimeout(() => setIdentificationSuccessMsg(null), 6000);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao conectar.";
      setInlineError(errorMsg);
      const bannerMsg = "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
      setCheckoutError(bannerMsg);
      setCheckoutErrorObj(new AppApiError(bannerMsg, "IDENTIFICATION_REQUIRED", 400));
    } finally {
      setInlineLoading(false);
    }
  };

  const handleOpenGpsMap = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setIsGpsModalOpen(true);
        },
        () => {
          setIsLocating(false);
          setIsGpsModalOpen(true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
      setIsGpsModalOpen(true);
    }
  };

  const handleGpsLocationConfirmed = (data: GpsLocationConfirmedData) => {
    if (data.street) setStreet(data.street);
    if (data.neighborhood) setNeighborhood(data.neighborhood);
    if (data.city) setCity(data.city);
    if (data.zip) setZip(data.zip);
    if (data.number) {
      setNumber(data.number);
    } else {
      setTimeout(() => {
        numberInputRef.current?.focus();
      }, 300);
    }
    setLatitude(data.latitude);
    setLongitude(data.longitude);
    setGeoToast("Localização confirmada via GPS!");
    setTimeout(() => setGeoToast(null), 5000);

    updateActiveAddressFields({
      street: data.street || street,
      neighborhood: data.neighborhood || neighborhood,
      city: data.city || city,
      zip: data.zip || zip,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  };

  // Funções de Geolocalização Reversa e GPS
  const fetchAddressFromCoords = async (lat: number, lon: number) => {
    try {
      setIsLocating(true);
      setLatitude(lat);
      setLongitude(lon);
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Não foi possível obter o endereço das coordenadas.");
      const data = await res.json();
      if (data.road) setStreet(data.road);
      if (data.neighborhood) setNeighborhood(data.neighborhood);
      if (data.city) setCity(data.city);
      if (data.postcode) setZip(data.postcode);

      updateActiveAddressFields({
        street: data.road || street,
        neighborhood: data.neighborhood || neighborhood,
        city: data.city || city,
        zip: data.postcode || zip,
        latitude: lat,
        longitude: lon,
      });

      // Auto-focus no campo de Número para agilizar o checkout
      setTimeout(() => {
        numberInputRef.current?.focus();
      }, 250);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao consultar endereço. Digite manualmente.";
      setGeoToast(msg);
      setTimeout(() => setGeoToast(null), 5000);
    } finally {
      setIsLocating(false);
      setPendingCoords(null);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoToast("Seu navegador não suporta geolocalização. Digite o endereço manualmente.");
      setTimeout(() => setGeoToast(null), 5000);
      return;
    }

    setIsLocating(true);
    setAccuracyWarning(null);
    setPendingCoords(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lon, accuracy } = position.coords;
        setGpsAccuracy(Math.round(accuracy));

        if (accuracy <= 30) {
          // Precisão excelente: prossegue automaticamente
          fetchAddressFromCoords(lat, lon);
        } else if (accuracy > 50) {
          // Sinal fraco / impreciso: alerta o usuário e dá opções
          setIsLocating(false);
          setPendingCoords({ lat, lon });
          setAccuracyWarning(
            `Sinal de GPS fraco (~${Math.round(accuracy)} metros). Aguarde alguns segundos em local aberto para melhorar o sinal ou confira o nome da rua manualmente.`
          );
        } else {
          // Entre 30 e 50 metros: razoável, preenche e avisa
          fetchAddressFromCoords(lat, lon);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoToast("Acesso à localização negado. Digite o endereço manualmente nos campos abaixo.");
        } else if (error.code === error.TIMEOUT) {
          setGeoToast("Tempo esgotado ao buscar GPS. Tente novamente ou digite manualmente.");
        } else {
          setGeoToast("Não foi possível obter sua localização. Digite o endereço manualmente.");
        }
        setTimeout(() => setGeoToast(null), 6000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleUsePendingLocation = () => {
    if (pendingCoords) {
      fetchAddressFromCoords(pendingCoords.lat, pendingCoords.lon);
      setAccuracyWarning(null);
    }
  };

  const handleRetryLocation = () => {
    setAccuracyWarning(null);
    handleGetLocation();
  };

  const handleFinishOrder = async () => {
    if (submitting) return;
    setCheckoutError("");
    setCheckoutErrorObj(null);

    // Bloqueio estrito de compras anônimas: exige autenticação via Acesso Rápido
    if (!user) {
      const cleanPhone = inlinePhone.replace(/\D/g, "");
      const nameParts = inlineName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length >= 2 && cleanPhone.length >= 10) {
        try {
          setInlineLoading(true);
          const res = await fastAccess(inlineName.trim(), cleanPhone);
          if (res.status === "new_device_detected") {
            setIsFastAccessModalOpen(true);
            return;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Erro ao conectar.";
          setInlineError(msg);
          setIsFastAccessModalOpen(true);
          return;
        } finally {
          setInlineLoading(false);
        }
      } else {
        const bannerMsg = "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
        setCheckoutError(bannerMsg);
        setCheckoutErrorObj(new AppApiError(bannerMsg, "IDENTIFICATION_REQUIRED", 400));
        handleReviewIdentification();
        return;
      }
    }

    if (!storeStatus.canAcceptOrders) {
      const msg =
        storeStatus.status === "CONVEYOR_PAUSED"
          ? `Finalizando os preparativos da cozinha. Nossa equipe está organizando a esteira para atender você. Nosso horário hoje é das ${storeStatus.openingTime} às ${storeStatus.closingTime}. Em instantes o recebimento de pedidos estará liberado!`
          : `Estamos fechados no momento. Hoje nosso horário de atendimento é das ${storeStatus.openingTime} às ${storeStatus.closingTime}. Você já pode ir escolhendo seus itens e montando sua sacola!`;
      setCheckoutError(msg);
      setCheckoutErrorObj(new AppApiError(msg, storeStatus.status, 422));
      return;
    }

    if (items.length === 0) {
      const msg = "Adicione itens ao carrinho antes de continuar.";
      setCheckoutError(msg);
      setCheckoutErrorObj(new AppApiError(msg, "VALIDATION_ERROR", 400));
      return;
    }

    if (deliveryMode === "delivery") {
      if (deliveryQuote && !deliveryQuote.isDeliverable) {
        const msg = `Seu endereço fica a ${deliveryQuote.distanceKm.toFixed(1)} km da nossa sede (raio máximo: ${deliveryQuote.maxRadiusKm} km). Infelizmente não conseguimos entregar aí no momento. Você pode optar por Retirada no Balcão para prosseguir com seu pedido!`;
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "OUT_OF_DELIVERY_RADIUS", 400));
        return;
      }

      if (!street.trim() || !number.trim() || !neighborhood.trim()) {
        const msg = "Preencha todos os campos obrigatórios de endereço (Rua, Número e Bairro).";
        setCheckoutError(msg);
        setCheckoutErrorObj(
          new AppApiError(msg, "VALIDATION_ERROR", 400, [
            { field: "Endereço", message: "Rua, Número e Bairro são obrigatórios" },
          ])
        );
        handleReviewAddress();
        return;
      }
    }

    if (paymentType === "dinheiro" && changeFor) {
      const changeNum = parseFloat(changeFor);
      if (isNaN(changeNum) || changeNum < finalTotal) {
        const msg = `O valor para troco deve ser maior ou igual ao total do pedido (R$ ${finalTotal.toFixed(2).replace(".", ",")}).`;
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "VALIDATION_ERROR", 400));
        return;
      }
    }

    setSubmitting(true);

    try {
      const isPickup = deliveryMode === "retirada";
      const idempotencyKey = getOrCreateCheckoutIdempotencyKey();

      const payload = {
        idempotencyKey,
        deliveryType: deliveryMode,
        isPickup: isPickup,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          promotionId: i.promotionId || null,
          notes: i.notes ? i.notes.trim() : null,
          selectedAddons: i.selectedOptions && i.selectedOptions.length > 0 ? i.selectedOptions.map(opt => ({
            id: opt.id || opt.name, // Fallback to name if id is missing
            name: opt.name,
            groupName: opt.groupName || undefined,
            price: opt.price,
            quantity: opt.quantity || 1
          })) : null,
        })),
        deliveryAddress: {
          street: isPickup ? "Retirada no Balcão" : street.trim(),
          number: isPickup ? "S/N" : number.trim(),
          neighborhood: isPickup ? "Centro Sul" : neighborhood.trim(),
          city: isPickup ? (storeSettings?.storeAddress?.split(",")[0] || "Várzea Grande") : (city.trim() || "Local"),
          complement: isPickup ? null : (complement.trim() || null),
          reference: isPickup ? null : (reference.trim() || null),
          zip: isPickup ? null : (zip.trim() || null),
          latitude: isPickup ? (storeSettings?.storeLatitude ?? null) : (latitude || null),
          longitude: isPickup ? (storeSettings?.storeLongitude ?? null) : (longitude || null),
        },
        paymentMethod: {
          type: paymentType,
          changeFor: paymentType === "dinheiro" && changeFor ? parseFloat(changeFor) : null,
        },
        couponCode: appliedCoupon?.code || null,
        customerName: inlineName.trim() || user?.fullName || null,
        name: inlineName.trim() || user?.fullName || null,
        customerPhone: (inlinePhone ? inlinePhone.replace(/\D/g, "") : null) || user?.phone || null,
        phone: (inlinePhone ? inlinePhone.replace(/\D/g, "") : null) || user?.phone || null,
      };

      const result = await orderService.createCheckoutOrder(payload);
      playDingSound();
      if (result.order?.id) {
        trackGuestOrder(result.order.id);
      }
      setOrderSuccessId(result.order.id);
      checkoutIdempotencyKeyRef.current = null;
      clearCart();
      if (!user) {
        refreshUser().catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar pedido no servidor.";
      setCheckoutError(msg);
      setCheckoutErrorObj(err as AppApiError | Error);
      setTimeout(() => {
        errorAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Modal / Tela de Sucesso
  if (orderSuccessId) {
    return (
      <div className="min-h-screen bg-transparent text-foreground flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-success/20 text-success rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold mb-2">
          Pedido Confirmado com Sucesso
        </span>
        <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
          Seu pedido foi recebido!
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mb-2 font-mono">
          Código do Pedido: <strong className="text-primary font-bold">#{orderSuccessId.substring(0, 8)}</strong>
        </p>
        <p className="text-muted-foreground text-xs max-w-md mb-6">
          A cozinha já iniciou o preparo. Lembre-se: o pagamento é realizado no momento da entrega!
        </p>

        {/* Banner para Solicitação Amigável de Permissão de Notificação */}
        <NotificationPermissionBanner className="mb-6 max-w-md w-full text-left" />

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pedidos"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-xl shadow-md"
          >
            Acompanhar Meus Pedidos <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/rastreamento?id=${orderSuccessId}`}
            className="border-2 border-primary text-primary hover:bg-primary/10 px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-xl"
          >
            Rastrear em Tempo Real
          </Link>
          <Link
            href="/"
            className="border-2 border-border hover:bg-muted px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center rounded-xl"
          >
            Voltar ao Cardápio
          </Link>
        </div>
      </div>
    );
  }

  const handleInitiateOrderConfirmation = async () => {
    if (submitting) return;
    setCheckoutError("");
    setCheckoutErrorObj(null);

    // Validação Obrigatória de Identificação (Acesso Rápido)
    if (!user) {
      const cleanPhone = inlinePhone.replace(/\D/g, "");
      const nameParts = inlineName.trim().split(/\s+/).filter(Boolean);
      if (nameParts.length < 2 || cleanPhone.length < 10) {
        const msg = "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "IDENTIFICATION_REQUIRED", 400));
        handleReviewIdentification();
        return;
      }

      const ddd = parseInt(cleanPhone.slice(0, 2), 10);
      if (cleanPhone.length >= 2 && !VALID_BRAZILIAN_DDDS.has(ddd)) {
        const msg = "Identificação necessária: Informe um DDD brasileiro válido no seu WhatsApp.";
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "IDENTIFICATION_REQUIRED", 400));
        handleReviewIdentification();
        return;
      }

      // Sincroniza e cria/associa a conta de acesso rápido automaticamente
      try {
        setInlineLoading(true);
        const res = await fastAccess(inlineName.trim(), cleanPhone);
        if (res.status === "new_device_detected") {
          setIsFastAccessModalOpen(true);
          return;
        }
        setIdentificationSuccessMsg("Identificação confirmada com sucesso! Você já pode concluir seu pedido.");
        setTimeout(() => setIdentificationSuccessMsg(null), 5000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Identificação necessária: Informe seu nome e WhatsApp antes de continuar.";
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "IDENTIFICATION_REQUIRED", 400));
        handleReviewIdentification();
        return;
      } finally {
        setInlineLoading(false);
      }
    }

    if (!storeStatus.canAcceptOrders) {
      const msg =
        storeStatus.status === "CONVEYOR_PAUSED"
          ? `Finalizando os preparativos da cozinha. Nosso horário hoje é das ${storeStatus.openingTime} às ${storeStatus.closingTime}.`
          : `A loja está fechada no momento. Nosso horário hoje é das ${storeStatus.openingTime} às ${storeStatus.closingTime}.`;
      setCheckoutError(msg);
      setCheckoutErrorObj(new AppApiError(msg, storeStatus.status, 422));
      return;
    }
    if (deliveryMode === "delivery") {
      if (deliveryQuote && !deliveryQuote.isDeliverable) {
        const msg = `Seu endereço fica a ${deliveryQuote.distanceKm.toFixed(1)} km da nossa sede (raio máximo: ${deliveryQuote.maxRadiusKm} km). Infelizmente não conseguimos entregar aí no momento. Alterne para Retirada no Balcão para prosseguir com seu pedido!`;
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "OUT_OF_DELIVERY_RADIUS", 400));
        return;
      }

      if (!street.trim() || !number.trim() || !neighborhood.trim()) {
        const msg = "Preencha todos os campos obrigatórios de endereço (Rua, Número e Bairro).";
        setCheckoutError(msg);
        setCheckoutErrorObj(
          new AppApiError(msg, "VALIDATION_ERROR", 400, [
            { field: "Endereço", message: "Rua, Número e Bairro são obrigatórios" },
          ])
        );
        handleReviewAddress();
        return;
      }
    }
    if (paymentType === "dinheiro" && changeFor) {
      const changeNum = parseFloat(changeFor);
      if (isNaN(changeNum) || changeNum < finalTotal) {
        const msg = `O valor para troco deve ser maior ou igual ao total (R$ ${finalTotal.toFixed(2).replace(".", ",")}).`;
        setCheckoutError(msg);
        setCheckoutErrorObj(new AppApiError(msg, "VALIDATION_ERROR", 400));
        return;
      }
    }
    setShowReviewModal(true);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-transparent text-foreground flex flex-col font-sans pb-32 lg:pb-12">
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/80 border-b border-border/40 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/40 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Voltar para a página anterior"
            title="Voltar para a página anterior"
          >
            <ChevronLeft className="w-5 h-5 text-primary dark:text-muted-foreground" />
          </button>

          <Link
            href="/"
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/40 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Ir para a página inicial"
            title="Página Inicial"
          >
            <Home className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Link>

          <div>
            <Link href="/" className="hover:opacity-85 transition-opacity block">
              <h1 className="text-base sm:text-lg font-heading font-black tracking-tight uppercase text-foreground flex items-center gap-2">
                <span>Meu Carrinho</span>
                {items.length > 0 && (
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-muted-foreground border border-primary/20">
                    {items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "item" : "itens"}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-muted-foreground">Pop Shake Sorveteria & Açaí</p>
            </Link>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Limpar sacola</span>
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
        {(checkoutErrorObj || checkoutError) && (
          <div ref={errorAlertRef} className="animate-in fade-in duration-300">
            <ResilientErrorAlert
              error={checkoutErrorObj || checkoutError}
              onRetry={handleFinishOrder}
              onReviewAddress={handleReviewAddress}
              onReviewIdentification={handleReviewIdentification}
              onDismiss={() => {
                setCheckoutError("");
                setCheckoutErrorObj(null);
              }}
              whatsappNumber={storeSettings?.whatsappNumber}
              cartSummary={cartSummary}
              isRetrying={submitting}
            />
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#230E26]/80 backdrop-blur-md border border-gray-200/80 dark:border-border/50 rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-xl shadow-primary/5 animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 via-accent/15 to-transparent blur-xl animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-primary/5 dark:bg-primary/95/60 border border-primary/20 dark:border-primary/80/60 flex items-center justify-center text-4xl sm:text-5xl shadow-inner">
                🥣
                <span className="absolute -top-1 -right-1 text-xl animate-bounce-subtle">✨</span>
                <span className="absolute -bottom-1 -left-1 text-base">🍧</span>
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
                Sua sacola está com saudade de um açaí!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nenhum item adicionado ainda. Que tal escolher seu açaí artesanal bem cremoso, sorvetes especiais ou montar uma taça personalizada agora mesmo?
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] hover:bg-right text-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-primary/25 active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                <span>Explorar Cardápio Pop Shake</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Atalhos rápidos de categorias populares */}
            <div className="pt-4 border-t border-gray-100 dark:border-border/30 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Sugestões rápidas:</span>
              <Link
                href="/?categoria=acai"
                className="text-xs px-3 py-1.5 rounded-xl bg-primary/5 dark:bg-primary/95/40 border border-primary/20/60 dark:border-primary/80/40 text-primary dark:text-muted-foreground font-medium hover:bg-primary/10 dark:hover:bg-primary/90/40 transition-colors"
              >
                🍧 Açaí no Copo
              </Link>
              <Link
                href="/?categoria=sorvete"
                className="text-xs px-3 py-1.5 rounded-xl bg-primary/5 dark:bg-primary/95/40 border border-primary/20/60 dark:border-primary/80/40 text-primary dark:text-muted-foreground font-medium hover:bg-primary/10 dark:hover:bg-primary/90/40 transition-colors"
              >
                🍦 Sorvetes Especiais
              </Link>
              <Link
                href="/?categoria=combos"
                className="text-xs px-3 py-1.5 rounded-xl bg-primary/5 dark:bg-primary/95/40 border border-primary/20/60 dark:border-primary/80/40 text-primary dark:text-muted-foreground font-medium hover:bg-primary/10 dark:hover:bg-primary/90/40 transition-colors"
              >
                🔥 Promoções & Combos
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
            {/* ── COLUNA ESQUERDA: Formulários e Itens ── */}
            <div className="flex-1 min-w-0 space-y-6">
            {/* 1. Identificação (Acesso Rápido) */}
            <section ref={identificationSectionRef} className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-border/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              {!user ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border/30">
                    <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span>1. Identificação (Acesso Rápido)</span>
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40">
                      Obrigatório
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Informe seu nome completo e WhatsApp para prosseguir com o pedido e contato de entrega.
                  </p>

                  {identificationSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{identificationSuccessMsg}</span>
                    </div>
                  )}

                  {inlineError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{inlineError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs uppercase text-muted-foreground">
                        Nome Completo *
                      </Label>
                      <Input
                        ref={nameInputRef}
                        value={inlineName}
                        onChange={(e) => {
                          setInlineName(e.target.value);
                          if (inlineError) setInlineError(null);
                        }}
                        placeholder="Ex: Maria Silva"
                        className="rounded-xl border border-input text-base md:text-sm h-11 px-3"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs uppercase text-muted-foreground">
                        Celular / WhatsApp *
                      </Label>
                      <Input
                        ref={phoneInputRef}
                        value={inlinePhone}
                        onChange={(e) => {
                          setInlinePhone(formatPhoneInput(e.target.value));
                          if (inlineError) setInlineError(null);
                        }}
                        placeholder="(65) 99999-9999"
                        className="rounded-xl border border-input text-base md:text-sm h-11 px-3 font-mono"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground block">
                        Inclua o DDD com 2 dígitos antes do número (ex: 65, 11).
                      </span>
                      <p className="text-[10px] text-muted-foreground/90 flex items-center gap-1 mt-1">
                        <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Seu WhatsApp é utilizado exclusivamente para confirmação e contato sobre a entrega deste pedido (Art. 9º da LGPD).</span>
                      </p>
                    </div>
                  </div>

                  {/* BLOCO DE RECONHECIMENTO DE CADASTRO PRÉVIO INLINE */}
                  {inlineRegisteredDetected && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          Identificamos que você já possui cadastro no PopClub!
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Olá, <strong>{inlineName || "Cliente"}</strong>! Digite sua senha para entrar preservando os itens do seu carrinho:
                        </p>
                        <form onSubmit={handleInlinePasswordSubmit} className="mt-2.5 flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type={inlineShowPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              value={inlinePassword}
                              onChange={(e) => {
                                setInlinePassword(e.target.value);
                                if (inlineError) setInlineError(null);
                              }}
                              className="pl-9 pr-9 text-xs h-10 rounded-xl bg-background"
                              disabled={inlinePasswordLoading}
                              autoFocus
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setInlineShowPassword(!inlineShowPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {inlineShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <Button
                            type="submit"
                            disabled={inlinePasswordLoading}
                            className="h-10 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-sm"
                          >
                            {inlinePasswordLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Entrar com Senha"
                            )}
                          </Button>
                        </form>
                        <div className="flex items-center justify-between text-[11px] pt-1.5 px-0.5">
                          <button
                            type="button"
                            onClick={() => setIsInlineRescueOpen(true)}
                            className="text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Esqueci minha senha
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsInlineBypass(true);
                              setInlineRegisteredDetected(false);
                            }}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Concluir pedido sem senha desta vez
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-border/30">
                    <Link
                      href="/login?tab=password&redirect=/carrinho"
                      className="text-xs text-primary dark:text-muted-foreground font-medium hover:underline flex items-center gap-1"
                    >
                      Já tem cadastro completo? <span className="font-bold underline">Entrar com senha</span>
                    </Link>

                    {!inlineRegisteredDetected && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmInlineIdentification}
                        disabled={inlineLoading}
                        className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white text-xs font-bold px-4 h-9 shadow-sm cursor-pointer"
                      >
                        {inlineLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Confirmar Identificação"
                        )}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-heading font-bold text-xs sm:text-sm text-foreground block">
                        ✓ Identificado como: {user.fullName || user.username || "Cliente"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {user.phone ? formatPhoneInput(user.phone) : (user.email || "WhatsApp cadastrado")}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signOut()}
                    className="rounded-xl text-xs font-bold h-8 px-3 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                  >
                    Alterar
                  </Button>
                </div>
              )}
            </section>

            {/* 2. Lista de Itens */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-border/40 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-border/30">
                <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span>Itens Selecionados</span>
                </h2>
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "item" : "itens"}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const lineTotal = item.price * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="bg-gray-50/70 dark:bg-background/80 border border-gray-200/70 dark:border-border/40 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all hover:border-primary/30 space-y-3"
                    >
                      {/* Top Row: Imagem + Título + Preço unitário + Botão Remover */}
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Miniatura do Produto */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/5 dark:bg-primary/95/60 border border-primary/10 dark:border-primary/90/30 overflow-hidden shrink-0 relative flex items-center justify-center shadow-xs">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-heading font-black text-xl gradient-text-brand">
                                {item.name[0]}
                              </span>
                            )}
                          </div>

                          {/* Nome e Tags */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="font-heading font-bold text-sm sm:text-base text-foreground leading-snug truncate">
                                {item.name}
                              </h4>
                              {item.promotionId && (
                                <span className="bg-gradient-to-r from-primary to-accent text-white text-[9px] font-heading font-bold uppercase px-2 py-0.5 rounded-full shadow-xs shrink-0">
                                  PROMO
                                </span>
                              )}
                            </div>

                            {/* Preço unitário */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                Unitário: {formatCurrency(item.price)}
                              </span>
                              {parseSafeNumber(item.originalPrice) > parseSafeNumber(item.price) && (
                                <span className="font-mono text-[11px] text-muted-foreground line-through">
                                  {formatCurrency(item.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botão de Remover Item */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                          title="Remover item da sacola"
                          aria-label={`Remover ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Middle Row: Adicionais, Caldas e Observações */}
                      {((item.selectedOptions && item.selectedOptions.length > 0) || item.notes) && (
                        <div className="pt-2 border-t border-gray-200/60 dark:border-border/30 space-y-2">
                          {item.selectedOptions && item.selectedOptions.length > 0 && (() => {
                            const { sections } = AddonOrganizationService.organizeOrderAddons(item.selectedOptions);
                            return (
                              <div className="space-y-1.5">
                                {sections.map((section, sIdx) => (
                                  <div key={`${section.groupName}-${sIdx}`} className="space-y-1">
                                    {sections.length > 1 && (
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block">
                                        {section.groupName}
                                      </span>
                                    )}
                                    <div className="flex flex-wrap gap-1.5">
                                      {section.items.map((opt, idx) => {
                                        const optQty = opt.quantity || 1;
                                        const optPrice = parseSafeNumber(opt.price);
                                        return (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-primary/5/80 dark:bg-primary/95/50 border border-primary/20/50 dark:border-primary/90/40 text-primary dark:text-muted-foreground font-medium"
                                          >
                                            <span>
                                              {optQty > 1 ? `${optQty}x ` : ""}
                                              {opt.name}
                                            </span>
                                            {optPrice > 0 && (
                                              <strong className="font-mono font-bold text-[10px]">
                                                (+{formatCurrency(optPrice * optQty)})
                                              </strong>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {item.notes && (
                            <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl px-3 py-1.5 flex items-start gap-1.5">
                              <span className="font-semibold">Obs:</span>
                              <span className="italic">&ldquo;{item.notes}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Row: Stepper Touch-Friendly de Quantidade e Total da Linha */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-border/30">
                        {/* Stepper com alta ergonomia para mobile */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#230E26] border border-gray-300 dark:border-border/60 rounded-xl p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                            title="Diminuir quantidade"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 font-mono font-black text-sm text-foreground min-w-[28px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer"
                            title="Aumentar quantidade"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal da Linha em Destaque */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Subtotal
                          </span>
                          <span className="font-mono font-black text-base sm:text-lg text-primary dark:text-muted-foreground">
                            R$ {lineTotal.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Cupom de Desconto */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-border/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <span>Cupom de Desconto</span>
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-heading font-bold text-xs uppercase text-emerald-700 dark:text-emerald-300 block">
                        Cupom {appliedCoupon.code} aplicado!
                      </span>
                      <p className="text-xs text-muted-foreground font-mono">
                        Desconto: - R$ {appliedCoupon.discountAmount.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:underline px-2 py-1 cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Ex: BEMVINDO10"
                    className="rounded-xl border-gray-300 dark:border-border/60 bg-white dark:bg-background font-mono text-base md:text-sm uppercase flex-1 h-11 px-3.5"
                  />
                  <Button
                    type="submit"
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider font-bold px-6 h-11 shadow-sm shadow-primary/20 cursor-pointer"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </form>
              )}

              {couponGatedMessage && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="font-medium">{couponGatedMessage}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCompleteRegModalOpen(true)}
                    className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs h-8 px-3 cursor-pointer"
                  >
                    Completar cadastro e aplicar
                  </Button>
                </div>
              )}

              {couponError && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 transition-all ${
                    couponError.toLowerCase().includes("respire fundo") ||
                    couponError.toLowerCase().includes("aguarde")
                      ? "bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200"
                      : "text-destructive font-mono"
                  }`}
                >
                  {(couponError.toLowerCase().includes("respire fundo") ||
                    couponError.toLowerCase().includes("aguarde")) && (
                    <Clock className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400 animate-pulse" />
                  )}
                  <span className="leading-relaxed">{couponError}</span>
                </div>
              )}
            </section>

            {/* 3. Modalidade de Atendimento & Endereço */}
            <section ref={addressSectionRef} className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-border/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-border/30">
                <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                    {deliveryMode === "delivery" ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                  </div>
                  <span>3. Como deseja receber seu pedido?</span>
                </h3>

                {deliveryMode === "delivery" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botão de Trocar / Gerenciar Endereços */}
                    <button
                      type="button"
                      onClick={openAddressModal}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-primary dark:text-muted-foreground bg-primary/5 dark:bg-primary/95/40 border border-primary/20 dark:border-primary/80 hover:bg-primary/10 dark:hover:bg-primary/90/40 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Selecionar / Alterar</span>
                    </button>

                    {/* Botão de Ação Rápida: Usar Minha Localização Atual com Mapa Interativo */}
                    <button
                      type="button"
                      onClick={handleOpenGpsMap}
                      disabled={isLocating}
                      className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-primary to-accent hover:opacity-95 px-3.5 py-2 rounded-xl shadow-xs shadow-primary/20 transition-all cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Buscando GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 text-white" />
                          <span>📍 GPS Atual</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Seletor de Modalidade: Entrega em Domicílio vs Retirada no Balcão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção A: Entrega em Domicílio */}
                <button
                  type="button"
                  onClick={() => setDeliveryMode("delivery")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    deliveryMode === "delivery"
                      ? deliveryQuote && !deliveryQuote.isDeliverable
                        ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/30 ring-1 ring-amber-500/40"
                        : "border-primary bg-primary/5 dark:bg-primary/20 shadow-sm ring-1 ring-primary/30"
                      : "border-gray-200 dark:border-border/40 hover:border-gray-300 dark:hover:border-border/80 bg-white dark:bg-background/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    {deliveryQuote && !deliveryQuote.isDeliverable ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white font-mono uppercase tracking-wider animate-pulse">
                        Fora da Área
                      </span>
                    ) : deliveryMode === "delivery" ? (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <span className="font-heading font-bold text-sm text-foreground block">
                      Entrega em Domicílio
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      Receba no conforto da sua casa
                    </span>
                  </div>
                </button>

                {/* Opção B: Retirada no Balcão */}
                <button
                  type="button"
                  onClick={() => setDeliveryMode("retirada")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    deliveryMode === "retirada"
                      ? "border-primary bg-primary/5 dark:bg-primary/20 shadow-sm ring-1 ring-primary/30"
                      : "border-gray-200 dark:border-border/40 hover:border-gray-300 dark:hover:border-border/80 bg-white dark:bg-background/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 uppercase tracking-wider">
                      Frete Grátis 🎉
                    </span>
                  </div>
                  <div>
                    <span className="font-heading font-bold text-sm text-foreground block">
                      Retirada no Balcão
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">
                      Retire na nossa sede (R$ 0,00)
                    </span>
                  </div>
                </button>
              </div>

              {/* CARD DE AVISO ACOLHEDOR: FORA DO RAIO DE ATENDIMENTO */}
              {deliveryMode === "delivery" && deliveryQuote && !deliveryQuote.isDeliverable && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3.5 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide text-amber-900 dark:text-amber-200 flex items-center gap-2">
                        <span>📍 Endereço fora do raio de entrega</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          Raio Máximo: {deliveryQuote.maxRadiusKm} km
                        </span>
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Identificamos que seu endereço fica a <strong className="text-amber-700 dark:text-amber-300 font-mono font-bold">{deliveryQuote.distanceKm.toFixed(1)} km</strong> da nossa sede, e nosso raio máximo atual é de <strong className="text-amber-700 dark:text-amber-300 font-mono font-bold">{deliveryQuote.maxRadiusKm} km</strong>. Infelizmente não conseguimos entregar aí no momento.
                      </p>
                    </div>
                  </div>

                  {/* Resgate Automático para Retirada no Balcão */}
                  <button
                    type="button"
                    onClick={() => setDeliveryMode("retirada")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    <Store className="w-4 h-4" />
                    <span>Prefere retirar no balcão? Clique aqui para continuar seu pedido</span>
                  </button>
                </div>
              )}

              {/* CARD DE DETALHES DE RETIRADA */}
              {deliveryMode === "retirada" && (
                <div className="p-4 rounded-2xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/30 text-purple-900 dark:text-purple-200 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide text-foreground">
                        Retirada Presencial na Loja
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Seu pedido será embalado e ficará pronto na bancada para retirada imediata sem cobrança de frete.
                      </p>
                      <div className="mt-2 text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>{storeSettings?.storeAddress || "Av. Filinto Müller, 850 - Centro Sul, Várzea Grande - MT"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULÁRIO DE ENDEREÇO DE ENTREGA */}
              {deliveryMode === "delivery" && (
                <div className="space-y-4 pt-1">

              {/* Se houver endereços salvos via AddressContext */}
              {addresses.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs uppercase text-muted-foreground">
                      Endereço ativo selecionado:
                    </Label>
                    <button
                      type="button"
                      onClick={openAddressModal}
                      className="text-xs font-bold text-primary dark:text-muted-foreground hover:underline"
                    >
                      Ver todos ({addresses.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {addresses.map((addr) => {
                      const isSelected = addr.id === activeAddressId;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setActiveAddressId(addr.id)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                              : "border-border/60 hover:border-primary/40 bg-card"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-foreground truncate">
                              {addr.label ? `${addr.label} • ` : ""}{addr.street}, {addr.number}
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {addr.neighborhood}, {addr.city}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                              Ativo
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feedback Visual e Inteligente de Precisão (UX) */}
              {isLocating && (
                <div className="flex items-center gap-2.5 p-3 bg-primary/5 dark:bg-primary/95/40 border border-primary/20 dark:border-primary/80/40 rounded-xl text-xs font-medium text-primary dark:text-muted-foreground animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Obtendo coordenadas do dispositivo e consultando dados da rua via satélite...</span>
                </div>
              )}

              {/* Se a precisão for boa (<= 30 metros) */}
              {gpsAccuracy !== null && !accuracyWarning && !isLocating && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-150">
                  <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>🎯 Localização precisa (~{gpsAccuracy} metros). Endereço preenchido com sucesso!</span>
                </div>
              )}

              {/* Se a precisão for baixa/ruim (> 50 metros) */}
              {accuracyWarning && !isLocating && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/50 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <span>⚠️ {accuracyWarning}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleRetryLocation}
                      className="px-3.5 py-1.5 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Aguardar sinal melhor
                    </button>
                    <button
                      type="button"
                      onClick={handleUsePendingLocation}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Usar mesmo assim
                    </button>
                  </div>
                </div>
              )}

              {/* Toast / Notificação de Erro amigável */}
              {geoToast && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{geoToast}</span>
                </div>
              )}

              {/* Se o usuário tiver endereços salvos */}
              {savedLocations.length > 0 && (
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Ou selecione um endereço salvo:
                  </Label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => {
                      setSelectedLocationId(e.target.value);
                      const found = savedLocations.find((l) => l.id === e.target.value);
                      if (found) {
                        if (found.street) setStreet(found.street);
                        else if (found.address_line) setStreet(found.address_line);
                        if (found.number) setNumber(found.number);
                        if (found.neighborhood) setNeighborhood(found.neighborhood);
                        if (found.city) setCity(found.city);
                        if (found.complement) setComplement(found.complement);
                        if (found.reference) setReference(found.reference);
                        if (found.zip) setZip(found.zip);
                        if (found.latitude) setLatitude(found.latitude);
                        if (found.longitude) setLongitude(found.longitude);
                      }
                    }}
                    className="w-full bg-background border-2 border-border rounded-xl p-2.5 font-sans text-xs"
                  >
                    {savedLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name ? `${l.name} - ` : ""}{l.street ? `${l.street}, ${l.number} - ${l.neighborhood}` : l.address_line}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Logradouro / Rua *
                  </Label>
                  <Input
                    value={street}
                    onChange={(e) => handleStreetChange(e.target.value)}
                    placeholder="Ex: Av. Beira Mar"
                    className="rounded-xl border border-input text-base md:text-sm h-11 px-3"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Número *
                  </Label>
                  <Input
                    ref={numberInputRef}
                    value={number}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    placeholder="Ex: 1420"
                    className="rounded-xl border border-input text-base md:text-sm h-11 px-3 focus-visible:ring-2 focus-visible:ring-primary/30"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Bairro *
                  </Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    placeholder="Ex: Centro"
                    className="rounded-xl border border-input text-base md:text-sm h-11 px-3"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Cidade / UF
                  </Label>
                  <Input
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    placeholder="Ex: Cidade"
                    className="rounded-xl border border-input text-base md:text-sm h-11 px-3"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    CEP
                  </Label>
                  <Input
                    value={zip}
                    onChange={(e) => handleZipChange(e.target.value)}
                    placeholder="00000-000"
                    className="rounded-xl border border-input text-base md:text-sm font-mono h-11 px-3"
                  />
                </div>
              </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs uppercase text-muted-foreground">
                        Complemento (Apto, Bloco...)
                      </Label>
                      <Input
                        value={complement}
                        onChange={(e) => handleComplementChange(e.target.value)}
                        placeholder="Ex: Apto 302 Bloco B"
                        className="rounded-xl border border-input text-base md:text-sm h-11 px-3"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs uppercase text-muted-foreground">
                        Ponto de Referência
                      </Label>
                      <Input
                        value={reference}
                        onChange={(e) => handleReferenceChange(e.target.value)}
                        placeholder="Ex: Próximo à praça central"
                        className="rounded-xl border border-input text-base md:text-sm h-11 px-3"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 4. Forma de Pagamento */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-border/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>4. Forma de Pagamento ({deliveryMode === "retirada" ? "no Balcão" : "na Entrega"})</span>
              </h3>

              {/* CRITICAL: AVISO VISUAL DESTACADO DE PAGAMENTO */}
              <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Pagamento no Momento da {deliveryMode === "retirada" ? "Retirada no Balcão" : "Entrega"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Nenhum valor é cobrado online agora. O pagamento é realizado diretamente {deliveryMode === "retirada" ? "no balcão da loja" : "ao entregador"} na chegada do seu pedido via Pix, Cartão ou Dinheiro.
                  </p>
                </div>
              </div>

              {/* Seleção do Método */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Pix na Entrega */}
                <button
                  type="button"
                  onClick={() => setPaymentType("pix_entrega")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentType === "pix_entrega"
                      ? "border-primary bg-primary/5/70 dark:bg-primary/20 shadow-sm ring-1 ring-primary/30"
                      : "border-gray-200 dark:border-border/40 hover:border-gray-300 dark:hover:border-border/80 bg-white dark:bg-background/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    {paymentType === "pix_entrega" && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-heading font-bold text-xs sm:text-sm text-foreground block">
                      Pix na Entrega
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">
                      QR Code gerado na hora
                    </span>
                  </div>
                </button>

                {/* Cartão Maquininha */}
                <button
                  type="button"
                  onClick={() => setPaymentType("cartao_maquininha")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentType === "cartao_maquininha"
                      ? "border-primary bg-primary/5/70 dark:bg-primary/20 shadow-sm ring-1 ring-primary/30"
                      : "border-gray-200 dark:border-border/40 hover:border-gray-300 dark:hover:border-border/80 bg-white dark:bg-background/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/95/60 text-primary dark:text-muted-foreground flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    {paymentType === "cartao_maquininha" && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-heading font-bold text-xs sm:text-sm text-foreground block">
                      Cartão (Maquininha)
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">
                      Débito ou crédito
                    </span>
                  </div>
                </button>

                {/* Dinheiro */}
                <button
                  type="button"
                  onClick={() => setPaymentType("dinheiro")}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    paymentType === "dinheiro"
                      ? "border-primary bg-primary/5/70 dark:bg-primary/20 shadow-sm ring-1 ring-primary/30"
                      : "border-gray-200 dark:border-border/40 hover:border-gray-300 dark:hover:border-border/80 bg-white dark:bg-background/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    {paymentType === "dinheiro" && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-heading font-bold text-xs sm:text-sm text-foreground block">
                      Dinheiro em Espécie
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 block">
                      Pague com cédulas
                    </span>
                  </div>
                </button>
              </div>

              {/* Campo de Troco se Dinheiro */}
              {paymentType === "dinheiro" && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 mt-3 space-y-2 animate-in fade-in-50 duration-200">
                  <Label htmlFor="input-change-for" className="font-heading text-xs uppercase font-bold text-foreground">
                    Precisa de troco para quanto? (Opcional)
                  </Label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                      <Input
                        id="input-change-for"
                        type="number"
                        step="0.01"
                        placeholder={`Ex: ${(Math.ceil(finalTotal / 10) * 10 + 10).toFixed(2)}`}
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value)}
                        className="pl-9 rounded-xl border-gray-300 dark:border-border/60 bg-white dark:bg-background text-sm font-mono h-10"
                      />
                    </div>
                    {changeFor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setChangeFor("")}
                        className="text-xs text-muted-foreground hover:text-foreground h-9 px-2"
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── COLUNA DIREITA: Resumo e Ação Desktop ── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-24 space-y-6">
            {/* 5. Resumo de Valores e Envio */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-border/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>Resumo do Pedido</span>
              </h3>

              <div className="space-y-2.5 font-mono text-xs border-b border-gray-100 dark:border-border/30 pb-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal dos Itens:</span>
                  <span className="font-bold text-foreground">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Desconto das Promoções:</span>
                    <span>- R$ {promoDiscount.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Desconto do Cupom ({appliedCoupon?.code}):</span>
                    <span>- R$ {couponDiscount.toFixed(2).replace(".", ",")}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-muted-foreground pt-1">
                  <span>{deliveryMode === "retirada" ? "Taxa de Retirada:" : "Taxa de Entrega:"}</span>
                  {deliveryMode === "retirada" ? (
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/50 uppercase tracking-wider">
                      Grátis (Balcão)
                    </span>
                  ) : isFreeDelivery ? (
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 uppercase tracking-wider">
                      Grátis
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-foreground">
                      R$ {deliveryFee.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>

                {deliveryMode === "delivery" && amountToFreeShipping > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-primary/5 dark:bg-primary/95/30 border border-primary/20/60 dark:border-primary/90/40 text-[11px] text-primary dark:text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Adicione mais <strong>R$ {amountToFreeShipping.toFixed(2).replace(".", ",")}</strong> para ganhar <strong>Entrega Grátis</strong>!
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">
                  Total a Pagar {deliveryMode === "retirada" ? "no Balcão" : "na Entrega"}:
                </span>
                <span className="font-heading text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </section>

            {/* Card de Ação Desktop */}
            <div className="hidden lg:block bg-card/90 backdrop-blur-md border border-border/40 rounded-3xl p-5 shadow-lg space-y-3">
              {!storeStatus.canAcceptOrders && (
                <div
                  className={`border rounded-2xl p-3 text-xs flex items-center gap-2 ${
                    storeStatus.status === "CONVEYOR_PAUSED"
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200"
                      : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    {storeStatus.status === "CONVEYOR_PAUSED"
                      ? `Finalizando preparativos da cozinha. Atendimento hoje das ${storeStatus.openingTime} às ${storeStatus.closingTime}.`
                      : `Estamos fechados no momento. Atendimento hoje das ${storeStatus.openingTime} às ${storeStatus.closingTime}.`}
                  </span>
                </div>
              )}
              {deliveryMode === "delivery" && deliveryQuote && !deliveryQuote.isDeliverable && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Endereço fora do raio de entrega. Alterne para retirada no balcão para continuar.</span>
                </div>
              )}
              <Button
                type="button"
                onClick={handleInitiateOrderConfirmation}
                disabled={submitting || !storeStatus.canAcceptOrders || (deliveryMode === "delivery" && deliveryQuote !== null && !deliveryQuote.isDeliverable)}
                className={`w-full h-14 rounded-2xl font-heading text-sm uppercase tracking-wider font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all ${
                  !storeStatus.canAcceptOrders || (deliveryMode === "delivery" && deliveryQuote !== null && !deliveryQuote.isDeliverable)
                    ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-white dark:bg-gray-700"
                    : "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] hover:bg-right text-white shadow-primary/25 border border-white/20"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando Pedido...
                  </>
                ) : !storeStatus.canAcceptOrders ? (
                  storeStatus.status === "CONVEYOR_PAUSED" ? (
                    <>Cozinha em Preparo (Aguarde)</>
                  ) : (
                    <>Loja Fechada no Momento</>
                  )
                ) : deliveryMode === "delivery" && deliveryQuote && !deliveryQuote.isDeliverable ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-300" />
                    Fora da Área de Entrega
                  </>
                ) : deliveryMode === "retirada" ? (
                  <>
                    Revisar Pedido (Retirada no Balcão)
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Revisar e Confirmar Pedido
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Ambiente seguro &bull; Pagamento no ato da {deliveryMode === "retirada" ? "retirada" : "entrega"}
              </p>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Barra de Ação Fixa Inferior (Mobile e Telas Pequenas) */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-background/95 backdrop-blur-md border-t border-border/40 p-4 z-40 shadow-2xl pb-safe">
          <div className="max-w-4xl mx-auto space-y-2">
            {!storeStatus.canAcceptOrders && (
              <div
                className={`border rounded-2xl p-3 text-xs flex items-center gap-2 ${
                  storeStatus.status === "CONVEYOR_PAUSED"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200"
                    : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  {storeStatus.status === "CONVEYOR_PAUSED"
                    ? `Finalizando preparativos da cozinha. Atendimento hoje das ${storeStatus.openingTime} às ${storeStatus.closingTime}.`
                    : `Estamos fechados no momento. Atendimento hoje das ${storeStatus.openingTime} às ${storeStatus.closingTime}. Você já pode montar sua sacola!`}
                </span>
              </div>
            )}
            {deliveryMode === "delivery" && deliveryQuote && !deliveryQuote.isDeliverable && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Fora da área de entrega. Alterne para retirada no balcão.</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                  Total (Pague {deliveryMode === "retirada" ? "no Balcão" : "na Entrega"})
                </span>
                <span className="font-heading text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <Button
                type="button"
                onClick={handleInitiateOrderConfirmation}
                disabled={submitting || !storeStatus.canAcceptOrders || (deliveryMode === "delivery" && deliveryQuote !== null && !deliveryQuote.isDeliverable)}
                className={`h-12 px-5 sm:px-8 rounded-2xl font-heading text-sm uppercase tracking-wider font-black shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all ${
                  !storeStatus.canAcceptOrders || (deliveryMode === "delivery" && deliveryQuote !== null && !deliveryQuote.isDeliverable)
                    ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-white dark:bg-gray-700"
                    : "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] hover:bg-right text-white shadow-primary/25 border border-white/20"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : !storeStatus.canAcceptOrders ? (
                  storeStatus.status === "CONVEYOR_PAUSED" ? (
                    <>Cozinha em Preparo</>
                  ) : (
                    <>Loja Fechada</>
                  )
                ) : deliveryMode === "delivery" && deliveryQuote && !deliveryQuote.isDeliverable ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    Fora do Raio
                  </>
                ) : deliveryMode === "retirada" ? (
                  <>
                    Retirar no Balcão
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Revisar Pedido
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE REVISÃO DO PEDIDO ===== */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-card border-2 border-border rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">Confirme antes de enviar</span>
                <h2 className="font-heading text-xl font-black uppercase tracking-tight">Revisão do Pedido</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-9 h-9 rounded-xl bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            </div>

            {/* Itens */}
            <div className="space-y-2 border border-border rounded-xl p-4">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Itens do Pedido</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm gap-2">
                  <span className="font-semibold text-foreground">
                    <span className="text-primary font-black">{item.quantity}x</span> {item.name}
                  </span>
                  <span className="font-mono text-muted-foreground shrink-0">
                    R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>

            {/* Endereço ou Retirada */}
            <div className="border border-border rounded-xl p-4 space-y-0.5">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {deliveryMode === "retirada" ? "Modalidade do Pedido" : "Endereço de Entrega"}
              </p>
              {deliveryMode === "retirada" ? (
                <>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Retirada no Balcão da Loja
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Av. Filinto Müller, 1259 - Centro, Várzea Grande - MT
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">{street}, {number}{complement ? `, ${complement}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{neighborhood} &bull; {city}{reference ? ` — Ref: ${reference}` : ""}</p>
                </>
              )}
            </div>

            {/* Pagamento */}
            <div className="border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Forma de Pagamento</p>
                <p className="text-sm font-bold text-foreground">
                  {paymentType === "dinheiro" ? "Dinheiro" : paymentType === "cartao_maquininha" ? "Cartão (Maquininha)" : "Pix"}
                  {paymentType === "dinheiro" && changeFor ? ` — Troco para R$ ${parseFloat(changeFor).toFixed(2).replace(".", ",")}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                {deliveryMode === "retirada" ? "No Balcão" : "Na Entrega"}
              </span>
            </div>

            {/* Resumo Financeiro */}
            <div className="space-y-2.5 font-mono text-xs border-t border-border pt-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal dos Itens:</span>
                <span className="font-bold text-foreground">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Desconto Promoções:</span>
                  <span>- R$ {promoDiscount.toFixed(2).replace(".", ",")}</span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Cupom ({appliedCoupon?.code}):</span>
                  <span>- R$ {couponDiscount.toFixed(2).replace(".", ",")}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-muted-foreground">
                <span>{deliveryMode === "retirada" ? "Taxa de Retirada:" : "Taxa de Entrega:"}</span>
                {deliveryMode === "retirada" ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/50 uppercase tracking-wider">
                    Grátis (Balcão)
                  </span>
                ) : isFreeDelivery ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 uppercase tracking-wider">
                    Grátis
                  </span>
                ) : (
                  <span className="font-mono font-bold text-foreground">
                    R$ {deliveryFee.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
            </div>

            {/* Total Final */}
            <div className="flex justify-between items-baseline border-t border-border pt-3">
              <span className="font-mono text-sm uppercase tracking-wider font-bold text-foreground">Total a Pagar:</span>
              <span className="font-heading text-3xl font-black text-primary dark:text-violet-400">
                R$ {finalTotal.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 h-12 border-2 border-border font-mono text-xs uppercase tracking-widest font-bold hover:bg-muted text-foreground transition-colors cursor-pointer rounded-xl"
              >
                Editar Pedido
              </button>
              <Button
                onClick={async () => {
                  if (submitting) return;
                  setShowReviewModal(false);
                  await handleFinishOrder();
                }}
                disabled={submitting}
                className="flex-1 h-12 rounded-xl font-heading text-sm uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                ) : (
                  <>Confirmar Pedido <CheckCircle2 className="w-5 h-5" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <FastAccessModal
        isOpen={isFastAccessModalOpen}
        onClose={() => setIsFastAccessModalOpen(false)}
        onSuccess={handleFastAccessSuccess}
        onRequestNewAddress={openAddressModal}
        initialName={inlineName}
        initialPhone={inlinePhone}
      />

      <GpsInteractiveMapModal
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
        onConfirmLocation={handleGpsLocationConfirmed}
        initialCoords={latitude && longitude ? { lat: latitude, lng: longitude } : null}
        defaultStoreCoords={
          storeSettings?.storeLatitude && storeSettings?.storeLongitude
            ? { lat: storeSettings.storeLatitude, lng: storeSettings.storeLongitude }
            : undefined
        }
      />

      <CompleteRegistrationModal
        isOpen={isCompleteRegModalOpen}
        onClose={() => setIsCompleteRegModalOpen(false)}
        onSuccess={handleCompleteRegistrationSuccess}
      />

      <PasswordRecoveryRescueModal
        isOpen={isInlineRescueOpen}
        onClose={() => setIsInlineRescueOpen(false)}
        clientName={inlineName}
        clientPhone={inlinePhone}
        onContinueWithoutPassword={() => {
          setIsInlineBypass(true);
          setInlineRegisteredDetected(false);
          setIsInlineRescueOpen(false);
        }}
      />
    </div>
  );
}
