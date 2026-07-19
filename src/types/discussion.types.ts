import type {
  CreateDiscussionPostSchemaType,
  CreateDiscussionTopicSchemaType,
  ListDiscussionPostsQuerySchemaType,
  ListDiscussionTopicsQuerySchemaType,
  UpdateDiscussionPostSchemaType,
  UpdateDiscussionTopicSchemaType,
} from "../schemas";

export type DiscussionTopicType =
  | "GENERAL"
  | "READING_CYCLE"
  | "READING_TARGET"
  | "PROMPT";

export type DiscussionAuthorDto = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: "MEMBER" | "MODERATOR" | "OWNER";
};

export type DiscussionTopicDto = {
  id: string;
  clubId: string;
  topicType: DiscussionTopicType;
  title: string;
  prompt: string | null;
  isPinned: boolean;
  isLocked: boolean;
  readingCycle: { id: string; bookTitle: string } | null;
  readingTarget: { id: string; title: string; rangeLabel: string } | null;
  createdBy: Omit<DiscussionAuthorDto, "role">;
  postCount: number;
  lastActivityAt: Date;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DiscussionPostDto = {
  id: string;
  topicId: string;
  content: string;
  author: DiscussionAuthorDto | null;
  parentPostId: string | null;
  replyCount: number;
  isDeleted: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CursorPage<T> = {
  items: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type CreateDiscussionTopicInput = CreateDiscussionTopicSchemaType;
export type UpdateDiscussionTopicInput = UpdateDiscussionTopicSchemaType;
export type ListDiscussionTopicsInput = ListDiscussionTopicsQuerySchemaType;
export type CreateDiscussionPostInput = CreateDiscussionPostSchemaType;
export type UpdateDiscussionPostInput = UpdateDiscussionPostSchemaType;
export type ListDiscussionPostsInput = ListDiscussionPostsQuerySchemaType;
