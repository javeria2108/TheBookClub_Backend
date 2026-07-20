import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { BookServiceError, findOrCreateGoogleBook } from "./bookService";
import { getClubMemberUserIds, notify } from "./notificationService";
import type { ApiErrorCode } from "../utils/apiResponse";
import type {
  Book,
  CreateReadingCycleInput,
  ListReadingCyclesQuery,
  ReadingCycle,
  UpdateReadingCycleInput,
} from "../types";

type ReadingCycleRecord = NonNullable<
  Awaited<ReturnType<typeof findReadingCycleById>>
>;

const ACTIVE_OR_PLANNED_STATUSES = ["ACTIVE", "PLANNED"] as const;

export class ReadingCycleServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ReadingCycleServiceError";
  }
}

const bookSelect = {
  id: true,
  title: true,
  subtitle: true,
  description: true,
  authors: true,
  coverImage: true,
  isbn10: true,
  isbn13: true,
  publisher: true,
  publishedDate: true,
  pageCount: true,
  language: true,
  externalSource: true,
  externalId: true,
  previewUrl: true,
  infoUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookSelect;

const readingCycleSelect = {
  id: true,
  clubId: true,
  bookId: true,
  status: true,
  startDate: true,
  targetEndDate: true,
  goalDescription: true,
  createdByUserId: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  book: { select: bookSelect },
} satisfies Prisma.ReadingCycleSelect;

async function findReadingCycleById(clubId: string, cycleId: string) {
  return prisma.readingCycle.findFirst({
    where: { id: cycleId, clubId },
    select: readingCycleSelect,
  });
}

function toBook(record: ReadingCycleRecord["book"]): Book {
  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle,
    description: record.description,
    authors: record.authors,
    coverImage: record.coverImage,
    isbn10: record.isbn10,
    isbn13: record.isbn13,
    publisher: record.publisher,
    publishedDate: record.publishedDate,
    pageCount: record.pageCount,
    language: record.language,
    externalSource: record.externalSource,
    externalId: record.externalId,
    previewUrl: record.previewUrl,
    infoUrl: record.infoUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toReadingCycle(record: ReadingCycleRecord): ReadingCycle {
  return {
    id: record.id,
    clubId: record.clubId,
    bookId: record.bookId,
    status: record.status,
    startDate: record.startDate,
    targetEndDate: record.targetEndDate,
    goalDescription: record.goalDescription,
    createdByUserId: record.createdByUserId,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    book: toBook(record.book),
  };
}

function ensureTargetEndDateIsAfterStartDate(
  startDate: Date,
  targetEndDate: Date,
) {
  if (targetEndDate <= startDate) {
    throw new ReadingCycleServiceError(
      "INVALID_READING_CYCLE_DATES",
      "Target end date must be after the start date.",
      400,
    );
  }
}

async function getClub(clubId: string) {
  const club = await prisma.bookClub.findUnique({
    where: { id: clubId },
    select: { id: true, isPublic: true },
  });

  if (!club) {
    throw new ReadingCycleServiceError(
      "CLUB_NOT_FOUND",
      "Club was not found.",
      404,
    );
  }

  return club;
}

async function getMembership(userId: string, clubId: string) {
  return prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
}

async function assertClubMember(userId: string, clubId: string) {
  await getClub(clubId);
  const membership = await getMembership(userId, clubId);

  if (!membership) {
    throw new ReadingCycleServiceError(
      "CLUB_MEMBER_REQUIRED",
      "Only club members can view this reading cycle.",
      403,
    );
  }

  return membership;
}

async function assertClubOwner(userId: string, clubId: string) {
  await getClub(clubId);
  const membership = await getMembership(userId, clubId);

  if (membership?.role !== "OWNER") {
    throw new ReadingCycleServiceError(
      "CLUB_OWNER_REQUIRED",
      "Only the club owner can manage reading cycles.",
      403,
    );
  }
}

async function assertNoOpenCycle(
  clubId: string,
  status: "ACTIVE" | "PLANNED",
  transactionClient: Prisma.TransactionClient = prisma,
  ignoredCycleId?: string,
) {
  const existingCycle = await transactionClient.readingCycle.findFirst({
    where: {
      clubId,
      status,
      id: ignoredCycleId ? { not: ignoredCycleId } : undefined,
    },
    select: { id: true },
  });

  if (!existingCycle) {
    return;
  }

  throwOpenCycleConflict(status);
}

async function assertExistingTargetsFitCycleDates(
  clubId: string,
  cycleId: string,
  startDate: Date,
  targetEndDate: Date,
) {
  const conflictingTarget = await prisma.readingTarget.findFirst({
    where: {
      readingCycleId: cycleId,
      readingCycle: { clubId },
      OR: [{ startDate: { lt: startDate } }, { endDate: { gt: targetEndDate } }],
    },
    select: { title: true },
  });

  if (conflictingTarget) {
    throw new ReadingCycleServiceError(
      "READING_TARGET_OUTSIDE_CYCLE",
      `Existing target "${conflictingTarget.title}" would fall outside the new cycle dates.`,
      409,
    );
  }
}

async function resolveSelectedBook(
  input: CreateReadingCycleInput["bookSelection"],
  transactionClient: Prisma.TransactionClient,
): Promise<Book> {
  if (input.source === "BOOKCIRCLE") {
    const book = await transactionClient.book.findUnique({
      where: { id: input.bookId },
      select: bookSelect,
    });

    if (!book) {
      throw new ReadingCycleServiceError(
        "BOOK_NOT_FOUND",
        "Selected book was not found.",
        404,
      );
    }

    return toBook(book);
  }

  return findOrCreateGoogleBook(input.googleBooksId, transactionClient);
}

function ensureCycleCanBeEdited(cycle: ReadingCycleRecord) {
  if (cycle.status === "COMPLETED" || cycle.status === "CANCELLED") {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_INVALID_TRANSITION",
      "Completed and cancelled reading cycles cannot be edited.",
      422,
    );
  }
}

function throwOpenCycleConflict(status: "ACTIVE" | "PLANNED"): never {
  throw new ReadingCycleServiceError(
    status === "ACTIVE"
      ? "READING_CYCLE_ALREADY_ACTIVE"
      : "PLANNED_READING_CYCLE_EXISTS",
    status === "ACTIVE"
      ? "This club already has an active reading cycle."
      : "This club already has a planned reading cycle.",
    409,
  );
}

async function notifyReadingCycleMembers(
  userId: string,
  cycle: ReadingCycle,
  type: "READING_CYCLE_STARTED" | "READING_CYCLE_UPDATED",
) {
  const recipients = await getClubMemberUserIds(cycle.clubId);

  await notify({
    recipients,
    type,
    actorId: userId,
    clubId: cycle.clubId,
    title:
      type === "READING_CYCLE_STARTED"
        ? "New reading cycle started"
        : "Reading cycle updated",
    body:
      type === "READING_CYCLE_STARTED"
        ? `The club has started reading ${cycle.book.title}.`
        : `${cycle.book.title} has new reading cycle details.`,
    actionUrl: `/clubs/${cycle.clubId}/reading`,
    entityType: "READING_CYCLE",
    entityId: cycle.id,
  });
}

export async function listReadingCycles(
  userId: string,
  clubId: string,
  query: ListReadingCyclesQuery,
): Promise<ReadingCycle[]> {
  await assertClubMember(userId, clubId);

  const cycles = await prisma.readingCycle.findMany({
    where: { clubId, status: query.status },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: readingCycleSelect,
  });

  return cycles.map(toReadingCycle);
}

export async function getCurrentReadingCycle(
  clubId: string,
): Promise<ReadingCycle | null> {
  const club = await getClub(clubId);

  if (!club.isPublic) {
    return null;
  }

  const cycles = await prisma.readingCycle.findMany({
    where: {
      clubId,
      status: { in: [...ACTIVE_OR_PLANNED_STATUSES] },
    },
    orderBy: [
      { startDate: "asc" },
      { createdAt: "asc" },
    ],
    select: readingCycleSelect,
  });

  const cycle =
    cycles.find((readingCycle) => readingCycle.status === "ACTIVE") ??
    cycles.find((readingCycle) => readingCycle.status === "PLANNED") ??
    null;

  return cycle ? toReadingCycle(cycle) : null;
}

export async function getReadingCycleById(
  userId: string,
  clubId: string,
  cycleId: string,
): Promise<ReadingCycle> {
  await assertClubMember(userId, clubId);
  const cycle = await findReadingCycleById(clubId, cycleId);

  if (!cycle) {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  return toReadingCycle(cycle);
}

export async function createReadingCycle(
  userId: string,
  clubId: string,
  input: CreateReadingCycleInput,
): Promise<ReadingCycle> {
  await assertClubOwner(userId, clubId);
  ensureTargetEndDateIsAfterStartDate(input.startDate, input.targetEndDate);

  try {
    const createdCycle = await prisma.$transaction(async (transactionClient) => {
      await assertNoOpenCycle(clubId, input.status, transactionClient);
      const book = await resolveSelectedBook(input.bookSelection, transactionClient);
      const now = new Date();

      const cycle = await transactionClient.readingCycle.create({
        data: {
          clubId,
          bookId: book.id,
          status: input.status,
          startDate: input.startDate,
          targetEndDate: input.targetEndDate,
          goalDescription: input.goalDescription?.trim() || null,
          createdByUserId: userId,
          startedAt: input.status === "ACTIVE" ? now : null,
        },
        select: readingCycleSelect,
      });

      return toReadingCycle(cycle);
    });

    if (createdCycle.status === "ACTIVE") {
      await notifyReadingCycleMembers(
        userId,
        createdCycle,
        "READING_CYCLE_STARTED",
      );
    }

    return createdCycle;
  } catch (error) {
    if (error instanceof ReadingCycleServiceError) {
      throw error;
    }

    if (error instanceof BookServiceError) {
      throw new ReadingCycleServiceError(
        error.code,
        error.message,
        error.statusCode,
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throwOpenCycleConflict(input.status);
    }

    throw new ReadingCycleServiceError(
      "READING_CYCLE_CREATE_FAILED",
      "Unable to create reading cycle. Please try again.",
      500,
    );
  }
}

export async function updateReadingCycle(
  userId: string,
  clubId: string,
  cycleId: string,
  input: UpdateReadingCycleInput,
): Promise<ReadingCycle> {
  await assertClubOwner(userId, clubId);

  const existingCycle = await findReadingCycleById(clubId, cycleId);

  if (!existingCycle) {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  ensureCycleCanBeEdited(existingCycle);

  const nextStartDate = input.startDate ?? existingCycle.startDate;
  const nextTargetEndDate = input.targetEndDate ?? existingCycle.targetEndDate;
  ensureTargetEndDateIsAfterStartDate(nextStartDate, nextTargetEndDate);
  await assertExistingTargetsFitCycleDates(
    clubId,
    cycleId,
    nextStartDate,
    nextTargetEndDate,
  );

  try {
    const cycle = await prisma.readingCycle.update({
      where: { id: cycleId },
      data: {
        startDate: input.startDate,
        targetEndDate: input.targetEndDate,
        goalDescription:
          input.goalDescription === undefined
            ? undefined
            : input.goalDescription?.trim() || null,
      },
      select: readingCycleSelect,
    });

    const updatedCycle = toReadingCycle(cycle);
    await notifyReadingCycleMembers(
      userId,
      updatedCycle,
      "READING_CYCLE_UPDATED",
    );

    return updatedCycle;
  } catch {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_UPDATE_FAILED",
      "Unable to update reading cycle. Please try again.",
      500,
    );
  }
}

export async function startReadingCycle(
  userId: string,
  clubId: string,
  cycleId: string,
): Promise<ReadingCycle> {
  await assertClubOwner(userId, clubId);

  try {
    const startedCycle = await prisma.$transaction(async (transactionClient) => {
      const cycle = await transactionClient.readingCycle.findFirst({
        where: { id: cycleId, clubId },
        select: readingCycleSelect,
      });

      if (!cycle) {
        throw new ReadingCycleServiceError(
          "READING_CYCLE_NOT_FOUND",
          "Reading cycle was not found.",
          404,
        );
      }

      if (cycle.status !== "PLANNED") {
        throw new ReadingCycleServiceError(
          "READING_CYCLE_INVALID_TRANSITION",
          "Only a planned reading cycle can be started.",
          422,
        );
      }

      await assertNoOpenCycle(clubId, "ACTIVE", transactionClient, cycleId);

      const updatedCycle = await transactionClient.readingCycle.update({
        where: { id: cycleId },
        data: { status: "ACTIVE", startedAt: new Date() },
        select: readingCycleSelect,
      });

      return toReadingCycle(updatedCycle);
    });

    await notifyReadingCycleMembers(
      userId,
      startedCycle,
      "READING_CYCLE_STARTED",
    );

    return startedCycle;
  } catch (error) {
    if (error instanceof ReadingCycleServiceError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throwOpenCycleConflict("ACTIVE");
    }

    throw error;
  }
}

export async function completeReadingCycle(
  userId: string,
  clubId: string,
  cycleId: string,
): Promise<ReadingCycle> {
  await assertClubOwner(userId, clubId);

  const cycle = await findReadingCycleById(clubId, cycleId);

  if (!cycle) {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  if (cycle.status !== "ACTIVE") {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_INVALID_TRANSITION",
      "Only an active reading cycle can be completed.",
      422,
    );
  }

  const updatedCycle = await prisma.readingCycle.update({
    where: { id: cycleId },
    data: { status: "COMPLETED", completedAt: new Date() },
    select: readingCycleSelect,
  });

  return toReadingCycle(updatedCycle);
}

export async function cancelReadingCycle(
  userId: string,
  clubId: string,
  cycleId: string,
): Promise<ReadingCycle> {
  await assertClubOwner(userId, clubId);

  const cycle = await findReadingCycleById(clubId, cycleId);

  if (!cycle) {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  if (cycle.status === "COMPLETED" || cycle.status === "CANCELLED") {
    throw new ReadingCycleServiceError(
      "READING_CYCLE_INVALID_TRANSITION",
      "This reading cycle cannot be cancelled.",
      422,
    );
  }

  const updatedCycle = await prisma.readingCycle.update({
    where: { id: cycleId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
    select: readingCycleSelect,
  });

  return toReadingCycle(updatedCycle);
}
