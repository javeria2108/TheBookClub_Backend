import { RequestHandler } from "express";

const registerUser: RequestHandler = async (req, res) => {
  const body = req.body;
  res.json(body);
};

export { registerUser };
