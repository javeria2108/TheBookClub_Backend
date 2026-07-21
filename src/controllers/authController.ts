import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig, getAuthCookieOptions } from "../config/authConfig";
import generateToken from "../utils/generateToken";
import { signAuthToken } from "../utils/authToken";
import { sendError } from "../utils/apiResponse";
import { getFirstValidationMessage } from "../utils/validation";
import { UserLoginSchema, UserRegisterSchema } from "../schemas";
import type {
  AuthSuccessData,
  AuthUserResponse,
  SocketTokenSuccessData,
} from "../types/auth.types";

function toAuthUser(user: {
  id: string;
  email: string;
  username: string;
  role: AuthUserResponse["role"];
}): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };
}

const registerUser: RequestHandler = async (req, res) => {
  const validation = UserRegisterSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  const { name, email, password } = validation.data;
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return sendError(
      res,
      409,
      "EMAIL_ALREADY_EXISTS",
      "User with this email already exists.",
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      username: name,
      email: email,
      passwordHash: hashedPassword,
    },
  });

  generateToken(user.id, res);

  return res.status(201).json({
    status: "success",
    data: {
      user: toAuthUser(user),
    } satisfies AuthSuccessData,
  });
};

const loginUser: RequestHandler = async (req, res) => {
  const validation = UserLoginSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      getFirstValidationMessage(validation.error),
    );
  }

  const { email, password } = validation.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  generateToken(user.id, res);

  return res.status(200).json({
    status: "success",
    data: {
      user: toAuthUser(user),
    } satisfies AuthSuccessData,
  });
};

const getMe: RequestHandler = async (_req, res) => {
  const userId = res.locals.userId as string | undefined;

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  });

  if (!user) {
    return sendError(
      res,
      401,
      "SESSION_RESTORE_FAILED",
      "Authenticated user could not be found.",
    );
  }

  return res.status(200).json({
    status: "success",
    data: {
      user: toAuthUser(user),
    } satisfies AuthSuccessData,
  });
};

const getSocketToken: RequestHandler = async (_req, res) => {
  const userId = res.locals.userId as string | undefined;

  if (!userId) {
    return sendError(res, 401, "AUTH_REQUIRED", "You must be signed in to continue.");
  }

  return res.status(200).json({
    status: "success",
    data: {
      token: signAuthToken(userId, "5m"),
    } satisfies SocketTokenSuccessData,
  });
};

const logout: RequestHandler = async (_req, res) => {
  res.clearCookie(authConfig.cookieName, {
    ...getAuthCookieOptions(),
    expires: new Date(0),
  });

  return res.status(200).json({
    status: "success",
    data: {
      message: "Logged out successfully.",
    },
  });
};

export { registerUser, loginUser, getMe, getSocketToken, logout };
