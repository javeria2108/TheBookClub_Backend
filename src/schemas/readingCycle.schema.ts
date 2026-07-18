import { z } from "zod";

const IsoDateSchema = z
  .string()
  .datetime("Date must be a valid ISO datetime")
  .transform((value) => new Date(value));

export const ReadingCycleStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const ClubIdParamSchema = z.object({
  clubId: z.string().uuid("Club id must be a valid UUID"),
});

export const ReadingCycleIdParamSchema = ClubIdParamSchema.extend({
  cycleId: z.string().uuid("Reading cycle id must be a valid UUID"),
});

export const BookCircleSelectionSchema = z.object({
  source: z.literal("BOOKCIRCLE"),
  bookId: z.string().uuid("Book id must be a valid UUID"),
});

export const GoogleBooksSelectionSchema = z.object({
  source: z.literal("GOOGLE_BOOKS"),
  googleBooksId: z.string().trim().min(1).max(120),
});

export const BookSelectionSchema = z.discriminatedUnion("source", [
  BookCircleSelectionSchema,
  GoogleBooksSelectionSchema,
]);

export const CreateReadingCycleSchema = z.object({
  bookSelection: BookSelectionSchema,
  status: z.enum(["PLANNED", "ACTIVE"]).default("PLANNED"),
  startDate: IsoDateSchema,
  targetEndDate: IsoDateSchema,
  goalDescription: z.string().trim().max(600).optional(),
});

export const UpdateReadingCycleSchema = z
  .object({
    startDate: IsoDateSchema.optional(),
    targetEndDate: IsoDateSchema.optional(),
    goalDescription: z.string().trim().max(600).optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one reading cycle field must be provided",
  });

export const ListReadingCyclesQuerySchema = z.object({
  status: ReadingCycleStatusSchema.optional(),
});

export type CreateReadingCycleSchemaType = z.infer<
  typeof CreateReadingCycleSchema
>;
export type UpdateReadingCycleSchemaType = z.infer<
  typeof UpdateReadingCycleSchema
>;
export type ListReadingCyclesQuerySchemaType = z.infer<
  typeof ListReadingCyclesQuerySchema
>;
