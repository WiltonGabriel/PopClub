"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Order } from "../../services/orderService";

interface OrderCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void>;
}

const CANCELLATION_REASONS = [
  "Falta de insumos / item indisponível no estoque",
  "Endereço fora do raio de entrega",
  "Loja sobrecarregada / fechando expediente",
  "Cliente solicitou cancelamento via WhatsApp",
  "Outro",
] as const;

export function OrderCancelDialog({
  open,
  onOpenChange,
  order,
  onConfirmCancel,
}: OrderCancelDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const finalReason = selectedReason === "Outro" ? customReason.trim() : selectedReason;

    if (!finalReason) {
      setError("Por favor, descreva o motivo do cancelamento.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirmCancel(order.id, finalReason);
      onOpenChange(false);
      setCustomReason("");
      setSelectedReason(CANCELLATION_REASONS[0]);
    } catch (err: any) {
      setError(err.message || "Erro ao cancelar o pedido.");
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full rounded-2xl bg-white dark:bg-[#1F0B22] text-foreground border border-gray-200 dark:border-border/40 shadow-2xl p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-lg font-bold text-foreground dark:text-foreground">
                Cancelar Pedido #{order.id.substring(0, 6)}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                Cliente: <span className="font-semibold text-gray-700 dark:text-gray-300">{clientName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Selecione o motivo do cancelamento:
            </Label>

            <div className="space-y-2 pt-1">
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    selectedReason === reason
                      ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-semibold"
                      : "border-gray-200 dark:border-border/40 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => {
                      setSelectedReason(reason);
                      setError("");
                    }}
                    className="accent-red-600 w-4 h-4 cursor-pointer"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Campo de texto aberto quando "Outro" for selecionado */}
          {selectedReason === "Outro" && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <Label htmlFor="custom-reason" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Especifique o motivo detalhado:
              </Label>
              <textarea
                id="custom-reason"
                rows={2}
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError("");
                }}
                required
                placeholder="Descreva por que o pedido está sendo cancelado..."
                className="w-full rounded-xl p-3 text-xs bg-white border border-gray-200 text-gray-900 dark:bg-card dark:border-border/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none transition-all placeholder:text-gray-400"
              />
            </div>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
              {error}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl h-11 border-gray-200 dark:border-border/40 text-xs font-semibold"
            >
              Voltar
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-red-600/20 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelando...
                </span>
              ) : (
                "Confirmar Cancelamento"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
