import { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

const registerUser: RequestHandler = async (req, res) => {
  const { name, email, password } = req.body;
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return res
      .status(400)
      .json({ message: "User with this email already exists" });
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
    }
  })

  res.status(201).json({
    status: "success",
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      }
    }});
};

export { registerUser };
