"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const users_1 = __importDefault(require("./routes/users"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const dotenv_1 = require("dotenv");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./lib/prisma");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
//Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use("/uploads/clubs", express_1.default.static(path_1.default.join(process.cwd(), "uploads", "clubs")));
app.use("/api/clubs", clubs_1.default);
app.use("/api/users", users_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/uploads", uploads_1.default);
// create server and attach io
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
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
        if (!jwtCookie)
            return next(new Error("Not authenticated"));
        const payload = jsonwebtoken_1.default.verify(jwtCookie, process.env.JWT_SECRET);
        // attach userId to socket
        socket.userId = payload.id;
        return next();
    }
    catch (err) {
        return next(new Error("Authentication error"));
    }
});
// basic handlers
io.on("connection", (socket) => {
    const userId = socket.userId;
    const isValidId = (value) => typeof value === "string" && value.trim().length > 0;
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
    socket.on("message", async ({ roomId, clubId, content }, ack) => {
        try {
            if (!isValidId(roomId)) {
                socket.emit("chatError", { message: "Invalid room id" });
                ack?.({ ok: false, message: "Invalid room id" });
                return;
            }
            if (!isValidId(clubId)) {
                socket.emit("chatError", { message: "Invalid club id" });
                ack?.({ ok: false, message: "Invalid club id" });
                return;
            }
            if (typeof content !== "string" || !content.trim()) {
                socket.emit("chatError", { message: "Message cannot be empty" });
                ack?.({ ok: false, message: "Message cannot be empty" });
                return;
            }
            const trimmedContent = content.trim();
            if (trimmedContent.length > 1000) {
                socket.emit("chatError", { message: "Message is too long" });
                ack?.({ ok: false, message: "Message is too long" });
                return;
            }
            // Only members can send messages in club chat.
            const membership = await prisma_1.prisma.clubMember.findUnique({
                where: { userId_clubId: { userId, clubId } },
                select: { id: true },
            });
            if (!membership) {
                socket.emit("chatError", {
                    message: "You must be a member of this club to send messages",
                });
                ack?.({
                    ok: false,
                    message: "You must be a member of this club to send messages",
                });
                return;
            }
            // Ensure chat room exists and belongs to this club.
            const existingRoom = await prisma_1.prisma.chatRoom.findUnique({
                where: { id: roomId },
                select: { id: true, clubId: true },
            });
            if (!existingRoom) {
                await prisma_1.prisma.chatRoom.create({
                    data: {
                        id: roomId,
                        clubId,
                        name: "General",
                    },
                });
            }
            else if (existingRoom.clubId !== clubId) {
                socket.emit("chatError", {
                    message: "Room does not belong to this club",
                });
                ack?.({ ok: false, message: "Room does not belong to this club" });
                return;
            }
            const msg = await prisma_1.prisma.chatMessage.create({
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
            ack?.({ ok: true });
        }
        catch (error) {
            console.error("Socket message handler failed:", error);
            socket.emit("chatError", {
                message: "Failed to send message. Please try again.",
            });
            ack?.({
                ok: false,
                message: "Failed to send message. Please try again.",
            });
        }
    });
    socket.on("editMessage", async ({ messageId, clubId, content, }, ack) => {
        try {
            if (!isValidId(messageId) || !isValidId(clubId)) {
                ack?.({ ok: false, message: "Invalid message or club id" });
                return;
            }
            if (typeof content !== "string" || !content.trim()) {
                ack?.({ ok: false, message: "Message cannot be empty" });
                return;
            }
            const trimmedContent = content.trim();
            if (trimmedContent.length > 1000) {
                ack?.({ ok: false, message: "Message is too long" });
                return;
            }
            const membership = await prisma_1.prisma.clubMember.findUnique({
                where: { userId_clubId: { userId, clubId } },
                select: { role: true },
            });
            if (!membership) {
                ack?.({
                    ok: false,
                    message: "You must be a member to edit messages",
                });
                return;
            }
            const existing = await prisma_1.prisma.chatMessage.findUnique({
                where: { id: messageId },
                select: {
                    id: true,
                    userId: true,
                    roomId: true,
                    clubId: true,
                    deletedAt: true,
                },
            });
            if (!existing || existing.clubId !== clubId) {
                ack?.({ ok: false, message: "Message not found" });
                return;
            }
            if (existing.deletedAt) {
                ack?.({ ok: false, message: "Cannot edit a deleted message" });
                return;
            }
            const canModerate = membership.role === "OWNER" || membership.role === "MODERATOR";
            if (!canModerate && existing.userId !== userId) {
                ack?.({ ok: false, message: "You can only edit your own messages" });
                return;
            }
            const updated = await prisma_1.prisma.chatMessage.update({
                where: { id: messageId },
                data: { content: trimmedContent },
                select: {
                    id: true,
                    roomId: true,
                    clubId: true,
                    userId: true,
                    content: true,
                    createdAt: true,
                },
            });
            io.to(updated.roomId).emit("messageEdited", {
                id: updated.id,
                roomId: updated.roomId,
                clubId: updated.clubId,
                userId: updated.userId,
                content: updated.content,
                createdAt: updated.createdAt,
            });
            ack?.({ ok: true });
        }
        catch (error) {
            console.error("Socket editMessage handler failed:", error);
            ack?.({
                ok: false,
                message: "Failed to edit message. Please try again.",
            });
        }
    });
    socket.on("deleteMessage", async ({ messageId, clubId }, ack) => {
        try {
            if (!isValidId(messageId) || !isValidId(clubId)) {
                ack?.({ ok: false, message: "Invalid message or club id" });
                return;
            }
            const membership = await prisma_1.prisma.clubMember.findUnique({
                where: { userId_clubId: { userId, clubId } },
                select: { role: true },
            });
            if (!membership) {
                ack?.({
                    ok: false,
                    message: "You must be a member to delete messages",
                });
                return;
            }
            const existing = await prisma_1.prisma.chatMessage.findUnique({
                where: { id: messageId },
                select: {
                    id: true,
                    userId: true,
                    roomId: true,
                    clubId: true,
                    deletedAt: true,
                },
            });
            if (!existing || existing.clubId !== clubId) {
                ack?.({ ok: false, message: "Message not found" });
                return;
            }
            const canModerate = membership.role === "OWNER" || membership.role === "MODERATOR";
            if (!canModerate && existing.userId !== userId) {
                ack?.({
                    ok: false,
                    message: "You can only delete your own messages",
                });
                return;
            }
            if (existing.deletedAt) {
                ack?.({ ok: true });
                return;
            }
            const updated = await prisma_1.prisma.chatMessage.update({
                where: { id: messageId },
                data: { deletedAt: new Date() },
                select: { id: true, roomId: true },
            });
            io.to(updated.roomId).emit("messageDeleted", {
                id: updated.id,
            });
            ack?.({ ok: true });
        }
        catch (error) {
            console.error("Socket deleteMessage handler failed:", error);
            ack?.({
                ok: false,
                message: "Failed to delete message. Please try again.",
            });
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
