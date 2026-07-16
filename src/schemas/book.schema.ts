import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const nullableUrlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const BookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  authors: z.array(z.string()),
  coverImage: z.string().url().nullable(),
  isbn10: z.string().nullable(),
  isbn13: z.string().nullable(),
  publisher: z.string().nullable(),
  publishedDate: z.string().nullable(),
  pageCount: z.number().int().positive().nullable(),
  language: z.string().nullable(),
  externalSource: z.string().nullable(),
  externalId: z.string().nullable(),
  previewUrl: z.string().url().nullable(),
  infoUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateBookSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(250),
    subtitle: optionalTrimmedString,
    description: optionalTrimmedString,
    authors: z
      .array(z.string().trim().min(1).max(120))
      .max(12, "A book can have at most 12 authors")
      .optional(),
    coverImage: nullableUrlSchema,
    isbn10: optionalTrimmedString,
    isbn13: optionalTrimmedString,
    publisher: optionalTrimmedString,
    publishedDate: optionalTrimmedString,
    pageCount: z.number().int().positive().max(10000).optional(),
    language: optionalTrimmedString,
    externalSource: optionalTrimmedString,
    externalId: optionalTrimmedString,
    previewUrl: nullableUrlSchema,
    infoUrl: nullableUrlSchema,
  })
  .strict()
  .refine(
    (value) =>
      (value.externalSource === undefined && value.externalId === undefined) ||
      (value.externalSource !== undefined && value.externalId !== undefined),
    {
      message: "External source and external id must be provided together",
    },
  );

export const UpdateBookSchema = CreateBookSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one book field must be provided",
  },
);

export const BookIdParamSchema = z.object({
  id: z.string().uuid("Book id must be a valid UUID"),
});

export const GetBooksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  search: z.string().trim().optional(),
});

export const BookListResponseSchema = z.object({
  books: z.array(BookSchema),
});

export const BookResponseSchema = z.object({
  book: BookSchema,
});

export type BookSchemaType = z.infer<typeof BookSchema>;
export type CreateBookSchemaType = z.infer<typeof CreateBookSchema>;
export type UpdateBookSchemaType = z.infer<typeof UpdateBookSchema>;
export type GetBooksQuerySchemaType = z.infer<typeof GetBooksQuerySchema>;
