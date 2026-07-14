import type { RequestHandler } from "express";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  message: string;
};

export function createRateLimit({
  maxRequests,
  windowMs,
  message,
}: RateLimitOptions): RequestHandler {
  const attempts = new Map<string, RateLimitRecord>();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      return res.status(429).json({
        status: "error",
        error: {
          code: "RATE_LIMITED",
          message,
        },
      });
    }

    current.count += 1;
    attempts.set(key, current);
    return next();
  };
}
