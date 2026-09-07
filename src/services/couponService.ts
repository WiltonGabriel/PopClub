export interface ValidatedCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
}

export const couponService = {
  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; coupon?: ValidatedCoupon; message?: string }> {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });

    return await res.json();
  },
};
