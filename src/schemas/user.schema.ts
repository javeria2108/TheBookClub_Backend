/**
 * Zod validation schemas for User-related operations
 */

import { z } from 'zod';

// Enum schemas
export const RoleSchema = z.enum(['USER', 'ADMIN']);
export const AuthProviderSchema = z.enum(['LOCAL', 'GOOGLE', 'GITHUB']);
export const ClubMemberRoleSchema = z.enum(['MEMBER', 'MODERATOR', 'OWNER']);
export type RoleSchemaType = z.infer<typeof RoleSchema>;
export type AuthProviderSchemaType = z.infer<typeof AuthProviderSchema>;
export type ClubMemberRoleSchemaType = z.infer<typeof ClubMemberRoleSchema>;

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
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters'),
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
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  favoriteGenres: z.array(z.string()),
  role: RoleSchema,
  isEmailVerified: z.boolean(),
  isActive: z.boolean(),
  provider: AuthProviderSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const JoinedClubProfileSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  genre: z.string().nullable(),
  coverImage: z.string().url().nullable(),
  memberCount: z.number().int().nonnegative(),
  memberRole: ClubMemberRoleSchema,
  currentReadingCycle: z.any().nullable(),
  joinedAt: z.date(),
  createdAt: z.date(),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  favoriteGenres: z.array(z.string()),
  role: RoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  joinedClubs: z.array(JoinedClubProfileSummarySchema),
});

export const MAX_PROFILE_BIO_LENGTH = 500;
export const MAX_FAVORITE_GENRES = 8;
export const MAX_FAVORITE_GENRE_LENGTH = 40;

export const UpdateUserProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be at most 50 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens",
      )
      .optional(),
    bio: z
      .string()
      .trim()
      .max(MAX_PROFILE_BIO_LENGTH, "Bio must be 500 characters or fewer")
      .nullable()
      .optional(),
    favoriteGenres: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Favorite genres cannot be empty")
          .max(
            MAX_FAVORITE_GENRE_LENGTH,
            "Favorite genres must be 40 characters or fewer",
          ),
      )
      .max(MAX_FAVORITE_GENRES, "Choose up to 8 favorite genres")
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field must be provided",
  });

// Type inference from Zod schemas
export type UserSchemaType = z.infer<typeof UserSchema>;
export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>;
export type UpdateUserSchemaType = z.infer<typeof UpdateUserSchema>;
export type UserLoginSchemaType = z.infer<typeof UserLoginSchema>;
export type UserRegisterSchemaType = z.infer<typeof UserRegisterSchema>;
export type UserResponseSchemaType = z.infer<typeof UserResponseSchema>;
export type UpdateUserProfileSchemaType = z.infer<typeof UpdateUserProfileSchema>;
export type JoinedClubProfileSummarySchemaType = z.infer<
  typeof JoinedClubProfileSummarySchema
>;
export type UserProfileSchemaType = z.infer<typeof UserProfileSchema>;
