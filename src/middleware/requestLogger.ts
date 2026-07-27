import type { RequestHandler } from "express";
import { logger } from "../utils/logger";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    if (res.statusCode < 500) return;

    logger.warn("http_request_failed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: res.locals.userId,
    });
  });

  next();
};
