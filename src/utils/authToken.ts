import jwt, { type SignOptions } from "jsonwebtoken";

import { authConfig, getJwtSecret } from "../config/authConfig";

type JwtPayload = {
  id?: string;
};

export type AuthTokenPayload = {
  userId: string;
};

export function signAuthToken(
  userId: string,
  expiresIn: SignOptions["expiresIn"] = authConfig.jwtExpiresIn,
): string {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

  if (!payload.id) {
    throw new Error("Invalid authentication token");
  }

  return { userId: payload.id };
}
