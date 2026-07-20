import type {
  NotificationEntityType,
  NotificationType,
} from "../generated/prisma/client";

export type NotificationActorDto = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
  actor: NotificationActorDto | null;
  clubId: string | null;
  entityId: string | null;
  entityType: NotificationEntityType | null;
};

export type NotificationPage = {
  items: NotificationDto[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type ListNotificationsInput = {
  cursor?: string;
  limit: number;
  unreadOnly?: boolean;
};

export type NotifyInput = {
  recipients: string[];
  type: NotificationType;
  actorId?: string | null;
  clubId?: string | null;
  title: string;
  body: string;
  actionUrl: string;
  entityId?: string | null;
  entityType?: NotificationEntityType | null;
};
