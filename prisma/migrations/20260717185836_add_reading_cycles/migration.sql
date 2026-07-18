-- CreateEnum
CREATE TYPE "ReadingCycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReadingCycle" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "status" "ReadingCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetEndDate" TIMESTAMP(3) NOT NULL,
    "goalDescription" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingCycle_clubId_status_idx" ON "ReadingCycle"("clubId", "status");

-- CreateIndex
CREATE INDEX "ReadingCycle_bookId_idx" ON "ReadingCycle"("bookId");

-- CreateIndex
CREATE INDEX "ReadingCycle_createdByUserId_idx" ON "ReadingCycle"("createdByUserId");

-- CreateIndex
CREATE INDEX "ReadingCycle_startDate_idx" ON "ReadingCycle"("startDate");

-- AddForeignKey
ALTER TABLE "ReadingCycle" ADD CONSTRAINT "ReadingCycle_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "BookClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingCycle" ADD CONSTRAINT "ReadingCycle_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingCycle" ADD CONSTRAINT "ReadingCycle_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
