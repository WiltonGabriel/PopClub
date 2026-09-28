"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Order, orderService } from "../../services/orderService";
import { Button } from "../ui/button";
import { useToast } from "../ui/ToastNotification";

const PRESET_COURIERS = [
  { name: "Carlos Silva (Motoboy 01)", phone: "(65) 99234-5678", code: "MB-01" },
  { name: "Marcos Vinícius (Motoboy 02)", phone: "(65) 99876-5432", code: "MB-02" },
  { name: "Lucas Ferreira (Motoboy 03)", phone: "(65) 99111-2233", code: "MB-03" },
  { name: "Retirada no Balcão", phone: "", code: "BALCAO" },
];

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

  const [enableGps, setEnableGps] = useState(true);
  const [courierPhone, setCourierPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [dispatchedData, setDispatchedData] = useState<{
    trackingToken: string;
    trackingUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [selectedCourierPreset, setSelectedCourierPreset] = useState<string>("Carlos Silva (Motoboy 01)");
  const [courierName, setCourierName] = useState("Carlos Silva (Motoboy 01)");
  const [courierCode, setCourierCode] = useState("MB-01");
  const [confirmSafetyText, setConfirmSafetyText] = useState("");

  useEffect(() => {
    if (isOpen && order) {
      setEnableGps(true);
      const defaultPreset = PRESET_COURIERS[0];
      setSelectedCourierPreset(defaultPreset.name);
      setCourierName(order.courier_name || defaultPreset.name);
      setCourierPhone(order.courier_phone || defaultPreset.phone);
      setCourierCode(order.courier_code || defaultPreset.code);
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
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";
  const addressText = order.delivery_address
    ? `${order.delivery_address.street}, ${order.delivery_address.number} - ${order.delivery_address.neighborhood}`
    : "Endereço não informado";

  const isSafetyConfirmed = confirmSafetyText.trim() === "CONFIRMO";
  const isCourierValid = Boolean(courierName.trim());
  const canDispatch = isSafetyConfirmed && isCourierValid && !loading;

  const handlePresetChange = (presetName: string) => {
    setSelectedCourierPreset(presetName);
    if (presetName === "manual") {
      setCourierName("");
      setCourierPhone("");
      setCourierCode("");
    } else {
      const found = PRESET_COURIERS.find((c) => c.name === presetName);
      if (found) {
        setCourierName(found.name);
        setCourierPhone(found.phone);
        setCourierCode(found.code);
        if (found.code === "BALCAO") {
          setEnableGps(false);
        } else {
          setEnableGps(true);
        }
      }
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

  const handleSendWhatsApp = () => {
    if (!dispatchedData?.trackingUrl) return;
    const rawDigits = courierPhone.replace(/\D/g, "");
    const phoneNo55 = rawDigits.startsWith("55") && (rawDigits.length === 12 || rawDigits.length === 13)
      ? rawDigits.slice(2)
      : rawDigits;
    const finalPhone = rawDigits ? `55${phoneNo55}` : null;

    const message = encodeURIComponent(
      `🍧 *Pop Shake Sorveteria — Nova Entrega*\n\n` +
        `Olá! Você foi escalado para entregar o pedido *#${order.id.substring(0, 6)}*.\n\n` +
        `👤 *Cliente:* ${clientName}\n` +
        `📍 *Endereço:* ${addressText}\n\n` +
        `📲 *Abra o link abaixo no seu celular para ver a rota e ativar seu GPS:*\n` +
        `${dispatchedData.trackingUrl}\n\n` +
        `Bom trabalho e dirija com segurança!`
    );

    const waUrl = finalPhone
      ? `https://wa.me/${finalPhone}?text=${message}`
      : `https://api.whatsapp.com/send?text=${message}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-card border-2 border-border rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-muted-foreground flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-primary tracking-wider">
                Controle de Despacho
              </span>
              <h2 className="font-heading text-lg font-black uppercase tracking-tight">
                Despachar Entrega 🛵
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

        {/* Resumo da Entrega */}
        <div className="bg-muted/40 rounded-xl p-3.5 space-y-2 text-xs border border-border/40">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-mono">Pedido:</span>
            <strong className="font-mono font-bold text-foreground">#{order.id.substring(0, 6)}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cliente:</span>
            <strong className="text-foreground">{clientName}</strong>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground shrink-0">Endereço:</span>
            <span className="text-right text-foreground font-medium">{addressText}</span>
          </div>
        </div>

        {/* Seção 1: Configuração antes de despachar */}
        {!dispatchedData ? (
          <div className="space-y-4">
            {/* Atribuição de Entregador */}
            <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <label className="font-heading font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Atribuir Entregador / Motoboy *
                </label>
                <span className="text-[10px] text-muted-foreground">Obrigatório</span>
              </div>

              {/* Selector Presets */}
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_COURIERS.map((courier) => {
                  const isSelected = selectedCourierPreset === courier.name;
                  return (
                    <button
                      key={courier.name}
                      type="button"
                      onClick={() => handlePresetChange(courier.name)}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-bold dark:bg-primary/20 dark:text-white"
                          : "bg-background border-border/70 text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="truncate">{courier.name}</div>
                      <div className="text-[10px] opacity-70 font-mono">
                        {courier.code ? `Cód: ${courier.code}` : "Sem código"}
                      </div>
                    </button>
                  );
                })}
              </div>

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
                        setSelectedCourierPreset("manual");
                      }}
                      className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Código / PIN
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
                    WhatsApp do Entregador (para rota direta)
                  </label>
                  <input
                    type="tel"
                    placeholder="(65) 99999-9999"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

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
                  className="w-4 h-4 accent-[hsl(var(--primary))] cursor-pointer rounded"
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
                Para liberar a saída da entrega e autorizar o motoboy, digite exatamente{" "}
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
                  <span className="text-destructive">Selecione um entregador</span>
                ) : !isSafetyConfirmed ? (
                  <span className="text-amber-600 dark:text-amber-400">Digite CONFIRMO acima</span>
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
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/20 flex items-center gap-2"
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
          /* Seção 2: Pós-despacho com Link e Botões de Ação */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <Check className="w-4 h-4" />
                <span>Pedido Despachado com Sucesso!</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Envie o link abaixo para o entregador. Ele poderá visualizar a rota e transmitir a localização em tempo real:
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
                    <span>Copiar Link</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleSendWhatsApp}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Entregador</span>
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
