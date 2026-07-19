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

export const UpdateReadingProgressSchema = z
  .object({
    progressPercentage: z
      .number()
      .int("Progress must be a whole percentage")
      .min(0, "Progress cannot be less than 0")
      .max(100, "Progress cannot be greater than 100"),
  })
  .strict();

export const ReadingTargetIdParamSchema = ReadingCycleIdParamSchema.extend({
  targetId: z.string().uuid("Reading target id must be a valid UUID"),
});

export const DiscussionTopicIdParamSchema = ClubIdParamSchema.extend({
  topicId: z.string().uuid("Discussion topic id must be a valid UUID"),
});

export const DiscussionPostIdParamSchema = ClubIdParamSchema.extend({
  postId: z.string().uuid("Discussion post id must be a valid UUID"),
});

export const BookVoteRoundIdParamSchema = ClubIdParamSchema.extend({
  roundId: z.string().uuid("Vote round id must be a valid UUID"),
});

export const BookNominationIdParamSchema = BookVoteRoundIdParamSchema.extend({
  nominationId: z.string().uuid("Nomination id must be a valid UUID"),
});

export const ReadingEntryIdParamSchema = ClubIdParamSchema.extend({
  entryId: z.string().uuid("Reading entry id must be a valid UUID"),
});

export const ReadingTargetTypeSchema = z.enum(["CHAPTERS", "PAGES", "CUSTOM"]);

const ReadingTargetPayloadBaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(600).optional().nullable(),
  startDate: IsoDateSchema,
  endDate: IsoDateSchema,
});

export const CreateReadingTargetSchema = ReadingTargetPayloadBaseSchema.extend({
  targetType: ReadingTargetTypeSchema,
  startValue: z.number().int().positive().optional().nullable(),
  endValue: z.number().int().positive().optional().nullable(),
}).strict();

export const UpdateReadingTargetSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120).optional(),
    description: z.string().trim().max(600).optional().nullable(),
    targetType: ReadingTargetTypeSchema.optional(),
    startValue: z.number().int().positive().optional().nullable(),
    endValue: z.number().int().positive().optional().nullable(),
    startDate: IsoDateSchema.optional(),
    endDate: IsoDateSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one reading target field must be provided",
  });

export const ReorderReadingTargetsSchema = z
  .object({
    targetIds: z
      .array(z.string().uuid("Target id must be a valid UUID"))
      .min(1, "At least one target id must be provided"),
  })
  .strict();

export const DiscussionTopicTypeSchema = z.enum([
  "GENERAL",
  "READING_CYCLE",
  "READING_TARGET",
  "PROMPT",
]);

export const ListDiscussionTopicsQuerySchema = z.object({
  filter: z
    .enum(["ALL", "CURRENT_READING", "THIS_WEEK", "GENERAL", "PINNED"])
    .default("ALL"),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateDiscussionTopicSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required").max(140),
    prompt: z.string().trim().max(1200).optional().nullable(),
    topicType: DiscussionTopicTypeSchema.default("GENERAL"),
    readingCycleId: z.string().uuid().optional().nullable(),
    readingTargetId: z.string().uuid().optional().nullable(),
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
  })
  .strict();

export const UpdateDiscussionTopicSchema = z
  .object({
    title: z.string().trim().min(3).max(140).optional(),
    prompt: z.string().trim().max(1200).optional().nullable(),
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one discussion topic field must be provided",
  });

export const ListDiscussionPostsQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export const CreateDiscussionPostSchema = z
  .object({
    content: z.string().trim().min(1, "Reply cannot be empty").max(4000),
    parentPostId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const UpdateDiscussionPostSchema = z
  .object({
    content: z.string().trim().min(1, "Reply cannot be empty").max(4000),
  })
  .strict();

export const CreateBookVoteRoundSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required").max(140),
    description: z.string().trim().max(800).optional().nullable(),
    opensAt: IsoDateSchema.optional().nullable(),
    closesAt: IsoDateSchema.optional().nullable(),
  })
  .strict();

export const UpdateBookVoteRoundSchema = z
  .object({
    title: z.string().trim().min(3).max(140).optional(),
    description: z.string().trim().max(800).optional().nullable(),
    opensAt: IsoDateSchema.optional().nullable(),
    closesAt: IsoDateSchema.optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one vote-round field must be provided",
  });

export const CreateBookNominationSchema = z
  .object({
    bookId: z.string().uuid("Book id must be a valid UUID").optional(),
    googleBooksId: z.string().trim().min(1).max(120).optional(),
    reason: z.string().trim().max(1000).optional().nullable(),
  })
  .strict()
  .refine((value) => Boolean(value.bookId) !== Boolean(value.googleBooksId), {
    message: "Choose either a saved BookCircle book or a Google Books result.",
  });

export const BookVoteSchema = z
  .object({
    nominationId: z.string().uuid("Nomination id must be a valid UUID"),
  })
  .strict();

export const ResolveBookVoteWinnerSchema = z
  .object({
    nominationId: z.string().uuid("Nomination id must be a valid UUID"),
  })
  .strict();

export const ReadingEntryTypeSchema = z.enum(["REFLECTION", "QUOTE"]);

export const ListReadingEntriesQuerySchema = z.object({
  type: ReadingEntryTypeSchema.optional(),
  author: z.enum(["me"]).optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateReadingEntrySchema = z
  .object({
    entryType: ReadingEntryTypeSchema,
    body: z.string().trim().min(1).max(2000),
    commentary: z.string().trim().max(1000).optional().nullable(),
    readingTargetId: z.string().uuid().optional().nullable(),
    pageNumber: z.number().int().positive().optional().nullable(),
    chapterReference: z.string().trim().max(80).optional().nullable(),
  })
  .strict();

export const UpdateReadingEntrySchema = z
  .object({
    body: z.string().trim().min(1).max(2000).optional(),
    commentary: z.string().trim().max(1000).optional().nullable(),
    readingTargetId: z.string().uuid().optional().nullable(),
    pageNumber: z.number().int().positive().optional().nullable(),
    chapterReference: z.string().trim().max(80).optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one reading entry field must be provided",
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
export type UpdateReadingProgressSchemaType = z.infer<
  typeof UpdateReadingProgressSchema
>;
export type CreateReadingTargetSchemaType = z.infer<
  typeof CreateReadingTargetSchema
>;
export type UpdateReadingTargetSchemaType = z.infer<
  typeof UpdateReadingTargetSchema
>;
export type ReorderReadingTargetsSchemaType = z.infer<
  typeof ReorderReadingTargetsSchema
>;
export type ListDiscussionTopicsQuerySchemaType = z.infer<
  typeof ListDiscussionTopicsQuerySchema
>;
export type CreateDiscussionTopicSchemaType = z.infer<
  typeof CreateDiscussionTopicSchema
>;
export type UpdateDiscussionTopicSchemaType = z.infer<
  typeof UpdateDiscussionTopicSchema
>;
export type ListDiscussionPostsQuerySchemaType = z.infer<
  typeof ListDiscussionPostsQuerySchema
>;
export type CreateDiscussionPostSchemaType = z.infer<
  typeof CreateDiscussionPostSchema
>;
export type UpdateDiscussionPostSchemaType = z.infer<
  typeof UpdateDiscussionPostSchema
>;
export type CreateBookVoteRoundSchemaType = z.infer<
  typeof CreateBookVoteRoundSchema
>;
export type UpdateBookVoteRoundSchemaType = z.infer<
  typeof UpdateBookVoteRoundSchema
>;
export type CreateBookNominationSchemaType = z.infer<
  typeof CreateBookNominationSchema
>;
export type BookVoteSchemaType = z.infer<typeof BookVoteSchema>;
export type ResolveBookVoteWinnerSchemaType = z.infer<
  typeof ResolveBookVoteWinnerSchema
>;
export type ListReadingEntriesQuerySchemaType = z.infer<
  typeof ListReadingEntriesQuerySchema
>;
export type CreateReadingEntrySchemaType = z.infer<
  typeof CreateReadingEntrySchema
>;
export type UpdateReadingEntrySchemaType = z.infer<
  typeof UpdateReadingEntrySchema
>;
