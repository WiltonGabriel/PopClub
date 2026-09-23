export class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();

  constructor(private windowMs: number, private maxRequests: number) {}

  check(key: string): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetTime < now) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return { success: true, limit: this.maxRequests, remaining: this.maxRequests - 1, reset: now + this.windowMs };
    }

    if (record.count >= this.maxRequests) {
      return { success: false, limit: this.maxRequests, remaining: 0, reset: record.resetTime };
    }

    record.count++;
    this.store.set(key, record);
    return { success: true, limit: this.maxRequests, remaining: this.maxRequests - record.count, reset: record.resetTime };
  }
}

export const checkoutLimiter = new RateLimiter(60 * 1000, 10); // 10 requests per minute
export const couponLimiter = new RateLimiter(60 * 1000, 15); // 15 requests per minute
