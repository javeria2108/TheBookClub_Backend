import { RequestHandler } from "express";

const registerUser: RequestHandler = async (req, res) => {
  res.json({ message: "success" });
};

export { registerUser };
