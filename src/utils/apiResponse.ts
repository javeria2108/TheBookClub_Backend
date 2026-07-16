import type { Response } from "express";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "BOOK_ALREADY_EXISTS"
  | "BOOK_CREATE_FAILED"
  | "BOOK_DELETE_FAILED"
  | "BOOK_MANAGEMENT_FORBIDDEN"
  | "BOOK_NOT_FOUND"
  | "BOOK_UPDATE_FAILED"
  | "EMAIL_ALREADY_EXISTS"
  | "EXPIRED_TOKEN"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "INVALID_CREDENTIALS"
  | "INVALID_TOKEN"
  | "JWT_SECRET_MISSING"
  | "PROFILE_LOAD_FAILED"
  | "PROFILE_UPDATE_FAILED"
  | "RATE_LIMITED"
  | "SESSION_RESTORE_FAILED"
  | "USERNAME_ALREADY_EXISTS"
  | "USER_NOT_FOUND"
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
