import { dispatchOrderEvent } from "../lib/orderEvents";

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
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
  delivery_address?: DeliveryAddress;
  shift_id?: string | null;
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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao buscar seus pedidos.");
    }
    return await res.json();
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erro ao vincular pedidos.");
    }
    return data;
  },

  async getAllOrders(includeArchived = false): Promise<Order[]> {
    const url = `/api/orders?all=true&includeArchived=${includeArchived ? "true" : "false"}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao listar todos os pedidos.");
    }
    return await res.json();
  },

  async getHistoricalOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
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

    const res = await fetch(`/api/orders?${query.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao buscar histórico de pedidos.");
    }
    return await res.json();
  },

  async createCheckoutOrder(payload: CheckoutPayload): Promise<{ success: boolean; order: any }> {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Erro ao finalizar pedido.");
    }

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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar status do pedido.");
    }

    dispatchOrderEvent("order_updated", data);
    return data;
  },

  async cancelOrder(orderId: string, cancellationReason: string): Promise<Order> {
    return this.updateOrderStatus(orderId, "cancelled", cancellationReason);
  },

  async getOrderById(orderId: string): Promise<Order> {
    const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Pedido não encontrado.");
    }
    // Retorna o objeto do pedido caso venha encapsulado ou direto
    return data.order || data;
  },

  async dispatchOrder(
    orderId: string,
    enableGps: boolean
  ): Promise<{ order: Order; trackingToken?: string | null; trackingUrl?: string | null }> {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enableGps }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao despachar pedido.");
    }
    if (data.order) {
      dispatchOrderEvent("order_updated", data.order);
    }
    return data;
  },
};
