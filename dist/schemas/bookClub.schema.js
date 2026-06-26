"use strict";
/**
 * Zod validation schemas for BookClub-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookClubResponseSchema = exports.UpdateBookClubSchema = exports.CreateBookClubSchema = exports.BookClubSchema = void 0;
const zod_1 = require("zod");
// Base BookClub schema
exports.BookClubSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().nullable().optional(),
    isPublic: zod_1.z.boolean(),
    genre: zod_1.z.string().nullable().optional(),
    coverImage: zod_1.z.string().url().nullable().optional(),
    memberCount: zod_1.z.number().int().nonnegative().optional(),
    createdAt: zod_1.z.date(),
});
// BookClub creation schema
exports.CreateBookClubSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Book club name is required")
        .max(100, "Book club name must be at most 100 characters"),
    description: zod_1.z
        .string()
        .trim()
        .max(500, "Description must be at most 500 characters")
        .optional(),
    isPublic: zod_1.z.boolean().optional().default(true),
    genre: zod_1.z
        .string()
        .trim()
        .max(80, "Genre must be at most 80 characters")
        .optional(),
    coverImage: zod_1.z.string().url("Cover image must be a valid URL"),
});
// BookClub update schema
exports.UpdateBookClubSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Book club name is required")
        .max(100, "Book club name must be at most 100 characters")
        .optional(),
    description: zod_1.z
        .string()
        .trim()
        .max(500, "Description must be at most 500 characters")
        .optional()
        .nullable(),
    isPublic: zod_1.z.boolean().optional(),
    genre: zod_1.z
        .string()
        .trim()
        .max(80, "Genre must be at most 80 characters")
        .optional()
        .nullable(),
    coverImage: zod_1.z
        .string()
        .url("Cover image must be a valid URL")
        .optional(),
});
// BookClub response schema
exports.BookClubResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable().optional(),
    isPublic: zod_1.z.boolean(),
    genre: zod_1.z.string().nullable().optional(),
    coverImage: zod_1.z.string().url().nullable().optional(),
    memberCount: zod_1.z.number().int().nonnegative(),
    isMember: zod_1.z.boolean().optional(),
    memberRole: zod_1.z.enum(["MEMBER", "MODERATOR", "OWNER"]).optional().nullable(),
    hasPendingJoinRequest: zod_1.z.boolean().optional(),
    pendingJoinRequestId: zod_1.z.string().uuid().optional().nullable(),
    createdAt: zod_1.z.date(),
});
