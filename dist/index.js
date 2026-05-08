"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const users_1 = __importDefault(require("./routes/users"));
const dotenv_1 = require("dotenv");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const cors_1 = __importDefault(require("cors"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
//Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use("/api/clubs", clubs_1.default);
app.use("/api/users", users_1.default);
app.use("/api/auth", authRoutes_1.default);
const PORT = 5001;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
server.on("error", (error) => {
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
