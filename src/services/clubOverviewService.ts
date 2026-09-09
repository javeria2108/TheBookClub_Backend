import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import type {
  ClubOverview,
  HomepageHighlights,
  OverviewActivity,
  OverviewBook,
  OverviewClub,
  OverviewTopic,
  OverviewUser,
  RatingSummary,
  ReadingCycle,
} from "../types";
import type { ApiErrorCode } from "../utils/apiResponse";
import { getBookRatingSummary, getClubRatingSummary } from "./ratingService";

const ACTIVE_OR_PLANNED_STATUSES = ["ACTIVE", "PLANNED"] as const;
const RECENT_ACTIVITY_LIMIT = 4;
const RECENT_MEMBER_LIMIT = 4;
const TOP_BOOK_LIMIT = 5;
const POPULAR_CLUB_LIMIT = 4;
const HOT_TOPIC_LIMIT = 5;
const HOMEPAGE_BOOK_LIMIT = 4;

type Membership = {
  role: "MEMBER" | "MODERATOR" | "OWNER";
};

type ClubRecord = NonNullable<Awaited<ReturnType<typeof findClub>>>;
type ReadingCycleRecord = NonNullable<
  Awaited<ReturnType<typeof findCurrentReadingCycle>>
>;
type TopicRecord = NonNullable<Awaited<ReturnType<typeof findTopicById>>>;

export class ClubOverviewServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ClubOverviewServiceError";
  }
}

const userSelect = {
  id: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

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

const topicSelect = {
  id: true,
  clubId: true,
  title: true,
  prompt: true,
  topicType: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: userSelect },
  readingCycle: {
    select: { id: true, book: { select: { title: true } } },
  },
  readingTarget: {
    select: { id: true, title: true },
  },
  _count: { select: { posts: { where: { deletedAt: null } } } },
} satisfies Prisma.DiscussionTopicSelect;

async function findClub(clubId: string) {
  return prisma.bookClub.findUnique({
    where: { id: clubId },
    select: {
      id: true,
      name: true,
      description: true,
      isPublic: true,
      genre: true,
      coverImage: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });
}

function toOverviewUser(user: {
  id: string;
  username: string;
  avatarUrl: string | null;
}): OverviewUser {
  return {
    id: user.id,
    displayName: user.username,
    avatarUrl: user.avatarUrl,
  };
}

function toBook(record: ReadingCycleRecord["book"]) {
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

function toOverviewClub(
  club: ClubRecord,
  membership: Membership | null,
  hasPendingJoinRequest: boolean,
): OverviewClub {
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    isPublic: club.isPublic,
    genre: club.genre,
    coverImage: club.coverImage,
    memberCount: club._count.members,
    isMember: Boolean(membership),
    memberRole: membership?.role ?? null,
    hasPendingJoinRequest,
    createdAt: club.createdAt,
  };
}

function getTopicContext(topic: TopicRecord): string | null {
  if (topic.readingTarget) return topic.readingTarget.title;
  if (topic.readingCycle) return topic.readingCycle.book.title;
  if (topic.topicType === "PROMPT") return "Prompt";
  return null;
}

function toOverviewTopic(
  topic: TopicRecord,
  lastActivityAt?: Date | null,
): OverviewTopic {
  return {
    id: topic.id,
    title: topic.title,
    prompt: topic.prompt,
    postCount: topic._count.posts,
    isPinned: topic.isPinned,
    lastActivityAt: lastActivityAt ?? topic.updatedAt,
    readingContext: getTopicContext(topic),
    createdBy: toOverviewUser(topic.createdBy),
  };
}

async function getMembership(userId: string | null | undefined, clubId: string) {
  if (!userId) return null;

  return prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });
}

async function getPendingJoinRequest(
  userId: string | null | undefined,
  clubId: string,
) {
  if (!userId) return false;

  const request = await prisma.clubJoinRequest.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { status: true },
  });

  return request?.status === "PENDING";
}

async function findCurrentReadingCycle(clubId: string) {
  const cycles = await prisma.readingCycle.findMany({
    where: { clubId, status: { in: [...ACTIVE_OR_PLANNED_STATUSES] } },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    select: readingCycleSelect,
  });

  return (
    cycles.find((cycle) => cycle.status === "ACTIVE") ??
    cycles.find((cycle) => cycle.status === "PLANNED") ??
    null
  );
}

async function findTopicById(topicId: string) {
  return prisma.discussionTopic.findUnique({
    where: { id: topicId },
    select: topicSelect,
  });
}

async function getHotTopic(clubId: string): Promise<OverviewTopic | null> {
  const topics = await prisma.discussionTopic.findMany({
    where: { clubId, deletedAt: null },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 12,
    select: topicSelect,
  });

  if (!topics.length) return null;

  const lastPostRows = await prisma.discussionPost.groupBy({
    by: ["topicId"],
    where: { topicId: { in: topics.map((topic) => topic.id) }, deletedAt: null },
    _max: { createdAt: true },
  });
  const lastPostByTopicId = new Map(
    lastPostRows.map((row) => [row.topicId, row._max.createdAt]),
  );

  const sortedTopics = [...topics].sort((first, second) => {
    if (first.isPinned !== second.isPinned) {
      return first.isPinned ? -1 : 1;
    }

    if (first._count.posts !== second._count.posts) {
      return second._count.posts - first._count.posts;
    }

    const firstActivity =
      lastPostByTopicId.get(first.id)?.getTime() ?? first.updatedAt.getTime();
    const secondActivity =
      lastPostByTopicId.get(second.id)?.getTime() ?? second.updatedAt.getTime();
    return secondActivity - firstActivity;
  });

  const hotTopic = sortedTopics[0];
  return hotTopic
    ? toOverviewTopic(hotTopic, lastPostByTopicId.get(hotTopic.id))
    : null;
}

async function getRecentActivity(clubId: string): Promise<OverviewActivity[]> {
  const [posts, entries] = await Promise.all([
    prisma.discussionPost.findMany({
      where: { deletedAt: null, topic: { clubId, deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: userSelect },
        topic: { select: { id: true, title: true } },
      },
    }),
    prisma.readingEntry.findMany({
      where: { clubId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        body: true,
        entryType: true,
        createdAt: true,
        user: { select: userSelect },
      },
    }),
  ]);

  return [
    ...posts.map((post) => ({
      id: post.id,
      kind: "DISCUSSION_POST" as const,
      text: post.content,
      createdAt: post.createdAt,
      user: toOverviewUser(post.user),
      topic: post.topic,
    })),
    ...entries.map((entry) => ({
      id: entry.id,
      kind: "READING_ENTRY" as const,
      text: entry.body,
      createdAt: entry.createdAt,
      user: toOverviewUser(entry.user),
      topic: null,
    })),
  ]
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

async function getTopBooks(
  clubId: string,
  userId?: string | null,
): Promise<OverviewBook[]> {
  const cycles = await prisma.readingCycle.findMany({
    where: { clubId, status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: TOP_BOOK_LIMIT,
    select: readingCycleSelect,
  });

  const ratingPairs = await Promise.all(
    cycles.map(async (cycle) => [
      cycle.bookId,
      await getBookRatingSummary(cycle.bookId, userId),
    ] as const),
  );
  const ratingByBookId = new Map<string, RatingSummary>(ratingPairs);

  return cycles.map((cycle) => ({
    cycleId: cycle.id,
    status: cycle.status,
    startDate: cycle.startDate,
    book: toBook(cycle.book),
    ratingSummary: ratingByBookId.get(cycle.bookId) ?? {
      averageRating: null,
      ratingCount: 0,
      myRating: null,
    },
  }));
}

async function getRecentMembers(clubId: string) {
  const members = await prisma.clubMember.findMany({
    where: { clubId },
    orderBy: { joinedAt: "desc" },
    take: RECENT_MEMBER_LIMIT,
    select: { joinedAt: true, user: { select: userSelect } },
  });

  return members.map((member) => ({
    joinedAt: member.joinedAt,
    user: toOverviewUser(member.user),
  }));
}

export async function getClubOverview(
  clubId: string,
  userId?: string | null,
): Promise<ClubOverview> {
  const club = await findClub(clubId);

  if (!club) {
    throw new ClubOverviewServiceError(
      "CLUB_NOT_FOUND",
      "Club was not found.",
      404,
    );
  }

  const [membership, hasPendingJoinRequest] = await Promise.all([
    getMembership(userId, clubId),
    getPendingJoinRequest(userId, clubId),
  ]);
  const canSeeMemberActivity = club.isPublic || Boolean(membership);

  const [
    currentReading,
    hotTopic,
    recentActivity,
    ratingSummary,
    topBooks,
    recentMembers,
  ] = await Promise.all([
    findCurrentReadingCycle(clubId),
    canSeeMemberActivity ? getHotTopic(clubId) : Promise.resolve(null),
    canSeeMemberActivity ? getRecentActivity(clubId) : Promise.resolve([]),
    getClubRatingSummary(clubId, userId),
    canSeeMemberActivity ? getTopBooks(clubId, userId) : Promise.resolve([]),
    getRecentMembers(clubId),
  ]);
  const currentReadingDto = currentReading ? toReadingCycle(currentReading) : null;

  return {
    club: toOverviewClub(club, membership, hasPendingJoinRequest),
    currentReading: currentReadingDto,
    bookContext: currentReadingDto
      ? {
          title: currentReadingDto.book.title,
          description: currentReadingDto.book.description,
          authors: currentReadingDto.book.authors,
          pageCount: currentReadingDto.book.pageCount,
          publishedDate: currentReadingDto.book.publishedDate,
          previewUrl: currentReadingDto.book.previewUrl,
          infoUrl: currentReadingDto.book.infoUrl,
        }
      : null,
    hotTopic,
    recentActivity,
    ratingSummary,
    topBooks,
    recentMembers,
  };
}

export async function getHomepageHighlights(): Promise<HomepageHighlights> {
  const clubs = await prisma.bookClub.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      name: true,
      description: true,
      isPublic: true,
      genre: true,
      coverImage: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });

  const highlightedClubs = await Promise.all(
    clubs.map(async (club) => {
      const [ratingSummary, currentReading, hotTopic] = await Promise.all([
        getClubRatingSummary(club.id),
        findCurrentReadingCycle(club.id),
        getHotTopic(club.id),
      ]);
      const clubDto = toOverviewClub(club, null, false);
      const score =
        clubDto.memberCount * 2 +
        (currentReading?.status === "ACTIVE" ? 12 : 0) +
        (hotTopic?.postCount ?? 0) +
        (ratingSummary.averageRating ?? 0) * 3;

      return {
        score,
        club: clubDto,
        ratingSummary,
        currentReading: currentReading ? toReadingCycle(currentReading) : null,
        hotTopic,
      };
    }),
  );

  const hotTopicRows = await prisma.discussionPost.groupBy({
    by: ["topicId"],
    where: { deletedAt: null, topic: { club: { isPublic: true }, deletedAt: null } },
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _count: { id: "desc" } },
    take: HOT_TOPIC_LIMIT,
  });
  const hotTopics = await Promise.all(
    hotTopicRows.map(async (row) => {
      const topic = await prisma.discussionTopic.findUnique({
        where: { id: row.topicId },
        select: {
          ...topicSelect,
          club: { select: { id: true, name: true } },
        },
      });

      return topic
        ? { ...toOverviewTopic(topic, row._max.createdAt), club: topic.club }
        : null;
    }),
  );
  const topBooks = (
    await Promise.all(
      highlightedClubs.slice(0, POPULAR_CLUB_LIMIT).map(async (item) => {
        const books = await getTopBooks(item.club.id);
        return books.map((book) => ({
          ...book,
          club: { id: item.club.id, name: item.club.name },
        }));
      }),
    )
  )
    .flat()
    .slice(0, HOMEPAGE_BOOK_LIMIT);

  return {
    popularClubs: highlightedClubs
      .sort((first, second) => second.score - first.score)
      .slice(0, POPULAR_CLUB_LIMIT)
      .map(({ score: _score, ...item }) => item),
    hotTopics: hotTopics.filter((topic): topic is NonNullable<typeof topic> =>
      Boolean(topic),
    ),
    topBooks,
  };
}
