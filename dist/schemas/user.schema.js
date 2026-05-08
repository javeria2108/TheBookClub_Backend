"use strict";
/**
 * Zod validation schemas for User-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResponseSchema = exports.UserRegisterSchema = exports.UserLoginSchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.UserSchema = exports.AuthProviderSchema = exports.RoleSchema = void 0;
const zod_1 = require("zod");
// Enum schemas
exports.RoleSchema = zod_1.z.enum(['USER', 'ADMIN']);
exports.AuthProviderSchema = zod_1.z.enum(['LOCAL', 'GOOGLE', 'GITHUB']);
// Base User schema
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(50),
    passwordHash: zod_1.z.string().nullable().optional(),
    role: exports.RoleSchema,
    isEmailVerified: zod_1.z.boolean(),
    isActive: zod_1.z.boolean(),
    provider: exports.AuthProviderSchema,
    providerId: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// User creation schema
exports.CreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    passwordHash: zod_1.z.string().optional(),
    role: exports.RoleSchema.optional(),
    provider: exports.AuthProviderSchema.optional(),
    providerId: zod_1.z.string().optional(),
});
// User update schema
exports.UpdateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').optional(),
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
        .optional(),
    passwordHash: zod_1.z.string().optional(),
    role: exports.RoleSchema.optional(),
    isEmailVerified: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
// User login schema
exports.UserLoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
// User registration schema
exports.UserRegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    name: zod_1.z
        .string()
        .trim()
        .min(3, 'Name must be at least 3 characters')
        .max(50, 'Name must be at most 50 characters'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
// User response schema (excludes passwordHash)
exports.UserResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    username: zod_1.z.string(),
    role: exports.RoleSchema,
    isEmailVerified: zod_1.z.boolean(),
    isActive: zod_1.z.boolean(),
    provider: exports.AuthProviderSchema,
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
