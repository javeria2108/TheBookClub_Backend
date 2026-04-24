/**
 * Zod validation schemas for BookClub-related operations
 */

import { z } from 'zod';

// Base BookClub schema
export const BookClubSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  isPublic: z.boolean(),
  genre: z.string().nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  memberCount: z.number().int().nonnegative().optional(),
  createdAt: z.date(),
});

// BookClub creation schema
export const CreateBookClubSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Book club name is required')
    .max(100, 'Book club name must be at most 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  isPublic: z.boolean().optional().default(true),
  genre: z.string().trim().max(80, 'Genre must be at most 80 characters').optional(),
  coverImage: z.string().url('Cover image must be a valid URL').optional(),
});

// BookClub update schema
export const UpdateBookClubSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Book club name is required')
    .max(100, 'Book club name must be at most 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable(),
  isPublic: z.boolean().optional(),
  genre: z.string().trim().max(80, 'Genre must be at most 80 characters').optional().nullable(),
  coverImage: z
    .string()
    .url('Cover image must be a valid URL')
    .optional()
    .nullable(),
});

// BookClub response schema
export const BookClubResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isPublic: z.boolean(),
  genre: z.string().nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  memberCount: z.number().int().nonnegative(),
  createdAt: z.date(),
});

// Type inference from Zod schemas
export type BookClubSchemaType = z.infer<typeof BookClubSchema>;
export type CreateBookClubSchemaType = z.infer<typeof CreateBookClubSchema>;
export type UpdateBookClubSchemaType = z.infer<typeof UpdateBookClubSchema>;
export type BookClubResponseSchemaType = z.infer<typeof BookClubResponseSchema>;
