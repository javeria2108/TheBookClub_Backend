CREATE TYPE "BookVoteRoundStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');

CREATE TABLE "BookVoteRound" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "BookVoteRoundStatus" NOT NULL DEFAULT 'DRAFT',
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "winnerNominationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "BookVoteRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookNomination" (
  "id" TEXT NOT NULL,
  "voteRoundId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "nominatedByUserId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "withdrawnAt" TIMESTAMP(3),
  CONSTRAINT "BookNomination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookVote" (
  "id" TEXT NOT NULL,
  "voteRoundId" TEXT NOT NULL,
  "nominationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookVoteRound_clubId_status_idx" ON "BookVoteRound"("clubId", "status");
CREATE INDEX "BookVoteRound_createdByUserId_idx" ON "BookVoteRound"("createdByUserId");
CREATE INDEX "BookVoteRound_winnerNominationId_idx" ON "BookVoteRound"("winnerNominationId");
CREATE UNIQUE INDEX "BookNomination_voteRoundId_bookId_key" ON "BookNomination"("voteRoundId", "bookId");
CREATE UNIQUE INDEX "BookNomination_voteRoundId_nominatedByUserId_key" ON "BookNomination"("voteRoundId", "nominatedByUserId");
CREATE INDEX "BookNomination_voteRoundId_idx" ON "BookNomination"("voteRoundId");
CREATE INDEX "BookNomination_bookId_idx" ON "BookNomination"("bookId");
CREATE INDEX "BookNomination_nominatedByUserId_idx" ON "BookNomination"("nominatedByUserId");
CREATE INDEX "BookNomination_withdrawnAt_idx" ON "BookNomination"("withdrawnAt");
CREATE UNIQUE INDEX "BookVote_voteRoundId_userId_key" ON "BookVote"("voteRoundId", "userId");
CREATE INDEX "BookVote_voteRoundId_idx" ON "BookVote"("voteRoundId");
CREATE INDEX "BookVote_nominationId_idx" ON "BookVote"("nominationId");
CREATE INDEX "BookVote_userId_idx" ON "BookVote"("userId");

ALTER TABLE "BookVoteRound" ADD CONSTRAINT "BookVoteRound_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "BookClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookVoteRound" ADD CONSTRAINT "BookVoteRound_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookVoteRound" ADD CONSTRAINT "BookVoteRound_winnerNominationId_fkey" FOREIGN KEY ("winnerNominationId") REFERENCES "BookNomination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookNomination" ADD CONSTRAINT "BookNomination_voteRoundId_fkey" FOREIGN KEY ("voteRoundId") REFERENCES "BookVoteRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookNomination" ADD CONSTRAINT "BookNomination_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookNomination" ADD CONSTRAINT "BookNomination_nominatedByUserId_fkey" FOREIGN KEY ("nominatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookVote" ADD CONSTRAINT "BookVote_voteRoundId_fkey" FOREIGN KEY ("voteRoundId") REFERENCES "BookVoteRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookVote" ADD CONSTRAINT "BookVote_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "BookNomination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookVote" ADD CONSTRAINT "BookVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
