import type {
  BookSchemaType,
  CreateBookSchemaType,
  GetBooksQuerySchemaType,
  UpdateBookSchemaType,
} from "../schemas";

export type Book = BookSchemaType;
export type CreateBookInput = CreateBookSchemaType;
export type UpdateBookInput = UpdateBookSchemaType;
export type GetBooksQuery = GetBooksQuerySchemaType;

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
