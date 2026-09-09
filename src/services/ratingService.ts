import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import type { Rating, RatingSummary, UpdateRatingInput } from "../types";
import type { ApiErrorCode } from "../utils/apiResponse";

export class RatingServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RatingServiceError";
  }
}

async function assertClubMember(userId: string, clubId: string) {
  const membership = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { id: true },
  });

  if (!membership) {
    throw new RatingServiceError(
      "CLUB_MEMBERSHIP_REQUIRED",
      "Only club members can rate this club.",
      403,
    );
  }
}

async function assertBookBelongsToClub(clubId: string, bookId: string) {
  const cycle = await prisma.readingCycle.findFirst({
    where: { clubId, bookId },
    select: { id: true },
  });

  if (!cycle) {
    throw new RatingServiceError(
      "BOOK_NOT_FOUND",
      "This book is not part of the club's reading history.",
      404,
    );
  }
}

function normalizeReview(review: string | null | undefined) {
  const trimmed = review?.trim();
  return trimmed ? trimmed : null;
}

function toRating(record: {
  id: string;
  rating: number;
  review: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Rating {
  return {
    id: record.id,
    rating: record.rating,
    review: record.review,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getClubRatingSummary(
  clubId: string,
  userId?: string | null,
): Promise<RatingSummary> {
  const [summary, ownRating] = await Promise.all([
    prisma.clubRating.aggregate({
      where: { clubId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    userId
      ? prisma.clubRating.findUnique({
          where: { clubId_userId: { clubId, userId } },
          select: { rating: true },
        })
      : null,
  ]);

  return {
    averageRating: summary._avg.rating
      ? Number(summary._avg.rating.toFixed(1))
      : null,
    ratingCount: summary._count.rating,
    myRating: ownRating?.rating ?? null,
  };
}

export async function getBookRatingSummary(
  bookId: string,
  userId?: string | null,
): Promise<RatingSummary> {
  const [summary, ownRating] = await Promise.all([
    prisma.bookRating.aggregate({
      where: { bookId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    userId
      ? prisma.bookRating.findUnique({
          where: { bookId_userId: { bookId, userId } },
          select: { rating: true },
        })
      : null,
  ]);

  return {
    averageRating: summary._avg.rating
      ? Number(summary._avg.rating.toFixed(1))
      : null,
    ratingCount: summary._count.rating,
    myRating: ownRating?.rating ?? null,
  };
}

export async function upsertClubRating(
  userId: string,
  clubId: string,
  input: UpdateRatingInput,
): Promise<{ rating: Rating; summary: RatingSummary }> {
  await assertClubMember(userId, clubId);

  try {
    const rating = await prisma.clubRating.upsert({
      where: { clubId_userId: { clubId, userId } },
      create: {
        clubId,
        userId,
        rating: input.rating,
        review: normalizeReview(input.review),
      },
      update: {
        rating: input.rating,
        review: normalizeReview(input.review),
      },
      select: {
        id: true,
        rating: true,
        review: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      rating: toRating(rating),
      summary: await getClubRatingSummary(clubId, userId),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new RatingServiceError(
        "CLUB_RATING_UPDATE_FAILED",
        "Unable to save your club rating.",
        500,
      );
    }

    throw error;
  }
}

export async function upsertBookRating(
  userId: string,
  clubId: string,
  bookId: string,
  input: UpdateRatingInput,
): Promise<{ rating: Rating; summary: RatingSummary }> {
  await assertClubMember(userId, clubId);
  await assertBookBelongsToClub(clubId, bookId);

  try {
    const rating = await prisma.bookRating.upsert({
      where: { bookId_userId: { bookId, userId } },
      create: {
        bookId,
        userId,
        rating: input.rating,
        review: normalizeReview(input.review),
      },
      update: {
        rating: input.rating,
        review: normalizeReview(input.review),
      },
      select: {
        id: true,
        rating: true,
        review: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      rating: toRating(rating),
      summary: await getBookRatingSummary(bookId, userId),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new RatingServiceError(
        "BOOK_RATING_UPDATE_FAILED",
        "Unable to save your book rating.",
        500,
      );
    }

    throw error;
  }
}
