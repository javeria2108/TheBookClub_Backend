import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";

export const getMessages: RequestHandler = async (req, res) => {
  const clubId = req.params.id;
  const roomId = req.query.roomId as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  if (!clubId)
    return res.status(400).json({ error: { message: "Club id required" } });

  const where: any = { clubId };
  if (roomId) where.roomId = roomId;

  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, username: true } } },
  });

  return res.status(200).json({
    status: "success",
    data: { messages: messages.reverse() },
  });
};
