import express from "express";
import {
  createClub,
  getClubById,
  getClubs,
  joinClub,
  leaveClub,
  getJoinRequests,
  updateJoinRequest,
} from "../controllers/clubController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// List clubs
router.get("/", getClubs);

// Create club
router.post("/", requireAuth, createClub);

//Join public club or request to join private club
router.post("/:id/join", requireAuth, joinClub);

//Leave a club
router.delete("/:id/member", requireAuth, leaveClub);

// Get join requests for a club (owner/moderator only)
router.get("/:id/join-requests", requireAuth, getJoinRequests);

// Approve/reject join request (owner/moderator only)
router.patch("/:id/join-requests/:reqId", requireAuth, updateJoinRequest);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
