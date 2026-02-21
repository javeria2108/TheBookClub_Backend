import express from "express";
import { loginUser, logout, registerUser } from "../controllers/authController";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("logout", logout);

export default router;
