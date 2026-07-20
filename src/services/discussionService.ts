import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { getClubMemberUserIds, notify } from "./notificationService";
import type {
  CreateDiscussionPostInput,
  CreateDiscussionTopicInput,
  CursorPage,
  DiscussionPostDto,
  DiscussionTopicDto,
  DiscussionTopicType,
  ListDiscussionPostsInput,
  ListDiscussionTopicsInput,
  UpdateDiscussionPostInput,
  UpdateDiscussionTopicInput,
} from "../types";
import type { ApiErrorCode } from "../utils/apiResponse";

type Membership = { role: "MEMBER" | "MODERATOR" | "OWNER" };
type TopicRecord = NonNullable<Awaited<ReturnType<typeof findTopic>>>;
type PostRecord = NonNullable<Awaited<ReturnType<typeof findPost>>>;
type PostDtoRecord = Prisma.DiscussionPostGetPayload<{
  select: typeof postSelect;
}>;

export class DiscussionServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "DiscussionServiceError";
  }
}

const userSelect = {
  id: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const topicSelect = {
  id: true,
  clubId: true,
  readingCycleId: true,
  readingTargetId: true,
  createdByUserId: true,
  title: true,
  prompt: true,
  topicType: true,
  isPinned: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: userSelect },
  readingCycle: {
    select: { id: true, book: { select: { title: true } } },
  },
  readingTarget: {
    select: {
      id: true,
      title: true,
      targetType: true,
      startValue: true,
      endValue: true,
    },
  },
  _count: { select: { posts: { where: { deletedAt: null } } } },
} satisfies Prisma.DiscussionTopicSelect;

const postSelect = {
  id: true,
  topicId: true,
  userId: true,
  parentPostId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: userSelect },
  _count: { select: { replies: { where: { deletedAt: null } } } },
} satisfies Prisma.DiscussionPostSelect;

function isModeratorOrOwner(membership: Membership) {
  return membership.role === "OWNER" || membership.role === "MODERATOR";
}

function getRangeLabel(target: {
  targetType: "CHAPTERS" | "PAGES" | "CUSTOM";
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

async function assertMember(userId: string, clubId: string): Promise<Membership> {
  const membership = await prisma.clubMember.findUnique({
    where: { userId_clubId: { userId, clubId } },
    select: { role: true },
  });

  if (!membership) {
    throw new DiscussionServiceError(
      "DISCUSSION_ACCESS_DENIED",
      "Only current club members can access discussions.",
      403,
    );
  }

  return membership;
}

async function getRolesByUserId(clubId: string, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Membership["role"]>();

  const memberships = await prisma.clubMember.findMany({
    where: { clubId, userId: { in: userIds } },
    select: { userId: true, role: true },
  });

  return new Map(memberships.map((member) => [member.userId, member.role]));
}

async function findTopic(clubId: string, topicId: string) {
  return prisma.discussionTopic.findFirst({
    where: { id: topicId, clubId, deletedAt: null },
    select: topicSelect,
  });
}

async function findPost(clubId: string, postId: string) {
  return prisma.discussionPost.findFirst({
    where: { id: postId, topic: { clubId, deletedAt: null } },
    select: {
      ...postSelect,
      topic: {
        select: {
          id: true,
          clubId: true,
          isLocked: true,
          deletedAt: true,
        },
      },
    },
  });
}

function toTopicDto(
  record: TopicRecord,
  userId: string,
  membership: Membership,
  lastActivityAt?: Date | null,
): DiscussionTopicDto {
  const canModerate = isModeratorOrOwner(membership);

  return {
    id: record.id,
    clubId: record.clubId,
    topicType: record.topicType,
    title: record.title,
    prompt: record.prompt,
    isPinned: record.isPinned,
    isLocked: record.isLocked,
    readingCycle: record.readingCycle
      ? { id: record.readingCycle.id, bookTitle: record.readingCycle.book.title }
      : null,
    readingTarget: record.readingTarget
      ? {
          id: record.readingTarget.id,
          title: record.readingTarget.title,
          rangeLabel: getRangeLabel(record.readingTarget),
        }
      : null,
    createdBy: {
      id: record.createdBy.id,
      displayName: record.createdBy.username,
      avatarUrl: record.createdBy.avatarUrl,
    },
    postCount: record._count.posts,
    lastActivityAt: lastActivityAt ?? record.updatedAt,
    canEdit: canModerate || record.createdByUserId === userId,
    canDelete: canModerate || record.createdByUserId === userId,
    canModerate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPostDto(
  record: PostDtoRecord,
  userId: string,
  membership: Membership,
  rolesByUserId: Map<string, Membership["role"]>,
): DiscussionPostDto {
  const canModerate = isModeratorOrOwner(membership);
  const isDeleted = Boolean(record.deletedAt);

  return {
    id: record.id,
    topicId: record.topicId,
    content: isDeleted ? "" : record.content,
    author: isDeleted
      ? null
      : {
          id: record.user.id,
          displayName: record.user.username,
          avatarUrl: record.user.avatarUrl,
          role: rolesByUserId.get(record.userId) ?? "MEMBER",
        },
    parentPostId: record.parentPostId,
    replyCount: record._count.replies,
    isDeleted,
    canEdit: !isDeleted && record.userId === userId,
    canDelete: !isDeleted && (canModerate || record.userId === userId),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getTopicOrThrow(clubId: string, topicId: string) {
  const topic = await findTopic(clubId, topicId);

  if (!topic) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_NOT_FOUND",
      "Discussion topic was not found.",
      404,
    );
  }

  return topic;
}

async function assertLinkedResources(
  clubId: string,
  input: CreateDiscussionTopicInput,
) {
  if (input.topicType === "GENERAL") {
    return { readingCycleId: null, readingTargetId: null };
  }

  if (input.topicType === "PROMPT" && !input.prompt?.trim()) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_INVALID",
      "Prompt topics need prompt text.",
      400,
    );
  }

  if (input.topicType === "READING_TARGET") {
    if (!input.readingTargetId) {
      throw new DiscussionServiceError(
        "DISCUSSION_TOPIC_INVALID",
        "Choose a reading target for this topic.",
        400,
      );
    }

    const target = await prisma.readingTarget.findFirst({
      where: { id: input.readingTargetId, readingCycle: { clubId } },
      select: { id: true, readingCycleId: true },
    });

    if (!target) {
      throw new DiscussionServiceError(
        "READING_TARGET_NOT_FOUND",
        "Reading target was not found for this club.",
        404,
      );
    }

    return {
      readingCycleId: target.readingCycleId,
      readingTargetId: target.id,
    };
  }

  if (!input.readingCycleId) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_INVALID",
      "Choose a reading cycle for this topic.",
      400,
    );
  }

  const cycle = await prisma.readingCycle.findFirst({
    where: { id: input.readingCycleId, clubId },
    select: { id: true },
  });

  if (!cycle) {
    throw new DiscussionServiceError(
      "READING_CYCLE_NOT_FOUND",
      "Reading cycle was not found for this club.",
      404,
    );
  }

  return { readingCycleId: cycle.id, readingTargetId: null };
}

function buildTopicFilter(
  clubId: string,
  filter: ListDiscussionTopicsInput["filter"],
  cursor?: Date,
): Prisma.DiscussionTopicWhereInput {
  const where: Prisma.DiscussionTopicWhereInput = {
    clubId,
    deletedAt: null,
    createdAt: cursor ? { lt: cursor } : undefined,
  };

  if (filter === "PINNED") return { ...where, isPinned: true };
  if (filter === "GENERAL") return { ...where, topicType: "GENERAL" };
  if (filter === "CURRENT_READING") {
    return { ...where, topicType: { in: ["READING_CYCLE", "PROMPT"] } };
  }
  if (filter === "THIS_WEEK") return { ...where, topicType: "READING_TARGET" };

  return where;
}

export async function listDiscussionTopics(
  userId: string,
  clubId: string,
  query: ListDiscussionTopicsInput,
): Promise<CursorPage<DiscussionTopicDto>> {
  const membership = await assertMember(userId, clubId);
  const cursorDate = query.cursor ? new Date(query.cursor) : undefined;

  const topics = await prisma.discussionTopic.findMany({
    where: buildTopicFilter(clubId, query.filter, cursorDate),
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: query.limit + 1,
    select: topicSelect,
  });

  const page = topics.slice(0, query.limit);
  const lastPostRows = await prisma.discussionPost.groupBy({
    by: ["topicId"],
    where: { topicId: { in: page.map((topic) => topic.id) }, deletedAt: null },
    _max: { createdAt: true },
  });
  const lastActivityByTopicId = new Map(
    lastPostRows.map((row) => [row.topicId, row._max.createdAt]),
  );

  return {
    items: page.map((topic) =>
      toTopicDto(topic, userId, membership, lastActivityByTopicId.get(topic.id)),
    ),
    pagination: {
      nextCursor:
        topics.length > query.limit
          ? page[page.length - 1]?.createdAt.toISOString() ?? null
          : null,
      hasMore: topics.length > query.limit,
    },
  };
}

export async function createDiscussionTopic(
  userId: string,
  clubId: string,
  input: CreateDiscussionTopicInput,
): Promise<DiscussionTopicDto> {
  const membership = await assertMember(userId, clubId);
  const officialType = input.topicType !== "GENERAL";

  if (officialType && !isModeratorOrOwner(membership)) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_PERMISSION_DENIED",
      "Only owners and moderators can create official reading topics.",
      403,
    );
  }

  const links = await assertLinkedResources(clubId, input);
  const topic = await prisma.discussionTopic.create({
    data: {
      clubId,
      createdByUserId: userId,
      title: input.title.trim(),
      prompt: input.prompt?.trim() || null,
      topicType: input.topicType,
      isPinned: isModeratorOrOwner(membership) ? Boolean(input.isPinned) : false,
      isLocked: isModeratorOrOwner(membership) ? Boolean(input.isLocked) : false,
      readingCycleId: links.readingCycleId,
      readingTargetId: links.readingTargetId,
    },
    select: topicSelect,
  });

  await notify({
    recipients: await getClubMemberUserIds(clubId, { excludeUserIds: [userId] }),
    type: "DISCUSSION_TOPIC_CREATED",
    actorId: userId,
    clubId,
    title: "New discussion topic",
    body: topic.title,
    actionUrl: `/clubs/${clubId}/discussion`,
    entityType: "DISCUSSION_TOPIC",
    entityId: topic.id,
  });

  return toTopicDto(topic, userId, membership);
}

export async function getDiscussionTopic(
  userId: string,
  clubId: string,
  topicId: string,
): Promise<DiscussionTopicDto> {
  const membership = await assertMember(userId, clubId);
  const topic = await getTopicOrThrow(clubId, topicId);
  const latestPost = await prisma.discussionPost.findFirst({
    where: { topicId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return toTopicDto(topic, userId, membership, latestPost?.createdAt);
}

export async function updateDiscussionTopic(
  userId: string,
  clubId: string,
  topicId: string,
  input: UpdateDiscussionTopicInput,
): Promise<DiscussionTopicDto> {
  const membership = await assertMember(userId, clubId);
  const topic = await getTopicOrThrow(clubId, topicId);

  if (!isModeratorOrOwner(membership) && topic.createdByUserId !== userId) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_PERMISSION_DENIED",
      "You cannot edit this discussion topic.",
      403,
    );
  }

  if (
    !isModeratorOrOwner(membership) &&
    (input.isPinned !== undefined || input.isLocked !== undefined)
  ) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_PERMISSION_DENIED",
      "Only owners and moderators can pin or lock topics.",
      403,
    );
  }

  const updated = await prisma.discussionTopic.update({
    where: { id: topicId },
    data: {
      title: input.title?.trim(),
      prompt:
        input.prompt === undefined ? undefined : input.prompt?.trim() || null,
      isPinned: isModeratorOrOwner(membership) ? input.isPinned : undefined,
      isLocked: isModeratorOrOwner(membership) ? input.isLocked : undefined,
    },
    select: topicSelect,
  });

  return toTopicDto(updated, userId, membership);
}

export async function deleteDiscussionTopic(
  userId: string,
  clubId: string,
  topicId: string,
): Promise<void> {
  const membership = await assertMember(userId, clubId);
  const topic = await getTopicOrThrow(clubId, topicId);

  if (!isModeratorOrOwner(membership) && topic.createdByUserId !== userId) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_PERMISSION_DENIED",
      "You cannot delete this discussion topic.",
      403,
    );
  }

  await prisma.discussionTopic.update({
    where: { id: topicId },
    data: { deletedAt: new Date() },
    select: { id: true },
  });
}

export async function listDiscussionPosts(
  userId: string,
  clubId: string,
  topicId: string,
  query: ListDiscussionPostsInput,
): Promise<CursorPage<DiscussionPostDto>> {
  const membership = await assertMember(userId, clubId);
  await getTopicOrThrow(clubId, topicId);
  const cursorDate = query.cursor ? new Date(query.cursor) : undefined;

  const posts = await prisma.discussionPost.findMany({
    where: {
      topicId,
      parentPostId: null,
      createdAt: cursorDate ? { lt: cursorDate } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: query.limit + 1,
    select: postSelect,
  });

  const page = posts.slice(0, query.limit);
  const replyRows = await prisma.discussionPost.findMany({
    where: { parentPostId: { in: page.map((post) => post.id) } },
    orderBy: { createdAt: "asc" },
    select: postSelect,
  });
  const userIds = Array.from(
    new Set([...page, ...replyRows].map((post) => post.userId)),
  );
  const rolesByUserId = await getRolesByUserId(clubId, userIds);
  const repliesByParentId = new Map<string, DiscussionPostDto[]>();

  replyRows.forEach((reply) => {
    const replies = repliesByParentId.get(reply.parentPostId ?? "") ?? [];
    replies.push(toPostDto(reply, userId, membership, rolesByUserId));
    if (reply.parentPostId) repliesByParentId.set(reply.parentPostId, replies);
  });

  const items = page
    .reverse()
    .flatMap((post) => [
      toPostDto(post, userId, membership, rolesByUserId),
      ...(repliesByParentId.get(post.id) ?? []),
    ]);

  return {
    items,
    pagination: {
      nextCursor:
        posts.length > query.limit
          ? page[0]?.createdAt.toISOString() ?? null
          : null,
      hasMore: posts.length > query.limit,
    },
  };
}

export async function createDiscussionPost(
  userId: string,
  clubId: string,
  topicId: string,
  input: CreateDiscussionPostInput,
): Promise<DiscussionPostDto> {
  const membership = await assertMember(userId, clubId);
  const topic = await getTopicOrThrow(clubId, topicId);

  if (topic.isLocked && !isModeratorOrOwner(membership)) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_LOCKED",
      "This discussion is locked.",
      423,
    );
  }

  let parentAuthorId: string | null = null;

  if (input.parentPostId) {
    const parent = await prisma.discussionPost.findFirst({
      where: { id: input.parentPostId, topicId, deletedAt: null },
      select: { id: true, parentPostId: true, userId: true },
    });

    if (!parent) {
      throw new DiscussionServiceError(
        "DISCUSSION_POST_NOT_FOUND",
        "Parent reply was not found.",
        404,
      );
    }

    if (parent.parentPostId) {
      throw new DiscussionServiceError(
        "DISCUSSION_POST_INVALID",
        "Replies can only go one level deep.",
        400,
      );
    }

    parentAuthorId = parent.userId;
  }

  const post = await prisma.discussionPost.create({
    data: {
      topicId,
      userId,
      content: input.content.trim(),
      parentPostId: input.parentPostId ?? null,
    },
    select: postSelect,
  });
  const rolesByUserId = await getRolesByUserId(clubId, [post.userId]);

  if (parentAuthorId && parentAuthorId !== userId) {
    await notify({
      recipients: [parentAuthorId],
      type: "DISCUSSION_REPLY",
      actorId: userId,
      clubId,
      title: "New reply to your discussion post",
      body: topic.title,
      actionUrl: `/clubs/${clubId}/discussion`,
      entityType: "DISCUSSION_POST",
      entityId: post.id,
    });
  }

  return toPostDto(post, userId, membership, rolesByUserId);
}

export async function updateDiscussionPost(
  userId: string,
  clubId: string,
  postId: string,
  input: UpdateDiscussionPostInput,
): Promise<DiscussionPostDto> {
  const membership = await assertMember(userId, clubId);
  const post = await findPost(clubId, postId);

  if (!post || post.deletedAt || post.topic.deletedAt) {
    throw new DiscussionServiceError(
      "DISCUSSION_POST_NOT_FOUND",
      "Discussion reply was not found.",
      404,
    );
  }

  if (post.topic.isLocked && !isModeratorOrOwner(membership)) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_LOCKED",
      "This discussion is locked.",
      423,
    );
  }

  if (post.userId !== userId) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_PERMISSION_DENIED",
      "You cannot edit another member's reply.",
      403,
    );
  }

  const updated = await prisma.discussionPost.update({
    where: { id: postId },
    data: { content: input.content.trim() },
    select: postSelect,
  });
  const rolesByUserId = await getRolesByUserId(clubId, [updated.userId]);

  return toPostDto(updated, userId, membership, rolesByUserId);
}

export async function deleteDiscussionPost(
  userId: string,
  clubId: string,
  postId: string,
): Promise<void> {
  const membership = await assertMember(userId, clubId);
  const post = await findPost(clubId, postId);

  if (!post || post.deletedAt || post.topic.deletedAt) {
    throw new DiscussionServiceError(
      "DISCUSSION_POST_NOT_FOUND",
      "Discussion reply was not found.",
      404,
    );
  }

  if (!isModeratorOrOwner(membership) && post.userId !== userId) {
    throw new DiscussionServiceError(
      "DISCUSSION_TOPIC_PERMISSION_DENIED",
      "You cannot remove this reply.",
      403,
    );
  }

  await prisma.discussionPost.update({
    where: { id: postId },
    data: { deletedAt: new Date(), content: "" },
    select: { id: true },
  });
}
