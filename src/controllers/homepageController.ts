import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { sendError } from "../utils/apiResponse";

export const getHomepageStats: RequestHandler = async (_req, res) => {
  try {
    const [
      readerCount,
      clubCount,
      activeReadingCycles,
      discussionTopics,
      readingEntries,
      openVoteRounds,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.bookClub.count(),
      prisma.readingCycle.count({ where: { status: "ACTIVE" } }),
      prisma.discussionTopic.count({ where: { deletedAt: null } }),
      prisma.readingEntry.count({ where: { deletedAt: null } }),
      prisma.bookVoteRound.count({ where: { status: "OPEN" } }),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        readerCount,
        clubCount,
        activeReadingCycles,
        discussionTopics,
        readingEntries,
        openVoteRounds,
      },
    });
  } catch (error) {
    console.error("GET /api/homepage/stats failed:", error);
    return sendError(
      res,
      500,
      "HOME_STATS_LOAD_FAILED",
      "Unable to load homepage statistics.",
    );
  }
};
