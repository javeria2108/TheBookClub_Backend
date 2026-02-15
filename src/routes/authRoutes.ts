import express from "express";
import { registerUser } from "../controllers/authController";

const router = express.Router();

router.get("/register", registerUser);

export default router;
