import express from "express";
import {
  cancelJoinRequest,
  createClub,
  deleteClub,
  getClubById,
  getClubMembers,
  getClubs,
  getJoinRequests,
  joinClub,
  leaveClub,
  transferClubOwnership,
  updateClub,
  updateJoinRequest,
  updateMemberRole,
} from "../controllers/clubController";
import { getMessages } from "../controllers/chatControllers";
import {
  cancelClubReadingCycle,
  completeClubReadingCycle,
  createClubReadingCycle,
  getClubReadingCycle,
  getCurrentClubReadingCycle,
  listClubReadingCycles,
  startClubReadingCycle,
  updateClubReadingCycle,
} from "../controllers/readingCycleController";
import {
  getClubReadingProgress,
  updateMyClubReadingProgress,
} from "../controllers/readingProgressController";
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

// Delete a club (owner only)
router.delete("/:id", requireAuth, deleteClub);

// Update club settings (owner only)
router.patch("/:id", requireAuth, updateClub);

// Get join requests for a club (owner/moderator only)
router.get("/:id/join-requests", requireAuth, getJoinRequests);

// Approve/reject join request (owner/moderator only)
router.patch("/:id/join-requests/:reqId", requireAuth, updateJoinRequest);

// Get club members (owner only)
router.get("/:id/members", requireAuth, getClubMembers);

// Update member role (owner only)
router.patch("/:id/members/:userId/role", requireAuth, updateMemberRole);

// Transfer ownership (owner only)
router.patch("/:id/ownership", requireAuth, transferClubOwnership);

router.get("/:clubId/reading-cycles", requireAuth, listClubReadingCycles);
router.get("/:clubId/reading-cycles/current", getCurrentClubReadingCycle);
router.get(
  "/:clubId/reading-cycles/:cycleId/progress",
  requireAuth,
  getClubReadingProgress,
);
router.put(
  "/:clubId/reading-cycles/:cycleId/progress/me",
  requireAuth,
  updateMyClubReadingProgress,
);
router.get("/:clubId/reading-cycles/:cycleId", requireAuth, getClubReadingCycle);
router.post("/:clubId/reading-cycles", requireAuth, createClubReadingCycle);
router.patch(
  "/:clubId/reading-cycles/:cycleId",
  requireAuth,
  updateClubReadingCycle,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/start",
  requireAuth,
  startClubReadingCycle,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/complete",
  requireAuth,
  completeClubReadingCycle,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/cancel",
  requireAuth,
  cancelClubReadingCycle,
);

router.get("/:id/chat/messages", requireAuth, getMessages);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
