import express from "express";
import path from "path";
import booksRouter from "./routes/books";
import clubsRouter from "./routes/clubs";
import feedbackRouter from "./routes/feedback";
import homepageRouter from "./routes/homepage";
import notificationsRouter from "./routes/notifications";
import usersRouter from "./routes/users";
import uploadsRouter from "./routes/uploads";
import { config } from "dotenv";
import authRouter from "./routes/authRoutes";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import { authConfig, corsOptions, getJwtSecret } from "./config/authConfig";
import { verifyAuthToken } from "./utils/authToken";
import { setSecurityHeaders } from "./middleware/securityHeaders";
import { requestLogger } from "./middleware/requestLogger";
import { registerChatSocketHandlers } from "./sockets/chatSocket";
import { getCookieValue } from "./utils/cookies";
import { logger } from "./utils/logger";

config();
getJwtSecret();

const app = express();

app.use(setSecurityHeaders);
app.use(requestLogger);
app.use(express.json({ limit: authConfig.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use(
  "/uploads/clubs",
  express.static(path.join(process.cwd(), "uploads", "clubs")),
);
app.use(
  "/uploads/avatars",
  express.static(path.join(process.cwd(), "uploads", "avatars")),
);
app.use("/api/clubs", clubsRouter);
app.use("/api/homepage", homepageRouter);
app.use("/api/books", booksRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/uploads", uploadsRouter);

// create server and attach io
const httpServer = http.createServer(app);
type SocketData = {
  userId: string;
};

const io = new IOServer(httpServer, {
  cors: {
    origin: authConfig.allowedFrontendOrigins,
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const token =
      typeof authToken === "string" && authToken.trim()
        ? authToken
        : getCookieValue(
            socket.handshake.headers.cookie,
            authConfig.cookieName,
          );

    if (!token) {
      return next(new Error("Not authenticated"));
    }

    const payload = verifyAuthToken(token);
    socket.data.userId = payload.userId;
    return next();
  } catch {
    return next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  const socketData = socket.data as SocketData;
  const userId = socketData.userId;

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  registerChatSocketHandlers(io, socket, userId);
});

const PORT = Number(process.env.PORT ?? 5001);
httpServer.listen(PORT, () => {
  logger.info("server_started", {
    port: PORT,
    nodeEnv: process.env.NODE_ENV ?? "development",
    allowedFrontendOrigins: authConfig.allowedFrontendOrigins,
  });
});

httpServer.on("error", (error) => {
  logger.error("server_error", error);
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandled_rejection", reason, { promise: String(promise) });
});

process.on("SIGTERM", () => {
  logger.info("server_shutdown", { signal: "SIGTERM" });
  httpServer.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("server_shutdown", { signal: "SIGINT" });
  httpServer.close(() => process.exit(0));
});

// Keep the process alive to prevent exit
setInterval(() => {
  // Keepalive interval
}, 60000);
