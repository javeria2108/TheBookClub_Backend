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
  createdAt: z.date(),
});

// BookClub creation schema
export const CreateBookClubSchema = z.object({
  name: z
    .string()
    .min(1, 'Book club name is required')
    .max(100, 'Book club name must be at most 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional(),
  isPublic: z.boolean().optional().default(true),
});

// BookClub update schema
export const UpdateBookClubSchema = z.object({
  name: z
    .string()
    .min(1, 'Book club name is required')
    .max(100, 'Book club name must be at most 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .nullable(),
  isPublic: z.boolean().optional(),
});

// BookClub response schema
export const BookClubResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isPublic: z.boolean(),
  createdAt: z.date(),
});

// Type inference from Zod schemas
export type BookClubSchemaType = z.infer<typeof BookClubSchema>;
export type CreateBookClubSchemaType = z.infer<typeof CreateBookClubSchema>;
export type UpdateBookClubSchemaType = z.infer<typeof UpdateBookClubSchema>;
export type BookClubResponseSchemaType = z.infer<typeof BookClubResponseSchema>;
