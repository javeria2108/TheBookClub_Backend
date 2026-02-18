import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
const registerUser: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body;
  const userExists = await prisma.user.findUnique({ where: { email } });
};

export { registerUser };
