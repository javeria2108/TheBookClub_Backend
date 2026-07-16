import { z } from "zod";

import type {
  BookDiscoveryResult,
  ExternalBookMetadata,
} from "../types/book.types";

const GOOGLE_BOOKS_API_BASE_URL = "https://www.googleapis.com/books/v1";
const GOOGLE_BOOKS_SOURCE = "GOOGLE_BOOKS" as const;
const GOOGLE_BOOKS_MAX_RESULTS = 10;
const GOOGLE_BOOKS_RETRY_DELAY_MS = 350;

const GoogleIndustryIdentifierSchema = z.object({
  type: z.string(),
  identifier: z.string(),
});

const GoogleVolumeInfoSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  authors: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  publishedDate: z.string().optional(),
  description: z.string().optional(),
  industryIdentifiers: z.array(GoogleIndustryIdentifierSchema).optional(),
  pageCount: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
  previewLink: z.string().url().optional(),
  infoLink: z.string().url().optional(),
  imageLinks: z
    .object({
      smallThumbnail: z.string().url().optional(),
      thumbnail: z.string().url().optional(),
    })
    .optional(),
});

const GoogleVolumeSchema = z.object({
  id: z.string(),
  volumeInfo: GoogleVolumeInfoSchema.optional(),
});

const GoogleSearchResponseSchema = z.object({
  items: z.array(GoogleVolumeSchema).optional(),
});

type GoogleVolume = z.infer<typeof GoogleVolumeSchema>;

export class GoogleBooksServiceError extends Error {
  constructor(
    public readonly code:
      | "GOOGLE_BOOKS_BOOK_NOT_FOUND"
      | "GOOGLE_BOOKS_IMPORT_FAILED"
      | "GOOGLE_BOOKS_RATE_LIMITED"
      | "GOOGLE_BOOKS_SEARCH_FAILED",
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "GoogleBooksServiceError";
  }
}

function getGoogleBooksApiKey(): string | undefined {
  return process.env.GOOGLE_BOOKS_API_KEY?.trim() || undefined;
}

function buildGoogleBooksUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`${GOOGLE_BOOKS_API_BASE_URL}${path}`);
  const apiKey = getGoogleBooksApiKey();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  return url;
}

async function fetchGoogleBooksJson(
  url: URL,
  fallbackCode: GoogleBooksServiceError["code"],
): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    const isNotFound = response.status === 404;
    const isRateLimited = response.status === 429;

    throw new GoogleBooksServiceError(
      isNotFound
        ? "GOOGLE_BOOKS_BOOK_NOT_FOUND"
        : isRateLimited
          ? "GOOGLE_BOOKS_RATE_LIMITED"
          : fallbackCode,
      isNotFound
        ? "Google Books metadata was not found."
        : isRateLimited
          ? "Google Books is rate limited. Please try again later."
        : "Unable to reach Google Books. Please try again.",
      isNotFound ? 404 : isRateLimited ? 429 : 502,
    );
  }

  return response.json();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchGoogleBooksJsonWithRetry(
  url: URL,
  fallbackCode: GoogleBooksServiceError["code"],
): Promise<unknown> {
  try {
    return await fetchGoogleBooksJson(url, fallbackCode);
  } catch (error) {
    if (
      error instanceof GoogleBooksServiceError &&
      error.statusCode === 502
    ) {
      await wait(GOOGLE_BOOKS_RETRY_DELAY_MS);
      return fetchGoogleBooksJson(url, fallbackCode);
    }

    throw error;
  }
}

function stripHtml(value: string | undefined): string | null {
  if (!value) return null;

  const withoutTags = value.replace(/<[^>]*>/g, " ");
  const normalized = withoutTags.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function truncateDescription(description: string | null): string | null {
  if (!description) return null;

  return description.length > 420
    ? `${description.slice(0, 417).trim()}...`
    : description;
}

function getIdentifier(
  volume: GoogleVolume,
  type: "ISBN_10" | "ISBN_13",
): string | null {
  const identifier = volume.volumeInfo?.industryIdentifiers?.find(
    (item) => item.type === type,
  );

  return identifier?.identifier ?? null;
}

function getPublishedYear(publishedDate: string | undefined): string | null {
  if (!publishedDate) return null;

  const match = publishedDate.match(/^\d{4}/);
  return match?.[0] ?? null;
}

function normalizeGoogleVolume(volume: GoogleVolume): BookDiscoveryResult | null {
  const volumeInfo = volume.volumeInfo;
  const title = volumeInfo?.title?.trim();

  if (!title) {
    return null;
  }

  const description = stripHtml(volumeInfo?.description);

  return {
    googleBooksId: volume.id,
    internalBookId: null,
    isImported: false,
    title,
    subtitle: volumeInfo?.subtitle?.trim() || null,
    description: truncateDescription(description),
    authors: volumeInfo?.authors ?? [],
    coverImage:
      volumeInfo?.imageLinks?.thumbnail ??
      volumeInfo?.imageLinks?.smallThumbnail ??
      null,
    isbn10: getIdentifier(volume, "ISBN_10"),
    isbn13: getIdentifier(volume, "ISBN_13"),
    publisher: volumeInfo?.publisher?.trim() || null,
    publishedDate: volumeInfo?.publishedDate?.trim() || null,
    publishedYear: getPublishedYear(volumeInfo?.publishedDate),
    pageCount:
      volumeInfo?.pageCount && volumeInfo.pageCount > 0
        ? volumeInfo.pageCount
        : null,
    language: volumeInfo?.language?.trim() || null,
    previewUrl: volumeInfo?.previewLink ?? null,
    infoUrl: volumeInfo?.infoLink ?? null,
  };
}

export async function searchGoogleBooks(
  query: string,
): Promise<BookDiscoveryResult[]> {
  const trimmedQuery = query.trim();
  const searchQueries = [
    trimmedQuery,
    `intitle:${trimmedQuery}`,
  ];
  const results = new Map<string, BookDiscoveryResult>();
  let lastError: unknown = null;

  for (const searchQuery of searchQueries) {
    const url = buildGoogleBooksUrl("/volumes", {
      q: searchQuery,
      maxResults: String(GOOGLE_BOOKS_MAX_RESULTS),
      printType: "books",
    });

    try {
      const payload = await fetchGoogleBooksJsonWithRetry(
        url,
        "GOOGLE_BOOKS_SEARCH_FAILED",
      );
      const parsedPayload = GoogleSearchResponseSchema.parse(payload);

      (parsedPayload.items ?? [])
        .map(normalizeGoogleVolume)
        .filter((book): book is BookDiscoveryResult => Boolean(book))
        .forEach((book) => {
          results.set(book.googleBooksId ?? book.title, book);
        });
    } catch (error) {
      lastError = error;
    }
  }

  if (results.size === 0 && lastError) {
    throw lastError;
  }

  return Array.from(results.values())
    .sort((firstBook, secondBook) => {
      const firstTitleMatches = firstBook.title
        .toLowerCase()
        .includes(trimmedQuery.toLowerCase());
      const secondTitleMatches = secondBook.title
        .toLowerCase()
        .includes(trimmedQuery.toLowerCase());

      if (firstTitleMatches === secondTitleMatches) return 0;
      return firstTitleMatches ? -1 : 1;
    })
    .slice(0, GOOGLE_BOOKS_MAX_RESULTS);
}

export async function getGoogleBookMetadata(
  googleBooksId: string,
): Promise<ExternalBookMetadata> {
  const url = buildGoogleBooksUrl(`/volumes/${encodeURIComponent(googleBooksId)}`);
  const payload = await fetchGoogleBooksJsonWithRetry(
    url,
    "GOOGLE_BOOKS_IMPORT_FAILED",
  );
  const parsedPayload = GoogleVolumeSchema.parse(payload);
  const normalizedBook = normalizeGoogleVolume(parsedPayload);

  if (!normalizedBook) {
    throw new GoogleBooksServiceError(
      "GOOGLE_BOOKS_BOOK_NOT_FOUND",
      "Google Books metadata was not found.",
      404,
    );
  }

  return {
    googleBooksId: parsedPayload.id,
    title: normalizedBook.title,
    subtitle: normalizedBook.subtitle,
    description: normalizedBook.description,
    authors: normalizedBook.authors,
    coverImage: normalizedBook.coverImage,
    isbn10: normalizedBook.isbn10,
    isbn13: normalizedBook.isbn13,
    publisher: normalizedBook.publisher,
    publishedDate: normalizedBook.publishedDate,
    pageCount: normalizedBook.pageCount,
    language: normalizedBook.language,
    previewUrl: normalizedBook.previewUrl,
    infoUrl: normalizedBook.infoUrl,
    externalSource: GOOGLE_BOOKS_SOURCE,
    externalId: parsedPayload.id,
  };
}
