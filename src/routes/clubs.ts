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
  cancelClubBookVoteRound,
  clearClubBookVote,
  closeClubBookVoteRound,
  createClubBookNomination,
  createClubBookVoteRound,
  deleteClubBookNomination,
  listClubBookVoteRounds,
  openClubBookVoteRound,
  resolveClubBookVoteWinner,
  updateClubBookVoteRound,
  voteInClubBookRound,
} from "../controllers/bookVoteController";
import {
  createClubDiscussionPost,
  createClubDiscussionTopic,
  deleteClubDiscussionPost,
  deleteClubDiscussionTopic,
  getClubDiscussionTopic,
  listClubDiscussionPosts,
  listClubDiscussionTopics,
  updateClubDiscussionPost,
  updateClubDiscussionTopic,
} from "../controllers/discussionController";
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
import {
  createClubReadingEntry,
  deleteClubReadingEntry,
  listClubReadingEntries,
  updateClubReadingEntry,
} from "../controllers/readingEntryController";
import {
  createClubReadingTarget,
  deleteClubReadingTarget,
  listClubReadingTargets,
  reorderClubReadingTargets,
  updateClubReadingTarget,
} from "../controllers/readingTargetController";
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

// Get club members (current members; emails only for owner)
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
router.get(
  "/:clubId/reading-cycles/:cycleId/targets",
  requireAuth,
  listClubReadingTargets,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/targets",
  requireAuth,
  createClubReadingTarget,
);
router.put(
  "/:clubId/reading-cycles/:cycleId/targets/order",
  requireAuth,
  reorderClubReadingTargets,
);
router.patch(
  "/:clubId/reading-cycles/:cycleId/targets/:targetId",
  requireAuth,
  updateClubReadingTarget,
);
router.delete(
  "/:clubId/reading-cycles/:cycleId/targets/:targetId",
  requireAuth,
  deleteClubReadingTarget,
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
router.get(
  "/:clubId/reading-cycles/:cycleId/entries",
  requireAuth,
  listClubReadingEntries,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/entries",
  requireAuth,
  createClubReadingEntry,
);
router.patch(
  "/:clubId/reading-entries/:entryId",
  requireAuth,
  updateClubReadingEntry,
);
router.delete(
  "/:clubId/reading-entries/:entryId",
  requireAuth,
  deleteClubReadingEntry,
);

router.get(
  "/:clubId/discussions/topics",
  requireAuth,
  listClubDiscussionTopics,
);
router.post(
  "/:clubId/discussions/topics",
  requireAuth,
  createClubDiscussionTopic,
);
router.get(
  "/:clubId/discussions/topics/:topicId",
  requireAuth,
  getClubDiscussionTopic,
);
router.patch(
  "/:clubId/discussions/topics/:topicId",
  requireAuth,
  updateClubDiscussionTopic,
);
router.delete(
  "/:clubId/discussions/topics/:topicId",
  requireAuth,
  deleteClubDiscussionTopic,
);
router.get(
  "/:clubId/discussions/topics/:topicId/posts",
  requireAuth,
  listClubDiscussionPosts,
);
router.post(
  "/:clubId/discussions/topics/:topicId/posts",
  requireAuth,
  createClubDiscussionPost,
);
router.patch(
  "/:clubId/discussions/posts/:postId",
  requireAuth,
  updateClubDiscussionPost,
);
router.delete(
  "/:clubId/discussions/posts/:postId",
  requireAuth,
  deleteClubDiscussionPost,
);

router.get("/:clubId/book-vote-rounds", requireAuth, listClubBookVoteRounds);
router.post("/:clubId/book-vote-rounds", requireAuth, createClubBookVoteRound);
router.patch(
  "/:clubId/book-vote-rounds/:roundId",
  requireAuth,
  updateClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/open",
  requireAuth,
  openClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/close",
  requireAuth,
  closeClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/cancel",
  requireAuth,
  cancelClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/nominations",
  requireAuth,
  createClubBookNomination,
);
router.delete(
  "/:clubId/book-vote-rounds/:roundId/nominations/:nominationId",
  requireAuth,
  deleteClubBookNomination,
);
router.put(
  "/:clubId/book-vote-rounds/:roundId/vote",
  requireAuth,
  voteInClubBookRound,
);
router.delete(
  "/:clubId/book-vote-rounds/:roundId/vote",
  requireAuth,
  clearClubBookVote,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/winner",
  requireAuth,
  resolveClubBookVoteWinner,
);

router.get("/:id/chat/messages", requireAuth, getMessages);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
