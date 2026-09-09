import type { Request } from "express";

import { authConfig } from "../config/authConfig";
import { verifyAuthToken } from "./authToken";
import { getCookieValue } from "./cookies";

export function getOptionalUserIdFromRequest(req: Request): string | undefined {
  const token = getCookieValue(req.headers.cookie, authConfig.cookieName);

  if (!token) {
    return undefined;
  }

  try {
    return verifyAuthToken(token).userId;
  } catch {
    return undefined;
  }
}
