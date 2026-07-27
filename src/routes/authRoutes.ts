import express from "express";
import {
  getMe,
  getSocketToken,
  loginUser,
  logout,
  registerUser,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";
import { authRateLimit } from "../middleware/rateLimit";

const router = express.Router();

router.post("/register", authRateLimit, registerUser);
router.post("/login", authRateLimit, loginUser);
router.get("/me", requireAuth, getMe);
router.get("/socket-token", requireAuth, getSocketToken);
router.post("/logout", logout);

export default router;
