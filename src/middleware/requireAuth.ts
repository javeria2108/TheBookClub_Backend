import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  id?: string;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res
      .status(401)
      .json({ error: { message: "Authorization token is required" } });
  }

  const token = authHeader.slice("Bearer".length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res
      .status(500)
      .json({ error: { message: "JWT_SECRET is not configured" } });
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (!payload.id) {
      return res
        .status(401)
        .json({ error: { message: "Invalid authorization token" } });
    }
    res.locals.userId = payload.id;
    return next();
  } catch {
    return res
      .status(401)
      .json({ error: { message: "Invalid auth or expired auth token" } });
  }
};
