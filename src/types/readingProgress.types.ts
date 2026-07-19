import type { UpdateReadingProgressSchemaType } from "../schemas";

export type ReadingProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export type ReadingProgressDto = {
  id: string | null;
  status: ReadingProgressStatus;
  progressPercentage: number;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
};

export type ReadingProgressMemberDto = ReadingProgressDto & {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: "MEMBER" | "MODERATOR" | "OWNER";
  };
};

export type ReadingProgressSummaryDto = {
  totalMembers: number;
  startedMembers: number;
  inProgressMembers: number;
  completedMembers: number;
  averageProgressPercentage: number;
};

export type ReadingProgressResponse = {
  cycleId: string;
  ownProgress: ReadingProgressDto;
  summary: ReadingProgressSummaryDto;
  members: ReadingProgressMemberDto[];
};

export type UpdateReadingProgressInput = UpdateReadingProgressSchemaType;
