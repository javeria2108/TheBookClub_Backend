import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getClubMemberUserIds, notify } from "./notificationService";
import type {
  CreateReadingEntryInput,
  ListReadingEntriesInput,
  ReadingEntryDto,
  ReadingEntryPage,
  UpdateReadingEntryInput,
} from "../types";
import type { ApiErrorCode } from "../utils/apiResponse";

type Membership = { role: "MEMBER" | "MODERATOR" | "OWNER" };
type EntryRecord = NonNullable<Awaited<ReturnType<typeof findEntry>>>;

const QUOTE_MAX_LENGTH = 300;
const REFLECTION_MAX_LENGTH = 2000;
const COMMENTARY_MAX_LENGTH = 1000;

export class ReadingEntryServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ReadingEntryServiceError";
  }
}

const entrySelect = {
  id: true,
  clubId: true,
  readingCycleId: true,
  readingTargetId: true,
  userId: true,
  entryType: true,
  body: true,
  commentary: true,
  pageNumber: true,
  chapterReference: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: { id: true, username: true, avatarUrl: true } },
  readingTarget: {
    select: {
      id: true,
      title: true,
      targetType: true,
      startValue: true,
      endValue: true,
    },
  },
} satisfies Prisma.ReadingEntrySelect;

async function assertMember(userId: string, clubId: string): Promise<Membership> {
  const membership = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });

  if (!membership) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_PERMISSION_DENIED",
      "Only current club members can access reflections and quotes.",
      403,
    );
  }

  return membership;
}

function isModeratorOrOwner(membership: Membership) {
  return membership.role === "OWNER" || membership.role === "MODERATOR";
}

function getRangeLabel(target: NonNullable<EntryRecord["readingTarget"]>) {
  if (target.targetType === "CHAPTERS") {
    return `Chapters ${target.startValue}-${target.endValue}`;
  }

  if (target.targetType === "PAGES") {
    return `Pages ${target.startValue}-${target.endValue}`;
  }

  return target.title;
}

function toEntryDto(
  record: EntryRecord,
  userId: string,
  membership: Membership,
): ReadingEntryDto {
  return {
    id: record.id,
    entryType: record.entryType,
    body: record.deletedAt ? "" : record.body,
    commentary: record.deletedAt ? null : record.commentary,
    pageNumber: record.pageNumber,
    chapterReference: record.chapterReference,
    readingTarget: record.readingTarget
      ? {
          id: record.readingTarget.id,
          title: record.readingTarget.title,
          rangeLabel: getRangeLabel(record.readingTarget),
        }
      : null,
    author: {
      id: record.user.id,
      displayName: record.user.username,
      avatarUrl: record.user.avatarUrl,
    },
    canEdit: !record.deletedAt && record.userId === userId,
    canDelete:
      !record.deletedAt && (record.userId === userId || isModeratorOrOwner(membership)),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getCycle(clubId: string, cycleId: string) {
  const cycle = await prisma.readingCycle.findFirst({
    where: { id: cycleId, clubId },
    select: { id: true, clubId: true, status: true },
  });

  if (!cycle) {
    throw new ReadingEntryServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  return cycle;
}

function ensureCycleAcceptsEntries(status: string) {
  if (status === "PLANNED" || status === "CANCELLED") {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_INVALID",
      "Reflections and quotes can be added only to active or completed reading cycles.",
      422,
    );
  }
}

function isCurrentTargetDateRange(target: { startDate: Date; endDate: Date }) {
  const now = new Date();
  return now >= target.startDate && now <= target.endDate;
}

async function ensureTarget(
  cycleId: string,
  readingTargetId: string | null | undefined,
) {
  if (!readingTargetId) return null;

  const target = await prisma.readingTarget.findFirst({
    where: { id: readingTargetId, readingCycleId: cycleId },
    select: { id: true, title: true, startDate: true, endDate: true },
  });

  if (!target) {
    throw new ReadingEntryServiceError(
      "READING_TARGET_NOT_FOUND",
      "Reading target was not found for this cycle.",
      404,
    );
  }

  return target;
}

function validateEntryContent(input: {
  entryType: "REFLECTION" | "QUOTE";
  body: string;
  commentary?: string | null;
}) {
  const body = input.body.trim();

  if (input.entryType === "QUOTE" && body.length > QUOTE_MAX_LENGTH) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_INVALID",
      "Quotes should be brief excerpts, not full passages.",
      400,
    );
  }

  if (input.entryType === "REFLECTION" && body.length > REFLECTION_MAX_LENGTH) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_INVALID",
      "Reflections must be at most 2,000 characters.",
      400,
    );
  }

  if ((input.commentary?.trim().length ?? 0) > COMMENTARY_MAX_LENGTH) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_INVALID",
      "Quote commentary must be at most 1,000 characters.",
      400,
    );
  }
}

async function findEntry(clubId: string, entryId: string) {
  return prisma.readingEntry.findFirst({
    where: { id: entryId, clubId, deletedAt: null },
    select: entrySelect,
  });
}

async function getEntryOrThrow(clubId: string, entryId: string) {
  const entry = await findEntry(clubId, entryId);

  if (!entry) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_NOT_FOUND",
      "Reading entry was not found.",
      404,
    );
  }

  return entry;
}

export async function listReadingEntries(
  userId: string,
  clubId: string,
  cycleId: string,
  query: ListReadingEntriesInput,
): Promise<ReadingEntryPage> {
  const membership = await assertMember(userId, clubId);
  await getCycle(clubId, cycleId);
  const cursorDate = query.cursor ? new Date(query.cursor) : undefined;

  const entries = await prisma.readingEntry.findMany({
    where: {
      clubId,
      readingCycleId: cycleId,
      deletedAt: null,
      entryType: query.type,
      userId: query.author === "me" ? userId : undefined,
      createdAt: cursorDate ? { lt: cursorDate } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: query.limit + 1,
    select: entrySelect,
  });
  const page = entries.slice(0, query.limit);

  return {
    items: page.map((entry) => toEntryDto(entry, userId, membership)),
    pagination: {
      nextCursor:
        entries.length > query.limit
          ? page[page.length - 1]?.createdAt.toISOString() ?? null
          : null,
      hasMore: entries.length > query.limit,
    },
  };
}

export async function createReadingEntry(
  userId: string,
  clubId: string,
  cycleId: string,
  input: CreateReadingEntryInput,
): Promise<ReadingEntryDto> {
  const membership = await assertMember(userId, clubId);
  const cycle = await getCycle(clubId, cycleId);
  ensureCycleAcceptsEntries(cycle.status);
  validateEntryContent(input);
  const readingTarget = await ensureTarget(cycleId, input.readingTargetId);

  const entry = await prisma.readingEntry.create({
    data: {
      clubId,
      readingCycleId: cycleId,
      userId,
      entryType: input.entryType,
      body: input.body.trim(),
      commentary:
        input.entryType === "QUOTE" ? input.commentary?.trim() || null : null,
      readingTargetId: readingTarget?.id ?? null,
      pageNumber: input.pageNumber ?? null,
      chapterReference: input.chapterReference?.trim() || null,
    },
    select: entrySelect,
  });

  if (readingTarget && isCurrentTargetDateRange(readingTarget)) {
    await notify({
      recipients: await getClubMemberUserIds(clubId, {
        excludeUserIds: [userId],
      }),
      type: "READING_ENTRY_CREATED",
      actorId: userId,
      clubId,
      title:
        input.entryType === "QUOTE"
          ? "New favourite quote"
          : "New reading reflection",
      body: `${entry.user.username} shared something for ${readingTarget.title}.`,
      actionUrl: `/clubs/${clubId}/reading`,
      entityType: "READING_ENTRY",
      entityId: entry.id,
    });
  }

  return toEntryDto(entry, userId, membership);
}

export async function updateReadingEntry(
  userId: string,
  clubId: string,
  entryId: string,
  input: UpdateReadingEntryInput,
): Promise<ReadingEntryDto> {
  const membership = await assertMember(userId, clubId);
  const existing = await getEntryOrThrow(clubId, entryId);

  if (existing.userId !== userId) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_PERMISSION_DENIED",
      "You cannot edit another member's entry.",
      403,
    );
  }

  const body = input.body ?? existing.body;
  const commentary =
    input.commentary === undefined ? existing.commentary : input.commentary;
  validateEntryContent({
    entryType: existing.entryType,
    body,
    commentary,
  });
  const readingTargetId =
    input.readingTargetId === undefined
      ? existing.readingTargetId
      : ((await ensureTarget(existing.readingCycleId, input.readingTargetId))?.id ??
        null);

  const updated = await prisma.readingEntry.update({
    where: { id: entryId },
    data: {
      body: input.body?.trim(),
      commentary:
        existing.entryType === "QUOTE"
          ? input.commentary === undefined
            ? undefined
            : input.commentary?.trim() || null
          : null,
      readingTargetId,
      pageNumber: input.pageNumber,
      chapterReference:
        input.chapterReference === undefined
          ? undefined
          : input.chapterReference?.trim() || null,
    },
    select: entrySelect,
  });

  return toEntryDto(updated, userId, membership);
}

export async function deleteReadingEntry(
  userId: string,
  clubId: string,
  entryId: string,
): Promise<void> {
  const membership = await assertMember(userId, clubId);
  const existing = await getEntryOrThrow(clubId, entryId);

  if (existing.userId !== userId && !isModeratorOrOwner(membership)) {
    throw new ReadingEntryServiceError(
      "READING_ENTRY_PERMISSION_DENIED",
      "You cannot remove this entry.",
      403,
    );
  }

  await prisma.readingEntry.update({
    where: { id: entryId },
    data: { deletedAt: new Date(), body: "", commentary: null },
    select: { id: true },
  });
}
