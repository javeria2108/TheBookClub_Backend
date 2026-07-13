import express from "express";
import {
  getMe,
  loginUser,
  logout,
  registerUser,
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", requireAuth, getMe);
router.post("/logout", logout);

export default router;
