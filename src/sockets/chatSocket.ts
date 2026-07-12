import type { Server as IOServer, Socket } from "socket.io";
import { prisma } from "../lib/prisma";

const MAX_MESSAGE_LENGTH = 1000;

type Ack<T = undefined> = (payload: {
  ok: boolean;
  message?: string;
  data?: T;
}) => void;

type ChatParticipant = {
  socketId: string;
  userId: string;
  username: string;
};

type ChatMessagePayload = {
  roomId: string;
  clubId: string;
  content: string;
  clientMessageId?: string;
};

type EditMessagePayload = {
  messageId: string;
  clubId: string;
  content: string;
};

type DeleteMessagePayload = {
  messageId: string;
  clubId: string;
};

type TypingPayload = {
  roomId: string;
  clubId: string;
};

type JoinRoomPayload = {
  roomId: string;
  clubId: string;
};

type LeaveRoomPayload = {
  roomId: string;
};

type SerializedChatMessage = {
  id: string;
  roomId: string;
  clubId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  clientMessageId?: string;
};

const roomParticipants = new Map<string, Map<string, ChatParticipant>>();
const socketRooms = new Map<string, Set<string>>();

function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getRoomParticipants(roomId: string): Map<string, ChatParticipant> {
  const existing = roomParticipants.get(roomId);
  if (existing) return existing;

  const created = new Map<string, ChatParticipant>();
  roomParticipants.set(roomId, created);
  return created;
}

function addSocketRoom(socketId: string, roomId: string): void {
  const rooms = socketRooms.get(socketId) ?? new Set<string>();
  rooms.add(roomId);
  socketRooms.set(socketId, rooms);
}

function removeSocketRoom(socketId: string, roomId: string): void {
  const rooms = socketRooms.get(socketId);
  if (!rooms) return;

  rooms.delete(roomId);
  if (rooms.size === 0) {
    socketRooms.delete(socketId);
  }
}

async function getUsername(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  return user?.username ?? "Reader";
}

async function getMembership(userId: string, clubId: string) {
  return prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
}

async function ensureMember(userId: string, clubId: string) {
  const membership = await getMembership(userId, clubId);
  if (!membership) {
    throw new Error("You must be a member of this club");
  }

  return membership;
}

async function ensureChatRoom(roomId: string, clubId: string): Promise<void> {
  const existingRoom = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, clubId: true },
  });

  if (!existingRoom) {
    await prisma.chatRoom.create({
      data: {
        id: roomId,
        clubId,
        name: "General",
      },
    });
    return;
  }

  if (existingRoom.clubId !== clubId) {
    throw new Error("Room does not belong to this club");
  }
}

function validateContent(content: unknown): string {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Message cannot be empty");
  }

  const trimmed = content.trim();
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error("Message is too long");
  }

  return trimmed;
}

function serializeMessage(
  message: {
    id: string;
    roomId: string;
    clubId: string;
    userId: string;
    content: string;
    createdAt: Date;
    deletedAt: Date | null;
    user: { username: string };
  },
  clientMessageId?: string,
): SerializedChatMessage {
  const isDeleted = Boolean(message.deletedAt);

  return {
    id: message.id,
    roomId: message.roomId,
    clubId: message.clubId,
    userId: message.userId,
    username: message.user.username,
    content: isDeleted ? "" : message.content,
    createdAt: message.createdAt,
    isDeleted,
    deletedAt: message.deletedAt,
    ...(clientMessageId ? { clientMessageId } : {}),
  };
}

function emitPresence(io: IOServer, roomId: string): void {
  const participants = Array.from(getRoomParticipants(roomId).values());
  io.to(roomId).emit("chatPresence", { roomId, participants });
}

function leaveTrackedRoom(io: IOServer, socket: Socket, roomId: string): void {
  const participants = roomParticipants.get(roomId);
  participants?.delete(socket.id);

  if (participants?.size === 0) {
    roomParticipants.delete(roomId);
  }

  removeSocketRoom(socket.id, roomId);
  socket.leave(roomId);
  socket.to(roomId).emit("userStoppedTyping", { roomId, socketId: socket.id });
  emitPresence(io, roomId);
}

function leaveAllTrackedRooms(io: IOServer, socket: Socket): void {
  const rooms = Array.from(socketRooms.get(socket.id) ?? []);
  rooms.forEach((roomId) => leaveTrackedRoom(io, socket, roomId));
}

export function registerChatSocketHandlers(
  io: IOServer,
  socket: Socket,
  userId: string,
): void {
  socket.on("joinRoom", async (payload: JoinRoomPayload, ack?: Ack) => {
    try {
      if (!isValidId(payload.roomId) || !isValidId(payload.clubId)) {
        ack?.({ ok: false, message: "Invalid room or club id" });
        socket.emit("chatError", { message: "Invalid room or club id" });
        return;
      }

      await ensureMember(userId, payload.clubId);
      await ensureChatRoom(payload.roomId, payload.clubId);

      const username = await getUsername(userId);
      const participants = getRoomParticipants(payload.roomId);

      participants.set(socket.id, {
        socketId: socket.id,
        userId,
        username,
      });

      addSocketRoom(socket.id, payload.roomId);
      socket.join(payload.roomId);
      emitPresence(io, payload.roomId);
      ack?.({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join chat room";
      ack?.({ ok: false, message });
      socket.emit("chatError", { message });
    }
  });

  socket.on("leaveRoom", (payload: LeaveRoomPayload) => {
    if (!isValidId(payload.roomId)) return;
    leaveTrackedRoom(io, socket, payload.roomId);
  });

  socket.on("typingStarted", async (payload: TypingPayload) => {
    if (!isValidId(payload.roomId) || !isValidId(payload.clubId)) return;

    try {
      await ensureMember(userId, payload.clubId);
      const username = await getUsername(userId);
      socket.to(payload.roomId).emit("userTyping", {
        roomId: payload.roomId,
        socketId: socket.id,
        userId,
        username,
      });
    } catch {
      // Typing indicators are best-effort; authorization failures are ignored.
    }
  });

  socket.on("typingStopped", (payload: TypingPayload) => {
    if (!isValidId(payload.roomId)) return;

    socket.to(payload.roomId).emit("userStoppedTyping", {
      roomId: payload.roomId,
      socketId: socket.id,
      userId,
    });
  });

  socket.on(
    "message",
    async (payload: ChatMessagePayload, ack?: Ack<SerializedChatMessage>) => {
      try {
        if (!isValidId(payload.roomId) || !isValidId(payload.clubId)) {
          throw new Error("Invalid room or club id");
        }

        const content = validateContent(payload.content);

        await ensureMember(userId, payload.clubId);
        await ensureChatRoom(payload.roomId, payload.clubId);

        const message = await prisma.chatMessage.create({
          data: {
            roomId: payload.roomId,
            clubId: payload.clubId,
            userId,
            content,
          },
          include: { user: { select: { username: true } } },
        });

        const serialized = serializeMessage(message, payload.clientMessageId);

        io.to(payload.roomId).emit("message", serialized);
        io.to(payload.roomId).emit("userStoppedTyping", {
          roomId: payload.roomId,
          socketId: socket.id,
          userId,
        });
        ack?.({ ok: true, data: serialized });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again.";
        socket.emit("chatError", { message });
        ack?.({ ok: false, message });
      }
    },
  );

  socket.on(
    "editMessage",
    async (payload: EditMessagePayload, ack?: Ack<SerializedChatMessage>) => {
      try {
        if (!isValidId(payload.messageId) || !isValidId(payload.clubId)) {
          throw new Error("Invalid message or club id");
        }

        const content = validateContent(payload.content);
        const membership = await ensureMember(userId, payload.clubId);

        const existing = await prisma.chatMessage.findUnique({
          where: { id: payload.messageId },
          select: {
            id: true,
            userId: true,
            roomId: true,
            clubId: true,
            deletedAt: true,
          },
        });

        if (!existing || existing.clubId !== payload.clubId) {
          throw new Error("Message not found");
        }

        if (existing.deletedAt) {
          throw new Error("Cannot edit a deleted message");
        }

        const canModerate =
          membership.role === "OWNER" || membership.role === "MODERATOR";
        if (!canModerate && existing.userId !== userId) {
          throw new Error("You can only edit your own messages");
        }

        const updated = await prisma.chatMessage.update({
          where: { id: payload.messageId },
          data: { content },
          include: { user: { select: { username: true } } },
        });

        const serialized = serializeMessage(updated);

        io.to(updated.roomId).emit("messageEdited", serialized);
        ack?.({ ok: true, data: serialized });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to edit message. Please try again.";
        ack?.({ ok: false, message });
      }
    },
  );

  socket.on(
    "deleteMessage",
    async (payload: DeleteMessagePayload, ack?: Ack<SerializedChatMessage>) => {
      try {
        if (!isValidId(payload.messageId) || !isValidId(payload.clubId)) {
          throw new Error("Invalid message or club id");
        }

        const membership = await ensureMember(userId, payload.clubId);

        const existing = await prisma.chatMessage.findUnique({
          where: { id: payload.messageId },
          select: {
            id: true,
            userId: true,
            roomId: true,
            clubId: true,
            deletedAt: true,
          },
        });

        if (!existing || existing.clubId !== payload.clubId) {
          throw new Error("Message not found");
        }

        const canModerate =
          membership.role === "OWNER" || membership.role === "MODERATOR";
        if (!canModerate && existing.userId !== userId) {
          throw new Error("You can only delete your own messages");
        }

        const updated = existing.deletedAt
          ? await prisma.chatMessage.findUniqueOrThrow({
              where: { id: payload.messageId },
              include: { user: { select: { username: true } } },
            })
          : await prisma.chatMessage.update({
              where: { id: payload.messageId },
              data: { deletedAt: new Date() },
              include: { user: { select: { username: true } } },
            });

        const serialized = serializeMessage(updated);

        io.to(updated.roomId).emit("messageDeleted", serialized);
        ack?.({ ok: true, data: serialized });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete message. Please try again.";
        ack?.({ ok: false, message });
      }
    },
  );

  socket.on("disconnect", () => {
    leaveAllTrackedRooms(io, socket);
  });
}
