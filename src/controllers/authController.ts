import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken";
import { getFirstValidationMessage } from "../utils/validation";
import { UserLoginSchema, UserRegisterSchema } from "../schemas";
import type { AuthSuccessData, AuthUserResponse } from "../types/auth.types";

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
    return res.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: getFirstValidationMessage(validation.error),
      },
    });
  }

  const { name, email, password } = validation.data;
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return res.status(409).json({
      status: "error",
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "User with this email already exists.",
      },
    });
  }

  //hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  //Create user
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
    return res.status(400).json({
      status: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: getFirstValidationMessage(validation.error),
      },
    });
  }

  const { email, password } = validation.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    });
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
    return res.status(401).json({
      status: "error",
      error: {
        code: "AUTH_REQUIRED",
        message: "You must be logged in to access this resource.",
      },
    });
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
    return res.status(401).json({
      status: "error",
      error: {
        code: "USER_NOT_FOUND",
        message: "Authenticated user could not be found.",
      },
    });
  }

  return res.status(200).json({
    status: "success",
    data: {
      user: toAuthUser(user),
    } satisfies AuthSuccessData,
  });
};

const logout: RequestHandler = async (_req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
  });

  return res.status(200).json({
    status: "success",
    data: {
      message: "Logged out successfully.",
    },
  });
};

export { registerUser, loginUser, getMe, logout };
