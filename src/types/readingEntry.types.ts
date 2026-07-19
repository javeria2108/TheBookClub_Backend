import type {
  CreateReadingEntrySchemaType,
  ListReadingEntriesQuerySchemaType,
  UpdateReadingEntrySchemaType,
} from "../schemas";

export type ReadingEntryType = "REFLECTION" | "QUOTE";

export type ReadingEntryDto = {
  id: string;
  entryType: ReadingEntryType;
  body: string;
  commentary: string | null;
  pageNumber: number | null;
  chapterReference: string | null;
  readingTarget: { id: string; title: string; rangeLabel: string } | null;
  author: { id: string; displayName: string; avatarUrl: string | null };
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ReadingEntryPage = {
  items: ReadingEntryDto[];
  pagination: { nextCursor: string | null; hasMore: boolean };
};

export type ListReadingEntriesInput = ListReadingEntriesQuerySchemaType;
export type CreateReadingEntryInput = CreateReadingEntrySchemaType;
export type UpdateReadingEntryInput = UpdateReadingEntrySchemaType;
