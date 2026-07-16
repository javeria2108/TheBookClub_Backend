import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { ApiErrorCode } from "../utils/apiResponse";
import type {
  Book,
  CreateBookInput,
  GetBooksQuery,
  GetBooksResult,
  UpdateBookInput,
} from "../types/book.types";

type BookRecord = NonNullable<Awaited<ReturnType<typeof findBookById>>>;

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
