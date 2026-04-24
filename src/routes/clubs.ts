import express from "express";
import {
	createClub,
	getClubById,
	getClubs,
	joinClub,
} from "../controllers/clubController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// List clubs
router.get("/", getClubs);

// Create club
router.post("/", createClub);

// Join public club (auth required)
router.post("/:id/join", requireAuth, joinClub);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
