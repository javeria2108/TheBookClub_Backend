import express from "express";
import path from "path";
import clubsRouter from "./routes/clubs";
import usersRouter from "./routes/users";
import uploadsRouter from "./routes/uploads";
import { config } from "dotenv";
import authRouter from "./routes/authRoutes";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { registerChatSocketHandlers } from "./sockets/chatSocket";

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

app.use(
  "/uploads/clubs",
  express.static(path.join(process.cwd(), "uploads", "clubs")),
);
app.use("/api/clubs", clubsRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/uploads", uploadsRouter);

// create server and attach io
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

type JwtPayload = {
  id?: string;
};

function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

// socket auth middleware
io.use((socket, next) => {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return next(new Error("JWT_SECRET is not configured"));
    }

    const token = getCookieValue(socket.handshake.headers.cookie, "jwt");

    if (!token) {
      return next(new Error("Not authenticated"));
    }

    const payload = jwt.verify(token, secret) as JwtPayload;

    if (!payload.id) {
      return next(new Error("Authentication error"));
    }

    socket.data.userId = payload.id;
    return next();
  } catch {
    return next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string | undefined;

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  registerChatSocketHandlers(io, socket, userId);
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
