import express from "express";
import { createClub, getClubById, getClubs } from "../controllers/clubController";

const router = express.Router();

// List clubs
router.get("/", getClubs);

// Create club
router.post("/", createClub);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
