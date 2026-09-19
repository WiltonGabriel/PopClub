"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
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
} from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import { couponService, ValidatedCoupon } from "../../services/couponService";
import { orderService } from "../../services/orderService";
import { userService, UserLocation } from "../../services/userService";
import { storeSettingsService, StoreSettings } from "../../services/storeSettingsService";
import { useAddress } from "@/contexts/AddressContext";
import { useOrders } from "@/contexts/OrderContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { playDingSound, initAudioUnlock } from "../../lib/sound";
import { NotificationPermissionBanner } from "../../components/storefront/NotificationPermissionBanner";

export default function CarrinhoPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  // Configuração de entrega da loja
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

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
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Carrega configurações da loja e inicializa desbloqueio de áudio
  useEffect(() => {
    initAudioUnlock();
    storeSettingsService.getSettings().then(setStoreSettings).catch(console.error);
  }, []);

  // Carrega endereços salvos e preferências de pagamento se estiver logado
  useEffect(() => {
    if (user?.id) {
      // Pré-seleciona forma de pagamento e troco preferencial do cliente
      const prefPayment = user.defaultPaymentMethod || user.default_payment_method || (user.accessibilitySettings as any)?.defaultPaymentMethod;
      if (prefPayment && (prefPayment === "pix_entrega" || prefPayment === "cartao_maquininha" || prefPayment === "dinheiro")) {
        setPaymentType(prefPayment);
      }
      const prefChange = user.defaultChangeFor !== undefined && user.defaultChangeFor !== null
        ? user.defaultChangeFor
        : (user.default_change_for !== undefined && user.default_change_for !== null
            ? user.default_change_for
            : (user.accessibilitySettings as any)?.defaultChangeFor);
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

    setValidatingCoupon(true);
    setCouponError("");

    try {
      const cartProductIds = items.map((it) => it.productId);
      const res = await couponService.validateCoupon(couponInput.trim(), itemsTotal, cartProductIds);
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponInput("");
      } else {
        setCouponError(res.message || "Cupom inválido.");
      }
    } catch {
      setCouponError("Erro ao validar cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // Cálculos de Entrega & Totais
  const isFreeDelivery = useMemo(() => {
    if (!storeSettings) return false;
    if (storeSettings.freeDeliveryThreshold !== null && storeSettings.freeDeliveryThreshold !== undefined) {
      return itemsTotal >= storeSettings.freeDeliveryThreshold;
    }
    return storeSettings.deliveryFee === 0;
  }, [storeSettings, itemsTotal]);

  const deliveryFee = useMemo(() => {
    if (!storeSettings) return 5.0;
    if (isFreeDelivery) return 0;
    return storeSettings.deliveryFee;
  }, [storeSettings, isFreeDelivery]);

  const amountToFreeShipping = useMemo(() => {
    if (!storeSettings || storeSettings.freeDeliveryThreshold === null || isFreeDelivery) return 0;
    return Math.max(0, Number((storeSettings.freeDeliveryThreshold - itemsTotal).toFixed(2)));
  }, [storeSettings, itemsTotal, isFreeDelivery]);

  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const totalDiscount = Number((promoDiscount + couponDiscount).toFixed(2));
  const finalTotal = Math.max(0, Number((itemsTotal - couponDiscount + deliveryFee).toFixed(2)));

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
    } catch (err: any) {
      setGeoToast(err.message || "Erro ao consultar endereço. Digite manualmente.");
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
    setCheckoutError("");

    if (storeSettings && !storeSettings.isOpen) {
      setCheckoutError("A loja está fechada no momento e não está aceitando novos pedidos. Nosso atendimento abrirá em breve!");
      return;
    }

    if (items.length === 0) {
      setCheckoutError("Adicione itens ao carrinho antes de continuar.");
      return;
    }

    if (!street.trim() || !number.trim() || !neighborhood.trim()) {
      setCheckoutError("Preencha todos os campos obrigatórios de endereço (Rua, Número e Bairro).");
      return;
    }

    if (paymentType === "dinheiro" && changeFor) {
      const changeNum = parseFloat(changeFor);
      if (isNaN(changeNum) || changeNum < finalTotal) {
        setCheckoutError(`O valor para troco deve ser maior ou igual ao total do pedido (R$ ${finalTotal.toFixed(2).replace(".", ",")}).`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          promotionId: i.promotionId || null,
        })),
        deliveryAddress: {
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim() || "Local",
          complement: complement.trim() || null,
          reference: reference.trim() || null,
          zip: zip.trim() || null,
          latitude: latitude || null,
          longitude: longitude || null,
        },
        paymentMethod: {
          type: paymentType,
          changeFor: paymentType === "dinheiro" && changeFor ? parseFloat(changeFor) : null,
        },
        couponCode: appliedCoupon?.code || null,
      };

      const result = await orderService.createCheckoutOrder(payload);
      playDingSound();
      if (!user && result.order?.id) {
        trackGuestOrder(result.order.id);
      }
      setOrderSuccessId(result.order.id);
      clearCart();
    } catch (err: any) {
      setCheckoutError(err.message || "Erro ao processar pedido no servidor.");
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
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans">
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

        <div className="flex gap-4">
          <Link
            href="/pedidos"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2"
          >
            Acompanhar Meus Pedidos <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="border-2 border-border hover:bg-muted px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold"
          >
            Voltar ao Cardápio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/90 border-b border-border/40 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/40 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Voltar para o cardápio"
          >
            <ChevronLeft className="w-5 h-5 text-[#9306CF] dark:text-[#C7A9C9]" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-heading font-black tracking-tight uppercase text-foreground flex items-center gap-2">
              <span>Meu Carrinho</span>
              {items.length > 0 && (
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] border border-[#9306CF]/20">
                  {items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "item" : "itens"}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-muted-foreground">Pop Shake Sorveteria & Açaí</p>
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

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-8">
        {checkoutError && (
          <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive font-mono text-xs rounded-r-xl">
            {checkoutError}
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#230E26]/80 backdrop-blur-md border border-gray-200/80 dark:border-[#512B54]/50 rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-xl shadow-[#9306CF]/5 animate-in fade-in duration-300">
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#9306CF]/20 via-[#940068]/15 to-transparent blur-xl animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center text-4xl sm:text-5xl shadow-inner">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#9306CF] via-[#940068] to-[#9306CF] bg-[length:200%_auto] hover:bg-right text-white font-heading font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-[#9306CF]/25 active:scale-95 transition-all cursor-pointer border border-white/20"
              >
                <span>Explorar Cardápio Pop Shake</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Atalhos rápidos de categorias populares */}
            <div className="pt-4 border-t border-gray-100 dark:border-[#512B54]/30 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Sugestões rápidas:</span>
              <Link
                href="/?categoria=acai"
                className="text-xs px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-[#9306CF] dark:text-[#C7A9C9] font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                🍧 Açaí no Copo
              </Link>
              <Link
                href="/?categoria=sorvete"
                className="text-xs px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-[#9306CF] dark:text-[#C7A9C9] font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                🍦 Sorvetes Especiais
              </Link>
              <Link
                href="/?categoria=combos"
                className="text-xs px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-[#9306CF] dark:text-[#C7A9C9] font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
              >
                🔥 Promoções & Combos
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Lista de Itens */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-[#512B54]/40 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#512B54]/30">
                <h2 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-xl bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
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
                      className="bg-gray-50/70 dark:bg-[#190B1A]/80 border border-gray-200/70 dark:border-[#512B54]/40 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all hover:border-[#9306CF]/30 space-y-3"
                    >
                      {/* Top Row: Imagem + Título + Preço unitário + Botão Remover */}
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Miniatura do Produto */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/30 overflow-hidden shrink-0 relative flex items-center justify-center shadow-xs">
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
                                <span className="bg-gradient-to-r from-[#9306CF] to-[#940068] text-white text-[9px] font-heading font-bold uppercase px-2 py-0.5 rounded-full shadow-xs shrink-0">
                                  PROMO
                                </span>
                              )}
                            </div>

                            {/* Preço unitário */}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-xs font-semibold text-muted-foreground">
                                Unitário: R$ {item.price.toFixed(2).replace(".", ",")}
                              </span>
                              {item.originalPrice > item.price && (
                                <span className="font-mono text-[11px] text-muted-foreground line-through">
                                  R$ {item.originalPrice.toFixed(2).replace(".", ",")}
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
                        <div className="pt-2 border-t border-gray-200/60 dark:border-[#512B54]/30 space-y-2">
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {item.selectedOptions.map((opt, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-900/40 text-[#9306CF] dark:text-[#C7A9C9] font-medium"
                                >
                                  <span>{opt.name}</span>
                                  {opt.price > 0 && (
                                    <strong className="font-mono font-bold text-[10px]">
                                      (+R$ {opt.price.toFixed(2).replace(".", ",")})
                                    </strong>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl px-3 py-1.5 flex items-start gap-1.5">
                              <span className="font-semibold">Obs:</span>
                              <span className="italic">&ldquo;{item.notes}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Row: Stepper Touch-Friendly de Quantidade e Total da Linha */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-[#512B54]/30">
                        {/* Stepper com alta ergonomia para mobile */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#230E26] border border-gray-300 dark:border-[#512B54]/60 rounded-xl p-1 shadow-xs">
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
                          <span className="font-mono font-black text-base sm:text-lg text-[#9306CF] dark:text-[#C7A9C9]">
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
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-[#512B54]/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
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
                    className="rounded-xl border-gray-300 dark:border-[#512B54]/60 bg-white dark:bg-[#190B1A] font-mono text-base md:text-sm uppercase flex-1 h-11 px-3.5"
                  />
                  <Button
                    type="submit"
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs uppercase tracking-wider font-bold px-6 h-11 shadow-sm shadow-[#9306CF]/20 cursor-pointer"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </form>
              )}

              {couponError && (
                <p className="text-destructive font-mono text-xs">{couponError}</p>
              )}
            </section>

            {/* 3. Endereço de Entrega */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-[#512B54]/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#512B54]/30">
                <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                  <div className="w-8 h-8 rounded-xl bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span>Endereço de Entrega</span>
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Botão de Trocar / Gerenciar Endereços */}
                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Selecionar / Alterar</span>
                  </button>

                  {/* Botão de Ação Rápida: Usar Minha Localização Atual */}
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 px-3.5 py-2 rounded-xl shadow-xs shadow-[#9306CF]/20 transition-all cursor-pointer disabled:opacity-60 shrink-0"
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
              </div>

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
                      className="text-xs font-bold text-[#9306CF] dark:text-[#C7A9C9] hover:underline"
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
                              ? "border-[#9306CF] bg-[#9306CF]/5 dark:bg-[#9306CF]/10 shadow-xs"
                              : "border-border/60 hover:border-[#9306CF]/40 bg-card"
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
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9306CF] text-white">
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
                <div className="flex items-center gap-2.5 p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 rounded-xl text-xs font-medium text-[#9306CF] dark:text-[#C7A9C9] animate-pulse">
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
                    className="rounded-xl border border-input text-base md:text-sm h-11 px-3 focus-visible:ring-2 focus-visible:ring-[#9306CF]/30"
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
            </section>

            {/* 4. Forma de Pagamento & AVISO VISUAL DESTACADO */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-[#512B54]/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>Forma de Pagamento na Entrega</span>
              </h3>

              {/* CRITICAL: AVISO VISUAL DESTACADO DE PAGAMENTO NA ENTREGA */}
              <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading font-black text-xs sm:text-sm uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Pagamento Exclusivo no Momento da Entrega
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Nenhum valor é cobrado online agora. O pagamento é realizado diretamente ao entregador na chegada do seu pedido via Pix, Cartão ou Dinheiro.
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
                      ? "border-[#9306CF] bg-purple-50/70 dark:bg-[#9306CF]/20 shadow-sm ring-1 ring-[#9306CF]/30"
                      : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    {paymentType === "pix_entrega" && (
                      <span className="w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
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
                      ? "border-[#9306CF] bg-purple-50/70 dark:bg-[#9306CF]/20 shadow-sm ring-1 ring-[#9306CF]/30"
                      : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    {paymentType === "cartao_maquininha" && (
                      <span className="w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
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
                      ? "border-[#9306CF] bg-purple-50/70 dark:bg-[#9306CF]/20 shadow-sm ring-1 ring-[#9306CF]/30"
                      : "border-gray-200 dark:border-[#512B54]/40 hover:border-gray-300 dark:hover:border-[#512B54]/80 bg-white dark:bg-[#190B1A]/60"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    {paymentType === "dinheiro" && (
                      <span className="w-5 h-5 rounded-full bg-[#9306CF] text-white flex items-center justify-center shadow-xs">
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
                        className="pl-9 rounded-xl border-gray-300 dark:border-[#512B54]/60 bg-white dark:bg-[#190B1A] text-sm font-mono h-10"
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

            {/* 5. Resumo de Valores e Envio */}
            <section className="bg-white/80 dark:bg-[#230E26]/90 backdrop-blur-sm border border-gray-200/80 dark:border-[#512B54]/40 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="font-heading text-base sm:text-lg font-bold uppercase tracking-wide flex items-center gap-2.5 text-foreground">
                <div className="w-8 h-8 rounded-xl bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>Resumo do Pedido</span>
              </h3>

              <div className="space-y-2.5 font-mono text-xs border-b border-gray-100 dark:border-[#512B54]/30 pb-3">
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
                  <span>Taxa de Entrega:</span>
                  {isFreeDelivery ? (
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 uppercase tracking-wider">
                      Grátis
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-foreground">
                      R$ {deliveryFee.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>

                {amountToFreeShipping > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-[11px] text-[#9306CF] dark:text-[#C7A9C9] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Adicione mais <strong>R$ {amountToFreeShipping.toFixed(2).replace(".", ",")}</strong> para ganhar <strong>Entrega Grátis</strong>!
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline pt-2">
                <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">
                  Total a Pagar na Entrega:
                </span>
                <span className="font-heading text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#9306CF] to-[#940068]">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Barra de Ação Fixa Inferior */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/95 dark:bg-[#190B1A]/95 backdrop-blur-md border-t border-border/40 p-4 z-40 shadow-2xl pb-safe">
          <div className="max-w-4xl mx-auto space-y-2">
            {storeSettings && !storeSettings.isOpen && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>Nossa esteira de pedidos está fechada neste momento. Você pode montar seu carrinho e finalizar assim que o atendimento abrir!</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                  Total (Pague na Entrega)
                </span>
                <span className="font-heading text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#9306CF] to-[#940068]">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <Button
                onClick={() => {
                  // Validações rápidas antes de abrir o modal
                  setCheckoutError("");
                  if (storeSettings && !storeSettings.isOpen) {
                    setCheckoutError("A loja está fechada no momento.");
                    return;
                  }
                  if (!street.trim() || !number.trim() || !neighborhood.trim()) {
                    setCheckoutError("Preencha todos os campos obrigatórios de endereço (Rua, Número e Bairro).");
                    return;
                  }
                  if (paymentType === "dinheiro" && changeFor) {
                    const changeNum = parseFloat(changeFor);
                    if (isNaN(changeNum) || changeNum < finalTotal) {
                      setCheckoutError(`O valor para troco deve ser maior ou igual ao total (R$ ${finalTotal.toFixed(2).replace(".", ",")}).`);
                      return;
                    }
                  }
                  setShowReviewModal(true);
                }}
                disabled={submitting || (storeSettings ? !storeSettings.isOpen : false)}
                className={`h-12 px-6 sm:px-8 rounded-2xl font-heading text-sm uppercase tracking-wider font-black shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all ${
                  storeSettings && !storeSettings.isOpen
                    ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed text-white dark:bg-gray-700"
                    : "bg-gradient-to-r from-[#9306CF] via-[#940068] to-[#9306CF] bg-[length:200%_auto] hover:bg-right text-white shadow-[#9306CF]/25 border border-white/20"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando Pedido...
                  </>
                ) : storeSettings && !storeSettings.isOpen ? (
                  <>Loja Fechada no Momento</>
                ) : (
                  <>
                    Revisar e Confirmar Pedido
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

            {/* Endereço */}
            <div className="border border-border rounded-xl p-4 space-y-0.5">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Endereço de Entrega</p>
              <p className="text-sm font-semibold">{street}, {number}{complement ? `, ${complement}` : ""}</p>
              <p className="text-xs text-muted-foreground">{neighborhood} &bull; {city}{reference ? ` — Ref: ${reference}` : ""}</p>
            </div>

            {/* Pagamento */}
            <div className="border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Forma de Pagamento</p>
                <p className="text-sm font-bold">
                  {paymentType === "dinheiro" ? "Dinheiro" : paymentType === "cartao_maquininha" ? "Cartão (Maquininha)" : "Pix na Entrega"}
                  {paymentType === "dinheiro" && changeFor ? ` — Troco para R$ ${parseFloat(changeFor).toFixed(2).replace(".", ",")}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">Na Entrega</span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline border-t border-border pt-3">
              <span className="font-mono text-sm uppercase tracking-wider font-bold">Total a Pagar:</span>
              <span className="font-heading text-3xl font-black text-primary">
                R$ {finalTotal.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 h-12 border-2 border-border font-mono text-xs uppercase tracking-widest font-bold hover:bg-muted transition-colors cursor-pointer rounded-none"
              >
                Editar Pedido
              </button>
              <Button
                onClick={async () => {
                  setShowReviewModal(false);
                  await handleFinishOrder();
                }}
                disabled={submitting}
                className="flex-1 h-12 rounded-none font-heading text-sm uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center gap-2"
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
    </div>
  );
}
