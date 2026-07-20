import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { ApiErrorCode } from "../utils/apiResponse";
import type {
  ReadingProgressDto,
  ReadingProgressMemberDto,
  ReadingProgressResponse,
  ReadingProgressStatus,
  UpdateReadingProgressInput,
} from "../types";

type ReadingProgressRecord = {
  id: string;
  status: ReadingProgressStatus;
  progressPercentage: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lastUpdatedAt: Date;
};

type CurrentMemberRecord = {
  role: "MEMBER" | "MODERATOR" | "OWNER";
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    readingProgress: ReadingProgressRecord[];
  };
};

export class ReadingProgressServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ReadingProgressServiceError";
  }
}

const progressSelect = {
  id: true,
  status: true,
  progressPercentage: true,
  startedAt: true,
  completedAt: true,
  lastUpdatedAt: true,
} satisfies Prisma.ReadingProgressSelect;

function deriveProgressStatus(
  progressPercentage: number,
): ReadingProgressStatus {
  if (progressPercentage === 0) return "NOT_STARTED";
  if (progressPercentage === 100) return "COMPLETED";
  return "IN_PROGRESS";
}

function emptyProgress(): ReadingProgressDto {
  return {
    id: null,
    status: "NOT_STARTED",
    progressPercentage: 0,
    startedAt: null,
    completedAt: null,
    updatedAt: null,
  };
}

function toProgressDto(
  record: ReadingProgressRecord | null | undefined,
): ReadingProgressDto {
  if (!record) return emptyProgress();

  return {
    id: record.id,
    status: record.status,
    progressPercentage: record.progressPercentage,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    updatedAt: record.lastUpdatedAt,
  };
}

async function getReadingCycle(clubId: string, cycleId: string) {
  const cycle = await prisma.readingCycle.findFirst({
    where: { id: cycleId, clubId },
    select: {
      id: true,
      clubId: true,
      status: true,
      club: { select: { id: true, isPublic: true } },
    },
  });

  if (!cycle) {
    throw new ReadingProgressServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  return cycle;
}

async function assertCurrentMember(userId: string, clubId: string) {
  const membership = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });

  if (!membership) {
    throw new ReadingProgressServiceError(
      "CLUB_MEMBERSHIP_REQUIRED",
      "Only current club members can access reading progress.",
      403,
    );
  }

  return membership;
}

function sortMemberProgress(
  currentUserId: string,
  members: ReadingProgressMemberDto[],
) {
  return members.sort((first, second) => {
    if (first.user.id === currentUserId) return -1;
    if (second.user.id === currentUserId) return 1;

    const firstUpdated = first.updatedAt?.getTime() ?? 0;
    const secondUpdated = second.updatedAt?.getTime() ?? 0;

    if (firstUpdated !== secondUpdated) {
      return secondUpdated - firstUpdated;
    }

    return first.user.name.localeCompare(second.user.name);
  });
}

function buildProgressResponse(
  cycleId: string,
  currentUserId: string,
  currentMembers: CurrentMemberRecord[],
): ReadingProgressResponse {
  const members = currentMembers.map((member) => {
    const progress = toProgressDto(member.user.readingProgress[0]);

    return {
      ...progress,
      user: {
        id: member.user.id,
        name: member.user.username,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
      },
    };
  });

  const totalMembers = members.length;
  const startedMembers = members.filter(
    (member) => member.progressPercentage > 0,
  ).length;
  const inProgressMembers = members.filter(
    (member) => member.status === "IN_PROGRESS",
  ).length;
  const completedMembers = members.filter(
    (member) => member.status === "COMPLETED",
  ).length;
  const averageProgressPercentage =
    totalMembers === 0
      ? 0
      : Math.round(
          members.reduce(
            (total, member) => total + member.progressPercentage,
            0,
          ) / totalMembers,
        );

  const ownMemberProgress = members.find(
    (member) => member.user.id === currentUserId,
  );

  return {
    cycleId,
    ownProgress: ownMemberProgress
      ? {
          id: ownMemberProgress.id,
          status: ownMemberProgress.status,
          progressPercentage: ownMemberProgress.progressPercentage,
          startedAt: ownMemberProgress.startedAt,
          completedAt: ownMemberProgress.completedAt,
          updatedAt: ownMemberProgress.updatedAt,
        }
      : emptyProgress(),
    summary: {
      totalMembers,
      startedMembers,
      inProgressMembers,
      completedMembers,
      averageProgressPercentage,
    },
    members: sortMemberProgress(currentUserId, members),
  };
}

export async function getReadingProgress(
  userId: string,
  clubId: string,
  cycleId: string,
): Promise<ReadingProgressResponse> {
  await getReadingCycle(clubId, cycleId);
  await assertCurrentMember(userId, clubId);

  const members = await prisma.clubMember.findMany({
    where: { clubId },
    orderBy: [{ joinedAt: "asc" }],
    select: {
      role: true,
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          readingProgress: {
            where: { readingCycleId: cycleId },
            take: 1,
            select: progressSelect,
          },
        },
      },
    },
  });

  return buildProgressResponse(cycleId, userId, members);
}

export async function updateMyReadingProgress(
  userId: string,
  clubId: string,
  cycleId: string,
  input: UpdateReadingProgressInput,
): Promise<ReadingProgressResponse> {
  const cycle = await getReadingCycle(clubId, cycleId);
  await assertCurrentMember(userId, clubId);

  if (cycle.status !== "ACTIVE") {
    throw new ReadingProgressServiceError(
      "READING_CYCLE_NOT_ACTIVE",
      "Progress can only be updated while the reading cycle is active.",
      422,
    );
  }

  const progressPercentage = input.progressPercentage;
  const status = deriveProgressStatus(progressPercentage);
  const now = new Date();

  try {
    const existing = await prisma.readingProgress.findUnique({
      where: { readingCycleId_userId: { readingCycleId: cycleId, userId } },
      select: {
        id: true,
        startedAt: true,
      },
    });

    await prisma.readingProgress.upsert({
      where: { readingCycleId_userId: { readingCycleId: cycleId, userId } },
      create: {
        readingCycleId: cycleId,
        userId,
        status,
        progressPercentage,
        startedAt: progressPercentage > 0 ? now : null,
        completedAt: progressPercentage === 100 ? now : null,
        lastUpdatedAt: now,
      },
      update: {
        status,
        progressPercentage,
        startedAt:
          progressPercentage > 0 && !existing?.startedAt ? now : undefined,
        completedAt: progressPercentage === 100 ? now : null,
        lastUpdatedAt: now,
      },
      select: progressSelect,
    });

    return getReadingProgress(userId, clubId, cycleId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return getReadingProgress(userId, clubId, cycleId);
    }

    throw new ReadingProgressServiceError(
      "READING_PROGRESS_UPDATE_FAILED",
      "Unable to update reading progress. Please try again.",
      500,
    );
  }
}
