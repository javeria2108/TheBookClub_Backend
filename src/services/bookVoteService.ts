import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { BookServiceError, findOrCreateGoogleBook } from "./bookService";
import { getClubMemberUserIds, notify } from "./notificationService";
import type {
  Book,
  BookVoteInput,
  BookVoteRoundDto,
  CreateBookNominationInput,
  CreateBookVoteRoundInput,
  ResolveBookVoteWinnerInput,
  UpdateBookVoteRoundInput,
} from "../types";
import type { ApiErrorCode } from "../utils/apiResponse";

type Membership = { role: "MEMBER" | "MODERATOR" | "OWNER" };
type RoundRecord = NonNullable<Awaited<ReturnType<typeof findRound>>>;

export class BookVoteServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "BookVoteServiceError";
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

const nominationSelect = {
  id: true,
  voteRoundId: true,
  bookId: true,
  nominatedByUserId: true,
  reason: true,
  createdAt: true,
  withdrawnAt: true,
  book: { select: bookSelect },
  nominatedBy: {
    select: { id: true, username: true, avatarUrl: true },
  },
  _count: { select: { votes: true } },
} satisfies Prisma.BookNominationSelect;

const roundSelect = {
  id: true,
  clubId: true,
  title: true,
  description: true,
  status: true,
  opensAt: true,
  closesAt: true,
  createdByUserId: true,
  winnerNominationId: true,
  createdAt: true,
  updatedAt: true,
  nominations: {
    where: { withdrawnAt: null },
    orderBy: { createdAt: "asc" },
    select: nominationSelect,
  },
  votes: { select: { userId: true, nominationId: true } },
} satisfies Prisma.BookVoteRoundSelect;

function toBook(record: RoundRecord["nominations"][number]["book"]): Book {
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

async function getMembership(userId: string, clubId: string): Promise<Membership | null> {
  return prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
}

async function assertMember(userId: string, clubId: string): Promise<Membership> {
  const membership = await getMembership(userId, clubId);

  if (!membership) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_PERMISSION_DENIED",
      "Only current club members can access next-book voting.",
      403,
    );
  }

  return membership;
}

async function assertOwner(userId: string, clubId: string): Promise<Membership> {
  const membership = await assertMember(userId, clubId);

  if (membership.role !== "OWNER") {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_PERMISSION_DENIED",
      "Only the club owner can manage next-book voting.",
      403,
    );
  }

  return membership;
}

async function findRound(clubId: string, roundId: string) {
  return prisma.bookVoteRound.findFirst({
    where: { id: roundId, clubId },
    select: roundSelect,
  });
}

async function getRoundOrThrow(clubId: string, roundId: string) {
  const round = await findRound(clubId, roundId);

  if (!round) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_NOT_FOUND",
      "Book vote round was not found.",
      404,
    );
  }

  return round;
}

function ensureDates(opensAt: Date | null | undefined, closesAt: Date | null | undefined) {
  if (opensAt && closesAt && opensAt >= closesAt) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_INVALID",
      "Opening date must be before closing date.",
      400,
    );
  }
}

function ensureOpen(round: { status: string }) {
  if (round.status !== "OPEN") {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_STATE_INVALID",
      "Voting must be open for this action.",
      422,
    );
  }
}

function getTiedLeaderIds(round: RoundRecord): string[] {
  if (round.nominations.length === 0) return [];
  const highest = Math.max(...round.nominations.map((nomination) => nomination._count.votes));
  if (highest === 0) return [];
  return round.nominations
    .filter((nomination) => nomination._count.votes === highest)
    .map((nomination) => nomination.id);
}

async function eligibleMemberCount(clubId: string) {
  return prisma.clubMember.count({ where: { clubId } });
}

async function notifyVoteRoundMembers(
  userId: string,
  round: { id: string; clubId: string; title: string },
  type: "VOTING_OPENED" | "VOTING_CLOSED",
) {
  const recipients = await getClubMemberUserIds(round.clubId);

  await notify({
    recipients,
    type,
    actorId: userId,
    clubId: round.clubId,
    title: type === "VOTING_OPENED" ? "Voting is open" : "Voting has closed",
    body:
      type === "VOTING_OPENED"
        ? `${round.title} is ready for your vote.`
        : `${round.title} has closed. See the result in the club.`,
    actionUrl: `/clubs/${round.clubId}/next-book`,
    entityType: "BOOK_VOTE",
    entityId: round.id,
  });
}

function toRoundDto(
  round: RoundRecord,
  userId: string,
  membership: Membership,
  totalEligibleMembers: number,
): BookVoteRoundDto {
  const currentUserVote = round.votes.find((vote) => vote.userId === userId);
  const totalVotes = round.votes.length;
  const tiedLeaderIds = round.status === "CLOSED" ? getTiedLeaderIds(round) : [];
  const canManage = membership.role === "OWNER";
  const nominations = [...round.nominations].sort((first, second) => {
    if (round.status === "OPEN") {
      return first.createdAt.getTime() - second.createdAt.getTime();
    }

    const voteDiff = second._count.votes - first._count.votes;
    return voteDiff || first.book.title.localeCompare(second.book.title);
  });

  const nominationDtos = nominations.map((nomination) => ({
    id: nomination.id,
    book: toBook(nomination.book),
    reason: nomination.reason,
    nominatedBy: {
      id: nomination.nominatedBy.id,
      displayName: nomination.nominatedBy.username,
      avatarUrl: nomination.nominatedBy.avatarUrl,
    },
    voteCount: nomination._count.votes,
    isCurrentUserVote: currentUserVote?.nominationId === nomination.id,
    isWinner: round.winnerNominationId === nomination.id,
    canRemove:
      round.status === "OPEN" &&
      (canManage || nomination.nominatedByUserId === userId),
    createdAt: nomination.createdAt,
  }));

  return {
    id: round.id,
    clubId: round.clubId,
    title: round.title,
    description: round.description,
    status: round.status,
    opensAt: round.opensAt,
    closesAt: round.closesAt,
    totalEligibleMembers,
    totalVotes,
    currentUserVoteNominationId: currentUserVote?.nominationId ?? null,
    canNominate: round.status === "OPEN",
    canVote: round.status === "OPEN",
    canManage,
    nominations: nominationDtos,
    winner:
      nominationDtos.find((nomination) => nomination.isWinner) ?? null,
    tiedLeaderIds,
    createdAt: round.createdAt,
    updatedAt: round.updatedAt,
  };
}

async function resolveBookId(
  input: CreateBookNominationInput,
  transactionClient: Prisma.TransactionClient,
) {
  if (input.bookId) {
    const book = await transactionClient.book.findUnique({
      where: { id: input.bookId },
      select: { id: true },
    });

    if (!book) {
      throw new BookVoteServiceError("BOOK_NOT_FOUND", "Book was not found.", 404);
    }

    return book.id;
  }

  if (!input.googleBooksId) {
    throw new BookVoteServiceError(
      "BOOK_SELECTION_INVALID",
      "Choose a book to nominate.",
      400,
    );
  }

  try {
    const book = await findOrCreateGoogleBook(input.googleBooksId, transactionClient);
    return book.id;
  } catch (error) {
    if (error instanceof BookServiceError) {
      throw new BookVoteServiceError(error.code, error.message, error.statusCode);
    }
    throw error;
  }
}

export async function listBookVoteRounds(
  userId: string,
  clubId: string,
): Promise<BookVoteRoundDto[]> {
  const membership = await assertMember(userId, clubId);
  const rounds = await prisma.bookVoteRound.findMany({
    where: {
      clubId,
      OR: [{ status: { not: "DRAFT" } }, { createdByUserId: userId }],
    },
    orderBy: [{ createdAt: "desc" }],
    select: roundSelect,
  });
  const totalEligibleMembers = await eligibleMemberCount(clubId);

  return rounds.map((round) =>
    toRoundDto(round, userId, membership, totalEligibleMembers),
  );
}

export async function createBookVoteRound(
  userId: string,
  clubId: string,
  input: CreateBookVoteRoundInput,
): Promise<BookVoteRoundDto> {
  const membership = await assertOwner(userId, clubId);
  ensureDates(input.opensAt, input.closesAt);

  const round = await prisma.bookVoteRound.create({
    data: {
      clubId,
      createdByUserId: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      opensAt: input.opensAt ?? null,
      closesAt: input.closesAt ?? null,
    },
    select: roundSelect,
  });

  return toRoundDto(round, userId, membership, await eligibleMemberCount(clubId));
}

export async function updateBookVoteRound(
  userId: string,
  clubId: string,
  roundId: string,
  input: UpdateBookVoteRoundInput,
): Promise<BookVoteRoundDto> {
  const membership = await assertOwner(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);

  if (round.status !== "DRAFT") {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_STATE_INVALID",
      "Only draft voting rounds can be edited.",
      422,
    );
  }

  ensureDates(input.opensAt ?? round.opensAt, input.closesAt ?? round.closesAt);

  const updated = await prisma.bookVoteRound.update({
    where: { id: roundId },
    data: {
      title: input.title?.trim(),
      description:
        input.description === undefined ? undefined : input.description?.trim() || null,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
    },
    select: roundSelect,
  });

  await notifyVoteRoundMembers(userId, updated, "VOTING_OPENED");

  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function openBookVoteRound(
  userId: string,
  clubId: string,
  roundId: string,
): Promise<BookVoteRoundDto> {
  const membership = await assertOwner(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);

  if (round.status !== "DRAFT") {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_STATE_INVALID",
      "Only draft voting rounds can be opened.",
      422,
    );
  }

  const openRound = await prisma.bookVoteRound.findFirst({
    where: { clubId, status: "OPEN", id: { not: roundId } },
    select: { id: true },
  });

  if (openRound) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_STATE_INVALID",
      "This club already has an open voting round.",
      409,
    );
  }

  const updated = await prisma.bookVoteRound.update({
    where: { id: roundId },
    data: { status: "OPEN", opensAt: round.opensAt ?? new Date() },
    select: roundSelect,
  });

  await notifyVoteRoundMembers(userId, updated, "VOTING_CLOSED");

  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function closeBookVoteRound(
  userId: string,
  clubId: string,
  roundId: string,
): Promise<BookVoteRoundDto> {
  const membership = await assertOwner(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);
  ensureOpen(round);

  const tiedLeaderIds = getTiedLeaderIds(round);
  const winnerNominationId = tiedLeaderIds.length === 1 ? tiedLeaderIds[0] : null;
  const updated = await prisma.bookVoteRound.update({
    where: { id: roundId },
    data: { status: "CLOSED", closedAt: new Date(), winnerNominationId },
    select: roundSelect,
  });

  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function cancelBookVoteRound(
  userId: string,
  clubId: string,
  roundId: string,
): Promise<BookVoteRoundDto> {
  const membership = await assertOwner(userId, clubId);
  await getRoundOrThrow(clubId, roundId);

  const updated = await prisma.bookVoteRound.update({
    where: { id: roundId },
    data: { status: "CANCELLED", winnerNominationId: null },
    select: roundSelect,
  });

  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function createBookNomination(
  userId: string,
  clubId: string,
  roundId: string,
  input: CreateBookNominationInput,
): Promise<BookVoteRoundDto> {
  const membership = await assertMember(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);
  ensureOpen(round);

  try {
    await prisma.$transaction(async (transactionClient) => {
      const bookId = await resolveBookId(input, transactionClient);
      await transactionClient.bookNomination.create({
        data: {
          voteRoundId: roundId,
          bookId,
          nominatedByUserId: userId,
          reason: input.reason?.trim() || null,
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof BookVoteServiceError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new BookVoteServiceError(
        "BOOK_VOTE_INVALID",
        "This member or book already has a nomination in this round.",
        409,
      );
    }
    throw error;
  }

  const updated = await getRoundOrThrow(clubId, roundId);
  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function removeBookNomination(
  userId: string,
  clubId: string,
  roundId: string,
  nominationId: string,
): Promise<BookVoteRoundDto> {
  const membership = await assertMember(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);
  ensureOpen(round);

  const nomination = round.nominations.find((item) => item.id === nominationId);
  if (!nomination) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_NOMINATION_NOT_FOUND",
      "Nomination was not found.",
      404,
    );
  }

  if (membership.role !== "OWNER" && nomination.nominatedByUserId !== userId) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_PERMISSION_DENIED",
      "You cannot remove this nomination.",
      403,
    );
  }

  await prisma.$transaction([
    prisma.bookVote.deleteMany({ where: { nominationId } }),
    prisma.bookNomination.update({
      where: { id: nominationId },
      data: { withdrawnAt: new Date() },
      select: { id: true },
    }),
  ]);

  const updated = await getRoundOrThrow(clubId, roundId);
  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function voteForBookNomination(
  userId: string,
  clubId: string,
  roundId: string,
  input: BookVoteInput,
): Promise<BookVoteRoundDto> {
  const membership = await assertMember(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);
  ensureOpen(round);

  if (!round.nominations.some((nomination) => nomination.id === input.nominationId)) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_NOMINATION_NOT_FOUND",
      "Nomination was not found in this round.",
      404,
    );
  }

  await prisma.bookVote.upsert({
    where: { voteRoundId_userId: { voteRoundId: roundId, userId } },
    create: { voteRoundId: roundId, nominationId: input.nominationId, userId },
    update: { nominationId: input.nominationId },
    select: { id: true },
  });

  const updated = await getRoundOrThrow(clubId, roundId);
  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function clearBookVote(
  userId: string,
  clubId: string,
  roundId: string,
): Promise<BookVoteRoundDto> {
  const membership = await assertMember(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);
  ensureOpen(round);

  await prisma.bookVote.deleteMany({ where: { voteRoundId: roundId, userId } });

  const updated = await getRoundOrThrow(clubId, roundId);
  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}

export async function resolveBookVoteWinner(
  userId: string,
  clubId: string,
  roundId: string,
  input: ResolveBookVoteWinnerInput,
): Promise<BookVoteRoundDto> {
  const membership = await assertOwner(userId, clubId);
  const round = await getRoundOrThrow(clubId, roundId);

  if (round.status !== "CLOSED") {
    throw new BookVoteServiceError(
      "BOOK_VOTE_ROUND_STATE_INVALID",
      "Only closed voting rounds can resolve a tied winner.",
      422,
    );
  }

  const tiedLeaderIds = getTiedLeaderIds(round);
  if (!tiedLeaderIds.includes(input.nominationId)) {
    throw new BookVoteServiceError(
      "BOOK_VOTE_INVALID",
      "Winner must be one of the tied leaders.",
      422,
    );
  }

  const updated = await prisma.bookVoteRound.update({
    where: { id: roundId },
    data: { winnerNominationId: input.nominationId },
    select: roundSelect,
  });

  return toRoundDto(updated, userId, membership, await eligibleMemberCount(clubId));
}
