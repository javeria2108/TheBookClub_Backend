import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import path from "node:path";

type JwtPayload = {
  id?: string;
};

function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = getCookieValue(req.headers.cookie, "jwt");
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      status: "error",
      error: {
        code: "JWT_SECRET_MISSING",
        message: "JWT_SECRET is not configured",
      },
    });
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "AUTH_REQUIRED",
        message: "You must be logged in to access this resource.",
      },
    });
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (!payload.id) {
      return res.status(401).json({
        status: "error",
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid authentication token.",
        },
      });
    }

    res.locals.userId = payload.id;
    return next();
  } catch {
    return res.status(401).json({
      status: "error",
      error: {
        code: "INVALID_OR_EXPIRED_TOKEN",
        message: "Your session has expired. Please log in again.",
      },
    });
  }
};
