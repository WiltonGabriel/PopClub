import { supabase } from "../lib/supabase";
import { Product } from "./productService";
import { UserLocation } from "./userService";

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_time: number;
  product?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export interface PaymentMethod {
  id: string;
  type: string;
  provider: string | null;
  last_four: string | null;
  brand: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_location_id: string | null;
  payment_method_id: string | null;
  coupon_id: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  location?: UserLocation;
  coupon?: Coupon;
  payment_method?: PaymentMethod;
}

export const orderService = {
  async getOrdersByUser(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        items:order_items(*, product:products(*)),
        location:user_locations(*),
        coupon:coupons(*),
        payment_method:payment_methods(*)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        items:order_items(*, product:products(*)),
        location:user_locations(*),
        coupon:coupons(*),
        payment_method:payment_methods(*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        items:order_items(*, product:products(*)),
        location:user_locations(*),
        coupon:coupons(*),
        payment_method:payment_methods(*)
      `)
      .eq("id", orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async createOrder(
    userId: string, 
    items: { product_id: string; quantity: number; price: number }[], 
    locationId: string | null,
    paymentMethodId: string | null = null,
    couponId: string | null = null,
    discountedTotal?: number
  ): Promise<Order> {
    const raw_total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total_amount = discountedTotal !== undefined ? discountedTotal : raw_total_amount;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([{
        user_id: userId,
        total_amount,
        delivery_location_id: locationId,
        payment_method_id: paymentMethodId,
        coupon_id: couponId,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_time: item.price
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw new Error(itemsError.message);

    return await this.getOrderById(order.id) as Order;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) throw new Error(error.message);
  }
};
