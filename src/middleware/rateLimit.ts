import type { Request, RequestHandler, Response } from "express";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  message: string;
  keyGenerator?: (req: Request, res: Response) => string;
};

export function createRateLimit({
  maxRequests,
  windowMs,
  message,
  keyGenerator,
}: RateLimitOptions): RequestHandler {
  const attempts = new Map<string, RateLimitRecord>();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator
      ? keyGenerator(req, res)
      : req.ip ?? "unknown";
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
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

function userOrIpKey(req: Request, res: Response) {
  const userId = res.locals.userId as string | undefined;
  return userId ? `user:${userId}` : `ip:${req.ip ?? "unknown"}`;
}

export const authRateLimit = createRateLimit({
  maxRequests: 20,
  windowMs: 15 * 60 * 1000,
  message: "Too many authentication attempts. Please try again later.",
});

export const searchRateLimit = createRateLimit({
  maxRequests: 60,
  windowMs: 60 * 1000,
  message: "Too many search requests. Please slow down and try again.",
});

export const clubJoinRateLimit = createRateLimit({
  maxRequests: 20,
  windowMs: 15 * 60 * 1000,
  message: "Too many membership actions. Please try again later.",
  keyGenerator: userOrIpKey,
});

export const mutationRateLimit = createRateLimit({
  maxRequests: 80,
  windowMs: 15 * 60 * 1000,
  message: "Too many changes in a short time. Please try again later.",
  keyGenerator: userOrIpKey,
});

export const discussionRateLimit = createRateLimit({
  maxRequests: 45,
  windowMs: 10 * 60 * 1000,
  message: "Too many discussion posts. Please pause briefly before posting again.",
  keyGenerator: userOrIpKey,
});

export const votingRateLimit = createRateLimit({
  maxRequests: 40,
  windowMs: 10 * 60 * 1000,
  message: "Too many voting actions. Please try again shortly.",
  keyGenerator: userOrIpKey,
});

export const notificationRateLimit = createRateLimit({
  maxRequests: 80,
  windowMs: 10 * 60 * 1000,
  message: "Too many notification updates. Please try again shortly.",
  keyGenerator: userOrIpKey,
});
