import type {
  CreateReadingCycleSchemaType,
  ListReadingCyclesQuerySchemaType,
  UpdateReadingCycleSchemaType,
} from "../schemas";
import type { Book } from "./book.types";

export type ReadingCycleStatus =
  | "PLANNED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type ReadingCycle = {
  id: string;
  clubId: string;
  bookId: string;
  status: ReadingCycleStatus;
  startDate: Date;
  targetEndDate: Date;
  goalDescription: string | null;
  createdByUserId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  book: Book;
};

export type CreateReadingCycleInput = CreateReadingCycleSchemaType;
export type UpdateReadingCycleInput = UpdateReadingCycleSchemaType;
export type ListReadingCyclesQuery = ListReadingCyclesQuerySchemaType;
