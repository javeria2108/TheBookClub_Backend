CREATE TYPE "NotificationType" AS ENUM (
  'JOIN_REQUEST_APPROVED',
  'JOIN_REQUEST_REJECTED',
  'CLUB_JOINED',
  'READING_CYCLE_STARTED',
  'READING_CYCLE_UPDATED',
  'READING_TARGET_UPCOMING',
  'VOTING_OPENED',
  'VOTING_CLOSED',
  'DISCUSSION_TOPIC_CREATED',
  'DISCUSSION_REPLY',
  'READING_ENTRY_CREATED'
);

CREATE TYPE "NotificationEntityType" AS ENUM (
  'CLUB',
  'JOIN_REQUEST',
  'READING_CYCLE',
  'READING_TARGET',
  'DISCUSSION_TOPIC',
  'DISCUSSION_POST',
  'BOOK_VOTE',
  'READING_ENTRY'
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "clubId" TEXT,
  "notificationType" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionUrl" TEXT NOT NULL,
  "entityId" TEXT,
  "entityType" "NotificationEntityType",
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_recipientUserId_notificationType_entityType_entityId_key"
  ON "Notification"("recipientUserId", "notificationType", "entityType", "entityId");

CREATE INDEX "Notification_recipientUserId_isRead_createdAt_idx"
  ON "Notification"("recipientUserId", "isRead", "createdAt");

CREATE INDEX "Notification_recipientUserId_createdAt_idx"
  ON "Notification"("recipientUserId", "createdAt");

CREATE INDEX "Notification_clubId_idx"
  ON "Notification"("clubId");

CREATE INDEX "Notification_notificationType_idx"
  ON "Notification"("notificationType");

CREATE INDEX "Notification_entityType_entityId_idx"
  ON "Notification"("entityType", "entityId");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "BookClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
