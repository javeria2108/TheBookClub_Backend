CREATE TYPE "DiscussionTopicType" AS ENUM ('GENERAL', 'READING_CYCLE', 'READING_TARGET', 'PROMPT');

CREATE TABLE "DiscussionTopic" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "readingCycleId" TEXT,
  "readingTargetId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT,
  "topicType" "DiscussionTopicType" NOT NULL DEFAULT 'GENERAL',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "DiscussionTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscussionPost" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentPostId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "DiscussionPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiscussionTopic_clubId_isPinned_createdAt_idx" ON "DiscussionTopic"("clubId", "isPinned", "createdAt");
CREATE INDEX "DiscussionTopic_readingCycleId_idx" ON "DiscussionTopic"("readingCycleId");
CREATE INDEX "DiscussionTopic_readingTargetId_idx" ON "DiscussionTopic"("readingTargetId");
CREATE INDEX "DiscussionTopic_createdByUserId_idx" ON "DiscussionTopic"("createdByUserId");
CREATE INDEX "DiscussionTopic_deletedAt_idx" ON "DiscussionTopic"("deletedAt");

CREATE INDEX "DiscussionPost_topicId_createdAt_idx" ON "DiscussionPost"("topicId", "createdAt");
CREATE INDEX "DiscussionPost_userId_idx" ON "DiscussionPost"("userId");
CREATE INDEX "DiscussionPost_parentPostId_idx" ON "DiscussionPost"("parentPostId");
CREATE INDEX "DiscussionPost_deletedAt_idx" ON "DiscussionPost"("deletedAt");

ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "BookClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_readingCycleId_fkey" FOREIGN KEY ("readingCycleId") REFERENCES "ReadingCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_readingTargetId_fkey" FOREIGN KEY ("readingTargetId") REFERENCES "ReadingTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "DiscussionTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_parentPostId_fkey" FOREIGN KEY ("parentPostId") REFERENCES "DiscussionPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
