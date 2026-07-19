-- CreateEnum
CREATE TYPE "ReadingTargetType" AS ENUM ('CHAPTERS', 'PAGES', 'CUSTOM');

-- CreateTable
CREATE TABLE "ReadingTarget" (
    "id" TEXT NOT NULL,
    "readingCycleId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetType" "ReadingTargetType" NOT NULL,
    "startValue" INTEGER,
    "endValue" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingTarget_readingCycleId_sequence_key" ON "ReadingTarget"("readingCycleId", "sequence");

-- CreateIndex
CREATE INDEX "ReadingTarget_readingCycleId_idx" ON "ReadingTarget"("readingCycleId");

-- CreateIndex
CREATE INDEX "ReadingTarget_readingCycleId_sequence_idx" ON "ReadingTarget"("readingCycleId", "sequence");

-- CreateIndex
CREATE INDEX "ReadingTarget_startDate_idx" ON "ReadingTarget"("startDate");

-- AddForeignKey
ALTER TABLE "ReadingTarget" ADD CONSTRAINT "ReadingTarget_readingCycleId_fkey" FOREIGN KEY ("readingCycleId") REFERENCES "ReadingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
