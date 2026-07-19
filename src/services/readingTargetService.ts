import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { ApiErrorCode } from "../utils/apiResponse";
import type {
  CreateReadingTargetInput,
  ReadingTarget,
  ReadingTargetState,
  ReadingTargetType,
  ReorderReadingTargetsInput,
  UpdateReadingTargetInput,
} from "../types";

type ReadingTargetRecord = NonNullable<
  Awaited<ReturnType<typeof findTargetById>>
>;

type CycleRecord = NonNullable<Awaited<ReturnType<typeof getCycleForTargets>>>;

export class ReadingTargetServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ReadingTargetServiceError";
  }
}

const targetSelect = {
  id: true,
  readingCycleId: true,
  sequence: true,
  title: true,
  description: true,
  targetType: true,
  startValue: true,
  endValue: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReadingTargetSelect;

async function getCycleForTargets(clubId: string, cycleId: string) {
  const cycle = await prisma.readingCycle.findFirst({
    where: { id: cycleId, clubId },
    select: {
      id: true,
      clubId: true,
      status: true,
      startDate: true,
      targetEndDate: true,
      club: { select: { id: true, isPublic: true } },
    },
  });

  if (!cycle) {
    throw new ReadingTargetServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found.",
      404,
    );
  }

  return cycle;
}

async function findTargetById(cycleId: string, targetId: string) {
  return prisma.readingTarget.findFirst({
    where: { id: targetId, readingCycleId: cycleId },
    select: targetSelect,
  });
}

async function getMembership(userId: string, clubId: string) {
  return prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
}

async function assertCurrentMember(userId: string, clubId: string) {
  const membership = await getMembership(userId, clubId);

  if (!membership) {
    throw new ReadingTargetServiceError(
      "CLUB_ACCESS_DENIED",
      "Only current club members can view this reading plan.",
      403,
    );
  }

  return membership;
}

async function assertClubOwner(userId: string, clubId: string) {
  const membership = await getMembership(userId, clubId);

  if (membership?.role !== "OWNER") {
    throw new ReadingTargetServiceError(
      "CLUB_OWNER_REQUIRED",
      "Only the club owner can manage the reading plan.",
      403,
    );
  }
}

function deriveTargetState(startDate: Date, endDate: Date): ReadingTargetState {
  const now = new Date();

  if (now < startDate) return "UPCOMING";
  if (now > endDate) return "PREVIOUS";
  return "CURRENT";
}

function getRangeLabel(target: {
  targetType: ReadingTargetType;
  title: string;
  startValue: number | null;
  endValue: number | null;
}) {
  if (target.targetType === "CHAPTERS") {
    return `Chapters ${target.startValue}-${target.endValue}`;
  }

  if (target.targetType === "PAGES") {
    return `Pages ${target.startValue}-${target.endValue}`;
  }

  return target.title;
}

function toReadingTarget(record: ReadingTargetRecord): ReadingTarget {
  return {
    id: record.id,
    readingCycleId: record.readingCycleId,
    sequence: record.sequence,
    title: record.title,
    description: record.description,
    targetType: record.targetType,
    startValue: record.startValue,
    endValue: record.endValue,
    rangeLabel: getRangeLabel(record),
    startDate: record.startDate,
    endDate: record.endDate,
    state: deriveTargetState(record.startDate, record.endDate),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function ensureCycleCanChangeTargets(cycle: CycleRecord) {
  if (cycle.status === "COMPLETED" || cycle.status === "CANCELLED") {
    throw new ReadingTargetServiceError(
      "READING_TARGET_CHANGE_NOT_ALLOWED",
      "Completed and cancelled reading cycles cannot change their reading plan.",
      422,
    );
  }
}

function ensureTargetRange(input: {
  targetType: ReadingTargetType;
  startValue?: number | null;
  endValue?: number | null;
  description?: string | null;
}) {
  if (input.targetType === "CUSTOM") {
    if (!input.description?.trim()) {
      throw new ReadingTargetServiceError(
        "READING_TARGET_INVALID",
        "Enter a description for this custom reading goal.",
        400,
      );
    }

    return;
  }

  if (!input.startValue || !input.endValue) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_RANGE_INVALID",
      input.targetType === "CHAPTERS"
        ? "Enter start and end chapters."
        : "Enter start and end pages.",
      400,
    );
  }

  if (input.endValue < input.startValue) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_RANGE_INVALID",
      input.targetType === "CHAPTERS"
        ? "End chapter must be greater than or equal to start chapter."
        : "End page must be greater than or equal to start page.",
      400,
    );
  }
}

function ensureTargetDates(cycle: CycleRecord, startDate: Date, endDate: Date) {
  if (endDate <= startDate) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_DATES_INVALID",
      "End date must be after start date.",
      400,
    );
  }

  if (startDate < cycle.startDate || endDate > cycle.targetEndDate) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_OUTSIDE_CYCLE",
      "Target dates must remain within the reading cycle.",
      422,
    );
  }
}

async function ensureNoOverlap(
  cycleId: string,
  startDate: Date,
  endDate: Date,
  ignoredTargetId?: string,
  transactionClient: Prisma.TransactionClient = prisma,
) {
  const overlappingTarget = await transactionClient.readingTarget.findFirst({
    where: {
      readingCycleId: cycleId,
      id: ignoredTargetId ? { not: ignoredTargetId } : undefined,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { title: true },
  });

  if (overlappingTarget) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_OVERLAP",
      `This target overlaps ${overlappingTarget.title}.`,
      409,
    );
  }
}

async function getNextSequence(
  cycleId: string,
  transactionClient: Prisma.TransactionClient,
) {
  const latest = await transactionClient.readingTarget.findFirst({
    where: { readingCycleId: cycleId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });

  return (latest?.sequence ?? 0) + 1;
}

async function compactSequences(
  cycleId: string,
  transactionClient: Prisma.TransactionClient,
) {
  const targets = await transactionClient.readingTarget.findMany({
    where: { readingCycleId: cycleId },
    orderBy: [{ sequence: "asc" }, { startDate: "asc" }],
    select: { id: true },
  });

  await Promise.all(
    targets.map((target, index) =>
      transactionClient.readingTarget.update({
        where: { id: target.id },
        data: { sequence: -(index + 1) },
        select: { id: true },
      }),
    ),
  );

  await Promise.all(
    targets.map((target, index) =>
      transactionClient.readingTarget.update({
        where: { id: target.id },
        data: { sequence: index + 1 },
        select: { id: true },
      }),
    ),
  );
}

function normalizeCreateInput(input: CreateReadingTargetInput) {
  const targetType = input.targetType;

  return {
    targetType,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    startValue: targetType === "CUSTOM" ? null : input.startValue,
    endValue: targetType === "CUSTOM" ? null : input.endValue,
    startDate: input.startDate,
    endDate: input.endDate,
  };
}

function normalizeUpdateInput(
  existing: ReadingTargetRecord,
  input: UpdateReadingTargetInput,
) {
  const targetType = input.targetType ?? existing.targetType;
  const description =
    input.description === undefined
      ? existing.description
      : input.description?.trim() || null;

  return {
    targetType,
    title: input.title?.trim() ?? existing.title,
    description,
    startValue:
      targetType === "CUSTOM"
        ? null
        : input.startValue !== undefined
          ? input.startValue
          : existing.startValue,
    endValue:
      targetType === "CUSTOM"
        ? null
        : input.endValue !== undefined
          ? input.endValue
          : existing.endValue,
    startDate: input.startDate ?? existing.startDate,
    endDate: input.endDate ?? existing.endDate,
  };
}

export async function listReadingTargets(
  userId: string,
  clubId: string,
  cycleId: string,
): Promise<ReadingTarget[]> {
  await getCycleForTargets(clubId, cycleId);
  await assertCurrentMember(userId, clubId);

  const targets = await prisma.readingTarget.findMany({
    where: { readingCycleId: cycleId },
    orderBy: [{ sequence: "asc" }, { startDate: "asc" }],
    select: targetSelect,
  });

  return targets.map(toReadingTarget);
}

export async function createReadingTarget(
  userId: string,
  clubId: string,
  cycleId: string,
  input: CreateReadingTargetInput,
): Promise<ReadingTarget> {
  const cycle = await getCycleForTargets(clubId, cycleId);
  await assertClubOwner(userId, clubId);
  ensureCycleCanChangeTargets(cycle);

  const data = normalizeCreateInput(input);
  ensureTargetRange(data);
  ensureTargetDates(cycle, data.startDate, data.endDate);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (transactionClient) => {
        await ensureNoOverlap(
          cycleId,
          data.startDate,
          data.endDate,
          undefined,
          transactionClient,
        );

        const target = await transactionClient.readingTarget.create({
          data: {
            ...data,
            readingCycleId: cycleId,
            sequence: await getNextSequence(cycleId, transactionClient),
          },
          select: targetSelect,
        });

        return toReadingTarget(target);
      });
    } catch (error) {
      if (error instanceof ReadingTargetServiceError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt === 0
      ) {
        continue;
      }

      throw new ReadingTargetServiceError(
        "READING_TARGET_INVALID",
        "Unable to create reading target. Please try again.",
        500,
      );
    }
  }

  throw new ReadingTargetServiceError(
    "READING_TARGET_INVALID",
    "Unable to create reading target. Please try again.",
    500,
  );
}

export async function updateReadingTarget(
  userId: string,
  clubId: string,
  cycleId: string,
  targetId: string,
  input: UpdateReadingTargetInput,
): Promise<ReadingTarget> {
  const cycle = await getCycleForTargets(clubId, cycleId);
  await assertClubOwner(userId, clubId);
  ensureCycleCanChangeTargets(cycle);

  const existingTarget = await findTargetById(cycleId, targetId);

  if (!existingTarget) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_NOT_FOUND",
      "Reading target was not found.",
      404,
    );
  }

  const data = normalizeUpdateInput(existingTarget, input);
  ensureTargetRange(data);
  ensureTargetDates(cycle, data.startDate, data.endDate);
  await ensureNoOverlap(cycleId, data.startDate, data.endDate, targetId);

  const target = await prisma.readingTarget.update({
    where: { id: targetId },
    data,
    select: targetSelect,
  });

  return toReadingTarget(target);
}

export async function deleteReadingTarget(
  userId: string,
  clubId: string,
  cycleId: string,
  targetId: string,
): Promise<ReadingTarget[]> {
  const cycle = await getCycleForTargets(clubId, cycleId);
  await assertClubOwner(userId, clubId);
  ensureCycleCanChangeTargets(cycle);

  return prisma.$transaction(async (transactionClient) => {
    const existingTarget = await transactionClient.readingTarget.findFirst({
      where: { id: targetId, readingCycleId: cycleId },
      select: { id: true },
    });

    if (!existingTarget) {
      throw new ReadingTargetServiceError(
        "READING_TARGET_NOT_FOUND",
        "Reading target was not found.",
        404,
      );
    }

    await transactionClient.readingTarget.delete({
      where: { id: targetId },
      select: { id: true },
    });
    await compactSequences(cycleId, transactionClient);

    const targets = await transactionClient.readingTarget.findMany({
      where: { readingCycleId: cycleId },
      orderBy: { sequence: "asc" },
      select: targetSelect,
    });

    return targets.map(toReadingTarget);
  });
}

export async function reorderReadingTargets(
  userId: string,
  clubId: string,
  cycleId: string,
  input: ReorderReadingTargetsInput,
): Promise<ReadingTarget[]> {
  const cycle = await getCycleForTargets(clubId, cycleId);
  await assertClubOwner(userId, clubId);
  ensureCycleCanChangeTargets(cycle);

  const uniqueIds = new Set(input.targetIds);

  if (uniqueIds.size !== input.targetIds.length) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_ORDER_INVALID",
      "Target order cannot include duplicate targets.",
      400,
    );
  }

  return prisma.$transaction(async (transactionClient) => {
    const existingTargets = await transactionClient.readingTarget.findMany({
      where: { readingCycleId: cycleId },
      orderBy: { sequence: "asc" },
      select: targetSelect,
    });

    if (existingTargets.length !== input.targetIds.length) {
      throw new ReadingTargetServiceError(
        "READING_TARGET_ORDER_INVALID",
        "Target order must include every target in this reading cycle.",
        409,
      );
    }

    const existingIds = new Set(existingTargets.map((target) => target.id));

    if (input.targetIds.some((targetId) => !existingIds.has(targetId))) {
      throw new ReadingTargetServiceError(
        "READING_TARGET_ORDER_INVALID",
        "Target order contains an unknown target.",
        409,
      );
    }

    await Promise.all(
      existingTargets.map((target, index) =>
        transactionClient.readingTarget.update({
          where: { id: target.id },
          data: { sequence: -(index + 1) },
          select: { id: true },
        }),
      ),
    );

    await Promise.all(
      input.targetIds.map((targetId, index) =>
        transactionClient.readingTarget.update({
          where: { id: targetId },
          data: { sequence: index + 1 },
          select: { id: true },
        }),
      ),
    );

    const targets = await transactionClient.readingTarget.findMany({
      where: { readingCycleId: cycleId },
      orderBy: { sequence: "asc" },
      select: targetSelect,
    });

    return targets.map(toReadingTarget);
  });
}

export async function assertTargetsFitCycleDates(
  clubId: string,
  cycleId: string,
  startDate: Date,
  targetEndDate: Date,
) {
  await getCycleForTargets(clubId, cycleId);

  const conflictingTarget = await prisma.readingTarget.findFirst({
    where: {
      readingCycleId: cycleId,
      OR: [{ startDate: { lt: startDate } }, { endDate: { gt: targetEndDate } }],
    },
    select: { title: true },
  });

  if (conflictingTarget) {
    throw new ReadingTargetServiceError(
      "READING_TARGET_OUTSIDE_CYCLE",
      `Existing target "${conflictingTarget.title}" would fall outside the new cycle dates.`,
      409,
    );
  }
}
