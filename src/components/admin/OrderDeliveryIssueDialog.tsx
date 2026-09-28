"use client";

import { useState } from "react";
import {
  AlertTriangle,
  X,
  RotateCcw,
  Ban,
  Loader2,
  UserX,
  MapPinOff,
  PackageX,
  ThumbsDown,
  Wrench,
  ShieldAlert,
} from "lucide-react";
import { Order, orderService } from "../../services/orderService";
import { Button } from "../ui/button";
import { useToast } from "../ui/ToastNotification";

export const DELIVERY_ISSUES = [
  {
    key: "CLIENTE_AUSENTE",
    title: "Cliente Ausente",
    description: "Cliente ausente / Não atende o interfone ou telefone",
    icon: UserX,
  },
  {
    key: "ENDERECO_INCORRETO",
    title: "Endereço Não Localizado",
    description: "Endereço não localizado / Número inexistente ou rua errada",
    icon: MapPinOff,
  },
  {
    key: "PEDIDO_AVARIADO",
    title: "Pedido Avariado",
    description: "Avaria no transporte / Pedido tombado, vazado ou danificado",
    icon: PackageX,
  },
  {
    key: "RECUSA_CLIENTE",
    title: "Recusa do Cliente",
    description: "Cliente recusou o pedido (tempo de espera / item incorreto)",
    icon: ThumbsDown,
  },
  {
    key: "PROBLEMA_VEICULO",
    title: "Problema com Veículo / Rota",
    description: "Falha mecânica no veículo / Acidente / Pneu furado do entregador",
    icon: Wrench,
  },
  {
    key: "SUSPEITA_GOLPE",
    title: "Suspeita de Trote / Risco",
    description: "Suspeita de trote / Insegurança no local de entrega",
    icon: ShieldAlert,
  },
];

interface OrderDeliveryIssueDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: (updatedOrder: Order) => void;
}

export function OrderDeliveryIssueDialog({
  order,
  isOpen,
  onClose,
  onResolved,
}: OrderDeliveryIssueDialogProps) {
  const { showToast } = useToast();
  const [selectedIssue, setSelectedIssue] = useState<string>("CLIENTE_AUSENTE");
  const [notes, setNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState<"reprepare" | "cancel" | null>(null);

  if (!isOpen || !order) return null;

  const clientName = order.user?.fullName || order.user?.username || "Cliente";

  const handleSubmit = async (resolution: "reprepare" | "cancel") => {
    if (!selectedIssue) {
      showToast({
        title: "Selecione o Motivo",
        message: "Escolha uma ocorrência da lista para registrar.",
        type: "warning",
      });
      return;
    }

    setSubmittingAction(resolution);
    try {
      const updated = await orderService.reportDeliveryIssue(
        order.id,
        selectedIssue,
        notes.trim() || undefined,
        resolution
      );

      showToast({
        title: resolution === "reprepare" ? "Pedido Retornado para Preparo" : "Pedido Cancelado",
        message:
          resolution === "reprepare"
            ? "Ocorrência registrada e pedido movido para a cozinha."
            : "Ocorrência registrada e pedido cancelado.",
        type: resolution === "reprepare" ? "warning" : "error",
      });

      onResolved(updated);
      onClose();
    } catch (err: unknown) {
      showToast({
        title: "Erro ao registrar ocorrência",
        message: (err instanceof Error ? err.message : "Erro desconhecido") || "Tente novamente.",
        type: "error",
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-card border-2 border-destructive/30 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold text-destructive tracking-wider">
                Ocorrência de Entrega
              </span>
              <h2 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
                Registrar Problema
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

        {/* Info card */}
        <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs flex justify-between items-center">
          <div>
            <span className="text-muted-foreground">Pedido: </span>
            <strong className="font-mono text-foreground font-bold">#{order.id.substring(0, 6)}</strong>
            <span className="mx-2 text-muted-foreground">•</span>
            <span className="text-foreground">{clientName}</span>
          </div>
          {order.courier_name && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              🛵 {order.courier_name}
            </span>
          )}
        </div>

        {/* Standardized issues list */}
        <div className="space-y-2">
          <label className="text-xs font-heading font-bold uppercase tracking-wide text-foreground">
            Selecione a Ocorrência:
          </label>
          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {DELIVERY_ISSUES.map((issue) => {
              const Icon = issue.icon;
              const isSelected = selectedIssue === issue.key;
              return (
                <div
                  key={issue.key}
                  onClick={() => setSelectedIssue(issue.key)}
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-destructive/10 border-destructive dark:bg-destructive/20 text-foreground"
                      : "bg-background border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-tight ${isSelected ? "text-foreground font-bold" : "text-foreground/90"}`}>
                      {issue.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {issue.description}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="deliveryIssue"
                    checked={isSelected}
                    onChange={() => setSelectedIssue(issue.key)}
                    className="mt-0.5 accent-destructive cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Observations input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">
            Observações adicionais (opcional):
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhe o ocorrido (ex: tentado ligar 3x, vizinho informou mudança...)"
            className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row items-center gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submittingAction !== null}
            className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs"
          >
            Voltar
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit("reprepare")}
            disabled={submittingAction !== null}
            className="w-full sm:w-auto h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
          >
            {submittingAction === "reprepare" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>Retornar para Em Preparo</span>
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit("cancel")}
            disabled={submittingAction !== null}
            className="w-full sm:w-auto h-10 px-4 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-destructive/20"
          >
            {submittingAction === "cancel" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
            <span>Cancelar com Estorno</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
