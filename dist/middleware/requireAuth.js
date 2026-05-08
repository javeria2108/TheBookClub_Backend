"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res
            .status(401)
            .json({ error: { message: "Authorization token is required" } });
    }
    const token = authHeader.slice("Bearer".length).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res
            .status(500)
            .json({ error: { message: "JWT_SECRET is not configured" } });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        if (!payload.id) {
            return res
                .status(401)
                .json({ error: { message: "Invalid authorization token" } });
        }
        res.locals.userId = payload.id;
        return next();
    }
    catch {
        return res
            .status(401)
            .json({ error: { message: "Invalid auth or expired auth token" } });
    }
};
exports.requireAuth = requireAuth;
