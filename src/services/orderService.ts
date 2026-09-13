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
}

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  subtotal?: number;
  discount_amount?: number;
  total_amount: number;
  payment_method_type?: string;
  payment_change_for?: number | null;
  delivery_address?: DeliveryAddress;
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
  async getMyOrders(): Promise<Order[]> {
    const res = await fetch("/api/orders");
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao buscar seus pedidos.");
    }
    return await res.json();
  },

  async getOrdersByUser(): Promise<Order[]> {
    return this.getMyOrders();
  },

  async getAllOrders(): Promise<Order[]> {
    const res = await fetch("/api/orders?all=true");
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao listar todos os pedidos.");
    }
    return await res.json();
  },

  async createCheckoutOrder(payload: CheckoutPayload): Promise<{ success: boolean; order: any }> {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
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
};
