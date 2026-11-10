export interface ShiftSummary {
  totalOrders: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalRevenue: number;
  cashTotal: number;
  pixTotal: number;
  cardTotal: number;
  isOpen: boolean;
  estimatedDeliveryTime: string;
  openedAt: string | null;
  closedAt: string | null;
}

export interface ShiftRecord {
  id: string;
  code: string;
  openedAt: string;
  closedAt: string | null;
  isOpen: boolean;
  estimatedDeliveryTime: string | null;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  cashTotal: number;
  pixTotal: number;
  cardTotal: number;
  notes: string | null;
}

export interface CloseShiftPendingOrder {
  id: string;
  shortId: string;
  status: string;
  totalAmount: number;
  clientName: string;
  createdAt: string;
}

export interface CloseShiftOptions {
  notes?: string;
  forceClose?: boolean;
  forceReason?: string;
  resolveAction?: "cancel" | "archive";
}

export interface ShiftStatusResponse {
  isOpen: boolean;
  currentShiftId: string | null;
  estimatedDeliveryTime: string;
  currentShift: ShiftRecord | null;
  currentShiftSummary: ShiftSummary | null;
  shifts: ShiftRecord[];
}

export const shiftService = {
  async getShiftData(): Promise<ShiftStatusResponse> {
    const res = await fetch("/api/shifts", {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error("Falha ao consultar informações de turnos.");
    }
    return await res.json();
  },

  async openShift(estimatedDeliveryTime = "30-50 min", notes?: string) {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "open",
        estimatedDeliveryTime,
        notes,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || "Erro ao abrir esteira/loja.");
    }
    return body;
  },

  async closeShift(notesOrOptions?: string | CloseShiftOptions) {
    const options: CloseShiftOptions =
      typeof notesOrOptions === "string" || notesOrOptions === undefined
        ? { notes: notesOrOptions }
        : notesOrOptions;

    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "close",
        notes: options.notes,
        forceClose: options.forceClose,
        forceReason: options.forceReason,
        resolveAction: options.resolveAction,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json();
    if (!res.ok) {
      const err: any = new Error(body.error || "Erro ao encerrar turno da loja.");
      err.pendingCount = body.pendingCount;
      err.pendingOrders = body.pendingOrders;
      err.breakdown = body.breakdown;
      err.canForceClose = body.canForceClose;
      err.code = body.code;
      throw err;
    }
    return body;
  },
};
