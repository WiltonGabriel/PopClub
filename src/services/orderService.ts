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
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  user?: {
    fullName: string | null;
    username: string;
    email: string;
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
  async getOrdersByUser(_userId?: string): Promise<Order[]> {
    const res = await fetch("/api/orders");
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao listar pedidos.");
    }
    return await res.json();
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

    return data;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const res = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao atualizar status do pedido.");
    }
  },
};
