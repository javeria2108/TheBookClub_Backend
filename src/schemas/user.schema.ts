/**
 * Zod validation schemas for User-related operations
 */

import { z } from 'zod';

// Enum schemas
export const RoleSchema = z.enum(['USER', 'ADMIN']);
export const AuthProviderSchema = z.enum(['LOCAL', 'GOOGLE', 'GITHUB']);

// Base User schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  passwordHash: z.string().nullable().optional(),
  role: RoleSchema,
  isEmailVerified: z.boolean(),
  isActive: z.boolean(),
  provider: AuthProviderSchema,
  providerId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User creation schema
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  passwordHash: z.string().optional(),
  role: RoleSchema.optional(),
  provider: AuthProviderSchema.optional(),
  providerId: z.string().optional(),
});

// User update schema
export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  passwordHash: z.string().optional(),
  role: RoleSchema.optional(),
  isEmailVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// User login schema
export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// User registration schema
export const UserRegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// User response schema (excludes passwordHash)
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  role: RoleSchema,
  isEmailVerified: z.boolean(),
  isActive: z.boolean(),
  provider: AuthProviderSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Type inference from Zod schemas
export type UserSchemaType = z.infer<typeof UserSchema>;
export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>;
export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;
export type UserLoginSchemaType = z.infer<typeof UserLoginSchema>;
export type UserRegisterSchemaType = z.infer<typeof UserRegisterSchema>;
export type UserResponseSchemaType = z.infer<typeof UserResponseSchema>;
