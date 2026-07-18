import type {
  BookSchemaType,
  CreateBookSchemaType,
  GetBooksQuerySchemaType,
  ImportGoogleBookSchemaType,
  SearchGoogleBooksQuerySchemaType,
  UpdateBookSchemaType,
} from "../schemas";

export type Book = BookSchemaType;
export type CreateBookInput = CreateBookSchemaType;
export type UpdateBookInput = UpdateBookSchemaType;
export type GetBooksQuery = GetBooksQuerySchemaType;
export type SearchGoogleBooksQuery = SearchGoogleBooksQuerySchemaType;
export type ImportGoogleBookInput = ImportGoogleBookSchemaType;

export type BookPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetBooksResult = {
  books: Book[];
  pagination: BookPagination;
};

export type BookDiscoveryResult = {
  source: "BOOKCIRCLE" | "GOOGLE_BOOKS";
  isSaved: boolean;
  bookId: string | null;
  googleBooksId: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  authors: string[];
  coverImage: string | null;
  isbn10: string | null;
  isbn13: string | null;
  publisher: string | null;
  publishedDate: string | null;
  publishedYear: string | null;
  pageCount: number | null;
  language: string | null;
  previewUrl: string | null;
  infoUrl: string | null;
};

export type ExternalBookMetadata = Omit<
  BookDiscoveryResult,
  "publishedYear" | "source" | "isSaved" | "bookId"
> & {
  googleBooksId: string;
  externalSource: "GOOGLE_BOOKS";
  externalId: string;
};
