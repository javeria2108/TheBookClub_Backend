CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "authors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "coverImage" TEXT,
    "isbn10" TEXT,
    "isbn13" TEXT,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "pageCount" INTEGER,
    "language" TEXT,
    "externalSource" TEXT,
    "externalId" TEXT,
    "previewUrl" TEXT,
    "infoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Book_isbn10_key" ON "Book"("isbn10");
CREATE UNIQUE INDEX "Book_isbn13_key" ON "Book"("isbn13");
CREATE UNIQUE INDEX "Book_externalSource_externalId_key" ON "Book"("externalSource", "externalId");
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Book_isbn13_idx" ON "Book"("isbn13");
