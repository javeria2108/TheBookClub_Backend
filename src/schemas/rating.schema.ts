import { z } from "zod";

export const ClubRatingParamSchema = z.object({
  clubId: z.string().uuid("Club id must be a valid UUID"),
});

export const ClubRatingRouteParamSchema = z.object({
  id: z.string().uuid("Club id must be a valid UUID"),
});

export const BookRatingParamSchema = z.object({
  clubId: z.string().uuid("Club id must be a valid UUID"),
  bookId: z.string().uuid("Book id must be a valid UUID"),
});

export const UpdateRatingSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export type UpdateRatingSchemaType = z.infer<typeof UpdateRatingSchema>;
