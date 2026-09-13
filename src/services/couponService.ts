export interface ValidatedCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  productIds?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  isActive: boolean;
  productIds: string[];
  createdAt: string;
}

export interface CreateCouponInput {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  productIds?: string[];
}

export interface UpdateCouponInput {
  code?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  minOrderValue?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  productIds?: string[];
}

export const couponService = {
  async getCoupons(): Promise<Coupon[]> {
    const res = await fetch("/api/coupons");
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao carregar cupons.");
    }
    return await res.json();
  },

  async createCoupon(input: CreateCouponInput): Promise<Coupon> {
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao criar cupom.");
    }
    return data;
  },

  async updateCoupon(id: string, input: UpdateCouponInput): Promise<Coupon> {
    const res = await fetch(`/api/coupons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar cupom.");
    }
    return data;
  },

  async toggleCouponStatus(id: string, isActive: boolean): Promise<{ id: string; code: string; isActive: boolean }> {
    const res = await fetch(`/api/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao alternar status do cupom.");
    }
    return data;
  },

  async deleteCoupon(id: string): Promise<void> {
    const res = await fetch(`/api/coupons/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Erro ao excluir cupom.");
    }
  },

  async validateCoupon(
    code: string,
    subtotal: number,
    productIds?: string[]
  ): Promise<{ valid: boolean; coupon?: ValidatedCoupon; message?: string }> {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal, productIds }),
    });

    return await res.json();
  },
};
