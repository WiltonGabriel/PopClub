import { dispatchOrderEvent } from "../lib/orderEvents";
import { fetchClient } from "../lib/fetchClient";

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  notes?: string | null;
  selected_addons?: Array<{
    id: string;
    name: string;
    groupName?: string;
    price: number;
    quantity: number;
  }> | null;
  selectedAddons?: Array<{
    id: string;
    name: string;
    groupName?: string;
    price: number;
    quantity: number;
  }> | null;
  product?: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
  };
}

export interface DeliveryAddress {
  street: string;
  number: string;
  neighborhood: string;
  city?: string;
  complement?: string | null;
  reference?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal?: number;
  discount_amount?: number;
  delivery_fee?: number;
  total_amount: number;
  payment_method_type?: string;
  payment_change_for?: number | null;
  change_for?: number | null;
  changeFor?: number | null;
  change_to_return?: number | null;
  changeToReturn?: number | null;
  delivery_address?: DeliveryAddress;
  shift_id?: string | null;
  shift_code?: string | null;
  is_archived?: boolean;
  tracking_token?: string | null;
  is_gps_tracking_active?: boolean;
  courier_latitude?: number | null;
  courier_longitude?: number | null;
  courier_updated_at?: string | null;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  origin_address?: string | null;
  branch_id?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  courier_name?: string | null;
  courier_phone?: string | null;
  courier_code?: string | null;
  order_pin?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  delivery_issue?: string | null;
  delivery_issue_notes?: string | null;
  delivery_issue_at?: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  user?: {
    fullName: string | null;
    username: string;
    email: string;
    phone?: string | null;
  } | null;
}

export interface HistoricalOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalRevenue: number;
  averageTicket: number;
}

export interface CheckoutPayload {
  items: {
    productId: string;
    quantity: number;
    promotionId?: string | null;
    notes?: string | null;
    selectedAddons?: Array<{
      id: string;
      name?: string | null;
      groupName?: string | null;
      price?: number | null;
      quantity?: number | null;
    }> | null;
  }[];
  deliveryAddress: {
    street: string;
    number: string;
    neighborhood: string;
    city?: string;
    complement?: string | null;
    reference?: string | null;
    zip?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  paymentMethod: {
    type: "dinheiro" | "cartao_maquininha" | "pix_entrega";
    changeFor?: number | null;
  };
  couponCode?: string | null;
  customerName?: string | null;
  name?: string | null;
  fullName?: string | null;
  customerPhone?: string | null;
  phone?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
}

async function safeParseResponse<T>(res: Response, fallbackErrorMessage: string): Promise<T> {
  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {
    throw new Error(fallbackErrorMessage || "Falha na leitura da resposta do servidor.");
  }

  let parsed: unknown = null;
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      // Respostas não-JSON (desafios Cloudflare, proxies, 502/503 em HTML)
      if (!res.ok) {
        throw new Error(
          `Serviço temporariamente indisponível (${res.status}). Tentando reconectar...`
        );
      }
      throw new Error("Formato de resposta inesperado do servidor.");
    }
  }

  if (!res.ok) {
    const errObj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    const errorMsg =
      (typeof errObj.error === "string" ? errObj.error : null) ||
      (typeof errObj.message === "string" ? errObj.message : null) ||
      fallbackErrorMessage ||
      `Erro na requisição (${res.status}).`;
    throw new Error(errorMsg);
  }

  return (parsed !== null ? parsed : {}) as T;
}

export const orderService = {
  async getMyOrders(guestOrderIds?: string[]): Promise<Order[]> {
    let url = "/api/orders";
    if (guestOrderIds && guestOrderIds.length > 0) {
      url += `?guestOrderIds=${encodeURIComponent(guestOrderIds.join(","))}`;
    }
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    const result = await safeParseResponse<Order[] | { orders?: Order[]; data?: Order[] }>(
      res,
      "Erro ao buscar seus pedidos."
    );
    if (Array.isArray(result)) return result;
    if ("orders" in result && Array.isArray(result.orders)) return result.orders;
    if ("data" in result && Array.isArray(result.data)) return result.data;
    return [];
  },

  async getOrdersByUser(guestOrderIds?: string[]): Promise<Order[]> {
    return this.getMyOrders(guestOrderIds);
  },

  async claimGuestOrders(orderIds: string[]): Promise<{ claimedCount: number; claimedOrderIds: string[] }> {
    const res = await fetch("/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds }),
      signal: AbortSignal.timeout(10000),
    });
    return await safeParseResponse<{ claimedCount: number; claimedOrderIds: string[] }>(
      res,
      "Erro ao vincular pedidos."
    );
  },

  async getAllOrders(includeArchived = false): Promise<Order[]> {
    const url = `/api/orders?all=true&includeArchived=${includeArchived ? "true" : "false"}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await safeParseResponse<Order[] | { orders?: Order[]; data?: Order[] }>(
      res,
      "Erro ao listar todos os pedidos."
    );
    if (Array.isArray(data)) return data;
    if ("orders" in data && Array.isArray(data.orders)) return data.orders;
    if ("data" in data && Array.isArray(data.data)) return data.data;
    return [];
  },

  async getHistoricalOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    shiftId?: string;
  }): Promise<HistoricalOrdersResponse> {
    const query = new URLSearchParams({
      all: "true",
      paginated: "true",
      includeArchived: "true",
      page: String(params.page || 1),
      limit: String(params.limit || 15),
    });

    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    if (params.search) query.set("search", params.search);
    if (params.shiftId) query.set("shiftId", params.shiftId);

    const res = await fetch(`/api/orders?${query.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    return await safeParseResponse<HistoricalOrdersResponse>(
      res,
      "Erro ao buscar histórico de pedidos."
    );
  },

  async createCheckoutOrder(payload: CheckoutPayload): Promise<{ success: boolean; order: Order }> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers["Idempotency-Key"] = payload.idempotencyKey;
    }
    const data = await fetchClient.post<{ success: boolean; order: Order }>("/api/checkout", payload, {
      headers,
      timeoutMs: 15000,
    });

    if (data.order) {
      dispatchOrderEvent("order_created", data.order);
    }

    return data;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, cancellationReason?: string): Promise<Order> {
    const res = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, cancellationReason }),
    });

    const data = await safeParseResponse<Order | { order?: Order; data?: Order }>(
      res,
      "Erro ao atualizar status do pedido."
    );
    const orderObj: Order =
      "order" in data && data.order
        ? data.order
        : "data" in data && data.data
        ? data.data
        : (data as Order);

    dispatchOrderEvent("order_updated", orderObj);
    return orderObj;
  },

  async cancelOrder(orderId: string, cancellationReason: string): Promise<Order> {
    return this.updateOrderStatus(orderId, "cancelled", cancellationReason);
  },

  async getOrderById(orderId: string, token?: string): Promise<Order> {
    const cleanId = encodeURIComponent(orderId.trim());
    let url = `/api/orders/${cleanId}`;
    if (token) url += `?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok && res.status === 404) {
      let fallbackUrl = `/api/orders?id=${cleanId}`;
      if (token) fallbackUrl += `&token=${encodeURIComponent(token)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await safeParseResponse<Order | { order?: Order; data?: Order }>(
        fallbackRes,
        "Pedido não encontrado."
      );
      return "data" in data && data.data ? data.data : "order" in data && data.order ? data.order : (data as Order);
    }
    const data = await safeParseResponse<Order | { order?: Order; data?: Order }>(
      res,
      "Pedido não encontrado."
    );
    return "data" in data && data.data ? data.data : "order" in data && data.order ? data.order : (data as Order);
  },

  async dispatchOrder(
    orderId: string,
    enableGpsOrOptions: boolean | { enableGps?: boolean; courierName?: string; courierPhone?: string; courierCode?: string }
  ): Promise<{ order: Order; trackingToken?: string | null; trackingUrl?: string | null }> {
    const payload = typeof enableGpsOrOptions === "boolean"
      ? { enableGps: enableGpsOrOptions }
      : enableGpsOrOptions;

    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await safeParseResponse<{
      order: Order;
      trackingToken?: string | null;
      trackingUrl?: string | null;
    }>(res, "Erro ao despachar pedido.");
    if (data?.order) {
      dispatchOrderEvent("order_updated", data.order);
    }
    return data;
  },

  async reportDeliveryIssue(
    orderId: string,
    issue: string,
    notes?: string,
    resolution: "reprepare" | "cancel" = "reprepare"
  ): Promise<Order> {
    const nextStatus: OrderStatus = resolution === "cancel" ? "cancelled" : "preparing";
    const res = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        status: nextStatus,
        deliveryIssue: issue,
        deliveryIssueNotes: notes,
        cancellationReason: resolution === "cancel" ? (notes || issue) : undefined,
      }),
    });
    const data = await safeParseResponse<Order | { order?: Order; data?: Order }>(
      res,
      "Erro ao registrar ocorrência de entrega."
    );
    const orderObj: Order =
      "order" in data && data.order
        ? data.order
        : "data" in data && data.data
        ? data.data
        : (data as Order);

    dispatchOrderEvent("order_updated", orderObj);
    return orderObj;
  },

  async completeDelivery(orderId: string, courierCode?: string, orderCode?: string): Promise<Order> {
    const res = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        status: "completed",
        courierCode,
        orderPin: orderCode,
      }),
    });
    const data = await safeParseResponse<Order | { order?: Order; data?: Order }>(
      res,
      "Erro ao concluir entrega."
    );
    const orderObj: Order =
      "order" in data && data.order
        ? data.order
        : "data" in data && data.data
        ? data.data
        : (data as Order);

    dispatchOrderEvent("order_updated", orderObj);
    return orderObj;
  },
};
