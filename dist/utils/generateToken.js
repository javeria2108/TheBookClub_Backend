"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (userId, res) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const payload = { id: userId };
    const token = jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: "7d",
    });
    res.cookie("jwt", token, {
        httpOnly: true, //so that user's browser cannot access the cookie via JavaScript
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return token;
};
exports.generateToken = generateToken;
exports.default = exports.generateToken;
