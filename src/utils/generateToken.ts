import jwt from "jsonwebtoken";

export const generateToken = (userId: string, res: any): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const payload = { id: userId };
  const token = jwt.sign(payload, secret, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true, //so that user's browser cannot access the cookie via JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return token;
};

export default generateToken;
