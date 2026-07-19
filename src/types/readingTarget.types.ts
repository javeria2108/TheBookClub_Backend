import type {
  CreateReadingTargetSchemaType,
  ReorderReadingTargetsSchemaType,
  UpdateReadingTargetSchemaType,
} from "../schemas";

export type ReadingTargetType = "CHAPTERS" | "PAGES" | "CUSTOM";
export type ReadingTargetState = "UPCOMING" | "CURRENT" | "PREVIOUS";

export type ReadingTarget = {
  id: string;
  readingCycleId: string;
  sequence: number;
  title: string;
  description: string | null;
  targetType: ReadingTargetType;
  startValue: number | null;
  endValue: number | null;
  rangeLabel: string;
  startDate: Date;
  endDate: Date;
  state: ReadingTargetState;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateReadingTargetInput = CreateReadingTargetSchemaType;
export type UpdateReadingTargetInput = UpdateReadingTargetSchemaType;
export type ReorderReadingTargetsInput = ReorderReadingTargetsSchemaType;
