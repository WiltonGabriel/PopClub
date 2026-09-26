export class RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private windowMs: number, private maxRequests: number) {
    // Automatically clean up expired records to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (record.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, windowMs * 2);
    // Unref the interval to prevent it from keeping the Node.js process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

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
export const couponLimiter = new RateLimiter(60 * 1000, 10); // 10 requests per minute
export const authLimiter = new RateLimiter(60 * 1000, 5); // 5 requests per minute
export const forgotPasswordLimiter = new RateLimiter(15 * 60 * 1000, 3); // 3 requests per 15 minutes

export function getIpFromRequest(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
  return "anonymous";
}
