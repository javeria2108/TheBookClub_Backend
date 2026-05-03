import express from "express";
import {
  cancelJoinRequest,
  createClub,
  getClubById,
  getClubs,
  joinClub,
  leaveClub,
  getJoinRequests,
  updateJoinRequest,
  updateMemberRole,
} from "../controllers/clubController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// List clubs
router.get("/", getClubs);

// Create club
router.post("/", requireAuth, createClub);

//Join public club or request to join private club
router.post("/:id/join", requireAuth, joinClub);

// Cancel pending join request for a private club
router.delete("/:id/join-request", requireAuth, cancelJoinRequest);

//Leave a club
router.delete("/:id/member", requireAuth, leaveClub);

// Get join requests for a club (owner/moderator only)
router.get("/:id/join-requests", requireAuth, getJoinRequests);

// Approve/reject join request (owner/moderator only)
router.patch("/:id/join-requests/:reqId", requireAuth, updateJoinRequest);

// Update member role (owner only)
router.patch("/:id/members/:userId/role", requireAuth, updateMemberRole);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
