import type { CorsOptions } from "cors";
import type { CookieOptions } from "express";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_FRONTEND_ORIGIN = "http://localhost:3000";

function getAllowedFrontendOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? DEFAULT_FRONTEND_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const authConfig = {
  cookieName: "jwt",
  jwtExpiresIn: "7d",
  cookieMaxAgeMs: SEVEN_DAYS_MS,
  jsonBodyLimit: "1mb",
  allowedFrontendOrigins: getAllowedFrontendOrigins(),
} as const;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function getAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    path: "/",
  };
}

export function getAuthCookieSetOptions(): CookieOptions {
  return {
    ...getAuthCookieOptions(),
    maxAge: authConfig.cookieMaxAgeMs,
  };
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || authConfig.allowedFrontendOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
