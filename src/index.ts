import express from "express";
import clubsRouter from "./routes/clubs";
import usersRouter from "./routes/users";
import { config } from "dotenv";
import authRouter from "./routes/authRoutes";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma";

config();

const app = express();

//Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/clubs", clubsRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);

// create server and attach io
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

// socket auth middleware
io.use((socket, next) => {
  try {
    const { cookie } = socket.handshake.headers;
    // parse cookie header to get jwt value (simple parser)
    const jwtCookie = cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("jwt="))
      ?.slice("jwt=".length);

    if (!jwtCookie) return next(new Error("Not authenticated"));

    const payload = jwt.verify(jwtCookie, process.env.JWT_SECRET!) as {
      id: string;
    };
    // attach userId to socket
    (socket as any).userId = payload.id;
    return next();
  } catch (err) {
    return next(new Error("Authentication error"));
  }
});

// basic handlers
io.on("connection", (socket) => {
  const userId = (socket as any).userId as string;

  socket.on("joinRoom", async ({ roomId }) => {
    if (typeof roomId !== "string" || !roomId.trim()) {
      socket.emit("chatError", { message: "Invalid room id" });
      return;
    }

    socket.join(roomId);
  });

  socket.on("leaveRoom", ({ roomId }) => {
    if (typeof roomId !== "string" || !roomId.trim()) {
      return;
    }

    socket.leave(roomId);
  });

  socket.on("message", async ({ roomId, clubId, content }) => {
    try {
      if (typeof roomId !== "string" || !roomId.trim()) {
        socket.emit("chatError", { message: "Invalid room id" });
        return;
      }

      if (typeof clubId !== "string" || !clubId.trim()) {
        socket.emit("chatError", { message: "Invalid club id" });
        return;
      }

      if (typeof content !== "string" || !content.trim()) {
        socket.emit("chatError", { message: "Message cannot be empty" });
        return;
      }

      const trimmedContent = content.trim();

      if (trimmedContent.length > 1000) {
        socket.emit("chatError", { message: "Message is too long" });
        return;
      }

      // Only members can send messages in club chat.
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId, clubId } },
        select: { id: true },
      });

      if (!membership) {
        socket.emit("chatError", {
          message: "You must be a member of this club to send messages",
        });
        return;
      }

      // Ensure chat room exists and belongs to this club.
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
      } else if (existingRoom.clubId !== clubId) {
        socket.emit("chatError", { message: "Room does not belong to this club" });
        return;
      }

      const msg = await prisma.chatMessage.create({
        data: {
          roomId,
          clubId,
          userId,
          content: trimmedContent,
        },
        include: { user: { select: { id: true, username: true } } },
      });

      io.to(roomId).emit("message", {
        id: msg.id,
        roomId: msg.roomId,
        clubId: msg.clubId,
        userId: msg.userId,
        username: msg.user.username,
        content: msg.content,
        createdAt: msg.createdAt,
      });
    } catch (error) {
      console.error("Socket message handler failed:", error);
      socket.emit("chatError", { message: "Failed to send message. Please try again." });
    }
  });
});

const PORT = 5001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

httpServer.on("error", (error) => {
  console.error("Server error:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason);
});

// Keep the process alive to prevent exit
setInterval(() => {
  // Keepalive interval
}, 60000);
