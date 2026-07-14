import { RequestHandler } from "express";

import { authConfig } from "../config/authConfig";
import { verifyAuthToken } from "../utils/authToken";
import { sendError } from "../utils/apiResponse";
import { getCookieValue } from "../utils/cookies";

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = getCookieValue(req.headers.cookie, authConfig.cookieName);

  if (!token) {
    return sendError(
      res,
      401,
      "AUTH_REQUIRED",
      "You must be signed in to continue.",
    );
  }

  try {
    const payload = verifyAuthToken(token);
    res.locals.userId = payload.userId;
    return next();
  } catch (error) {
    if (error instanceof Error && error.message === "JWT_SECRET is not configured") {
      return sendError(res, 500, "JWT_SECRET_MISSING", error.message);
    }

    return sendError(
      res,
      401,
      "INVALID_TOKEN",
      "Your session is invalid or expired. Please sign in again.",
    );
  }
};
