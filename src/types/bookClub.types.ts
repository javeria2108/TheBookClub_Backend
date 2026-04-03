/**
 * BookClub-related TypeScript types inferred from Zod schemas.
 * The schemas remain the runtime source of truth.
 */

import type {
  BookClubResponseSchemaType,
  BookClubSchemaType,
  CreateBookClubSchemaType,
  UpdateBookClubSchemaType,
} from "../schemas";

export type BookClub = BookClubSchemaType;
export type CreateBookClubInput = CreateBookClubSchemaType;
export type UpdateBookClubInput = UpdateBookClubSchemaType;
export type BookClubResponse = BookClubResponseSchemaType;
