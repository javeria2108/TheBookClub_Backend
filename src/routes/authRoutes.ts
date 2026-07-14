import express from "express";
import {
  getMe,
  loginUser,
  logout,
  registerUser,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";
import { createRateLimit } from "../middleware/rateLimit";

const router = express.Router();

const authRateLimit = createRateLimit({
  maxRequests: 20,
  windowMs: 15 * 60 * 1000,
  message: "Too many authentication attempts. Please try again later.",
});

router.post("/register", authRateLimit, registerUser);
router.post("/login", authRateLimit, loginUser);
router.get("/me", requireAuth, getMe);
router.post("/logout", logout);

export default router;
