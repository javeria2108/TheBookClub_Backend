import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";

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

    const rawLimit = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200)
      : 50;

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

    const where = roomId ? { clubId, roomId } : { clubId };

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const uniqueUserIds = Array.from(new Set(messages.map((m) => m.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, username: true },
    });

    const usernamesById = new Map(users.map((u) => [u.id, u.username]));

    return res.status(200).json({
      status: "success",
      data: {
        messages: messages.reverse().map((m) => ({
          id: m.id,
          roomId: m.roomId,
          clubId: m.clubId,
          userId: m.userId,
          username: usernamesById.get(m.userId) ?? "Unknown user",
          content: m.content,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/clubs/:id/chat/messages failed:", error);
    return res.status(500).json({
      error: { message: "Failed to fetch chat messages" },
    });
  }
};
