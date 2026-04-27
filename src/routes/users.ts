import express from "express";
import { getMyClubs } from "../controllers/clubController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// Get clubs for the current authenticated user
router.get("/me/clubs", requireAuth, getMyClubs);

export default router;
