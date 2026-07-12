import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";

const DEFAULT_CHAT_PAGE_LIMIT = 50;
const MAX_CHAT_PAGE_LIMIT = 100;

function parseLimit(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_CHAT_PAGE_LIMIT);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_CHAT_PAGE_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_CHAT_PAGE_LIMIT);
}

export const getMessages: RequestHandler = async (req, res) => {
  try {
    const rawClubId = req.params.id;
    const clubId = Array.isArray(rawClubId) ? rawClubId[0] : rawClubId;
    const roomId = req.query.roomId as string | undefined;
    const authUserId = res.locals.userId as string | undefined;

    if (!clubId) {
      return res.status(400).json({
        error: { message: "Club id required" },
      });
    }

    if (!authUserId) {
      return res.status(401).json({
        error: { message: "Authentication required" },
      });
    }

    const limit = parseLimit(req.query.limit);
    const cursor = (req.query.cursor as string | undefined)?.trim();
    const cursorDate = cursor ? new Date(cursor) : null;

    if (cursor && (!cursorDate || Number.isNaN(cursorDate.getTime()))) {
      return res.status(400).json({
        error: { message: "Invalid chat cursor" },
      });
    }

    // Only club members can read chat history.
    const membership = await prisma.clubMember.findUnique({
      where: { userId_clubId: { userId: authUserId, clubId } },
      select: { id: true },
    });

    if (!membership) {
      return res.status(403).json({
        error: { message: "You must be a member of this club to view chat" },
      });
    }

    const where = {
      clubId,
      ...(roomId ? { roomId } : {}),
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    };

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const pageMessages = messages.slice(0, limit);
    const hasMore = messages.length > limit;
    const oldestMessage = pageMessages[pageMessages.length - 1];

    const uniqueUserIds = Array.from(
      new Set(pageMessages.map((m) => m.userId)),
    );
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, username: true },
    });

    const usernamesById = new Map(users.map((u) => [u.id, u.username]));

    return res.status(200).json({
      status: "success",
      data: {
        messages: pageMessages.reverse().map((m) => {
          const isDeleted = Boolean(m.deletedAt);

          return {
            id: m.id,
            roomId: m.roomId,
            clubId: m.clubId,
            userId: m.userId,
            username: usernamesById.get(m.userId) ?? "Unknown user",
            content: isDeleted ? "" : m.content,
            createdAt: m.createdAt,
            isDeleted,
            deletedAt: m.deletedAt,
          };
        }),
        pagination: {
          nextCursor:
            hasMore && oldestMessage
              ? oldestMessage.createdAt.toISOString()
              : null,
          hasMore,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/clubs/:id/chat/messages failed:", error);
    return res.status(500).json({
      error: { message: "Failed to fetch chat messages" },
    });
  }
};
