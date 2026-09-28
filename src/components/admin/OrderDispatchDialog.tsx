"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bike,
  X,
  Copy,
  Check,
  MessageCircle,
  User,
  ShieldCheck,
  Loader2,
  Navigation,
  MapPin,
  ExternalLink,
  DollarSign,
  CreditCard,
  Phone,
} from "lucide-react";
import { Order, orderService } from "../../services/orderService";
import { courierService, Courier } from "../../services/courierService";
import { Button } from "../ui/button";
import { useToast } from "../ui/ToastNotification";

interface OrderDispatchDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onDispatched: (orderId: string) => void;
}

export function OrderDispatchDialog({
  order,
  isOpen,
  onClose,
  onDispatched,
}: OrderDispatchDialogProps) {
  const { showToast } = useToast();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(true);
  const [enableGps, setEnableGps] = useState(true);
  const [courierPhone, setCourierPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [dispatchedData, setDispatchedData] = useState<{
    trackingToken: string;
    trackingUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);

  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [courierName, setCourierName] = useState("");
  const [courierCode, setCourierCode] = useState("");
  const [confirmSafetyText, setConfirmSafetyText] = useState("");

  // Carrega lista de motoboys do banco de dados
  useEffect(() => {
    if (isOpen) {
      setLoadingCouriers(true);
      courierService
        .getCouriers()
        .then((data) => {
          setCouriers(data);
          if (order && !order.courier_name && data.length > 0) {
            const firstAvail = data.find((c) => c.status === "available") || data[0];
            setSelectedCourierId(firstAvail.id);
            setCourierName(firstAvail.name);
            setCourierPhone(firstAvail.phone);
            setCourierCode(firstAvail.plate || "MB-01");
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar entregadores:", err);
        })
        .finally(() => {
          setLoadingCouriers(false);
        });
    }
  }, [isOpen, order]);

  useEffect(() => {
    if (isOpen && order) {
      setEnableGps(true);
      setConfirmSafetyText("");
      setDispatchedData(
        order.tracking_token
          ? {
              trackingToken: order.tracking_token,
              trackingUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/entrega/${order.tracking_token}`,
            }
          : null
      );
      setCopied(false);
      setTemplateCopied(false);

      if (order.courier_name) {
        setCourierName(order.courier_name);
        setCourierPhone(order.courier_phone || "");
        setCourierCode(order.courier_code || "");
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";
  const addressText = order.delivery_address
    ? `${order.delivery_address.street}, ${order.delivery_address.number} - ${order.delivery_address.neighborhood}`
    : "Endereço não informado";

  // Google Maps URL
  const delLat = order.delivery_address?.latitude;
  const delLng = order.delivery_address?.longitude;
  const googleMapsUrl =
    delLat && delLng
      ? `https://www.google.com/maps/search/?api=1&query=${delLat},${delLng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${addressText}, ${order.delivery_address?.city || "Várzea Grande"} - MT`
        )}`;

  // Informações de Pagamento
  const paymentMethodLabel = (() => {
    switch (order.payment_method_type) {
      case "dinheiro":
        return "Dinheiro em Espécie";
      case "cartao_maquininha":
        return "Cartão (Levar maquininha na entrega)";
      case "pix_entrega":
        return "Pix na Entrega (Conferir comprovante)";
      default:
        return order.payment_method_type || "A combinar";
    }
  })();

  const changeInfo = useMemo(() => {
    if (order.payment_method_type === "dinheiro" && order.change_for) {
      const trocoDevolver = order.change_to_return ? ` • Troco a devolver: R$ ${Number(order.change_to_return).toFixed(2).replace(".", ",")}` : "";
      return `\n💵 *Troco para:* R$ ${Number(order.change_for).toFixed(2).replace(".", ",")}${trocoDevolver}`;
    }
    return "";
  }, [order.payment_method_type, order.change_for, order.change_to_return]);

  const totalFormatted = Number(order.total_amount || 0).toFixed(2).replace(".", ",");

  // Template Completo para o WhatsApp do Entregador
  const trackingUrl = dispatchedData?.trackingUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/entrega/${order.tracking_token || "rastreamento"}`;

  const courierWhatsAppText = useMemo(() => {
    return (
      `🍧 *NOVO DESPACHO - POP SHAKE*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏍️ *Entregador:* ${courierName || "Motoboy"}\n` +
      `📦 *Pedido:* #${order.id.substring(0, 6)}\n` +
      `👤 *Cliente:* ${clientName}\n\n` +
      `📍 *Endereço de Entrega:*\n` +
      `${addressText}\n` +
      `🗺️ *Google Maps / Rota GPS:*\n` +
      `${googleMapsUrl}\n\n` +
      `💵 *Valor a Cobrar:* R$ ${totalFormatted}\n` +
      `💳 *Forma de Pagamento:* ${paymentMethodLabel}` +
      `${changeInfo}\n\n` +
      `📲 *Link de Rastreamento ao Vivo:*\n` +
      `${trackingUrl}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Por favor, confirme a saída do pedido. Bom trabalho! 🚀`
    );
  }, [
    courierName,
    order.id,
    clientName,
    addressText,
    googleMapsUrl,
    totalFormatted,
    paymentMethodLabel,
    changeInfo,
    trackingUrl,
  ]);

  const isSafetyConfirmed = confirmSafetyText.trim() === "CONFIRMO";
  const isCourierValid = Boolean(courierName.trim());
  const canDispatch = isSafetyConfirmed && isCourierValid && !loading;

  const handleSelectCourier = (courierId: string) => {
    setSelectedCourierId(courierId);
    if (courierId === "balcao") {
      setCourierName("Retirada no Balcão");
      setCourierPhone("");
      setCourierCode("BALCAO");
      setEnableGps(false);
      return;
    }
    if (courierId === "manual") {
      setCourierName("");
      setCourierPhone("");
      setCourierCode("");
      return;
    }

    const found = couriers.find((c) => c.id === courierId);
    if (found) {
      setCourierName(found.name);
      setCourierPhone(found.phone);
      setCourierCode(found.plate || "MB-01");
      setEnableGps(true);
    }
  };

  const handleOpenCourierWhatsApp = () => {
    const rawDigits = courierPhone.replace(/\D/g, "");
    const phoneNo55 = rawDigits.startsWith("55") && (rawDigits.length === 12 || rawDigits.length === 13)
      ? rawDigits.slice(2)
      : rawDigits;
    const finalPhone = rawDigits ? `55${phoneNo55}` : null;

    const encoded = encodeURIComponent(courierWhatsAppText);
    const waUrl = finalPhone
      ? `https://wa.me/${finalPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, "_blank");
  };

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(courierWhatsAppText);
      setTemplateCopied(true);
      showToast({
        title: "Template Copiado!",
        message: "Dados completos do pedido copiados para envio manual ao entregador.",
        type: "success",
      });
      setTimeout(() => setTemplateCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!canDispatch) return;
    setLoading(true);
    try {
      const res = await orderService.dispatchOrder(order.id, {
        enableGps,
        courierName: courierName.trim(),
        courierPhone: courierPhone.trim(),
        courierCode: courierCode.trim() || undefined,
      });

      if (enableGps && res.trackingToken && res.trackingUrl) {
        setDispatchedData({
          trackingToken: res.trackingToken,
          trackingUrl: res.trackingUrl,
        });
        showToast({
          title: "Despachado com GPS!",
          message: "Link de rastreamento gerado e motoboy atribuído.",
          type: "success",
        });
        onDispatched(order.id);
      } else {
        showToast({
          title: "Pedido Despachado",
          message: `Despachado com sucesso para ${courierName}.`,
          type: "success",
        });
        onDispatched(order.id);
        onClose();
      }
    } catch (err: unknown) {
      showToast({
        title: "Erro ao despachar",
        message: (err instanceof Error ? err.message : "Erro desconhecido") || "Não foi possível despachar o pedido.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!dispatchedData?.trackingUrl) return;
    try {
      await navigator.clipboard.writeText(dispatchedData.trackingUrl);
      setCopied(true);
      showToast({
        title: "Link Copiado!",
        message: "O link foi copiado para sua área de transferência.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl bg-card border-2 border-border rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-violet-400 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-primary tracking-wider">
                Logística & Despacho
              </span>
              <h2 className="font-heading text-lg font-black uppercase tracking-tight">
                Despachar Pedido #{order.id.substring(0, 6)} 🛵
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo do Pedido e Destino */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Cliente:</span>
              <p className="font-bold text-foreground text-sm">{clientName}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">A Cobrar:</span>
              <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                R$ {totalFormatted}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate">{addressText}</p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                <span>Abrir rota no Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
            <span className="text-muted-foreground">Forma de Pagamento:</span>
            <span className="font-bold text-foreground">{paymentMethodLabel}</span>
          </div>
        </div>

        {!dispatchedData ? (
          <div className="space-y-4">
            {/* Seleção do Entregador Cadastrado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-heading font-bold text-xs uppercase tracking-wide text-foreground">
                  Selecione o Entregador (Motoboy) *
                </label>
                <span className="text-[10px] text-muted-foreground">Obrigatório</span>
              </div>

              {loadingCouriers ? (
                <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando entregadores da base...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {couriers.map((courier) => {
                    const isSelected = selectedCourierId === courier.id;
                    return (
                      <button
                        key={courier.id}
                        type="button"
                        onClick={() => handleSelectCourier(courier.id)}
                        className={`px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold dark:bg-primary/20 dark:text-white"
                            : "bg-background border-border/70 text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="truncate font-bold">{courier.name}</div>
                        <div className="text-[10px] opacity-75 font-mono truncate">
                          {courier.vehicle || "Moto"} {courier.plate ? `• ${courier.plate}` : ""}
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleSelectCourier("balcao")}
                    className={`px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors cursor-pointer ${
                      selectedCourierId === "balcao"
                        ? "bg-primary/10 border-primary text-primary font-bold dark:bg-primary/20 dark:text-white"
                        : "bg-background border-border/70 text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="truncate font-bold">🏪 Retirada no Balcão</div>
                    <div className="text-[10px] opacity-70">Sem entregador</div>
                  </button>
                </div>
              )}

              {/* Campos do Entregador Selecionado */}
              <div className="pt-1.5 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Nome do Entregador
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Silva"
                      value={courierName}
                      onChange={(e) => {
                        setCourierName(e.target.value);
                        setSelectedCourierId("manual");
                      }}
                      className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Placa / Código
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: MB-01"
                      value={courierCode}
                      onChange={(e) => setCourierCode(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs font-mono uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    WhatsApp do Entregador com DDD (para acionamento nativo)
                  </label>
                  <input
                    type="tel"
                    placeholder="(65) 99999-9999"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* AÇÃO RÁPIDA: ENVIAR TEMPLATE VIA WHATSAPP AO ENTREGADOR */}
            {selectedCourierId !== "balcao" && Boolean(courierPhone) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    Template Pronto de Despacho (WhatsApp)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                    Nativo wa.me
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Envie o pedido formatado com endereço, link do Google Maps, valor a cobrar e pagamento para o motoboy via WhatsApp com 1 clique:
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCourierWhatsApp}
                    className="flex-1 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Abrir Conversa no WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="h-10 px-3 rounded-xl border border-emerald-500/40 bg-white dark:bg-[#181D2D] hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar texto do template"
                  >
                    {templateCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* GPS Switch */}
            <div className="p-3 rounded-xl bg-primary/5 dark:bg-[#230E26]/60 border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="enable-gps-switch"
                  className="font-heading font-bold text-xs uppercase tracking-wide text-foreground cursor-pointer flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4 text-primary" />
                  Rastreamento GPS ao vivo do entregador
                </label>
                <input
                  id="enable-gps-switch"
                  type="checkbox"
                  checked={enableGps}
                  onChange={(e) => setEnableGps(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer rounded"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {enableGps
                  ? "Gera link web leve para o motoboy transmitir localização ao cliente em tempo real."
                  : "Cliente verá status 'A Caminho' com traçado padrão no mapa."}
              </p>
            </div>

            {/* Trava de Segurança CONFIRMO */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-heading font-bold text-xs uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4" />
                  Trava de Segurança Obrigatória
                </div>
                {isSafetyConfirmed && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Liberado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-tight">
                Para liberar a saída e atualizar o pedido para &quot;A Caminho&quot;, digite exatamente{" "}
                <strong className="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-900 dark:text-amber-100">
                  CONFIRMO
                </strong>
                :
              </p>
              <input
                type="text"
                placeholder='Digite "CONFIRMO"'
                value={confirmSafetyText}
                onChange={(e) => setConfirmSafetyText(e.target.value.toUpperCase())}
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 font-mono text-sm tracking-widest text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-muted-foreground">
                {!isCourierValid ? (
                  <span className="text-destructive font-semibold">Selecione um entregador</span>
                ) : !isSafetyConfirmed ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Digite CONFIRMO acima</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pronto para despachar</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="h-10 px-4 rounded-xl text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDispatch}
                  disabled={!canDispatch}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Despachando...
                    </>
                  ) : (
                    <>
                      <Bike className="w-4 h-4" />
                      Confirmar Saída
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Seção Pós-despacho com Link e Ações */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <Check className="w-4 h-4" />
                <span>Pedido Despachado com Sucesso!</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Link de rastreamento gerado. O motoboy pode abrir o link no celular para transmitir o GPS e acompanhar a rota:
              </p>

              <div className="bg-white dark:bg-black/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 font-mono text-[11px] break-all select-all text-foreground">
                {dispatchedData.trackingUrl}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleCopyLink}
                className="h-11 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-border"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-muted-foreground" />
                    <span>Copiar Link de Rastreio</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleOpenCourierWhatsApp}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Abrir WhatsApp do Motoboy</span>
              </Button>
            </div>

            <div className="pt-2 border-t border-border/50 flex justify-end">
              <Button
                type="button"
                onClick={onClose}
                className="h-10 px-6 rounded-xl bg-primary hover:bg-[#8005b5] text-white text-xs font-bold"
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
