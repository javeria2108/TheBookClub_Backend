import express from "express";
import {
  createClub,
  getClubById,
  getClubs,
  joinClub,
  leaveClub,
} from "../controllers/clubController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// List clubs
router.get("/", getClubs);

// Create club
router.post("/", createClub);

//Join public club
router.post("/:id/join", requireAuth, joinClub);

//Leave a club
router.delete("/:id/member", requireAuth, leaveClub);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
