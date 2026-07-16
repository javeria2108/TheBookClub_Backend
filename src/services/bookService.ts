import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  getGoogleBookMetadata,
  GoogleBooksServiceError,
  searchGoogleBooks,
} from "./googleBooksService";
import type { ApiErrorCode } from "../utils/apiResponse";
import type {
  Book,
  BookDiscoveryResult,
  CreateBookInput,
  ExternalBookMetadata,
  GetBooksQuery,
  GetBooksResult,
  UpdateBookInput,
} from "../types/book.types";

type BookRecord = NonNullable<Awaited<ReturnType<typeof findBookById>>>;

const BOOK_DISCOVERY_LIMIT = 10;

export class BookServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "BookServiceError";
  }
}

const bookSelect = {
  id: true,
  title: true,
  subtitle: true,
  description: true,
  authors: true,
  coverImage: true,
  isbn10: true,
  isbn13: true,
  publisher: true,
  publishedDate: true,
  pageCount: true,
  language: true,
  externalSource: true,
  externalId: true,
  previewUrl: true,
  infoUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookSelect;

async function findBookById(bookId: string) {
  return prisma.book.findUnique({
    where: { id: bookId },
    select: bookSelect,
  });
}

function toBook(record: BookRecord): Book {
  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle,
    description: record.description,
    authors: record.authors,
    coverImage: record.coverImage,
    isbn10: record.isbn10,
    isbn13: record.isbn13,
    publisher: record.publisher,
    publishedDate: record.publishedDate,
    pageCount: record.pageCount,
    language: record.language,
    externalSource: record.externalSource,
    externalId: record.externalId,
    previewUrl: record.previewUrl,
    infoUrl: record.infoUrl,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function getPublishedYear(publishedDate: string | null): string | null {
  if (!publishedDate) return null;

  const match = publishedDate.match(/^\d{4}/);
  return match?.[0] ?? null;
}

function toBookDiscoveryResult(record: BookRecord): BookDiscoveryResult {
  return {
    googleBooksId:
      record.externalSource === "GOOGLE_BOOKS" ? record.externalId : null,
    internalBookId: record.id,
    isImported: true,
    title: record.title,
    subtitle: record.subtitle,
    description: record.description,
    authors: record.authors,
    coverImage: record.coverImage,
    isbn10: record.isbn10,
    isbn13: record.isbn13,
    publisher: record.publisher,
    publishedDate: record.publishedDate,
    publishedYear: getPublishedYear(record.publishedDate),
    pageCount: record.pageCount,
    language: record.language,
    previewUrl: record.previewUrl,
    infoUrl: record.infoUrl,
  };
}

function optionalStringToNullable(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeAuthors(authors: string[] | undefined): string[] | undefined {
  if (authors === undefined) return undefined;

  const uniqueAuthors = new Map<string, string>();

  authors.forEach((author) => {
    const normalizedAuthor = author.trim();

    if (!normalizedAuthor) {
      return;
    }

    uniqueAuthors.set(normalizedAuthor.toLowerCase(), normalizedAuthor);
  });

  return Array.from(uniqueAuthors.values());
}

function normalizeBookCreateInput(input: CreateBookInput): Prisma.BookCreateInput {
  return {
    title: input.title.trim(),
    subtitle: optionalStringToNullable(input.subtitle),
    description: optionalStringToNullable(input.description),
    authors: normalizeAuthors(input.authors) ?? [],
    coverImage: optionalStringToNullable(input.coverImage),
    isbn10: optionalStringToNullable(input.isbn10),
    isbn13: optionalStringToNullable(input.isbn13),
    publisher: optionalStringToNullable(input.publisher),
    publishedDate: optionalStringToNullable(input.publishedDate),
    pageCount: input.pageCount,
    language: optionalStringToNullable(input.language),
    externalSource: optionalStringToNullable(input.externalSource),
    externalId: optionalStringToNullable(input.externalId),
    previewUrl: optionalStringToNullable(input.previewUrl),
    infoUrl: optionalStringToNullable(input.infoUrl),
  };
}

function normalizeBookUpdateInput(input: UpdateBookInput): Prisma.BookUpdateInput {
  const title = input.title !== undefined ? input.title.trim() : undefined;

  return {
    title,
    subtitle: optionalStringToNullable(input.subtitle),
    description: optionalStringToNullable(input.description),
    authors: normalizeAuthors(input.authors),
    coverImage: optionalStringToNullable(input.coverImage),
    isbn10: optionalStringToNullable(input.isbn10),
    isbn13: optionalStringToNullable(input.isbn13),
    publisher: optionalStringToNullable(input.publisher),
    publishedDate: optionalStringToNullable(input.publishedDate),
    pageCount: input.pageCount,
    language: optionalStringToNullable(input.language),
    externalSource: optionalStringToNullable(input.externalSource),
    externalId: optionalStringToNullable(input.externalId),
    previewUrl: optionalStringToNullable(input.previewUrl),
    infoUrl: optionalStringToNullable(input.infoUrl),
  };
}

function buildBookSearchWhere(search: string | undefined): Prisma.BookWhereInput {
  const searchTerm = search?.trim();

  if (!searchTerm) {
    return {};
  }

  return {
    OR: [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { subtitle: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
      { publisher: { contains: searchTerm, mode: "insensitive" } },
      { isbn10: { contains: searchTerm, mode: "insensitive" } },
      { isbn13: { contains: searchTerm, mode: "insensitive" } },
      { authors: { has: searchTerm } },
    ],
  };
}

function throwDuplicateBookError(): never {
  throw new BookServiceError(
    "BOOK_ALREADY_EXISTS",
    "A book with the same identifier already exists.",
    409,
  );
}

function toCreateBookInputFromExternalMetadata(
  metadata: ExternalBookMetadata,
): CreateBookInput {
  return {
    title: metadata.title,
    subtitle: metadata.subtitle ?? undefined,
    description: metadata.description ?? undefined,
    authors: metadata.authors,
    coverImage: metadata.coverImage ?? undefined,
    isbn10: metadata.isbn10 ?? undefined,
    isbn13: metadata.isbn13 ?? undefined,
    publisher: metadata.publisher ?? undefined,
    publishedDate: metadata.publishedDate ?? undefined,
    pageCount: metadata.pageCount ?? undefined,
    language: metadata.language ?? undefined,
    externalSource: metadata.externalSource,
    externalId: metadata.externalId,
    previewUrl: metadata.previewUrl ?? undefined,
    infoUrl: metadata.infoUrl ?? undefined,
  };
}

async function findExistingImportedBook(
  metadata: ExternalBookMetadata,
): Promise<Book | null> {
  const existingBook = metadata.isbn13
    ? await prisma.book.findUnique({
        where: { isbn13: metadata.isbn13 },
        select: bookSelect,
      })
    : await prisma.book.findUnique({
        where: {
          externalSource_externalId: {
            externalSource: metadata.externalSource,
            externalId: metadata.externalId,
          },
        },
        select: bookSelect,
      });

  return existingBook ? toBook(existingBook) : null;
}

function toGoogleBookServiceError(error: GoogleBooksServiceError): BookServiceError {
  return new BookServiceError(error.code, error.message, error.statusCode);
}

async function searchInternalBookDiscovery(
  query: string,
): Promise<BookDiscoveryResult[]> {
  const records = await prisma.book.findMany({
    where: buildBookSearchWhere(query),
    take: BOOK_DISCOVERY_LIMIT,
    orderBy: [{ title: "asc" }, { createdAt: "desc" }],
    select: bookSelect,
  });

  return records.map(toBookDiscoveryResult);
}

function getDiscoveryDedupeKey(book: BookDiscoveryResult): string {
  if (book.isbn13) return `isbn13:${book.isbn13}`;
  if (book.googleBooksId) return `google:${book.googleBooksId}`;
  if (book.internalBookId) return `book:${book.internalBookId}`;

  return `title:${book.title.toLowerCase()}`;
}

function mergeDiscoveryResults(
  internalResults: BookDiscoveryResult[],
  externalResults: BookDiscoveryResult[],
): BookDiscoveryResult[] {
  const results = new Map<string, BookDiscoveryResult>();

  internalResults.forEach((book) => {
    results.set(getDiscoveryDedupeKey(book), book);
  });

  externalResults.forEach((book) => {
    const key = getDiscoveryDedupeKey(book);

    if (!results.has(key)) {
      results.set(key, book);
    }
  });

  return Array.from(results.values()).slice(0, BOOK_DISCOVERY_LIMIT);
}

export async function assertCanManageBooks(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new BookServiceError("USER_NOT_FOUND", "User was not found.", 404);
  }

  if (user.role === "ADMIN") {
    return;
  }

  const ownedClub = await prisma.clubMember.findFirst({
    where: {
      userId,
      role: "OWNER",
    },
    select: { id: true },
  });

  if (!ownedClub) {
    throw new BookServiceError(
      "BOOK_MANAGEMENT_FORBIDDEN",
      "Only admins and club owners can manage books.",
      403,
    );
  }
}

export async function getBooks(query: GetBooksQuery): Promise<GetBooksResult> {
  const where = buildBookSearchWhere(query.search);
  const skip = (query.page - 1) * query.limit;

  const [records, totalItems] = await prisma.$transaction([
    prisma.book.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: [{ title: "asc" }, { createdAt: "desc" }],
      select: bookSelect,
    }),
    prisma.book.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / query.limit);

  return {
    books: records.map(toBook),
    pagination: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}

export async function getBookById(bookId: string): Promise<Book> {
  const book = await findBookById(bookId);

  if (!book) {
    throw new BookServiceError("BOOK_NOT_FOUND", "Book was not found.", 404);
  }

  return toBook(book);
}

export async function searchBookDiscovery(
  query: string,
): Promise<BookDiscoveryResult[]> {
  const internalResults = await searchInternalBookDiscovery(query);

  try {
    const externalResults = await searchGoogleBooks(query);
    return mergeDiscoveryResults(internalResults, externalResults);
  } catch (error) {
    if (internalResults.length > 0) {
      return internalResults;
    }

    if (error instanceof GoogleBooksServiceError) {
      if (error.code === "GOOGLE_BOOKS_SEARCH_FAILED") {
        return [];
      }

      throw toGoogleBookServiceError(error);
    }

    throw new BookServiceError(
      "GOOGLE_BOOKS_SEARCH_FAILED",
      "Unable to search Google Books. Please try again.",
      502,
    );
  }
}

export async function createBook(
  userId: string,
  input: CreateBookInput,
): Promise<Book> {
  await assertCanManageBooks(userId);

  try {
    const book = await prisma.book.create({
      data: normalizeBookCreateInput(input),
      select: bookSelect,
    });

    return toBook(book);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throwDuplicateBookError();
    }

    throw new BookServiceError(
      "BOOK_CREATE_FAILED",
      "Unable to create book. Please try again.",
      500,
    );
  }
}

export async function importGoogleBook(
  userId: string,
  googleBooksId: string,
): Promise<Book> {
  await assertCanManageBooks(userId);

  let metadata: ExternalBookMetadata | null = null;

  try {
    metadata = await getGoogleBookMetadata(googleBooksId);
    const existingBook = await findExistingImportedBook(metadata);

    if (existingBook) {
      return existingBook;
    }

    const book = await prisma.book.create({
      data: normalizeBookCreateInput(
        toCreateBookInputFromExternalMetadata(metadata),
      ),
      select: bookSelect,
    });

    return toBook(book);
  } catch (error) {
    if (error instanceof GoogleBooksServiceError) {
      throw toGoogleBookServiceError(error);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingBook = metadata
        ? await findExistingImportedBook(metadata)
        : null;

      if (existingBook) {
        return existingBook;
      }

      throwDuplicateBookError();
    }

    throw new BookServiceError(
      "GOOGLE_BOOKS_IMPORT_FAILED",
      "Unable to import this book. Please try again.",
      500,
    );
  }
}

export async function updateBook(
  userId: string,
  bookId: string,
  input: UpdateBookInput,
): Promise<Book> {
  await assertCanManageBooks(userId);

  try {
    const book = await prisma.book.update({
      where: { id: bookId },
      data: normalizeBookUpdateInput(input),
      select: bookSelect,
    });

    return toBook(book);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new BookServiceError("BOOK_NOT_FOUND", "Book was not found.", 404);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throwDuplicateBookError();
    }

    throw new BookServiceError(
      "BOOK_UPDATE_FAILED",
      "Unable to update book. Please try again.",
      500,
    );
  }
}

export async function deleteBook(userId: string, bookId: string): Promise<void> {
  await assertCanManageBooks(userId);

  try {
    await prisma.book.delete({
      where: { id: bookId },
      select: { id: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new BookServiceError("BOOK_NOT_FOUND", "Book was not found.", 404);
    }

    throw new BookServiceError(
      "BOOK_DELETE_FAILED",
      "Unable to delete book. Please try again.",
      500,
    );
  }
}
