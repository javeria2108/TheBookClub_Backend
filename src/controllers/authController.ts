import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken";
import { getFirstValidationMessage } from "../utils/validation";
import { UserLoginSchema, UserRegisterSchema } from "../schemas";
import type { AuthSuccessData, AuthUserResponse } from "../types/auth.types";

const registerUser: RequestHandler = async (req, res) => {
  const validation = UserRegisterSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: { message: getFirstValidationMessage(validation.error) },
    });
  }

  const { name, email, password } = validation.data;
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return res
      .status(400)
      .json({ error: { message: "User with this email already exists" } });
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

  const token = generateToken(user.id, res);
  res.status(201).json({
    status: "success",
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      } satisfies AuthUserResponse,
      token,
    } satisfies AuthSuccessData,
  });
};

const loginUser: RequestHandler = async (req, res) => {
  const validation = UserLoginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: { message: getFirstValidationMessage(validation.error) },
    });
  }

  const { email, password } = validation.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return res
      .status(400)
      .json({ error: { message: "Invalid email or password" } });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res
      .status(400)
      .json({ error: { message: "Invalid email or password" } });
  }

  const token = generateToken(user.id, res);
  res.status(200).json({
    status: "success",
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      } satisfies AuthUserResponse,
      token,
    } satisfies AuthSuccessData,
  });
};

const logout: RequestHandler = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({
    status: "success",
    message: "logged out successfully",
  });
};
export { registerUser, loginUser, logout };
