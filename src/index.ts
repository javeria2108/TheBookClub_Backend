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
    socket.join(roomId);
  });

  socket.on("leaveRoom", ({ roomId }) => {
    socket.leave(roomId);
  });

  socket.on("message", async ({ roomId, clubId, content }) => {
    // persist message
    const msg = await prisma.chatMessage.create({
      data: {
        roomId,
        clubId,
        userId,
        content,
      },
      include: { user: { select: { id: true, username: true } } },
    });
    // broadcast
    io.to(roomId).emit("message", {
      id: msg.id,
      roomId: msg.roomId,
      clubId: msg.clubId,
      userId: msg.userId,
      username: msg.user.username,
      content: msg.content,
      createdAt: msg.createdAt,
    });
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
