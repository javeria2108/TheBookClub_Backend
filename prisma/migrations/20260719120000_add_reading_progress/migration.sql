-- CreateEnum
CREATE TYPE "ReadingProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "readingCycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReadingProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercentage" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_readingCycleId_userId_key" ON "ReadingProgress"("readingCycleId", "userId");

-- CreateIndex
CREATE INDEX "ReadingProgress_readingCycleId_idx" ON "ReadingProgress"("readingCycleId");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_idx" ON "ReadingProgress"("userId");

-- CreateIndex
CREATE INDEX "ReadingProgress_status_idx" ON "ReadingProgress"("status");

-- CreateIndex
CREATE INDEX "ReadingProgress_lastUpdatedAt_idx" ON "ReadingProgress"("lastUpdatedAt");

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_readingCycleId_fkey" FOREIGN KEY ("readingCycleId") REFERENCES "ReadingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
