import type { Response } from "express";

import { getAuthCookieSetOptions, authConfig } from "../config/authConfig";
import { signAuthToken } from "./authToken";

export const generateToken = (userId: string, res: Response): void => {
  res.cookie(authConfig.cookieName, signAuthToken(userId), getAuthCookieSetOptions());
};

export default generateToken;
