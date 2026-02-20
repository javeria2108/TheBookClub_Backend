import jwt from "jsonwebtoken";

const generateToken = (userId: String) => {
  const payload = { id: userId };
  const token = jwt.sign(payload);
};
