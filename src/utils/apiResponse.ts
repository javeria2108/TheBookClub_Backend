import type { Response } from "express";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "EMAIL_ALREADY_EXISTS"
  | "EXPIRED_TOKEN"
  | "INVALID_CREDENTIALS"
  | "INVALID_TOKEN"
  | "JWT_SECRET_MISSING"
  | "RATE_LIMITED"
  | "SESSION_RESTORE_FAILED"
  | "VALIDATION_ERROR";

export function sendError(
  res: Response,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
) {
  return res.status(statusCode).json({
    status: "error",
    error: {
      code,
      message,
    },
  });
}
