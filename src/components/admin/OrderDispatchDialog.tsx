"use client";

import { useState, useEffect } from "react";
import {
  Bike,
  X,
  Copy,
  Check,
  MessageCircle,
  MapPin,
  User,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Loader2,
  Navigation,
} from "lucide-react";
import { Order, orderService } from "../../services/orderService";
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
  const [enableGps, setEnableGps] = useState(true);
  const [courierPhone, setCourierPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [dispatchedData, setDispatchedData] = useState<{
    trackingToken: string;
    trackingUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      setEnableGps(true);
      setCourierPhone("");
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

  const handleConfirmDispatch = async () => {
    setLoading(true);
    try {
      const res = await orderService.dispatchOrder(order.id, enableGps);

      if (enableGps && res.trackingToken && res.trackingUrl) {
        setDispatchedData({
          trackingToken: res.trackingToken,
          trackingUrl: res.trackingUrl,
        });
        showToast({
          title: "Despachado com GPS!",
          message: "Link de rastreamento gerado. Envie para o entregador.",
          type: "success",
        });
        onDispatched(order.id);
      } else {
        showToast({
          title: "Pedido Despachado",
          message: "Pedido avançado para entrega com traçado padrão.",
          type: "success",
        });
        onDispatched(order.id);
        onClose();
      }
    } catch (err: any) {
      showToast({
        title: "Erro ao despachar",
        message: err.message || "Não foi possível despachar o pedido.",
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
    const cleanPhone = courierPhone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `🍧 *Pop Shake Sorveteria — Nova Entrega*\n\n` +
        `Olá! Você foi escalado para entregar o pedido *#${order.id.substring(0, 6)}*.\n\n` +
        `👤 *Cliente:* ${clientName}\n` +
        `📍 *Endereço:* ${addressText}\n\n` +
        `📲 *Abra o link abaixo no seu celular para ver a rota e ativar seu GPS:*\n` +
        `${dispatchedData.trackingUrl}\n\n` +
        `Bom trabalho e dirija com segurança!`
    );

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${message}`
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
            <div className="w-10 h-10 rounded-xl bg-[#9306CF]/10 text-[#9306CF] dark:text-[#C7A9C9] flex items-center justify-center">
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
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-[#230E26]/60 border border-[#9306CF]/20 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="enable-gps-switch"
                  className="font-heading font-bold text-xs uppercase tracking-wide text-foreground cursor-pointer flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4 text-[#9306CF]" />
                  Rastreamento GPS ao vivo do entregador
                </label>
                <input
                  id="enable-gps-switch"
                  type="checkbox"
                  checked={enableGps}
                  onChange={(e) => setEnableGps(e.target.checked)}
                  className="w-5 h-5 accent-[#9306CF] cursor-pointer rounded"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {enableGps
                  ? "Será gerado um link web leve para o entregador abrir no celular, compartilhar GPS sem precisar instalar app e atualizar a posição no mapa do cliente a cada 10s."
                  : "O cliente verá a rota fixa entre a sorveteria e seu endereço, com status 'A Caminho'."}
              </p>
            </div>

            {enableGps && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  WhatsApp do Entregador (opcional para envio direto)
                </label>
                <input
                  type="tel"
                  placeholder="(65) 99999-9999"
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-[#9306CF]/30"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
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
                disabled={loading}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#9306CF] to-[#940068] hover:opacity-95 text-white font-heading text-xs font-bold uppercase tracking-wider shadow-md shadow-[#9306CF]/20 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Despachando...
                  </>
                ) : (
                  <>
                    <Bike className="w-4 h-4" />
                    Confirmar Despacho
                  </>
                )}
              </Button>
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
                className="h-10 px-6 rounded-xl bg-[#9306CF] hover:bg-[#8005b5] text-white text-xs font-bold"
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
