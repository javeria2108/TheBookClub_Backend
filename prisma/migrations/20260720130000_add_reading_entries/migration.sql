CREATE TYPE "ReadingEntryType" AS ENUM ('REFLECTION', 'QUOTE');

CREATE TABLE "ReadingEntry" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "readingCycleId" TEXT NOT NULL,
  "readingTargetId" TEXT,
  "userId" TEXT NOT NULL,
  "entryType" "ReadingEntryType" NOT NULL,
  "body" TEXT NOT NULL,
  "commentary" TEXT,
  "pageNumber" INTEGER,
  "chapterReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ReadingEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadingEntry_clubId_createdAt_idx" ON "ReadingEntry"("clubId", "createdAt");
CREATE INDEX "ReadingEntry_readingCycleId_createdAt_idx" ON "ReadingEntry"("readingCycleId", "createdAt");
CREATE INDEX "ReadingEntry_readingTargetId_idx" ON "ReadingEntry"("readingTargetId");
CREATE INDEX "ReadingEntry_userId_idx" ON "ReadingEntry"("userId");
CREATE INDEX "ReadingEntry_entryType_idx" ON "ReadingEntry"("entryType");
CREATE INDEX "ReadingEntry_deletedAt_idx" ON "ReadingEntry"("deletedAt");

ALTER TABLE "ReadingEntry" ADD CONSTRAINT "ReadingEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "BookClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingEntry" ADD CONSTRAINT "ReadingEntry_readingCycleId_fkey" FOREIGN KEY ("readingCycleId") REFERENCES "ReadingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingEntry" ADD CONSTRAINT "ReadingEntry_readingTargetId_fkey" FOREIGN KEY ("readingTargetId") REFERENCES "ReadingTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReadingEntry" ADD CONSTRAINT "ReadingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
