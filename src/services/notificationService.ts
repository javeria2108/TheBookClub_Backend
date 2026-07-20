import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type {
  ListNotificationsInput,
  NotificationDto,
  NotificationPage,
  NotifyInput,
} from "../types";
import type { ApiErrorCode } from "../utils/apiResponse";

type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export class NotificationServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

const actorSelect = {
  id: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const notificationSelect = {
  id: true,
  notificationType: true,
  title: true,
  body: true,
  actionUrl: true,
  isRead: true,
  createdAt: true,
  readAt: true,
  actorUserId: true,
  actor: { select: actorSelect },
  clubId: true,
  entityId: true,
  entityType: true,
} satisfies Prisma.NotificationSelect;

function normalizeText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function toNotificationDto(record: NotificationRecord): NotificationDto {
  return {
    id: record.id,
    type: record.notificationType,
    title: record.title,
    body: record.body,
    actionUrl: record.actionUrl,
    isRead: record.isRead,
    createdAt: record.createdAt,
    readAt: record.readAt,
    actor: record.actor
      ? {
          id: record.actor.id,
          displayName: record.actor.username,
          avatarUrl: record.actor.avatarUrl,
        }
      : null,
    clubId: record.clubId,
    entityId: record.entityId,
    entityType: record.entityType,
  };
}

export async function getClubMemberUserIds(
  clubId: string,
  options: { excludeUserIds?: string[] } = {},
) {
  const excluded = new Set(options.excludeUserIds ?? []);
  const members = await prisma.clubMember.findMany({
    where: { clubId, userId: excluded.size ? { notIn: [...excluded] } : undefined },
    select: { userId: true },
  });

  return members.map((member) => member.userId);
}

export async function notify(input: NotifyInput): Promise<void> {
  const recipientIds = [...new Set(input.recipients)].filter(Boolean);

  if (!recipientIds.length) return;

  const title = normalizeText(input.title, 140);
  const body = normalizeText(input.body, 420);
  const actionUrl = normalizeText(input.actionUrl, 500);

  if (!title || !body || !actionUrl) return;

  await prisma.notification
    .createMany({
      data: recipientIds.map((recipientUserId) => ({
        recipientUserId,
        actorUserId: input.actorId ?? null,
        clubId: input.clubId ?? null,
        notificationType: input.type,
        title,
        body,
        actionUrl,
        entityId: input.entityId ?? null,
        entityType: input.entityType ?? null,
      })),
      skipDuplicates: true,
    })
    .catch((error) => {
      console.error("Notification delivery failed:", error);
    });
}

export async function listNotifications(
  userId: string,
  input: ListNotificationsInput,
): Promise<NotificationPage> {
  const cursorDate = input.cursor ? new Date(input.cursor) : undefined;
  const notifications = await prisma.notification.findMany({
    where: {
      recipientUserId: userId,
      isRead: input.unreadOnly ? false : undefined,
      createdAt: cursorDate ? { lt: cursorDate } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: input.limit + 1,
    select: notificationSelect,
  });
  const page = notifications.slice(0, input.limit);

  return {
    items: page.map(toNotificationDto),
    pagination: {
      nextCursor:
        notifications.length > input.limit
          ? page[page.length - 1]?.createdAt.toISOString() ?? null
          : null,
      hasMore: notifications.length > input.limit,
    },
  };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { recipientUserId: userId, isRead: false },
  });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<NotificationDto> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientUserId: userId },
    select: { id: true, isRead: true },
  });

  if (!notification) {
    throw new NotificationServiceError(
      "NOTIFICATION_NOT_FOUND",
      "Notification was not found.",
      404,
    );
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: notification.isRead ? {} : { isRead: true, readAt: new Date() },
    select: notificationSelect,
  });

  return toNotificationDto(updated);
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientUserId: userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { message: "Notifications marked as read" };
}
