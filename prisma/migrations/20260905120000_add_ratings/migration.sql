CREATE TABLE "ClubRating" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookRating" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubRating_clubId_userId_key" ON "ClubRating"("clubId", "userId");
CREATE INDEX "ClubRating_clubId_idx" ON "ClubRating"("clubId");
CREATE INDEX "ClubRating_userId_idx" ON "ClubRating"("userId");
CREATE INDEX "ClubRating_rating_idx" ON "ClubRating"("rating");

CREATE UNIQUE INDEX "BookRating_bookId_userId_key" ON "BookRating"("bookId", "userId");
CREATE INDEX "BookRating_bookId_idx" ON "BookRating"("bookId");
CREATE INDEX "BookRating_userId_idx" ON "BookRating"("userId");
CREATE INDEX "BookRating_rating_idx" ON "BookRating"("rating");

ALTER TABLE "ClubRating" ADD CONSTRAINT "ClubRating_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "BookClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubRating" ADD CONSTRAINT "ClubRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookRating" ADD CONSTRAINT "BookRating_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookRating" ADD CONSTRAINT "BookRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
