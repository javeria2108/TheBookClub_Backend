import type { CookieOptions } from "express";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const authConfig = {
  cookieName: "jwt",
  jwtExpiresIn: "7d",
  cookieMaxAgeMs: SEVEN_DAYS_MS,
  jsonBodyLimit: "1mb",
  allowedFrontendOrigin:
    process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
} as const;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  };
}

export function getAuthCookieSetOptions(): CookieOptions {
  return {
    ...getAuthCookieOptions(),
    maxAge: authConfig.cookieMaxAgeMs,
  };
}
