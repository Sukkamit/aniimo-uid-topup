import { Request, Response, NextFunction } from 'express';

interface ClientRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private clients: Map<string, ClientRecord> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  public check(ip: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.clients.get(ip);
    if (!record) {
      record = { timestamps: [] };
      this.clients.set(ip, record);
    }

    // Filter out timestamps outside the active sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const result = this.check(clientIp);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfterSeconds);
        res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests from IP ${clientIp}. Please retry in ${result.retryAfterSeconds} seconds.`,
          retryAfter: result.retryAfterSeconds,
        });
        return;
      }

      next();
    };
  }

  public reset(): void {
    this.clients.clear();
  }
}

export const rateLimiter = new SlidingWindowRateLimiter(60000, 30);
