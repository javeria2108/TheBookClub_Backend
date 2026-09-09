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
import { getClubOverviewById } from "../controllers/clubOverviewController";
import {
  updateMyBookRating,
  updateMyClubRating,
} from "../controllers/ratingController";
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
import {
  clubJoinRateLimit,
  discussionRateLimit,
  mutationRateLimit,
  votingRateLimit,
} from "../middleware/rateLimit";

const router = express.Router();

// List clubs
router.get("/", getClubs);

// Create club
router.post("/", requireAuth, mutationRateLimit, createClub);

//Join public club or request to join private club
router.post("/:id/join", requireAuth, clubJoinRateLimit, joinClub);

// Cancel pending join request for a private club
router.delete("/:id/join-request", requireAuth, clubJoinRateLimit, cancelJoinRequest);

//Leave a club
router.delete("/:id/member", requireAuth, clubJoinRateLimit, leaveClub);

// Delete a club (owner only)
router.delete("/:id", requireAuth, mutationRateLimit, deleteClub);

// Update club settings (owner only)
router.patch("/:id", requireAuth, mutationRateLimit, updateClub);

// Get join requests for a club (owner/moderator only)
router.get("/:id/join-requests", requireAuth, getJoinRequests);

// Approve/reject join request (owner/moderator only)
router.patch("/:id/join-requests/:reqId", requireAuth, clubJoinRateLimit, updateJoinRequest);

// Get club members (current members; emails only for owner)
router.get("/:id/members", requireAuth, getClubMembers);

// Update member role (owner only)
router.patch("/:id/members/:userId/role", requireAuth, mutationRateLimit, updateMemberRole);

// Transfer ownership (owner only)
router.patch("/:id/ownership", requireAuth, mutationRateLimit, transferClubOwnership);

router.get("/:id/overview", getClubOverviewById);
router.put("/:id/rating/me", requireAuth, mutationRateLimit, updateMyClubRating);
router.put(
  "/:clubId/books/:bookId/rating/me",
  requireAuth,
  mutationRateLimit,
  updateMyBookRating,
);

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
  mutationRateLimit,
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
  mutationRateLimit,
  createClubReadingTarget,
);
router.put(
  "/:clubId/reading-cycles/:cycleId/targets/order",
  requireAuth,
  mutationRateLimit,
  reorderClubReadingTargets,
);
router.patch(
  "/:clubId/reading-cycles/:cycleId/targets/:targetId",
  requireAuth,
  mutationRateLimit,
  updateClubReadingTarget,
);
router.delete(
  "/:clubId/reading-cycles/:cycleId/targets/:targetId",
  requireAuth,
  mutationRateLimit,
  deleteClubReadingTarget,
);
router.get("/:clubId/reading-cycles/:cycleId", requireAuth, getClubReadingCycle);
router.post("/:clubId/reading-cycles", requireAuth, mutationRateLimit, createClubReadingCycle);
router.patch(
  "/:clubId/reading-cycles/:cycleId",
  requireAuth,
  mutationRateLimit,
  updateClubReadingCycle,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/start",
  requireAuth,
  mutationRateLimit,
  startClubReadingCycle,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/complete",
  requireAuth,
  mutationRateLimit,
  completeClubReadingCycle,
);
router.post(
  "/:clubId/reading-cycles/:cycleId/cancel",
  requireAuth,
  mutationRateLimit,
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
  discussionRateLimit,
  createClubReadingEntry,
);
router.patch(
  "/:clubId/reading-entries/:entryId",
  requireAuth,
  mutationRateLimit,
  updateClubReadingEntry,
);
router.delete(
  "/:clubId/reading-entries/:entryId",
  requireAuth,
  mutationRateLimit,
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
  discussionRateLimit,
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
  mutationRateLimit,
  updateClubDiscussionTopic,
);
router.delete(
  "/:clubId/discussions/topics/:topicId",
  requireAuth,
  mutationRateLimit,
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
  discussionRateLimit,
  createClubDiscussionPost,
);
router.patch(
  "/:clubId/discussions/posts/:postId",
  requireAuth,
  mutationRateLimit,
  updateClubDiscussionPost,
);
router.delete(
  "/:clubId/discussions/posts/:postId",
  requireAuth,
  mutationRateLimit,
  deleteClubDiscussionPost,
);

router.get("/:clubId/book-vote-rounds", requireAuth, listClubBookVoteRounds);
router.post("/:clubId/book-vote-rounds", requireAuth, votingRateLimit, createClubBookVoteRound);
router.patch(
  "/:clubId/book-vote-rounds/:roundId",
  requireAuth,
  votingRateLimit,
  updateClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/open",
  requireAuth,
  votingRateLimit,
  openClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/close",
  requireAuth,
  votingRateLimit,
  closeClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/cancel",
  requireAuth,
  votingRateLimit,
  cancelClubBookVoteRound,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/nominations",
  requireAuth,
  votingRateLimit,
  createClubBookNomination,
);
router.delete(
  "/:clubId/book-vote-rounds/:roundId/nominations/:nominationId",
  requireAuth,
  votingRateLimit,
  deleteClubBookNomination,
);
router.put(
  "/:clubId/book-vote-rounds/:roundId/vote",
  requireAuth,
  votingRateLimit,
  voteInClubBookRound,
);
router.delete(
  "/:clubId/book-vote-rounds/:roundId/vote",
  requireAuth,
  votingRateLimit,
  clearClubBookVote,
);
router.post(
  "/:clubId/book-vote-rounds/:roundId/winner",
  requireAuth,
  votingRateLimit,
  resolveClubBookVoteWinner,
);

router.get("/:id/chat/messages", requireAuth, getMessages);

// Get single club by ID
router.get("/:id", getClubById);

export default router;
